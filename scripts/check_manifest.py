import urllib.request, json, datetime

url = 'https://ubdevaemtwbzxksjlhjg.supabase.co/storage/v1/object/public/radar-mf/manifest.json'
try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read().decode())
        print(f"Update: {data.get('generated_at')}")
        print(f"Frames: {data.get('frame_count')}")
        if data.get('frames'):
            print(f"Last Frame: {data['frames'][-1]['timestamp']}")
except Exception as e:
    print(f"Error: {e}")
