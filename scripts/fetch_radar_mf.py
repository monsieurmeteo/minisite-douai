"""
Météo-France Radar Mosaic Processor
Downloads the radar mosaic package, extracts HDF5 files,
and generates PNG images with a precipitation color palette.
Images are saved to public/radar-mf/ for serving via the frontend.
"""
import h5py
import numpy as np
from PIL import Image
import os
import sys
import json
import gzip
import tarfile
import io
import urllib.request
import time
import glob

# Configuration
MF_API_KEY = "eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJHcmVnNTk4ODBAY2FyYm9uLnN1cGVyIiwiYXBwbGljYXRpb24iOnsib3duZXIiOiJHcmVnNTk4ODAiLCJ0aWVyUXVvdGFUeXBlIjpudWxsLCJ0aWVyIjoiVW5saW1pdGVkIiwibmFtZSI6IkRlZmF1bHRBcHBsaWNhdGlvbiIsImlkIjoyMzg0MCwidXVpZCI6IjA3YTRhZjk0LWE4MzktNDllZC05MjJlLTAyZDMyMTM1ZjVlZSJ9LCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnI6NDQzXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiNTBQZXJNaW4iOnsidGllclF1b3RhVHlwZSI6InJlcXVlc3RDb3VudCIsImdyYXBoUUxNYXhDb21wbGV4aXR5IjowLCJncmFwaFFMTWF4RGVwdGgiOjAsInN0b3BPblF1b3RhUmVhY2giOnRydWUsInNwaWtlQXJyZXN0TGltaXQiOjAsInNwaWtlQXJyZXN0VW5pdCI6InNlYyJ9LCI2MFJlcVBhck1pbiI6eyJ0aWVyUXVvdGFUeXBlIjoicmVxdWVzdENvdW50IiwiZ3JhcGhRTE1heENvbXBsZXhpdHkiOjAsImdyYXBoUUxNYXhEZXB0aCI6MCwic3RvcE9uUXVvdGFSZWFjaCI6dHJ1ZSwic3Bpa2VBcnJlc3RMaW1pdCI6MCwic3Bpa2VBcnJlc3RVbml0Ijoic2VjIn19LCJrZXl0eXBlIjoiUFJPRFVDVElPTiIsInN1YnNjcmliZWRBUElzIjpbeyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNWaWdpbGFuY2UiLCJjb250ZXh0IjoiXC9wdWJsaWNcL0RQVmlnaWxhbmNlXC92MSIsInB1Ymxpc2hlciI6ImFkbWluIiwidmVyc2lvbiI6InYxIiwic3Vic2NyaXB0aW9uVGllciI6IjYwUmVxUGFyTWluIn0seyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNPYnNlcnZhdGlvbiIsImNvbnRleHQiOiJcL3B1YmxpY1wvRFBPYnNcL3YxIiwicHVibGlzaGVyIjoiYmFzdGllbmciLCJ2ZXJzaW9uIjoidjEiLCJzdWJzY3JpcHRpb25UaWVyIjoiNTBQZXJNaW4ifSx7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYW1lIjoiRG9ubmVlc1B1YmxpcXVlc1BhcXVldE9ic2VydmF0aW9uIiwiY29udGV4dCI6IlwvcHVibGljXC9EUFBhcXVldE9ic1wvdjEiLCJwdWJsaXNoZXIiOiJiYXN0aWVuZyIsInZlcnNpb24iOiJ2MSIsInN1YnNjcmlwdGlvblRpZXIiOiI1MFBlck1pbiJ9LHsic3Vic2NyaWJlclRlbmFudERvbWFpbiI6ImNhcmJvbi5zdXBlciIsIm5hbWUiOiJEb25uZWVzUHVibGlxdWVzUGFxdWV0UmFkYXIiLCJjb250ZXh0IjoiXC9wdWJsaWNcL0RQUGFxdWV0UmFkYXJcL3YxIiwicHVibGlzaGVyIjoibG9pYy5tYXJ0aW4iLCJ2ZXJzaW9uIjoidjEiLCJzdWJzY3JpcHRpb25UaWVyIjoiNTBQZXJNaW4ifV0sImV4cCI6MTc5NTQ1NTk3MCwidG9rZW5fdHlwZSI6ImFwaUtleSIsImlhdCI6MTc2OTE1ODEyMCwianRpIjoiYzhjOWM4ODUtNTkwMi00MDcxLTliMmEtNzYzNjU2NjBlMTczIn0=.GwLM-0qaSCCn1meoV0a_zPE1vqoY-9bD0n951MuytlRfH_qB5udKEnaPZaa24ta7fO45QGwxqikX6do_Y0P-Hzhr3j1Fmtp6SQAt2xGgIQlv5fIf4SR8mv78mJto3J_Kmzccq66NpxFVr_BCZMkwN9STh-78PgVlJ6ympR9yCkHmYG8xBh8u3qvEHE5adCiIZ5su9Wl_ui25JQW0_ncc-lxjrBByp6Pmn1f33fGV6IG4gqs2xrhvh7VUeb_vSuG00JWn-2LFkKmyI-3uRxTqVi8o6xImihaSGkh-R-Xn8ixA4YHdniv2-AAI2AvVng12yXE8M2NPNlpNB_BUcOlt2w=="

MF_API_URL = "https://public-api.meteofrance.fr/public/DPPaquetRadar/v1/mosaique/paquet"

# Get project root (script is in scripts/)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, '..')
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'public', 'radar-mf')
MANIFEST_FILE = os.path.join(OUTPUT_DIR, 'manifest.json')

# Maximum number of frames to keep (1h = 12 frames at 5min intervals)
MAX_FRAMES = 18

# Official Météo-France precipitation color palette (mm/h)
# Matches the palette from meteox.fr / infoclimat / meteo60
# Scale from the competitor screenshot: 0.1 -> 650 mm/h
# Format: (min_mmh, max_mmh, R, G, B, A)
RAIN_PALETTE = [
    (0.0,    0.1,    0,   0,   0,   0),       # Transparent (no rain)
    # Blues (light rain)
    (0.1,    0.15,   4,   4,  132, 200),       # Dark navy
    (0.15,   0.2,    4,   20, 156, 210),       # Navy
    (0.2,    0.3,    4,   40, 180, 215),       # Dark blue
    (0.3,    0.4,    4,   64, 204, 220),       # Blue
    (0.4,    0.5,    4,   88, 220, 220),       # Medium blue
    (0.5,    0.6,    4,  112, 236, 225),       # Blue-cyan
    (0.6,    0.9,    4,  140, 252, 225),       # Cyan
    (0.9,    1.2,   20, 168, 220, 225),        # Light cyan
    # Greens (moderate rain)
    (1.2,    1.5,    8,  180,  8,  230),       # Dark green
    (1.5,    2.0,   24, 200,  24, 230),        # Green
    (2.0,    2.7,   60, 216,  60, 230),        # Medium green
    (2.7,    3.7,  100, 232, 100, 230),        # Light green
    # Yellows (heavy rain)
    (3.7,    4.8,  180, 232,  20, 235),        # Yellow-green
    (4.8,    6.0,  232, 232,   4, 235),        # Yellow
    (6.0,    8.0,  252, 216,   4, 235),        # Gold
    # Oranges (very heavy rain)
    (8.0,   12.0,  252, 176,   4, 240),        # Light orange
    (12.0,  16.0,  252, 132,   4, 240),        # Orange
    (16.0,  27.0,  252,  88,   4, 240),        # Dark orange
    # Reds (intense rain)
    (27.0,  37.0,  252,  36,   4, 245),        # Red-orange
    (37.0,  48.0,  220,   4,   4, 245),        # Red
    (48.0,  65.0,  188,   4,   4, 245),        # Dark red
    # Purples/Pinks (extreme rain)
    (65.0,  85.0,  176,   4, 100, 250),        # Red-purple
    (85.0, 120.0,  160,   4, 160, 250),        # Purple
    (120.0, 150.0, 176,  44, 200, 250),        # Light purple
    (150.0, 210.0, 200,  80, 220, 250),        # Magenta
    (210.0, 278.0, 220, 120, 240, 250),        # Pink
    (278.0, 370.0, 236, 160, 248, 250),        # Light pink
    (370.0, 486.0, 248, 200, 252, 250),        # Very light pink
    (486.0, 999.0, 255, 240, 255, 255),        # Near white
]

def get_color_interp(mm_value):
    """Get RGBA color for a precipitation value in mm/h with interpolation."""
    for min_v, max_v, r, g, b, a in RAIN_PALETTE:
        if min_v <= mm_value < max_v:
            return (r, g, b, a)
    if mm_value >= 999.0:
        return (255, 240, 255, 255)
    return (0, 0, 0, 0)

def download_radar_package():
    """Download the radar mosaic package from Météo-France."""
    print("[1/4] Downloading radar package from Météo-France...")
    req = urllib.request.Request(MF_API_URL)
    req.add_header('apikey', MF_API_KEY)
    req.add_header('Accept', 'application/gzip')
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read()
            print(f"  Downloaded {len(data)} bytes")
            return data
    except Exception as e:
        print(f"  ERROR downloading: {e}")
        return None

def extract_h5_files(gzip_data):
    """Extract IPRN20 (metropole) HDF5 files from the tar.gz package."""
    print("[2/4] Extracting HDF5 files...")
    decompressed = gzip.decompress(gzip_data)
    
    # Parse TAR manually (more reliable than tarfile for this format)
    h5_files = {}
    offset = 0
    while offset < len(decompressed) - 512:
        name_raw = decompressed[offset:offset+100].decode('utf8', errors='replace')
        name = name_raw.replace('\0', '').strip()
        if not name:
            break
        
        size_str = decompressed[offset+124:offset+136].decode('utf8', errors='replace').replace('\0', '').strip()
        size = int(size_str, 8) if size_str else 0
        
        if not name.startswith('././@') and 'IPRN20' in name and name.endswith('.h5'):
            data = decompressed[offset+512:offset+512+size]
            # Extract timestamp from filename: T_IPRN20_C_LFPW_YYYYMMDDHHMMSS.h5
            parts = name.replace('.h5', '').split('_')
            ts_str = parts[-1]  # YYYYMMDDHHMMSS
            h5_files[ts_str] = data
            print(f"  Found: {os.path.basename(name)} ({size} bytes, ts={ts_str})")
        
        offset += 512 + ((size + 511) // 512) * 512
    
    return h5_files

def h5_to_png(h5_data, timestamp_str):
    """Convert HDF5 radar data to a PNG image with official MF palette."""
    # Write to temp file (h5py needs a file)
    tmp_path = os.path.join(OUTPUT_DIR, f'_tmp_{timestamp_str}.h5')
    with open(tmp_path, 'wb') as f:
        f.write(h5_data)
    
    try:
        with h5py.File(tmp_path, 'r') as f:
            # Read the radar data grid
            data = f['dataset1/data1/data'][()]  # 3472x3472 uint16
            
            # Read scaling attributes
            what = f['dataset1/data1/what']
            gain = what.attrs.get('gain', 0.01)
            offset_val = what.attrs.get('offset', 0.0)
            nodata = what.attrs.get('nodata', 65535.0)
            undetect = what.attrs.get('undetect', 65534.0)
            
            # Read geographic info
            where = f['where']
            xsize = int(where.attrs.get('xsize', 3472))
            ysize = int(where.attrs.get('ysize', 3472))
            
            # Get corner coordinates for the manifest
            bounds = {
                'UL_lat': float(where.attrs.get('UL_lat', 53.67)),
                'UL_lon': float(where.attrs.get('UL_lon', -9.965)),
                'UR_lat': float(where.attrs.get('UR_lat', 52.55)),
                'UR_lon': float(where.attrs.get('UR_lon', 17.56)),
                'LL_lat': float(where.attrs.get('LL_lat', 38.14)),
                'LL_lon': float(where.attrs.get('LL_lon', -6.72)),
                'LR_lat': float(where.attrs.get('LR_lat', 37.46)),
                'LR_lon': float(where.attrs.get('LR_lon', 11.98)),
            }
        
        # Mask invalid pixels FIRST (before any conversion)
        mask_nodata = (data == int(nodata))
        mask_undetect = (data == int(undetect))
        mask_invalid = mask_nodata | mask_undetect
        
        # Zero out invalid values before conversion to prevent contamination during averaging
        clean_data = data.astype(np.float64)
        clean_data[mask_invalid] = 0.0
        
        # Convert raw values to mm (accumulated over 5 min)
        # ACRR = Accumulated Rainfall Rate:  raw * gain + offset = mm in 5 min
        mm_accum = clean_data * gain + offset_val
        mm_accum[mask_invalid] = 0.0  # ensure offset doesn't affect invalid pixels
        
        # Convert to mm/h (multiply by 12 since 5 min accumulation)
        mmh_data = mm_accum * 12.0
        
        # Downscale 2x for better resolution: 3472 -> 1736
        # This gives ~1km resolution, very close to native
        scale = 2
        h_new = ysize // scale
        w_new = xsize // scale
        mmh_small = mmh_data[:h_new*scale, :w_new*scale].reshape(h_new, scale, w_new, scale).mean(axis=(1,3))
        # For the mask, use .all() so we only mask if ALL sub-pixels are invalid
        mask_small = mask_invalid[:h_new*scale, :w_new*scale].reshape(h_new, scale, w_new, scale).all(axis=(1,3))
        
        # Create RGBA image
        img = np.zeros((h_new, w_new, 4), dtype=np.uint8)
        
        # Vectorized coloring using the MF palette
        for min_v, max_v, r, g, b, a in RAIN_PALETTE:
            mask_range = (mmh_small >= min_v) & (mmh_small < max_v) & ~mask_small
            img[mask_range] = [r, g, b, a]
        
        # Set nodata/undetect to transparent
        img[mask_small] = [0, 0, 0, 0]
        
        # Save PNG
        pil_img = Image.fromarray(img, 'RGBA')
        png_filename = f'radar_{timestamp_str}.png'
        png_path = os.path.join(OUTPUT_DIR, png_filename)
        pil_img.save(png_path, optimize=True)
        
        file_size = os.path.getsize(png_path)
        
        # Stats for debugging
        valid_mask = ~mask_small & (mmh_small > 0.1)
        num_rain_px = np.sum(valid_mask)
        max_mmh = np.max(mmh_small[~mask_small]) if np.any(~mask_small) else 0
        print(f"  Generated: {png_filename} ({pil_img.size[0]}x{pil_img.size[1]}, {file_size//1024}KB, rain_px={num_rain_px}, max={max_mmh:.1f}mm/h)")
        
        return {
            'filename': png_filename,
            'timestamp': timestamp_str,
            'bounds': bounds,
            'size': [w_new, h_new],
        }
    
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def update_manifest(new_frames):
    """Update the manifest.json with new frames, keeping max MAX_FRAMES."""
    existing_frames = []
    if os.path.exists(MANIFEST_FILE):
        try:
            with open(MANIFEST_FILE, 'r') as f:
                manifest = json.load(f)
                existing_frames = manifest.get('frames', [])
        except:
            pass
    
    # Merge: add new frames, deduplicate by timestamp
    all_frames = {f['timestamp']: f for f in existing_frames}
    for frame in new_frames:
        all_frames[frame['timestamp']] = frame
    
    # Sort by timestamp and keep only latest MAX_FRAMES
    sorted_frames = sorted(all_frames.values(), key=lambda x: x['timestamp'])
    
    # Remove old frames (files + entries)
    if len(sorted_frames) > MAX_FRAMES:
        to_remove = sorted_frames[:-MAX_FRAMES]
        for old_frame in to_remove:
            old_path = os.path.join(OUTPUT_DIR, old_frame['filename'])
            if os.path.exists(old_path):
                os.remove(old_path)
                print(f"  Cleaned: {old_frame['filename']}")
        sorted_frames = sorted_frames[-MAX_FRAMES:]
    
    # Use bounds from latest frame (they're all the same)
    bounds = sorted_frames[-1]['bounds'] if sorted_frames else {}
    
    manifest = {
        'generated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'source': 'Météo-France DPPaquetRadar/v1',
        'projection': 'stere',
        'bounds': bounds,
        # Leaflet ImageOverlay needs [[south, west], [north, east]]
        'leaflet_bounds': [
            [bounds.get('LL_lat', 38.14), bounds.get('UL_lon', -9.965)],
            [bounds.get('UL_lat', 53.67), bounds.get('UR_lon', 17.56)]
        ] if bounds else [],
        'frame_count': len(sorted_frames),
        'frames': sorted_frames,
    }
    
    with open(MANIFEST_FILE, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"  Manifest updated: {len(sorted_frames)} frames")

def main():
    print("=" * 60)
    print("Météo-France Radar Processor")
    print("=" * 60)
    
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Step 1: Download
    package = download_radar_package()
    if not package:
        print("FAILED: Could not download radar package")
        sys.exit(1)
    
    # Step 2: Extract HDF5 files
    h5_files = extract_h5_files(package)
    if not h5_files:
        print("FAILED: No HDF5 files found in package")
        sys.exit(1)
    
    # Step 3: Convert to PNG images
    print("[3/4] Converting HDF5 to PNG images...")
    new_frames = []
    for ts_str, h5_data in sorted(h5_files.items()):
        # Skip if already exists
        png_path = os.path.join(OUTPUT_DIR, f'radar_{ts_str}.png')
        if os.path.exists(png_path):
            print(f"  Skipping (exists): radar_{ts_str}.png")
            # Still add to frames list
            # Read bounds from existing manifest
            existing_manifest = {}
            if os.path.exists(MANIFEST_FILE):
                with open(MANIFEST_FILE) as f:
                    existing_manifest = json.load(f)
            existing_frame = next((fr for fr in existing_manifest.get('frames', []) if fr['timestamp'] == ts_str), None)
            if existing_frame:
                new_frames.append(existing_frame)
            continue
        
        frame_info = h5_to_png(h5_data, ts_str)
        if frame_info:
            new_frames.append(frame_info)
    
    # Step 4: Update manifest
    print("[4/4] Updating manifest...")
    update_manifest(new_frames)
    
    print("\n[OK] Done! Radar images ready in public/radar-mf/")
    print(f"   Manifest: {MANIFEST_FILE}")

if __name__ == '__main__':
    main()
