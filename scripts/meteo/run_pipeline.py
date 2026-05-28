"""
Orchestrateur principal du pipeline météo.
Lance fetch + generation + upload + cleanup pour chaque modèle actif.
Usage : python run_pipeline.py [ecmwf|icon-eu|all]
"""
import sys
import time
import logging
from datetime import datetime, timezone
from pathlib import Path

from config import MODELS, ACTIVE_PARAMETERS, ACTIVE_ZONES

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [PIPELINE] %(levelname)s %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('pipeline.log', encoding='utf-8'),
    ]
)
log = logging.getLogger('pipeline')


def run_ecmwf():
    from fetch_ecmwf   import fetch_ecmwf
    from generate_maps import process_ecmwf
    from upload_supabase import upload_model_run, update_metadata

    log.info("=" * 60)
    log.info("DÉMARRAGE ECMWF")
    t0 = time.time()

    grib_file, run_date, run_hour = fetch_ecmwf()
    process_ecmwf(grib_file, run_date, run_hour)
    upload_model_run('ecmwf', run_date, run_hour)
    update_metadata('ecmwf', run_date, run_hour, MODELS['ecmwf']['steps'])

    log.info(f"✅ ECMWF terminé en {(time.time()-t0)/60:.1f} min")


def run_icon():
    from fetch_icon    import fetch_icon
    from generate_maps import process_icon
    from upload_supabase import upload_model_run, update_metadata

    log.info("=" * 60)
    log.info("DÉMARRAGE ICON-EU")
    t0 = time.time()

    run_dir, run_date, run_hour = fetch_icon()
    process_icon(run_dir, run_date, run_hour)
    upload_model_run('icon-eu', run_date, run_hour)
    update_metadata('icon-eu', run_date, run_hour, MODELS['icon-eu']['steps'])

    log.info(f"✅ ICON-EU terminé en {(time.time()-t0)/60:.1f} min")


def run_cleanup():
    from cleanup_supabase import cleanup_old_files
    log.info("=" * 60)
    log.info("NETTOYAGE SUPABASE (>48h)")
    deleted = cleanup_old_files()
    log.info(f"✅ {deleted} fichiers supprimés")


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else 'all'
    log.info(f"Pipeline démarré — {datetime.now(timezone.utc).isoformat()} UTC")
    log.info(f"Zones actives : {ACTIVE_ZONES}")
    log.info(f"Paramètres actifs : {ACTIVE_PARAMETERS}")

    errors = []

    if target in ('ecmwf', 'all') and MODELS['ecmwf']['enabled']:
        try:
            run_ecmwf()
        except Exception as e:
            log.error(f"❌ ECMWF échoué : {e}")
            errors.append(f"ecmwf: {e}")

    if target in ('icon-eu', 'icon', 'all') and MODELS['icon-eu']['enabled']:
        try:
            run_icon()
        except Exception as e:
            log.error(f"❌ ICON-EU échoué : {e}")
            errors.append(f"icon-eu: {e}")

    # Nettoyage systématique après chaque run
    try:
        run_cleanup()
    except Exception as e:
        log.error(f"❌ Cleanup échoué : {e}")

    if errors:
        log.error(f"Pipeline terminé avec erreurs : {errors}")
        sys.exit(1)
    else:
        log.info("✅ Pipeline complet terminé avec succès")


if __name__ == '__main__':
    main()
