"""
Supprime de Supabase Storage les fichiers de plus de 48h.
Lance apres chaque upload pour garder l'espace sous controle.
"""
import logging
from datetime import datetime, timezone, timedelta

try:
    from supabase import create_client
except ImportError:
    import sys; sys.exit(1)

from config import BUCKET_NAME, SUPABASE_URL, SUPABASE_KEY, ARCHIVE_HOURS

logging.basicConfig(level=logging.INFO, format='%(asctime)s [CLEANUP] %(message)s')
log = logging.getLogger('cleanup')


def cleanup_old_files():
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.warning("Variables Supabase manquantes, cleanup ignore")
        return 0

    client  = create_client(SUPABASE_URL, SUPABASE_KEY)
    cutoff  = datetime.now(timezone.utc) - timedelta(hours=ARCHIVE_HOURS)
    deleted = 0

    models = ['ecmwf', 'icon-eu', 'arome', 'arpege']

    for model in models:
        try:
            zones = client.storage.from_(BUCKET_NAME).list(model) or []
        except Exception:
            continue

        for zone_item in zones:
            zone = zone_item['name']
            try:
                params = client.storage.from_(BUCKET_NAME).list(f'{model}/{zone}') or []
            except Exception:
                continue

            for param_item in params:
                param  = param_item['name']
                prefix = f'{model}/{zone}/{param}'
                try:
                    runs = client.storage.from_(BUCKET_NAME).list(prefix) or []
                except Exception:
                    continue

                for run_item in runs:
                    run_name = run_item['name']
                    try:
                        date_part, hour_part = run_name.split('_')
                        run_hour = int(hour_part.replace('h', ''))
                        run_dt = datetime.strptime(
                            f"{date_part} {run_hour:02d}", '%Y%m%d %H'
                        ).replace(tzinfo=timezone.utc)
                    except Exception:
                        continue

                    if run_dt < cutoff:
                        run_prefix = f'{prefix}/{run_name}'
                        try:
                            files = client.storage.from_(BUCKET_NAME).list(run_prefix) or []
                            paths = [f'{run_prefix}/{f["name"]}' for f in files]
                            for i in range(0, len(paths), 100):
                                batch = paths[i:i+100]
                                client.storage.from_(BUCKET_NAME).remove(batch)
                                deleted += len(batch)
                        except Exception as e:
                            log.warning(f"Erreur suppression {run_prefix}: {e}")

    log.info(f"Nettoyage termine : {deleted} fichiers supprimes (>{ARCHIVE_HOURS}h)")
    return deleted


if __name__ == '__main__':
    cleanup_old_files()
