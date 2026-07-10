#!/usr/bin/env python3
"""
Télécharge la carte SST (Sea Surface Temperature) depuis Copernicus Marine
et génère une image PNG colorée pour la France + Méditerranée.
Upload vers Supabase Storage.

Authentification : variables d'environnement
  CMEMS_USERNAME / CMEMS_PASSWORD
  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
"""
import os
import sys
import json
import struct
import zlib
import datetime
import urllib.request
import urllib.parse
import http.client

# ─── Config ───────────────────────────────────────────────────────────────────
DATASET_ID   = "SST_MED_PHY_L4_NRT_010_041"   # Méditerranée L4 NRT
DATASET_GLOB = "SST_GLO_PHY_L4_NRT_008_046"   # Atlantique / Manche L4 NRT

# Extent : France + Atlantique + Manche + Méditerranée
LAT_MIN, LAT_MAX = 36.0, 52.0
LON_MIN, LON_MAX = -10.0, 16.0

# Color scale: temp (°C) → (R, G, B)
COLOR_STOPS = [
    (6,  (8,   48,  107)),
    (10, (8,   81,  156)),
    (13, (33,  113, 181)),
    (15, (66,  146, 198)),
    (17, (107, 174, 214)),
    (19, (158, 202, 225)),
    (20, (49,  163,  84)),
    (21, (116, 196,  74)),
    (22, (199, 233,  92)),
    (23, (254, 224,  39)),
    (24, (253, 174,  97)),
    (26, (230,  85,  13)),
    (28, (165,  15,  21)),
    (30, (103,   0,  13)),
]

def temp_to_rgb(t):
    if t is None or t != t:   # NaN check
        return (0, 0, 0, 0)   # transparent
    t = float(t) - 273.15     # Kelvin → Celsius
    stops = COLOR_STOPS
    if t <= stops[0][0]:
        r, g, b = stops[0][1]
        return (r, g, b, 220)
    if t >= stops[-1][0]:
        r, g, b = stops[-1][1]
        return (r, g, b, 220)
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t0 <= t <= t1:
            f = (t - t0) / (t1 - t0)
            r = int(c0[0] + f * (c1[0] - c0[0]))
            g = int(c0[1] + f * (c1[1] - c0[1]))
            b = int(c0[2] + f * (c1[2] - c0[2]))
            return (r, g, b, 210)
    return (128, 128, 128, 180)

# ─── Minimal PNG writer (no numpy/pillow required) ────────────────────────────
def write_png(filename, width, height, rgba_rows):
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)))
        # color type 2 = RGB (we'll use 6 = RGBA)
        # Actually type 6 = RGBA
        f.write(b'\x89PNG\r\n\x1a\n')

    # Use simpler approach: write raw PNG with RGBA
    import array
    signature = b'\x89PNG\r\n\x1a\n'
    
    def make_chunk(tag, data):
        import zlib as z
        length = struct.pack('>I', len(data))
        crc = struct.pack('>I', z.crc32(tag + data) & 0xffffffff)
        return length + tag + data + crc
    
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # 6 = RGBA
    
    raw_rows = []
    for row in rgba_rows:
        raw = bytearray()
        raw.append(0)  # filter type None
        for r, g, b, a in row:
            raw.extend([r, g, b, a])
        raw_rows.append(bytes(raw))
    
    idat_data = zlib.compress(b''.join(raw_rows), 9)
    
    with open(filename, 'wb') as f:
        f.write(signature)
        f.write(make_chunk(b'IHDR', ihdr))
        f.write(make_chunk(b'IDAT', idat_data))
        f.write(make_chunk(b'IEND', b''))

# ─── Download from Copernicus Marine via copernicusmarine toolbox ─────────────
def download_sst_nc(username, password, outfile):
    import subprocess
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)

    # Try global dataset first (covers Atlantic + Manche + Med)
    for dataset_id in [
        "SST_GLO_PHY_L4_NRT_008_046",
        "SST_MED_PHY_L4_NRT_010_041",
    ]:
        print(f"Trying dataset: {dataset_id}")
        cmd = [
            sys.executable, "-m", "copernicusmarine", "subset",
            "--dataset-id", dataset_id,
            "--variable", "analysed_sst",
            "--start-datetime", f"{yesterday}T00:00:00",
            "--end-datetime", f"{yesterday}T23:59:59",
            "--minimum-longitude", str(LON_MIN),
            "--maximum-longitude", str(LON_MAX),
            "--minimum-latitude", str(LAT_MIN),
            "--maximum-latitude", str(LAT_MAX),
            "--output-filename", outfile,
            "--force-download",
            "--username", username,
            "--password", password,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0 and os.path.exists(outfile):
            print(f"✅ Downloaded: {dataset_id}")
            return True
        else:
            print(f"⚠️ Failed {dataset_id}: {result.stderr[:300]}")
    return False

# ─── Convert NetCDF → PNG ─────────────────────────────────────────────────────
def nc_to_png(nc_file, png_file, img_width=1200, img_height=800):
    import struct
    # Use netCDF4 if available, else scipy
    try:
        import netCDF4 as nc
        ds = nc.Dataset(nc_file)
        sst_raw = ds.variables['analysed_sst'][0]  # first time step
        lats = ds.variables['latitude'][:]
        lons = ds.variables['longitude'][:]
        ds.close()
    except ImportError:
        from scipy.io import netcdf_file
        ds = netcdf_file(nc_file, 'r', mmap=False)
        sst_raw = ds.variables['analysed_sst'].data[0]
        lats = ds.variables['latitude'].data
        lons = ds.variables['longitude'].data
        ds.close()

    import numpy as np

    # sst_raw shape: (lat, lon)
    # Flip lat so north is up
    if lats[0] < lats[-1]:
        sst_raw = sst_raw[::-1]
        lats = lats[::-1]

    lat_range = lats[0] - lats[-1]
    lon_range = lons[-1] - lons[0]

    rows = []
    for py in range(img_height):
        lat = lats[0] - (py / img_height) * lat_range
        row = []
        for px in range(img_width):
            lon = lons[0] + (px / img_width) * lon_range
            # Find nearest grid cell
            lat_idx = int((lats[0] - lat) / lat_range * len(lats))
            lon_idx = int((lon - lons[0]) / lon_range * len(lons))
            lat_idx = max(0, min(lat_idx, len(lats) - 1))
            lon_idx = max(0, min(lon_idx, len(lons) - 1))
            val = sst_raw[lat_idx, lon_idx]
            if hasattr(val, 'mask') and val.mask:
                row.append((0, 0, 0, 0))  # transparent (land/no data)
            else:
                row.append(temp_to_rgb(float(val)))
        rows.append(row)

    write_png_rgba(png_file, img_width, img_height, rows)
    print(f"✅ PNG generated: {png_file} ({img_width}x{img_height})")

def write_png_rgba(filename, width, height, rgba_rows):
    """Minimal PNG writer, no external deps."""
    signature = b'\x89PNG\r\n\x1a\n'

    def make_chunk(tag, data):
        crc_val = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc_val)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)

    raw_rows = bytearray()
    for row in rgba_rows:
        raw_rows.append(0)  # filter None
        for r, g, b, a in row:
            raw_rows.extend([r & 0xFF, g & 0xFF, b & 0xFF, a & 0xFF])

    idat_data = zlib.compress(bytes(raw_rows), 6)

    with open(filename, 'wb') as f:
        f.write(signature)
        f.write(make_chunk(b'IHDR', ihdr))
        f.write(make_chunk(b'IDAT', idat_data))
        f.write(make_chunk(b'IEND', b''))

# ─── Upload to Supabase Storage ───────────────────────────────────────────────
def upload_to_supabase(local_file, remote_path, mime_type='image/png'):
    url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not url or not key:
        print("⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping upload")
        return None

    bucket = 'vigilance-captures'
    upload_url = f"{url}/storage/v1/object/{bucket}/{remote_path}"

    with open(local_file, 'rb') as f:
        data = f.read()

    req = urllib.request.Request(
        upload_url,
        data=data,
        method='PUT',
        headers={
            'Authorization': f'Bearer {key}',
            'Content-Type': mime_type,
            'x-upsert': 'true',
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            public_url = f"{url}/storage/v1/object/public/{bucket}/{remote_path}"
            print(f"✅ Uploaded: {public_url}")
            return public_url
    except Exception as e:
        print(f"⚠️  Upload failed: {e}")
        return None

# ─── Also export metadata JSON for the frontend ───────────────────────────────
def export_metadata(png_url, today):
    meta = {
        "url": png_url,
        "date": str(today - datetime.timedelta(days=1)),
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "bounds": {
            "south": LAT_MIN, "north": LAT_MAX,
            "west": LON_MIN,  "east": LON_MAX,
        },
        "source": "Copernicus Marine Service – SST L4 NRT",
        "attribution": "© Copernicus Marine Service"
    }
    meta_path = "/tmp/sst_metadata.json"
    with open(meta_path, 'w') as f:
        json.dump(meta, f)
    upload_to_supabase(meta_path, "sst_metadata.json", "application/json")

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    username = os.environ.get('CMEMS_USERNAME', '')
    password = os.environ.get('CMEMS_PASSWORD', '')

    if not username or not password:
        print("❌ CMEMS_USERNAME / CMEMS_PASSWORD not set")
        sys.exit(1)

    # Install copernicusmarine if needed
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'copernicusmarine', 'netCDF4', 'numpy'], check=False)

    today = datetime.date.today()
    nc_file = f"/tmp/sst_{today}.nc"
    png_file = f"/tmp/sst_france_{today}.png"

    # 1. Download NetCDF from Copernicus Marine
    if not download_sst_nc(username, password, nc_file):
        print("❌ Failed to download SST data")
        sys.exit(1)

    # 2. Convert to PNG
    nc_to_png(nc_file, png_file)

    # 3. Upload PNG to Supabase
    png_url = upload_to_supabase(png_file, "sst_france.png")

    # 4. Export metadata JSON
    if png_url:
        export_metadata(png_url, today)

    print("✅ Done!")

if __name__ == '__main__':
    main()
