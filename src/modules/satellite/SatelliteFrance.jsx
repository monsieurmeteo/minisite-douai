import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, LayersControl } from 'react-leaflet';
import '../radar/RadarFrance.css'; // Import des styles du Radar pour un look unifié
import { Play, Square, ChevronRight, Clock, Eye, Moon, CloudRain, Globe } from 'lucide-react';

const { BaseLayer, Overlay } = LayersControl;

const SatelliteFrance = () => {
    // Configuration carte : Zoom plus serré sur la France
    const center = [46.4, 2.5]; // Centre approximatif de la France
    const zoom = 6;

    // États
    const [timestamps, setTimestamps] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [layerType, setLayerType] = useState('infrared'); // 'infrared', 'radar', 'visible', 'natural'
    const [loading, setLoading] = useState(true);
    const [preloadProgress, setPreloadProgress] = useState(0); // 0-100 pour preload
    const [isPreloading, setIsPreloading] = useState(false);
    const timerRef = useRef(null);
    const preloadedImages = useRef({}); // Cache des images préchargées

    // Préchargement de toutes les images pour une animation sans blanc
    const preloadImages = async (frames, isRadar) => {
        setIsPreloading(true);
        setPreloadProgress(0);
        const cache = {};
        const total = frames.length;

        await Promise.all(frames.map((ts, i) => {
            return new Promise((resolve) => {
                const url = `https://tilecache.rainviewer.com${ts.path}/256/4/8/5/${isRadar ? '2' : '0'}/1_1.png`;
                const img = new Image();
                img.onload = img.onerror = () => {
                    cache[ts.time] = img;
                    setPreloadProgress(Math.round(((i + 1) / total) * 100));
                    resolve();
                };
                img.src = url;
            });
        }));

        preloadedImages.current = cache;
        setIsPreloading(false);
        return cache;
    };

    // Chargement des données - RainViewer ou fallback EUMETSAT animé
    useEffect(() => {
        setLoading(true);
        setIsPlaying(false);
        setTimestamps([]);
        preloadedImages.current = {};

        // Pour visible et natural, on utilise EUMETSAT statique
        if (layerType === 'visible' || layerType === 'natural') {
            setTimestamps([]);
            setLoading(false);
            return;
        }

        // Essayer RainViewer d'abord
        fetch('https://api.rainviewer.com/public/weather-maps.json')
            .then(res => res.json())
            .then(async data => {
                let frames = [];

                if (layerType === 'infrared' && data.satellite?.infrared) {
                    frames = data.satellite.infrared;
                } else if (layerType === 'radar' && data.radar?.past) {
                    frames = data.radar.past;
                }

                if (frames.length > 0) {
                    // Prendre les 18 dernières frames (environ 3h pour infrarouge à ~10min)
                    const recentFrames = frames.slice(-18);
                    setTimestamps(recentFrames);

                    // Précharger les images pour éviter les blancs à l'animation
                    await preloadImages(recentFrames, layerType === 'radar');

                    setCurrentIndex(recentFrames.length - 1);
                    setIsPlaying(true);
                } else if (layerType === 'infrared') {
                    // Pas de données RainViewer - utiliser EUMETSAT statique
                    console.log('📡 RainViewer indisponible, utilisation EUMETSAT statique');
                    setTimestamps([]);
                } else {
                    setTimestamps([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Erreur API RainViewer:", err);
                setTimestamps([]);
                setLoading(false);
            });
    }, [layerType]);

    // Animation Player — vitesse augmentée pour plus de fluidité
    useEffect(() => {
        if (!isPlaying || timestamps.length === 0 || isPreloading) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const isLastFrame = currentIndex === timestamps.length - 1;
        // Pause légère sur la dernière frame, sinon 500ms
        const delay = isLastFrame ? 1800 : 500;

        timerRef.current = setTimeout(() => {
            setCurrentIndex((prev) => (prev === timestamps.length - 1 ? 0 : prev + 1));
        }, delay);

        return () => clearTimeout(timerRef.current);
    }, [isPlaying, currentIndex, timestamps, isPreloading]);

    const currentTs = timestamps[currentIndex];

    // Formatage heure
    const formatTime = (ts) => {
        if (!ts) return '--:--';
        return new Date(ts.time * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    // Formatage date complète
    const formatDateTime = (ts) => {
        if (!ts) return '--';
        const d = new Date(ts.time * 1000);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' +
            d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="radar-container">
            {/* BARRE DE CONTRÔLE (Style Radar) */}
            <div className="radar-controls-compact">
                {/* Section Lecture */}
                <div className="control-section main-player">
                    <button
                        className={`btn-compact ${isPlaying ? 'active' : ''}`}
                        onClick={() => setIsPlaying(true)}
                        title="Lecture"
                        disabled={isPreloading || timestamps.length === 0}
                    >
                        <Play size={16} fill="currentColor" />
                    </button>
                    <button
                        className={`btn-compact ${!isPlaying ? 'active' : ''}`}
                        onClick={() => setIsPlaying(false)}
                        title="Pause"
                    >
                        <Square size={16} fill="currentColor" />
                    </button>
                    <div className="step-group">
                        <button className="btn-compact" onClick={() => { setIsPlaying(false); setCurrentIndex((prev) => (prev + 1) % timestamps.length); }}
                            disabled={timestamps.length === 0}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="control-divider"></div>

                {/* Section Timeline */}
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
                    <input
                        type="range"
                        min="0"
                        max={Math.max(0, timestamps.length - 1)}
                        value={currentIndex}
                        onChange={(e) => {
                            setCurrentIndex(parseInt(e.target.value));
                            setIsPlaying(false);
                        }}
                        className="compact-range"
                        disabled={timestamps.length === 0}
                    />
                </div>

                <div className="control-divider"></div>

                {/* Section Choix des Couches */}
                <div className="control-section settings-grid">
                    <button
                        className={`btn-compact ${layerType === 'infrared' ? 'active' : ''}`}
                        onClick={() => setLayerType('infrared')}
                        title="Satellite Infrarouge (~10 min)"
                        style={{ width: 'auto', padding: '0 8px', gap: '6px' }}
                    >
                        <Moon size={16} /> <span className="tiny-label" style={{ color: 'inherit' }}>Infrarouge</span>
                    </button>
                    <button
                        className={`btn-compact ${layerType === 'visible' ? 'active' : ''}`}
                        onClick={() => setLayerType('visible')}
                        title="Canal Visible (EUMETSAT)"
                        style={{ width: 'auto', padding: '0 8px', gap: '6px' }}
                    >
                        <Eye size={16} /> <span className="tiny-label" style={{ color: 'inherit' }}>Visible</span>
                    </button>
                    <button
                        className={`btn-compact ${layerType === 'natural' ? 'active' : ''}`}
                        onClick={() => setLayerType('natural')}
                        title="Couleurs Naturelles (EUMETSAT)"
                        style={{ width: 'auto', padding: '0 8px', gap: '6px' }}
                    >
                        <Globe size={16} /> <span className="tiny-label" style={{ color: 'inherit' }}>Couleurs</span>
                    </button>
                    <button
                        className={`btn-compact ${layerType === 'radar' ? 'active' : ''}`}
                        onClick={() => setLayerType('radar')}
                        title="Radar Précipitations"
                        style={{ width: 'auto', padding: '0 8px', gap: '6px' }}
                    >
                        <CloudRain size={16} /> <span className="tiny-label" style={{ color: 'inherit' }}>Pluie</span>
                    </button>
                </div>
            </div>

            {/* Loader initial */}
            {loading && (
                <div className="radar-glass-loader">
                    <div className="loader-content">
                        <div className="spinner"></div>
                        <p>Chargement Satellite...</p>
                    </div>
                </div>
            )}

            {/* Loader préchargement */}
            {isPreloading && !loading && (
                <div className="radar-glass-loader">
                    <div className="loader-content">
                        <div className="spinner"></div>
                        <p>Optimisation de l'animation... {preloadProgress}%</p>
                        <div className="progress-bar-container" style={{ width: '200px' }}>
                            <div className="progress-bar-fill" style={{ width: `${preloadProgress}%`, background: '#3b82f6' }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENU PRINCIPAL */}
            <div className="radar-main-content SINGLE">
                <div className="radar-map-wrapper">
                    <MapContainer
                        center={center}
                        zoom={zoom}
                        style={{ height: '100%', width: '100%', background: '#111' }}
                        minZoom={4}
                        zoomControl={false}
                    >
                        <LayersControl position="topright">
                            <BaseLayer checked name="Carto Dark">
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    attribution="&copy; CARTO"
                                />
                            </BaseLayer>
                            <BaseLayer name="Satellite Hybride">
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution="&copy; Esri"
                                />
                            </BaseLayer>
                            <BaseLayer name="OpenStreetMap">
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution="&copy; OSM"
                                />
                            </BaseLayer>

                            <Overlay checked name="Frontières">
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                                    zIndex={400}
                                />
                            </Overlay>
                        </LayersControl>

                        {/* COUCHES DYNAMIQUES STATIQUES */}
                        {layerType === 'visible' && (
                            <WMSTileLayer
                                url="https://eumetview.eumetsat.int/geoserver/wms"
                                layers="meteosat:msg_vis06"
                                format="image/png"
                                transparent={true}
                                attribution="&copy; EUMETSAT"
                                opacity={0.8}
                                zIndex={300}
                            />
                        )}

                        {layerType === 'natural' && (
                            <WMSTileLayer
                                url="https://eumetview.eumetsat.int/geoserver/wms"
                                layers="meteosat:msg_rgb_natural_en_3857"
                                format="image/png"
                                transparent={true}
                                attribution="&copy; EUMETSAT"
                                opacity={0.8}
                                zIndex={300}
                            />
                        )}

                        {/* Fallback EUMETSAT IR statique seulement si aucun timestamp */}
                        {layerType === 'infrared' && timestamps.length === 0 && !loading && (
                            <WMSTileLayer
                                url="https://eumetview.eumetsat.int/geoserver/wms"
                                layers="meteosat:msg_ir108_3857"
                                format="image/png"
                                transparent={true}
                                attribution="&copy; EUMETSAT (Fallback)"
                                opacity={0.85}
                                zIndex={300}
                            />
                        )}

                        {/* Animation RainViewer — buffer étendu ±5 frames avec transition CSS */}
                        {timestamps.length > 0 && timestamps.map((ts, index) => {
                            const isVisible = index === currentIndex;
                            const isRadar = layerType === 'radar';
                            // Buffer étendu : charger ±5 frames autour de l'index courant
                            const isBuffered = Math.abs(index - currentIndex) <= 5;
                            if (!isBuffered) return null;

                            const url = `https://tilecache.rainviewer.com${ts.path}/256/{z}/{x}/{y}/${isRadar ? '2' : '0'}/1_1.png`;

                            return (
                                <TileLayer
                                    key={`${layerType}-${ts.time}`}
                                    url={url}
                                    opacity={isVisible ? (isRadar ? 0.82 : 0.78) : 0}
                                    zIndex={isVisible ? 310 : 300}
                                    className="radar-tile-layer-pro"
                                    maxNativeZoom={7}
                                    maxZoom={20}
                                    tileSize={256}
                                    updateWhenZooming={false}
                                    keepBuffer={4}
                                />
                            );
                        })}

                        {/* Message mode statique EUMETSAT */}
                        {layerType === 'infrared' && timestamps.length === 0 && !loading && (
                            <div style={{
                                position: 'absolute',
                                bottom: '80px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 1000,
                                background: 'rgba(245, 158, 11, 0.9)',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                textAlign: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700
                            }}>
                                📡 Image statique EUMETSAT (RainViewer indisponible)
                            </div>
                        )}
                    </MapContainer>

                    {/* Légende */}
                    <div className="map-legend-compact" style={{ width: 'auto', minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Eye size={14} className="text-slate-500" />
                            <span className="tiny-label">LÉGENDE {layerType.toUpperCase()}</span>
                        </div>
                        {layerType === 'infrared' && (
                            <div className="legend-numbers" style={{ display: 'block', lineHeight: '1.6' }}>
                                Blanc = Nuages froids (Hauts)<br />Gris = Nuages chauds (Bas)<br />
                                <span style={{ fontSize: '0.5rem', color: '#94a3b8', fontWeight: 600 }}>
                                    ⏱ Image toutes les ~10 min
                                </span>
                            </div>
                        )}
                        {layerType === 'radar' && (
                            <>
                                <div className="legend-gradient-bar" style={{
                                    background: `linear-gradient(to right, #3b82f6, #10b981, #facc15, #ef4444)`
                                }}></div>
                                <div className="legend-numbers">
                                    <span>Faible</span>
                                    <span>Intense</span>
                                </div>
                                <div style={{ fontSize: '0.5rem', color: '#94a3b8', fontWeight: 600, marginTop: '3px' }}>
                                    ⏱ Image toutes les ~10 min
                                </div>
                            </>
                        )}
                        {(layerType === 'visible' || layerType === 'natural') && (
                            <div className="legend-numbers" style={{ display: 'block', lineHeight: '1.6' }}>
                                Image EUMETSAT temps réel<br />
                                <span style={{ fontSize: '0.5rem', color: '#94a3b8', fontWeight: 600 }}>
                                    Source : EUMETSAT (statique)
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SatelliteFrance;
