import h5py
import numpy as np
import sys
import os
import json

radar_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tmp_radar')
h5_files = [f for f in os.listdir(radar_dir) if f.endswith('.h5') and 'IPRN20' in f]

if not h5_files:
    print("No IPRN20 H5 files found")
    sys.exit(1)

h5_file = os.path.join(radar_dir, sorted(h5_files)[0])
print(f"Analyzing: {os.path.basename(h5_file)}")

with h5py.File(h5_file, 'r') as f:
    print("\n=== ROOT ATTRIBUTES ===")
    for key in f.attrs:
        val = f.attrs[key]
        if isinstance(val, bytes):
            val = val.decode('utf-8', errors='replace')
        print(f"  {key} = {val}")
    
    print("\n=== FILE STRUCTURE ===")
    def visit(name, obj):
        indent = "  " * name.count('/')
        if isinstance(obj, h5py.Group):
            print(f"{indent}GROUP: /{name}")
            for k in obj.attrs:
                v = obj.attrs[k]
                if isinstance(v, bytes):
                    v = v.decode('utf-8', errors='replace')
                elif isinstance(v, np.ndarray):
                    v = v.tolist()
                print(f"{indent}  ATTR: {k} = {str(v)[:150]}")
        elif isinstance(obj, h5py.Dataset):
            print(f"{indent}DATASET: /{name}  shape={obj.shape}  dtype={obj.dtype}")
            for k in obj.attrs:
                v = obj.attrs[k]
                if isinstance(v, bytes):
                    v = v.decode('utf-8', errors='replace')
                elif isinstance(v, np.ndarray):
                    v = v.tolist()
                print(f"{indent}  ATTR: {k} = {str(v)[:150]}")
            # Show sample data for small or large datasets
            if len(obj.shape) > 0:
                data = obj[()]
                if data.size > 0:
                    flat = data.flatten()
                    print(f"{indent}  SAMPLE: {flat[:10].tolist()}")
                    print(f"{indent}  MIN={np.nanmin(data):.4f}  MAX={np.nanmax(data):.4f}  MEAN={np.nanmean(data):.4f}")
    
    f.visititems(visit)
