import React, { useState, useRef, useEffect } from 'react';
import '../radar/RadarFrance.css';
import { Satellite, CloudRain, Wind, Thermometer, Eye, ExternalLink } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Windy.com Embed — widget natif, animation fluide sans gestion de tuiles
// Documentation : https://api.windy.com/point-forecast
// Embed gratuit, aucune clé API requise pour l'affichage
// ─────────────────────────────────────────────────────────────────────────────

const WINDY_BASE = 'https://embed.windy.com/embed.html';

const LAT  = 46.4;
const LON  = 2.5;
const ZOOM = 5;

const OVERLAYS = [
    {
        key: 'satellite',
        label: 'Satellite IR',
        icon: <Satellite size={16} />,
        overlay: 'satellite',
        description: 'Image infrarouge Meteosat — nuages et systèmes en temps réel',
        color: '#6366f1',
    },
    {
        key: 'rain',
        label: 'Radar pluie',
        icon: <CloudRain size={16} />,
        overlay: 'rain',
        description: 'Précipitations radar — animé toutes les 10 min',
        color: '#0ea5e9',
    },
    {
        key: 'rainAccumulation',
        label: 'Cumul pluie',
        icon: <CloudRain size={16} />,
        overlay: 'rainAccumulation',
        description: 'Cumul de précipitations sur 24h',
        color: '#06b6d4',
    },
    {
        key: 'wind',
        label: 'Vent',
        icon: <Wind size={16} />,
        overlay: 'wind',
        description: 'Vents en surface — particules animées',
        color: '#10b981',
    },
    {
        key: 'temp',
        label: 'Température',
        icon: <Thermometer size={16} />,
        overlay: 'temp',
        description: 'Température en surface',
        color: '#f59e0b',
    },
    {
        key: 'clouds',
        label: 'Nuages',
        icon: <Eye size={16} />,
        overlay: 'clouds',
        description: 'Couverture nuageuse totale',
        color: '#94a3b8',
    },
];

const buildWindyUrl = (overlay) =>
    `${WINDY_BASE}?type=map` +
    `&location=coordinates` +
    `&lat=${LAT}&lon=${LON}&zoom=${ZOOM}` +
    `&overlay=${overlay}` +
    `&product=ecmwf` +
    `&level=surface` +
    `&metricRain=mm` +
    `&metricTemp=%C2%B0C` +
    `&metricWind=km%2Fh` +
    `&message=true`;

const SatelliteFrance = () => {
    const [activeKey, setActiveKey] = useState('satellite');
    const [loading, setLoading]     = useState(true);
    const iframeRef = useRef(null);

    const active = OVERLAYS.find(o => o.key === activeKey);
    const windyUrl = buildWindyUrl(active.overlay);

    // Montrer un loader pendant le chargement de l'iframe
    const handleLoad = () => setLoading(false);

    // Forcer le rechargement de l'iframe quand on change d'overlay
    useEffect(() => {
        setLoading(true);
    }, [activeKey]);

    return (
        <div className="radar-container">
            {/* BARRE DE CONTRÔLE */}
            <div className="radar-controls-compact" style={{ gap: '6px', flexWrap: 'wrap' }}>
                {/* Boutons de couches */}
                {OVERLAYS.map(({ key, label, icon, color }) => (
                    <button
                        key={key}
                        className={`btn-compact ${activeKey === key ? 'active' : ''}`}
                        onClick={() => setActiveKey(key)}
                        style={{
                            width: 'auto',
                            padding: '0 12px',
                            gap: '6px',
                            fontWeight: '800',
                            fontSize: '0.75rem',
                            background: activeKey === key ? color : 'transparent',
                            color:      activeKey === key ? '#fff'  : '#64748b',
                            border:     `1px solid ${activeKey === key ? color : '#e2e8f0'}`,
                            borderRadius: '8px',
                            transition: 'all 0.2s',
                        }}
                    >
                        {icon}
                        <span>{label}</span>
                    </button>
                ))}

                <div className="control-divider" />

                {/* Description de la couche active */}
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', flex: 1 }}>
                    {active.description}
                </span>

                {/* Lien externe Windy */}
                <a
                    href={`https://www.windy.com/?${active.overlay},${LAT},${LON},${ZOOM}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.7rem', fontWeight: '700', color: '#0ea5e9',
                        textDecoration: 'none',
                    }}
                    title="Ouvrir dans Windy"
                >
                    <ExternalLink size={14} /> Windy.com
                </a>
            </div>

            {/* CARTE WINDY EMBED */}
            <div className="radar-main-content SINGLE">
                <div className="radar-map-wrapper" style={{ position: 'relative' }}>

                    {/* Loader pendant l'initialisation */}
                    {loading && (
                        <div className="radar-glass-loader">
                            <div className="loader-content">
                                <div className="spinner" />
                                <p>Chargement {active.label}...</p>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                    Connexion à Windy.com
                                </span>
                            </div>
                        </div>
                    )}

                    <iframe
                        ref={iframeRef}
                        key={activeKey}
                        src={windyUrl}
                        onLoad={handleLoad}
                        title={`Carte météo — ${active.label}`}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            display: 'block',
                        }}
                        allow="fullscreen"
                        allowFullScreen
                    />
                </div>
            </div>
        </div>
    );
};

export default SatelliteFrance;
