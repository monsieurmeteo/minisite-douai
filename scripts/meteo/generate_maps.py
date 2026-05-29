"""
Génère les cartes PNG par modèle, zone, paramètre et échéance.
Style proche Meteociel : fond relief baked-in, palettes pros, isohypses géopotentiel,
info du run en bas de carte, barre de couleur.
"""
import sys
import logging
import warnings
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.ticker as mticker
from matplotlib.colors import LinearSegmentedColormap, BoundaryNorm
from matplotlib.patches import FancyBboxPatch
import matplotlib.patheffects as pe
from pathlib import Path
from datetime import datetime, timezone, timedelta

warnings.filterwarnings('ignore')

try:
    import cartopy.crs as ccrs
    import cartopy.feature as cfeature
    from cartopy.mpl.gridliner import LONGITUDE_FORMATTER, LATITUDE_FORMATTER
    HAS_CARTOPY = True
except ImportError:
    HAS_CARTOPY = False
    print("WARNING: pip install cartopy")

try:
    from scipy.ndimage import gaussian_filter
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

from config import ZONES, ACTIVE_ZONES, PARAMETERS, ACTIVE_PARAMETERS, MODELS

logging.basicConfig(level=logging.INFO, format='%(asctime)s [MAPS] %(message)s')
log = logging.getLogger('maps')

OUTPUT_DIR = Path('data/output')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ─── PALETTES DE COULEURS ── style météorologique professionnel ───────────────
def make_cmap(colors_list):
    return LinearSegmentedColormap.from_list('', colors_list)


CMAPS = {
    # Température : bleu profond → cyan → vert → jaune → orange → rouge foncé
    'temp': make_cmap([
        '#440055', '#660099', '#000088', '#0000cc', '#0033ff', '#0088ff', '#00ccff',
        '#00ffff', '#88ffff', '#00ff00', '#77ff00', '#bbff00', '#ffff00', '#ffcc00',
        '#ff9900', '#ff6600', '#ff0000', '#cc0000', '#990000', '#660000', '#440000',
        '#880088', '#cc00cc', '#ff00ff'
    ]),
    # Vent / Rafales : blanc → vert clair → vert → jaune → orange → rouge → violet
    'wind': make_cmap([
        '#ffffff', '#e8fce8', '#99ee99', '#44cc44', '#00aa00',
        '#ffff44', '#ffcc00', '#ff8800', '#ff4400', '#cc0000',
        '#880033', '#550055', '#220033',
    ]),
    # Précipitations : transparent → bleu pâle → bleu → violet → magenta
    'precip': make_cmap([
        '#ffffff00', '#d4f0ff', '#99d4ff', '#4499ff', '#0044ff',
        '#0000cc', '#5500cc', '#aa00cc', '#ff00aa', '#ff0055',
        '#aa0000',
    ]),
    # Pression : bleu profond → blanc → rouge foncé
    'pressure': make_cmap([
        '#00007f', '#0000ff', '#4488ff', '#aaddff',
        '#ffffff',
        '#ffddaa', '#ff8844', '#ff2200', '#880000',
    ]),
    # Géopotentiel 500hPa : violet → bleu → vert → jaune → rouge (centres d'action)
    'geopotential': make_cmap([
        '#330088', '#0000dd', '#0066ff', '#00aaff',
        '#00ddcc', '#00cc66', '#88dd00',
        '#ffff00', '#ffcc00', '#ff8800',
        '#ff4400', '#cc0000', '#660000',
    ]),
    # Nébulosité : transparent → gris clair → gris moyen → gris foncé
    'clouds': make_cmap([
        '#ffffff00', '#f0f0f088', '#d0d0d0aa',
        '#b0b0b0bb', '#909090cc', '#606060dd',
        '#404040ee',
    ]),
    # CAPE : transparent → jaune → orange → rouge → violet
    'cape': make_cmap([
        '#ffffff00', '#ffff8888', '#ffff00', '#ffcc00',
        '#ff8800', '#ff4400', '#ff0000',
        '#cc0066', '#880099', '#440066',
    ]),
    # Humidité : beige sec → vert → bleu profond
    'humidity': make_cmap([
        '#fff8e8', '#ffe0a0', '#ffcc44', '#aadd66',
        '#44cc44', '#0099cc', '#0044cc', '#001188',
    ]),
    # Neige : transparent → bleu très clair → bleu → bleu profond → violet
    'snow': make_cmap([
        '#ffffff00', '#e8f4ff', '#aadcff',
        '#66aaff', '#3366ff', '#0000cc',
        '#440099', '#220055',
    ]),
}


# ─── FOND DE CARTE STYLE METEOCIEL ────────────────────────────────────────────
def add_basemap(ax, zone_key):
    """Ajoute fond et habillage géographique style météo professionnel."""
    if not HAS_CARTOPY:
        return

    # Fond océan / terre en couleurs neutres
    ax.add_feature(cfeature.OCEAN.with_scale('50m'),
                   facecolor='#c8dff2', zorder=0)
    ax.add_feature(cfeature.LAND.with_scale('50m'),
                   facecolor='#e8e0d8', zorder=0)

    # Relief — ombrage hillshade via Natural Earth
    ax.add_feature(cfeature.NaturalEarthFeature(
        'physical', 'land', '50m',
        facecolor=cfeature.COLORS['land'],
    ), zorder=0)

    # Lacs
    ax.add_feature(cfeature.LAKES.with_scale('50m'),
                   facecolor='#b8d4e8', edgecolor='#888', linewidth=0.3, zorder=1)

    # Rivières pour zoom régional
    if zone_key == 'hauts-de-france':
        ax.add_feature(cfeature.RIVERS.with_scale('10m'),
                       edgecolor='#7ab0cc', linewidth=0.5, zorder=1)
    elif zone_key == 'france':
        ax.add_feature(cfeature.RIVERS.with_scale('50m'),
                       edgecolor='#7ab0cc', linewidth=0.3, zorder=1)

    # Côtes
    scale = '10m' if zone_key == 'hauts-de-france' else '50m'
    ax.add_feature(cfeature.COASTLINE.with_scale(scale),
                   linewidth=0.8, edgecolor='#445566', zorder=6)

    # Frontières nationales
    ax.add_feature(cfeature.BORDERS.with_scale(scale),
                   linewidth=1.0, edgecolor='#334455', zorder=6)

    # Frontières régionales / départements
    if zone_key in ('france', 'hauts-de-france'):
        ax.add_feature(cfeature.NaturalEarthFeature(
            'cultural', 'admin_1_states_provinces_lines', '10m',
            facecolor='none', edgecolor='#77889966', linewidth=0.5,
        ), zorder=6)


def add_gridlines(ax, zone_key):
    """Ajoute graticule de coordonnées."""
    if not HAS_CARTOPY:
        return
    gl = ax.gridlines(draw_labels=True, linewidth=0.3, color='#aaaaaa',
                      alpha=0.6, linestyle='--', zorder=7)
    gl.top_labels   = False
    gl.right_labels = False
    gl.xlabel_style = {'size': 7, 'color': '#444444'}
    gl.ylabel_style = {'size': 7, 'color': '#444444'}
    step = 1 if zone_key == 'hauts-de-france' else (2 if zone_key == 'france' else 5)
    gl.xlocator = mticker.MultipleLocator(step)
    gl.ylocator = mticker.MultipleLocator(step)


def add_run_info(fig, ax, model_key, run_date, run_hour, step, param_key):
    """Bande d'info en bas de carte : modèle, run, échéance, source."""
    model  = MODELS[model_key]
    param  = PARAMETERS[param_key]
    run_dt = datetime.strptime(f"{run_date}{run_hour:02d}", '%Y%m%d%H')
    valid_dt = run_dt + timedelta(hours=step)

    info = (
        f"{model['short']} {model['resolution']} — "
        f"Run {run_dt.strftime('%d/%m/%Y %Hh')} UTC — "
        f"Échéance H+{step:03d} ({valid_dt.strftime('%d/%m %Hh')} UTC) — "
        f"{param['label']} ({param['unit']})"
    )
    fig.text(0.01, 0.005, info,
             fontsize=6, color='#333333', va='bottom',
             path_effects=[pe.withStroke(linewidth=2, foreground='white')])

    # Timestamp de génération
    gen_ts = datetime.now(timezone.utc).strftime('Généré le %d/%m/%Y à %Hh%M UTC')
    fig.text(0.99, 0.005, gen_ts,
             fontsize=5, color='#666666', va='bottom', ha='right',
             path_effects=[pe.withStroke(linewidth=2, foreground='white')])


def add_colorbar(fig, cf, param_key, zone_key):
    """Légende couleur en bas de la carte."""
    param = PARAMETERS[param_key]

    # Position selon la zone
    if zone_key == 'europe':
        cbar_ax = fig.add_axes([0.10, 0.04, 0.80, 0.018])
    elif zone_key == 'hauts-de-france':
        cbar_ax = fig.add_axes([0.10, 0.05, 0.80, 0.022])
    else:
        cbar_ax = fig.add_axes([0.10, 0.045, 0.80, 0.020])

    cb = plt.colorbar(cf, cax=cbar_ax, orientation='horizontal',
                      extend=param.get('extend', 'both'))
    cb.ax.tick_params(labelsize=7)
    # Le label est géré dans add_run_info pour éviter la superposition


# ─── GÉNÉRATION D'UNE CARTE ────────────────────────────────────────────────────
def generate_map(lats, lons, data, param_key, zone_key, output_path,
                 model_key='icon-eu', run_date='20260101', run_hour=0, step=0,
                 u_wind=None, v_wind=None):
    """
    Génère une carte PNG complète style Meteociel avec fond de carte,
    données météo, isohypses si nécessaire, légende et info du run.
    """
    param = PARAMETERS[param_key]
    zone  = ZONES[zone_key]
    lon_min, lon_max, lat_min, lat_max = zone['bounds']

    cmap   = CMAPS.get(param['cmap'], plt.cm.viridis)
    levels = param['levels']
    norm   = BoundaryNorm(levels, cmap.N)

    # Lissage léger pour rendu plus doux
    if HAS_SCIPY and data.shape[0] > 10:
        sigma = 0.8 if zone_key == 'hauts-de-france' else 0.5
        data_smooth = gaussian_filter(data, sigma=sigma)
    else:
        data_smooth = data

    fig = plt.figure(figsize=zone['figsize'], dpi=zone['dpi'])

    if HAS_CARTOPY:
        ax = fig.add_axes([0.0, 0.08, 1.0, 0.90], projection=ccrs.Mercator())
        ax.set_extent([lon_min, lon_max, lat_min, lat_max], crs=ccrs.PlateCarree())

        # 1. Fond de carte
        add_basemap(ax, zone_key)

        # 2. Données météo colorées
        cf = ax.contourf(
            lons, lats, data_smooth,
            levels=levels, cmap=cmap, norm=norm,
            extend=param.get('extend', 'both'),
            transform=ccrs.PlateCarree(),
            alpha=0.82,
            zorder=2,
        )

        # 3. Isohypses / isobares
        if param.get('isobars', False):
            isobar_step = param.get('isobar_step', 5)
            iso_levels  = [l for l in levels if l % isobar_step == 0]
            cs = ax.contour(
                lons, lats, data_smooth,
                levels=iso_levels,
                colors='#222222',
                linewidths=0.7,
                transform=ccrs.PlateCarree(),
                zorder=3,
            )
            if param.get('isobar_label', False) or param_key in ('pressure', 'geopotential'):
                try:
                    ax.clabel(cs, fmt='%d', fontsize=6.5, colors='#111111',
                              inline=True, inline_spacing=3)
                except Exception:
                    pass

        # 4. Flèches de vent (si disponibles et zone petite)
        if u_wind is not None and v_wind is not None and zone_key in ('france', 'hauts-de-france'):
            step_arrow = max(1, lons.shape[1] // 18)
            ax.barbs(
                lons[::step_arrow, ::step_arrow],
                lats[::step_arrow, ::step_arrow],
                u_wind[::step_arrow, ::step_arrow],
                v_wind[::step_arrow, ::step_arrow],
                length=5, linewidth=0.7, color='#222222',
                transform=ccrs.PlateCarree(), zorder=4,
            )

        # 5. Habillage géographique par-dessus les données
        add_basemap(ax, zone_key)   # rappel pour les traits par-dessus les données

        # 6. Graticule
        add_gridlines(ax, zone_key)

    else:
        # Fallback sans cartopy
        ax = fig.add_axes([0.0, 0.10, 1.0, 0.88])
        cf = ax.contourf(lons, lats, data_smooth,
                         levels=levels, cmap=cmap, norm=norm,
                         extend=param.get('extend', 'both'), alpha=0.85)

    # 7. Barre de couleur + info du run
    add_colorbar(fig, cf, param_key, zone_key)
    add_run_info(fig, ax, model_key, run_date, run_hour, step, param_key)

    # Sauvegarde
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(
        str(output_path),
        dpi=zone['dpi'],
        bbox_inches='tight',
        pad_inches=0.02,
        facecolor='#f5f5f5',  # fond gris très clair (pas transparent — self-contained)
        format='png',
    )
    plt.close(fig)


# ─── LECTURE GRIB ECMWF ───────────────────────────────────────────────────────
def read_grib_ecmwf(grib_file, param_key, step):
    import xarray as xr
    param = PARAMETERS[param_key]
    ep    = param['ecmwf_param']
    conv  = param['convert_ecmwf']

    filter_keys = {'step': np.timedelta64(step * 3600, 's')}

    # Géopotentiel sur niveau de pression
    if param.get('ecmwf_levtype') == 'pl':
        filter_keys['typeOfLevel'] = 'isobaricInhPa'
        filter_keys['level']       = param.get('ecmwf_level', 500)

    try:
        if isinstance(ep, list):
            ds_u = xr.open_dataset(grib_file, engine='cfgrib',
                                   backend_kwargs={'filter_by_keys':
                                       {**filter_keys, 'shortName': ep[0]}})
            ds_v = xr.open_dataset(grib_file, engine='cfgrib',
                                   backend_kwargs={'filter_by_keys':
                                       {**filter_keys, 'shortName': ep[1]}})
            u    = ds_u[list(ds_u.data_vars)[0]].values
            v    = ds_v[list(ds_v.data_vars)[0]].values
            lats = ds_u.latitude.values
            lons = ds_u.longitude.values
            data = conv(u, v)
            return lats, lons, data, u, v
        else:
            ds   = xr.open_dataset(grib_file, engine='cfgrib',
                                   backend_kwargs={'filter_by_keys':
                                       {**filter_keys, 'shortName': ep}})
            var  = list(ds.data_vars)[0]
            lats = ds.latitude.values
            lons = ds.longitude.values
            data = conv(ds[var].values)
            return lats, lons, np.where(np.isfinite(data), data, np.nan), None, None
    except Exception as e:
        log.debug(f"  Lecture {param_key} H+{step}: {e}")
        return None, None, None, None, None


# ─── TRAITEMENT COMPLET ECMWF ─────────────────────────────────────────────────
def process_ecmwf(grib_file, run_date, run_hour):
    from config import MODELS
    steps = MODELS['ecmwf']['steps']
    total = 0

    for step in steps:
        log.info(f"  ECMWF H+{step:03d} ({len(ACTIVE_PARAMETERS)} params × {len(ACTIVE_ZONES)} zones)")
        for param_key in ACTIVE_PARAMETERS:
            lats, lons, data, u, v = read_grib_ecmwf(grib_file, param_key, step)
            if data is None:
                continue
            for zone_key in ACTIVE_ZONES:
                zone = ZONES[zone_key]
                lon_min, lon_max, lat_min, lat_max = zone['bounds']
                lon_m = (lons >= lon_min) & (lons <= lon_max)
                lat_m = (lats >= lat_min) & (lats <= lat_max)
                lats_c   = lats[lat_m]
                lons_c   = lons[lon_m]
                data_c   = data[np.ix_(lat_m, lon_m)]
                lons_2d, lats_2d = np.meshgrid(lons_c, lats_c)
                u_c = u[np.ix_(lat_m, lon_m)] if u is not None else None
                v_c = v[np.ix_(lat_m, lon_m)] if v is not None else None

                out = (OUTPUT_DIR / 'ecmwf' / zone_key / param_key /
                       f'{run_date}_{run_hour:02d}h' / f'H+{step:03d}.png')
                generate_map(lats_2d, lons_2d, data_c, param_key, zone_key, out,
                             'ecmwf', run_date, run_hour, step, u_c, v_c)
                total += 1

    log.info(f"✅ ECMWF : {total} cartes générées")
    return total


# ─── TRAITEMENT COMPLET ICON-EU ───────────────────────────────────────────────
def process_icon(run_dir, run_date, run_hour):
    import xarray as xr
    run_dir = Path(run_dir)
    steps   = MODELS['icon-eu']['steps']
    total   = 0

    for step in steps:
        log.info(f"  ICON-EU H+{step:03d}")
        for param_key in ACTIVE_PARAMETERS:
            ip   = PARAMETERS[param_key].get('icon_param')
            conv = PARAMETERS[param_key]['convert_icon']
            if not ip:
                continue
            try:
                u_data = v_data = None
                if isinstance(ip, list):
                    f_u = run_dir / f'{ip[0]}_{step:03d}.grib2'
                    f_v = run_dir / f'{ip[1]}_{step:03d}.grib2'
                    if not f_u.exists() or not f_v.exists():
                        continue
                    ds_u = xr.open_dataset(str(f_u), engine='cfgrib')
                    ds_v = xr.open_dataset(str(f_v), engine='cfgrib')
                    u_raw  = ds_u[list(ds_u.data_vars)[0]].values
                    v_raw  = ds_v[list(ds_v.data_vars)[0]].values
                    lats   = ds_u.latitude.values
                    lons   = ds_u.longitude.values
                    data   = conv(u_raw, v_raw)
                    u_data = u_raw
                    v_data = v_raw
                else:
                    f = run_dir / f'{ip}_{step:03d}.grib2'
                    if not f.exists():
                        continue
                    ds   = xr.open_dataset(str(f), engine='cfgrib')
                    var  = list(ds.data_vars)[0]
                    lats = ds.latitude.values
                    lons = ds.longitude.values
                    data = conv(ds[var].values)

                data = np.where(np.isfinite(data), data, np.nan)

                for zone_key in ACTIVE_ZONES:
                    zone = ZONES[zone_key]
                    lon_min, lon_max, lat_min, lat_max = zone['bounds']
                    lon_m = (lons >= lon_min) & (lons <= lon_max)
                    lat_m = (lats >= lat_min) & (lats <= lat_max)
                    if not lon_m.any() or not lat_m.any():
                        continue
                    lats_c   = lats[lat_m]
                    lons_c   = lons[lon_m]
                    data_c   = data[np.ix_(lat_m, lon_m)]
                    lons_2d, lats_2d = np.meshgrid(lons_c, lats_c)
                    u_c = u_data[np.ix_(lat_m, lon_m)] if u_data is not None else None
                    v_c = v_data[np.ix_(lat_m, lon_m)] if v_data is not None else None

                    out = (OUTPUT_DIR / 'icon-eu' / zone_key / param_key /
                           f'{run_date}_{run_hour:02d}h' / f'H+{step:03d}.png')
                    generate_map(lats_2d, lons_2d, data_c, param_key, zone_key, out,
                                 'icon-eu', run_date, run_hour, step, u_c, v_c)
                    total += 1
            except Exception as e:
                log.warning(f"  {param_key} H+{step:03d} : {e}")
                continue

    log.info(f"✅ ICON-EU : {total} cartes générées")
    return total



# ─── TRAITEMENT COMPLET AROME ─────────────────────────────────────────────────
def process_arome(run_dir, run_date, run_hour):
    import xarray as xr
    run_dir = Path(run_dir)
    steps   = MODELS['arome']['steps']
    total   = 0

    # Mapping param_key → nom de fichier AROME (voir fetch_arome.py)
    AROME_FILE = {
        'temperature': ('{pk}_{step:03d}.grib2', None),
        'wind_speed':  ('{pk}_U_{step:03d}.grib2', '{pk}_V_{step:03d}.grib2'),
        'wind_gusts':  ('{pk}_{step:03d}.grib2', None),
        'precipitation': ('{pk}_{step:03d}.grib2', None),
        'pressure':    ('{pk}_{step:03d}.grib2', None),
        'clouds':      ('{pk}_{step:03d}.grib2', None),
        'humidity':    ('{pk}_{step:03d}.grib2', None),
        'cape':        ('{pk}_{step:03d}.grib2', None),
        'snow':        ('{pk}_{step:03d}.grib2', None),
    }

    for step in steps:
        log.info(f"  AROME H+{step:03d}")
        for param_key in ACTIVE_PARAMETERS:
            conv = PARAMETERS[param_key].get('convert_icon', lambda x: x)
            file_tpl = AROME_FILE.get(param_key)
            if not file_tpl:
                continue
            try:
                u_data = v_data = None
                fname_u, fname_v = file_tpl
                fname_u = fname_u.format(pk=param_key, step=step)

                if fname_v:
                    fname_v = fname_v.format(pk=param_key, step=step)
                    f_u = run_dir / fname_u
                    f_v = run_dir / fname_v
                    if not f_u.exists() or not f_v.exists():
                        continue
                    ds_u = xr.open_dataset(str(f_u), engine='cfgrib')
                    ds_v = xr.open_dataset(str(f_v), engine='cfgrib')
                    u_raw = ds_u[list(ds_u.data_vars)[0]].values
                    v_raw = ds_v[list(ds_v.data_vars)[0]].values
                    lats  = ds_u.latitude.values
                    lons  = ds_u.longitude.values
                    data  = conv(u_raw, v_raw)
                    u_data = u_raw
                    v_data = v_raw
                else:
                    f = run_dir / fname_u
                    if not f.exists():
                        continue
                    ds   = xr.open_dataset(str(f), engine='cfgrib')
                    var  = list(ds.data_vars)[0]
                    lats = ds.latitude.values
                    lons = ds.longitude.values
                    data = conv(ds[var].values)

                data = np.where(np.isfinite(data), data, np.nan)

                for zone_key in ACTIVE_ZONES:
                    zone = ZONES[zone_key]
                    lon_min, lon_max, lat_min, lat_max = zone['bounds']
                    lon_m = (lons >= lon_min) & (lons <= lon_max)
                    lat_m = (lats >= lat_min) & (lats <= lat_max)
                    if not lon_m.any() or not lat_m.any():
                        continue
                    lats_c = lats[lat_m]
                    lons_c = lons[lon_m]
                    data_c = data[np.ix_(lat_m, lon_m)]
                    lons_2d, lats_2d = np.meshgrid(lons_c, lats_c)
                    u_c = u_data[np.ix_(lat_m, lon_m)] if u_data is not None else None
                    v_c = v_data[np.ix_(lat_m, lon_m)] if v_data is not None else None

                    out = (OUTPUT_DIR / 'arome' / zone_key / param_key /
                           f'{run_date}_{run_hour:02d}h' / f'H+{step:03d}.png')
                    generate_map(lats_2d, lons_2d, data_c, param_key, zone_key, out,
                                 'arome', run_date, run_hour, step, u_c, v_c)
                    total += 1

            except Exception as e:
                log.warning(f"  {param_key} H+{step:03d} : {e}")
                continue

    log.info(f"AROME : {total} cartes generees")
    return total


if __name__ == '__main__':
    mode     = sys.argv[1] if len(sys.argv) > 1 else 'icon'
    grib_arg = sys.argv[2] if len(sys.argv) > 2 else ''
    run_date = sys.argv[3] if len(sys.argv) > 3 else '20260529'
    run_hour = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    if mode == 'ecmwf':
        process_ecmwf(grib_arg, run_date, run_hour)
    elif mode == 'arome':
        process_arome(grib_arg, run_date, run_hour)
    else:
        process_icon(grib_arg, run_date, run_hour)

