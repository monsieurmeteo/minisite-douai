import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';
import '../radar/RadarFrance.css';
import { Play, Square, ChevronRight, Clock, Eye, Moon, CloudRain, Globe, RefreshCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// EUMETSAT EUMETView WMS (sans authentification, 200 OK confirmé)
// Couches réelles vérifiées dans GetCapabilities le 2026-05-28
// ─────────────────────────────────────────────────────────────────────────────
const EUMETSAT_WMS = 'https://view.eumetsat.int/geoserver/wms';

const LAYERS = {
    infrared: { name: 'msg_fes:ir108',                    step: 15, label: 'Infrarouge IR 10.8µm', basemap: 'dark'    },
    visible:  { name: 'msg_fes:vis06',                    step: 15, label: 'Visible VIS 0.6µm',    basemap: 'relief'  },
    natural:  { name: 'mumi:wideareacoverage_rgb_natural', step: 60, label: 'Couleurs naturelles',  basemap: 'relief'  },
    radar:    { name: null,                               step: 10, label: 'Radar précipitations',  basemap: 'dark'    },
};

// Fonds de carte disponibles
const BASEMAPS = {
    dark:    { label: 'Nuit (Recommandé)', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',       labels: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png' },
    relief:  { label: 'Relief / Terrain',   url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', labels: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png' },
    light:   { label: 'Clair',              url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',      labels: null },
};

// Génère une série de timestamps ISO en remontant N frames depuis maintenant
const generateTimestamps = (stepMin, frameCount = 9) => {
    const now = new Date();
    now.setSeconds(0, 0);
    // Aligner sur les intervalles de step minutes
    now.setMinutes(Math.floor(now.getMinutes() / stepMin) * stepMin);

    const frames = [];
    for (let i = frameCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * stepMin * 60 * 1000);
        frames.push({
            time: Math.floor(d.getTime() / 1000),
            iso:  d.toISOString().slice(0, 19) + 'Z',
        });
    }
    return frames;
};

const SatelliteFrance = () => {
    const center = [46.4, 2.5];
    const zoom   = 6;

    const [layerType, setLayerType]     = useState('infrared');
    const [timestamps, setTimestamps]   = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying]     = useState(false);
    const [loading, setLoading]         = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [basemapKey, setBasemapKey]   = useState(null); // null = auto selon couche
    const timerRef = useRef(null);

    // Basemap effective : manuel si défini, sinon auto selon couche
    const effectiveBasemap = basemapKey || LAYERS[layerType]?.basemap || 'dark';
    const basemap = BASEMAPS[effectiveBasemap];

    // ── Chargement des frames ───────────────────────────────────────────────
    const loadFrames = useCallback(() => {
        setLoading(true);
        const cfg = LAYERS[layerType];

        if (layerType === 'radar') {
            // RainViewer radar
            fetch('https://api.rainviewer.com/public/weather-maps.json')
                .then(r => r.json())
                .then(data => {
                    const frames = (data.radar?.past || []).slice(-12).map(f => ({
                        time: f.time,
                        iso:  new Date(f.time * 1000).toISOString().slice(0, 19) + 'Z',
                        path: f.path,
                        host: data.host,
                    }));
                    setTimestamps(frames);
                    setCurrentIndex(Math.max(0, frames.length - 1));
                    setLastRefresh(new Date());
                    setLoading(false);
                    // Attendre 1.5s avant de lancer l'animation pour laisser les tuiles charger
                    setTimeout(() => setIsPlaying(frames.length > 0), 1500);
                })
                .catch(() => { setTimestamps([]); setLoading(false); });
        } else {
            // EUMETSAT WMS animé
            const frames = generateTimestamps(cfg.step, 9);
            setTimestamps(frames);
            setCurrentIndex(Math.max(0, frames.length - 1));
            setLastRefresh(new Date());
            setLoading(false);
            // Attendre 2s avant animation pour que les tuiles de la frame courante chargent
            setTimeout(() => setIsPlaying(true), 2000);
        }
    }, [layerType]);

    useEffect(() => { loadFrames(); }, [loadFrames]);

    // ── Lecteur ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isPlaying || timestamps.length === 0) {
            clearTimeout(timerRef.current);
            return;
        }
        const isLast = currentIndex === timestamps.length - 1;
        // 1000ms par frame pour EUMETSAT (tuiles WMS plus lentes), 600ms pour RainViewer
        const delay = isLast ? 2500 : (layerType === 'radar' ? 600 : 1000);
        timerRef.current = setTimeout(() => {
            setCurrentIndex(p => p >= timestamps.length - 1 ? 0 : p + 1);
        }, delay);
        return () => clearTimeout(timerRef.current);
    }, [isPlaying, currentIndex, timestamps]);

    const currentTs = timestamps[currentIndex];

    const formatTime = ts => {
        if (!ts) return '--:--';
        return new Date(ts.time * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateTime = ts => {
        if (!ts) return '--';
        const d = new Date(ts.time * 1000);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
             + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const cfg = LAYERS[layerType];

    return (
        <div className="radar-container">
            {/* BARRE DE CONTRÔLE */}
            <div className="radar-controls-compact">
                {/* Lecture */}
                <div className="control-section main-player">
                    <button className={`btn-compact ${isPlaying ? 'active' : ''}`}
                        onClick={() => setIsPlaying(true)} title="Lecture"
                        disabled={timestamps.length === 0}>
                        <Play size={16} fill="currentColor" />
                    </button>
                    <button className={`btn-compact ${!isPlaying ? 'active' : ''}`}
                        onClick={() => setIsPlaying(false)} title="Pause">
                        <Square size={16} fill="currentColor" />
                    </button>
                    <div className="step-group">
                        <button className="btn-compact"
                            onClick={() => { setIsPlaying(false); setCurrentIndex(p => (p + 1) % Math.max(1, timestamps.length)); }}
                            disabled={timestamps.length === 0}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="control-divider" />

                {/* Timeline */}
                <div className="control-section timeline" style={{ flex: 1 }}>
                    <div className="time-badge">
                        <Clock size={14} />
                        <span>{formatTime(currentTs)}</span>
                    </div>
                    {timestamps.length > 0 && (
                        <div className="last-update-tag">
                            {formatDateTime(timestamps[timestamps.length - 1])} • {timestamps.length} images
                        </div>
                    )}
                    <input type="range" min="0"
                        max={Math.max(0, timestamps.length - 1)}
                        value={currentIndex}
                        onChange={e => { setCurrentIndex(parseInt(e.target.value)); setIsPlaying(false); }}
                        className="compact-range"
                        disabled={timestamps.length === 0}
                    />
                </div>

                <div className="control-divider" />

                {/* Choix couche */}
                <div className="control-section settings-grid">
                    {[
                        { key: 'infrared', icon: <Moon size={16} />,      label: 'Infrarouge' },
                        { key: 'visible',  icon: <Eye size={16} />,       label: 'Visible'    },
                        { key: 'natural',  icon: <Globe size={16} />,     label: 'Couleurs'   },
                        { key: 'radar',    icon: <CloudRain size={16} />, label: 'Pluie'      },
                    ].map(({ key, icon, label }) => (
                        <button key={key}
                            className={`btn-compact ${layerType === key ? 'active' : ''}`}
                            onClick={() => { setLayerType(key); setBasemapKey(null); }} // reset basemap en auto
                            style={{ width: 'auto', padding: '0 8px', gap: '6px' }}>
                            {icon}
                            <span className="tiny-label" style={{ color: 'inherit' }}>{label}</span>
                        </button>
                    ))}
                    <button className="btn-compact" onClick={loadFrames}
                        style={{ width: 'auto', padding: '0 8px', gap: '6px' }} title="Actualiser">
                        <RefreshCw size={14} />
                    </button>
                    {/* Sélecteur de fond */}
                    <select
                        value={basemapKey || effectiveBasemap}
                        onChange={e => setBasemapKey(e.target.value)}
                        style={{ fontSize: '0.65rem', fontWeight: '700', padding: '3px 6px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#475569', cursor: 'pointer' }}
                        title="Fond de carte"
                    >
                        {Object.entries(BASEMAPS).map(([k, b]) => (
                            <option key={k} value={k}>{b.label}{(!basemapKey && LAYERS[layerType]?.basemap === k) ? ' ★' : ''}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Loader */}
            {loading && (
                <div className="radar-glass-loader">
                    <div className="loader-content">
                        <div className="spinner" />
                        <p>Chargement satellite...</p>
                    </div>
                </div>
            )}

            {/* CARTE */}
            <div className="radar-main-content SINGLE">
                <div className="radar-map-wrapper">
                    <MapContainer center={center} zoom={zoom}
                        style={{ height: '100%', width: '100%', background: '#111' }}
                        minZoom={4} zoomControl={false}>

                        {/* Fond de carte adapté selon le mode */}
                        <TileLayer
                            key={`base-${effectiveBasemap}`}
                            url={basemap.url}
                            attribution="&copy; CARTO / ESRI" />

                        {/* ── EUMETSAT WMS animé : toutes les frames en buffer, on change juste l'opacité ── */}
                        {layerType !== 'radar' && timestamps.map((ts, idx) => {
                            const isCurrent = idx === currentIndex;
                            // Pré-charger ±2 frames autour de la frame courante
                            const isBuffered = Math.abs(idx - currentIndex) <= 2;
                            if (!isBuffered) return null;
                            return (
                                <WMSTileLayer
                                    key={`${layerType}-${ts.time}`}
                                    url={EUMETSAT_WMS}
                                    layers={cfg.name}
                                    styles=""
                                    format="image/png"
                                    transparent={true}
                                    version="1.3.0"
                                    time={ts.iso}
                                    opacity={isCurrent ? 0.88 : 0}
                                    zIndex={isCurrent ? 310 : 300}
                                    attribution="&copy; EUMETSAT"
                                    keepBuffer={4}
                                    updateWhenZooming={false}
                                />
                            );
                        })}

                        {/* Labels et frontières par-dessus le satellite */}
                        {basemap.labels && (
                            <TileLayer
                                url={basemap.labels}
                                zIndex={500}
                                opacity={0.9}
                            />
                        )}

                        {/* ── RADAR RainViewer ── */}
                        {layerType === 'radar' && timestamps.map((ts, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isBuffered = Math.abs(idx - currentIndex) <= 3;
                            if (!isBuffered || !ts.path) return null;
                            return (
                                <TileLayer
                                    key={`rain-${ts.time}`}
                                    url={`${ts.host}${ts.path}/256/{z}/{x}/{y}/2/1_1.png`}
                                    opacity={isCurrent ? 0.82 : 0}
                                    zIndex={isCurrent ? 310 : 300}
                                    maxNativeZoom={7} maxZoom={20} tileSize={256}
                                    updateWhenZooming={false} keepBuffer={4}
                                />
                            );
                        })}
                    </MapContainer>

                    {/* Légende */}
                    <div className="map-legend-compact" style={{ width: 'auto', minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <Eye size={14} />
                            <span className="tiny-label">{cfg.label.toUpperCase()}</span>
                        </div>

                        {layerType === 'infrared' && (
                            <div className="legend-numbers" style={{ display: 'block', lineHeight: '1.8' }}>
                                <span style={{ color: '#fff' }}>⬜ Blanc</span> = Nuages hauts (froids)<br />
                                <span style={{ color: '#aaa' }}>▪ Gris</span> = Nuages bas (chauds)<br />
                                <span style={{ color: '#555' }}>■ Sombre</span> = Ciel dégagé<br />
                                <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 600 }}>
                                    Source EUMETSAT MSG — toutes les 15 min
                                </span>
                            </div>
                        )}
                        {layerType === 'visible' && (
                            <div className="legend-numbers" style={{ display: 'block', lineHeight: '1.8' }}>
                                <span style={{ color: '#fff' }}>⬜ Blanc</span> = Nuages épais<br />
                                <span style={{ color: '#aaa' }}>▪ Gris</span> = Nuages fins<br />
                                <span style={{ color: '#555' }}>■ Sombre</span> = Mer / Terre<br />
                                <span style={{ fontSize: '0.55rem', color: '#f59e0b', fontWeight: 600 }}>
                                    ⚠ Disponible uniquement de jour
                                </span><br />
                                <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 600 }}>
                                    Source EUMETSAT MSG — toutes les 15 min
                                </span>
                            </div>
                        )}
                        {layerType === 'natural' && (
                            <div className="legend-numbers" style={{ display: 'block', lineHeight: '1.8' }}>
                                Image RGB couleurs naturelles<br />
                                Anneau géostationnaire (multi-satellites)<br />
                                <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 600 }}>
                                    Source EUMETSAT MUMI — toutes les 60 min
                                </span>
                            </div>
                        )}
                        {layerType === 'radar' && (
                            <>
                                <div className="legend-gradient-bar" style={{
                                    background: 'linear-gradient(to right, #3b82f6, #10b981, #facc15, #ef4444)'
                                }} />
                                <div className="legend-numbers">
                                    <span>Faible</span><span>Intense</span>
                                </div>
                                <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                                    Source RainViewer — toutes les 10 min
                                </div>
                            </>
                        )}

                        {lastRefresh && (
                            <div style={{ marginTop: '8px', fontSize: '0.55rem', color: '#475569', fontWeight: 600, borderTop: '1px solid #334155', paddingTop: '6px' }}>
                                Actualisé à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SatelliteFrance;
