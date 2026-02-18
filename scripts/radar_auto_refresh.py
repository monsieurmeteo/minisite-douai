"""
Auto-refresher for Météo-France radar data.
Runs fetch_radar_mf.py every 5 minutes in a loop.
Start with: python scripts/radar_auto_refresh.py
"""
import subprocess
import time
import os
import sys
import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FETCH_SCRIPT = os.path.join(SCRIPT_DIR, 'fetch_radar_supabase.py')
INTERVAL_SECONDS = 5 * 60  # 5 minutes

def run_fetch():
    """Run the fetch script and return success status."""
    try:
        result = subprocess.run(
            [sys.executable, FETCH_SCRIPT],
            capture_output=True,
            text=True,
            timeout=120,
            encoding='utf-8',
            errors='replace'
        )
        now = datetime.datetime.now().strftime('%H:%M:%S')
        if result.returncode == 0:
            # Extract key stats from output
            lines = result.stdout.strip().split('\n')
            gen_lines = [l for l in lines if 'Generated:' in l or 'Skipping' in l]
            manifest_line = [l for l in lines if 'Manifest' in l]
            print(f"[{now}] OK - {len(gen_lines)} frames processed. {manifest_line[-1].strip() if manifest_line else ''}")
            return True
        else:
            print(f"[{now}] ERROR (exit {result.returncode})")
            if result.stderr:
                # Show last 3 lines of error
                err_lines = result.stderr.strip().split('\n')[-3:]
                for line in err_lines:
                    print(f"  {line}")
            return False
    except subprocess.TimeoutExpired:
        now = datetime.datetime.now().strftime('%H:%M:%S')
        print(f"[{now}] TIMEOUT - fetch took more than 120s")
        return False
    except Exception as e:
        now = datetime.datetime.now().strftime('%H:%M:%S')
        print(f"[{now}] EXCEPTION: {e}")
        return False

def main():
    print("=" * 50)
    print("Meteo-France Radar Auto-Refresh")
    print(f"Interval: {INTERVAL_SECONDS}s ({INTERVAL_SECONDS//60}min)")
    print("=" * 50)
    
    consecutive_errors = 0
    max_errors = 5
    
    while True:
        success = run_fetch()
        
        if success:
            consecutive_errors = 0
        else:
            consecutive_errors += 1
            if consecutive_errors >= max_errors:
                print(f"\n[!] {max_errors} consecutive errors. Waiting 30min before retry...")
                time.sleep(30 * 60)
                consecutive_errors = 0
                continue
        
        # Wait for next cycle
        next_run = datetime.datetime.now() + datetime.timedelta(seconds=INTERVAL_SECONDS)
        print(f"    Next refresh at {next_run.strftime('%H:%M:%S')}")
        time.sleep(INTERVAL_SECONDS)

if __name__ == '__main__':
    main()
