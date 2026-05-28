import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, ImageOverlay, ZoomControl } from 'react-leaflet';
import {
    Play, Square, ChevronLeft, ChevronRight, ChevronDown,
    Download, RefreshCw, Clock, Info, Globe, Map, ZoomIn
} from 'lucide-react';
import './ModeleFrance.css';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL;
const STORAGE_BASE   = `${SUPABASE_URL}/storage/v1/object/public/meteo-models`;
const METADATA_URL   = `${STORAGE_BASE}/metadata.json`;

const MODELS = {
    'ecmwf':   { name: 'ECMWF IFS',         short: 'ECMWF',   resolution: '~28 km', color: '#2563eb', maxStep: 240 },
    'icon-eu': { name: 'ICON-EU (DWD)',       short: 'ICON-EU', resolution: '6.5 km', color: '#16a34a', maxStep: 180 },
    'arome':   { name: 'AROME (MF)',          short: 'AROME',   resolution: '1.3 km', color: '#dc2626', maxStep: 51  },
    'arpege':  { name: 'ARPÈGE (MF)',         short: 'ARPÈGE',  resolution: '~10 km', color: '#9333ea', maxStep: 114 },
};

const PARAMETERS = {
    temperature:  { label: 'Température 2m',     unit: '°C',    icon: '🌡️', group: 'Thermique'    },
    wind_speed:   { label: 'Vent 10m',            unit: 'km/h',  icon: '💨', group: 'Vent'         },
    wind_gusts:   { label: 'Rafales 10m',         unit: 'km/h',  icon: '🌬️', group: 'Vent'         },
    precipitation:{ label: 'Précipitations',      unit: 'mm',    icon: '🌧️', group: 'Eau'          },
    pressure:     { label: 'Pression mer',        unit: 'hPa',   icon: '📊', group: 'Dynamique'    },
    geopotential: { label: 'Géopotentiel 500hPa', unit: 'mgp',   icon: '🌀', group: 'Dynamique'    },
    clouds:       { label: 'Nébulosité',          unit: '%',     icon: '☁️', group: 'Nuages'       },
    cape:         { label: 'CAPE',                unit: 'J/kg',  icon: '⚡', group: 'Instabilité'  },
    humidity:     { label: 'Humidité 2m',         unit: '%',     icon: '💧', group: 'Thermique'    },
    snow:         { label: 'Épaisseur neige',     unit: 'cm',    icon: '❄️', group: 'Eau'          },
};

const PARAM_GROUPS = ['Thermique', 'Vent', 'Eau', 'Dynamique', 'Nuages', 'Instabilité'];

const ZONES = {
    france:            { name: 'France',          center: [46.5, 2.5],  zoom: 5,  bounds: [[41, -6],    [52.5, 11]]   },
    'hauts-de-france': { name: 'Hauts-de-France', center: [50.4, 2.8],  zoom: 8,  bounds: [[49.2, 1.0], [51.5, 4.5]] },
    europe:            { name: 'Europe',          center: [52.0, 10.0], zoom: 4,  bounds: [[34, -25],   [72, 45]]     },
};

// ─── HELPERS ───────────────────────────────────────────────────────────────────
const getMapUrl = (model, zone, param, runDate, runHour, step) =>
    `${STORAGE_BASE}/${model}/${zone}/${param}/${runDate}_${String(runHour).padStart(2,'0')}h/H+${String(step).padStart(3,'0')}.png`;

const fmtRun = (date, hour) => {
    if (!date) return '—';
    const d = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
    return `${new Date(d).toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit',year:'2-digit'})} ${String(hour).padStart(2,'0')}h UTC`;
};

const fmtValidTime = (date, hour, step) => {
    if (!date) return '';
    const dt = new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${String(hour).padStart(2,'0')}:00:00Z`);
    dt.setHours(dt.getHours() + step);
    return dt.toLocaleString('fr-FR', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'UTC' }) + ' UTC';
};

const preloadImage = url => new Promise(resolve => {
    const img = new window.Image();
    img.onload = img.onerror = () => resolve(url);
    img.src = url;
});

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
const ModeleFrance = () => {
    // État principal
    const [metadata,    setMetadata]    = useState(null);
    const [metaError,   setMetaError]   = useState(false);
    const [model,       setModel]       = useState('icon-eu');
    const [zone,        setZone]        = useState('france');
    const [param,       setParam]       = useState('temperature');
    const [run,         setRun]         = useState(null);  // { date, hour, steps }
    const [stepIdx,     setStepIdx]     = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(600);
    const [mapUrl,      setMapUrl]      = useState('');
    const [loading,     setLoading]     = useState(true);
    const [preloading,  setPreloading]  = useState(false);
    const [preloadPct,  setPreloadPct]  = useState(0);
    const [showInfo,    setShowInfo]    = useState(false);

    const overlayRef = useRef(null);
    const timerRef   = useRef(null);
    const stepsRef   = useRef([]);

    // ── Chargement metadata ────────────────────────────────────────────────────
    const loadMetadata = useCallback(async () => {
        setLoading(true);
        setMetaError(false);
        try {
            const r    = await fetch(`${METADATA_URL}?t=${Date.now()}`);
            const meta = await r.json();
            setMetadata(meta);
            // Sélectionne le dernier run du modèle actuel
            const runs = meta?.models?.[model]?.runs || [];
            if (runs.length > 0) {
                const last = runs[0];
                setRun(last);
                setStepIdx(0);
            }
        } catch {
            setMetaError(true);
        } finally {
            setLoading(false);
        }
    }, [model]);

    useEffect(() => { loadMetadata(); }, [loadMetadata]);

    // ── Quand run/param/zone/stepIdx changent → met à jour l'URL de la carte ──
    useEffect(() => {
        if (!run) return;
        const steps = run.steps || [];
        stepsRef.current = steps;
        const step = steps[stepIdx] ?? 0;
        const url  = getMapUrl(model, zone, param, run.date, run.hour, step);
        setMapUrl(url);
        if (overlayRef.current) overlayRef.current.setUrl(url);
    }, [model, zone, param, run, stepIdx]);

    // ── Animation ─────────────────────────────────────────────────────────────
    useEffect(() => {
        clearInterval(timerRef.current);
        if (!isPlaying || !run?.steps?.length) return;
        timerRef.current = setInterval(() => {
            setStepIdx(i => {
                const next = (i + 1) % stepsRef.current.length;
                const url  = getMapUrl(model, zone, param, run.date, run.hour,
                                       stepsRef.current[next]);
                if (overlayRef.current) overlayRef.current.setUrl(url);
                return next;
            });
        }, speed);
        return () => clearInterval(timerRef.current);
    }, [isPlaying, run, model, zone, param, speed]);

    // ── Préchargement de toutes les frames ────────────────────────────────────
    const preloadAll = useCallback(async () => {
        if (!run?.steps?.length) return;
        setPreloading(true);
        setPreloadPct(0);
        const steps = run.steps;
        for (let i = 0; i < steps.length; i++) {
            const url = getMapUrl(model, zone, param, run.date, run.hour, steps[i]);
            await preloadImage(url);
            setPreloadPct(Math.round(((i + 1) / steps.length) * 100));
        }
        setPreloading(false);
        setIsPlaying(true);
    }, [model, zone, param, run]);

    // ── Navigation manuelle ───────────────────────────────────────────────────
    const goTo = idx => {
        if (!run?.steps) return;
        const i   = Math.max(0, Math.min(idx, run.steps.length - 1));
        const url = getMapUrl(model, zone, param, run.date, run.hour, run.steps[i]);
        setStepIdx(i);
        if (overlayRef.current) overlayRef.current.setUrl(url);
    };

    // ── Téléchargement de la carte courante ──────────────────────────────────
    const downloadCurrent = () => {
        if (!mapUrl) return;
        const a    = document.createElement('a');
        a.href     = mapUrl;
        const step = run?.steps?.[stepIdx] ?? 0;
        a.download = `${model}_${zone}_${param}_${run?.date}_${String(run?.hour||0).padStart(2,'0')}h_H+${String(step).padStart(3,'0')}.png`;
        a.target   = '_blank';
        a.click();
    };

    // ── Sélection d'un run ───────────────────────────────────────────────────
    const runs = metadata?.models?.[model]?.runs || [];
    const currentStep = run?.steps?.[stepIdx] ?? 0;
    const zoneConfig  = ZONES[zone];

    return (
        <div className="modele-container">

            {/* ── BARRE SUPÉRIEURE : modèle + zone ── */}
            <div className="modele-top-bar">
                <div className="modele-section-label">MODÈLE MÉTÉO</div>

                {/* Sélecteur modèle */}
                <div className="modele-model-tabs">
                    {Object.entries(MODELS).map(([key, m]) => (
                        <button key={key}
                            className={`modele-model-tab ${model === key ? 'active' : ''}`}
                            style={{ '--model-color': m.color }}
                            onClick={() => { setModel(key); setStepIdx(0); setIsPlaying(false); }}>
                            <span className="tab-short">{m.short}</span>
                            <span className="tab-res">{m.resolution}</span>
                        </button>
                    ))}
                </div>

                <div className="modele-divider" />

                {/* Sélecteur zone */}
                <div className="modele-zone-tabs">
                    {Object.entries(ZONES).map(([key, z]) => (
                        <button key={key}
                            className={`modele-zone-tab ${zone === key ? 'active' : ''}`}
                            onClick={() => setZone(key)}>
                            {key === 'europe' ? <Globe size={13}/> : key === 'hauts-de-france' ? <ZoomIn size={13}/> : <Map size={13}/>}
                            {z.name}
                        </button>
                    ))}
                </div>

                <div className="modele-divider" />

                {/* Sélecteur run */}
                <div className="modele-run-select">
                    <Clock size={13} style={{ color: '#64748b' }} />
                    <select value={run ? `${run.date}_${run.hour}` : ''}
                        onChange={e => {
                            const [d, h] = e.target.value.split('_');
                            const r = runs.find(r => r.date === d && r.hour === +h);
                            if (r) { setRun(r); setStepIdx(0); setIsPlaying(false); }
                        }}
                        className="modele-run-dropdown">
                        {runs.map(r => (
                            <option key={`${r.date}_${r.hour}`} value={`${r.date}_${r.hour}`}>
                                Run {fmtRun(r.date, r.hour)}
                            </option>
                        ))}
                    </select>
                </div>

                <button className="modele-icon-btn" onClick={loadMetadata} title="Actualiser">
                    <RefreshCw size={14} />
                </button>
                <button className="modele-icon-btn" onClick={() => setShowInfo(s => !s)} title="Infos modèle">
                    <Info size={14} />
                </button>
            </div>

            {/* ── SÉLECTEUR PARAMÈTRES ── */}
            <div className="modele-param-bar">
                {PARAM_GROUPS.map(group => {
                    const params = Object.entries(PARAMETERS).filter(([, p]) => p.group === group);
                    if (!params.length) return null;
                    return (
                        <div key={group} className="modele-param-group">
                            <span className="modele-param-group-label">{group}</span>
                            {params.map(([key, p]) => (
                                <button key={key}
                                    className={`modele-param-btn ${param === key ? 'active' : ''}`}
                                    onClick={() => { setParam(key); setStepIdx(0); setIsPlaying(false); }}>
                                    <span className="param-icon">{p.icon}</span>
                                    <span className="param-label">{p.label}</span>
                                </button>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* ── CONTRÔLES ANIMATION ── */}
            <div className="modele-anim-bar">
                {/* Boutons play/nav */}
                <button className="modele-ctrl-btn" onClick={() => { setIsPlaying(false); goTo(0); }} title="Début">|◄</button>
                <button className="modele-ctrl-btn" onClick={() => { setIsPlaying(false); goTo(stepIdx - 1); }} title="Précédent">◄</button>
                <button className="modele-ctrl-btn play" onClick={() => setIsPlaying(p => !p)}>
                    {isPlaying ? <Square size={14}/> : <Play size={14}/>}
                </button>
                <button className="modele-ctrl-btn" onClick={() => { setIsPlaying(false); goTo(stepIdx + 1); }} title="Suivant">►</button>
                <button className="modele-ctrl-btn" onClick={() => { setIsPlaying(false); goTo((run?.steps?.length||1) - 1); }} title="Fin">►|</button>

                {/* Vitesse */}
                <select value={speed} onChange={e => setSpeed(+e.target.value)} className="modele-speed-select">
                    <option value={1500}>Lent</option>
                    <option value={800}>Normal</option>
                    <option value={400}>Rapide</option>
                    <option value={200}>Très rapide</option>
                </select>

                {/* Slider temporal */}
                <div className="modele-slider-wrap">
                    <input type="range" min={0} max={(run?.steps?.length||1) - 1}
                        value={stepIdx}
                        onChange={e => { setIsPlaying(false); goTo(+e.target.value); }}
                        className="modele-slider" />
                    <div className="modele-step-ticks">
                        {(run?.steps||[]).filter((_, i, a) => i % Math.max(1, Math.floor(a.length/12)) === 0).map((s, i) => (
                            <span key={i} style={{ left: `${(run.steps.indexOf(s) / (run.steps.length-1)) * 100}%` }}>
                                H+{String(s).padStart(3,'0')}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Échéance courante */}
                <div className="modele-step-display">
                    <span className="step-h">H+{String(currentStep).padStart(3,'0')}</span>
                    <span className="step-valid">{fmtValidTime(run?.date, run?.hour, currentStep)}</span>
                </div>

                {/* Précharge + téléchargement */}
                <button className="modele-ctrl-btn preload" onClick={preloadAll}
                    title="Précharger toutes les frames pour animation fluide" disabled={preloading}>
                    {preloading ? `${preloadPct}%` : '⚡ Précharger'}
                </button>
                <button className="modele-ctrl-btn download" onClick={downloadCurrent} title="Télécharger cette carte">
                    <Download size={13} /> PNG
                </button>
            </div>

            {/* ── CARTE ── */}
            <div className="modele-map-wrap">

                {/* Loader */}
                {(loading || metaError) && (
                    <div className="modele-loader">
                        {metaError ? (
                            <div className="loader-error">
                                <p>⚠️ Aucune donnée disponible</p>
                                <span>Le pipeline GitHub Actions n'a pas encore tourné.<br/>
                                Lance-le manuellement depuis l'onglet Actions de GitHub.</span>
                                <button onClick={loadMetadata}>Réessayer</button>
                            </div>
                        ) : (
                            <div className="loader-content">
                                <div className="spinner"/>
                                <p>Chargement des modèles...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Info panel flottant */}
                {showInfo && run && (
                    <div className="modele-info-panel">
                        <strong>{MODELS[model]?.name}</strong>
                        <div>Résolution : {MODELS[model]?.resolution}</div>
                        <div>Run : {fmtRun(run.date, run.hour)}</div>
                        <div>Échéances : H+{run.steps?.[0]} → H+{run.steps?.[run.steps.length-1]}</div>
                        <div>Zones : {(run.zones||[]).join(', ')}</div>
                        <div style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:4}}>
                            Généré le {run.generated_at ? new Date(run.generated_at).toLocaleString('fr-FR') : '—'}
                        </div>
                    </div>
                )}

                {!loading && !metaError && mapUrl && (
                    <MapContainer
                        key={zone}
                        center={zoneConfig.center}
                        zoom={zoneConfig.zoom}
                        style={{ height: '100%', width: '100%' }}
                        minZoom={3} maxZoom={10}
                        zoomControl={false}>

                        {/* Fond relief Esri */}
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}"
                            attribution="&copy; Esri" />

                        {/* Image météo générée par Python */}
                        <ImageOverlay
                            ref={overlayRef}
                            url={mapUrl}
                            bounds={zoneConfig.bounds}
                            opacity={0.92}
                            zIndex={400}
                        />

                        {/* Labels par-dessus */}
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                            zIndex={600} opacity={0.7} />

                        <ZoomControl position="bottomright" />
                    </MapContainer>
                )}
            </div>

            {/* ── PIED DE PAGE : prochaine mise à jour ── */}
            <div className="modele-footer">
                <span>
                    {MODELS[model]?.short} — Prochaine mise à jour estimée :{' '}
                    {run?.generated_at ? (() => {
                        const next = new Date(run.generated_at);
                        next.setHours(next.getHours() + (model === 'icon-eu' ? 3 : 12));
                        return next.toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
                    })() : '—'}
                </span>
                <span>Sources : ECMWF (CC-4.0) • DWD ICON-EU (libre) • Météo-France AROME</span>
            </div>
        </div>
    );
};

export default ModeleFrance;
