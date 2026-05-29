"""
Upload les PNG generes vers Supabase Storage.
Met a jour metadata.json avec la liste des runs disponibles.
"""
import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

try:
    from supabase import create_client
except ImportError:
    print("ERROR: pip install supabase")
    sys.exit(1)

from config import (
    BUCKET_NAME, SUPABASE_URL, SUPABASE_KEY,
    storage_path, ACTIVE_ZONES, ACTIVE_PARAMETERS
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s [UPLOAD] %(message)s')
log = logging.getLogger('upload')

OUTPUT_DIR = Path('data/output')


def get_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Variables SUPABASE_URL et SUPABASE_KEY manquantes")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def upload_file(client, local_path, remote_path):
    with open(local_path, 'rb') as f:
        data = f.read()
    opts = {'content-type': 'image/png', 'cache-control': '3600', 'upsert': 'true'}
    try:
        client.storage.from_(BUCKET_NAME).upload(path=remote_path, file=data, file_options=opts)
        return True
    except Exception:
        try:
            client.storage.from_(BUCKET_NAME).update(
                path=remote_path, file=data,
                file_options={'content-type': 'image/png', 'upsert': 'true'}
            )
            return True
        except Exception as e:
            log.error(f"Erreur upload {remote_path}: {e}")
            return False


def upload_model_run(model, run_date, run_hour):
    client = get_client()
    run_dir = OUTPUT_DIR / model
    uploaded = failed = 0

    for zone_key in ACTIVE_ZONES:
        for param_key in ACTIVE_PARAMETERS:
            param_dir = run_dir / zone_key / param_key / f'{run_date}_{run_hour:02d}h'
            if not param_dir.exists():
                continue
            for png_file in sorted(param_dir.glob('H+*.png')):
                step = int(png_file.stem.replace('H+', ''))
                remote = storage_path(model, zone_key, param_key, run_date, run_hour, step)
                if upload_file(client, str(png_file), remote):
                    uploaded += 1
                else:
                    failed += 1

    log.info(f"Upload {model} {run_date}_{run_hour:02d}h : {uploaded} OK, {failed} erreurs")
    return uploaded, failed


def update_metadata(model, run_date, run_hour, steps_available):
    client = get_client()
    try:
        raw  = client.storage.from_(BUCKET_NAME).download('metadata.json')
        meta = json.loads(raw.decode('utf-8'))
    except Exception:
        meta = {'models': {}, 'last_updated': ''}

    if model not in meta['models']:
        meta['models'][model] = {'runs': []}

    run_info = {
        'date':  run_date,
        'hour':  run_hour,
        'steps': steps_available,
        'zones': ACTIVE_ZONES,
        'params': ACTIVE_PARAMETERS,
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }

    runs = meta['models'][model]['runs']
    idx  = next((i for i, r in enumerate(runs)
                 if r['date'] == run_date and r['hour'] == run_hour), None)
    if idx is not None:
        runs[idx] = run_info
    else:
        runs.append(run_info)

    runs.sort(key=lambda r: (r['date'], r['hour']), reverse=True)
    meta['models'][model]['runs'] = runs[:20]
    meta['last_updated'] = datetime.now(timezone.utc).isoformat()

    meta_bytes = json.dumps(meta, ensure_ascii=False, indent=2).encode('utf-8')
    try:
        client.storage.from_(BUCKET_NAME).update(
            path='metadata.json', file=meta_bytes,
            file_options={'content-type': 'application/json', 'upsert': 'true'}
        )
    except Exception:
        client.storage.from_(BUCKET_NAME).upload(
            path='metadata.json', file=meta_bytes,
            file_options={'content-type': 'application/json', 'upsert': 'true'}
        )
    log.info("metadata.json mis a jour")


if __name__ == '__main__':
    model    = sys.argv[1] if len(sys.argv) > 1 else 'icon-eu'
    run_date = sys.argv[2] if len(sys.argv) > 2 else '20260529'
    run_hour = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    upload_model_run(model, run_date, run_hour)
