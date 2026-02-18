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
    const timerRef = useRef(null);

    // Chargement des données - RainViewer ou fallback EUMETSAT animé
    useEffect(() => {
        setLoading(true);
        setIsPlaying(false);

        // Pour visible et natural, on utilise EUMETSAT statique
        if (layerType === 'visible' || layerType === 'natural') {
            setTimestamps([]);
            setLoading(false);
            return;
        }

        // Essayer RainViewer d'abord
        fetch('https://api.rainviewer.com/public/weather-maps.json')
            .then(res => res.json())
            .then(data => {
                let frames = [];

                if (layerType === 'infrared' && data.satellite?.infrared) {
                    frames = data.satellite.infrared;
                } else if (layerType === 'radar' && data.radar?.past) {
                    frames = data.radar.past;
                }

                if (frames.length > 0) {
                    // RainViewer a des données
                    const recentFrames = frames.slice(-12);
                    setTimestamps(recentFrames);
                    setCurrentIndex(recentFrames.length - 1);
                    setIsPlaying(true);
                } else if (layerType === 'infrared') {
                    // Pas de données RainViewer - utiliser EUMETSAT statique
                    console.log('📡 RainViewer indisponible, utilisation EUMETSAT statique');
                    setTimestamps([]);
                    // Le fallback EUMETSAT WMS sera affiché automatiquement
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

    // Animation Player
    useEffect(() => {
        if (!isPlaying || timestamps.length === 0) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        timerRef.current = setTimeout(() => {
            setCurrentIndex((prev) => (prev === timestamps.length - 1 ? 0 : prev + 1));
        }, 600); // 600ms par intervalle

        return () => clearTimeout(timerRef.current);
    }, [isPlaying, currentIndex, timestamps]);

    const currentTs = timestamps[currentIndex];

    // Formatage heure
    const formatTime = (ts) => {
        if (!ts) return '--:--';
        return new Date(ts.time * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
                        <button className="btn-compact" onClick={() => { setIsPlaying(false); setCurrentIndex((prev) => (prev + 1) % timestamps.length); }}>
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
                        title="Satellite Infrarouge"
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

            {/* Loader */}
            {loading && (
                <div className="radar-glass-loader">
                    <div className="loader-content">
                        <div className="spinner"></div>
                        <p>Chargement Satellite...</p>
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
                                    attribution='&copy; CARTO'
                                />
                            </BaseLayer>
                            <BaseLayer name="Satellite Hybride">
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution='&copy; Esri'
                                />
                            </BaseLayer>
                            <BaseLayer name="OpenStreetMap">
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OSM'
                                />
                            </BaseLayer>

                            <Overlay checked name="Frontières">
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                                    zIndex={400}
                                />
                            </Overlay>
                        </LayersControl>

                        {/* COUCHES DYNAMIQUES */}
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

                        {/* Animation RainViewer */}
                        {timestamps.length > 0 && timestamps.map((ts, index) => {
                            const isVisible = index === currentIndex;
                            const isRadar = layerType === 'radar';
                            const isBuffered = Math.abs(index - currentIndex) <= 4;
                            if (!isBuffered) return null;

                            const url = `https://tilecache.rainviewer.com${ts.path}/256/{z}/{x}/{y}/${isRadar ? '2' : '0'}/1_1.png`;

                            return (
                                <TileLayer
                                    key={`${layerType}-${ts.time}`}
                                    url={url}
                                    opacity={isVisible ? (isRadar ? 0.8 : 0.75) : 0}
                                    zIndex={300}
                                    className="radar-tile-layer-pro"
                                    maxNativeZoom={7}
                                    maxZoom={20}
                                    tileSize={256}
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
                    <div className="map-legend-compact" style={{ width: 'auto', minWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Eye size={14} className="text-slate-500" />
                            <span className="tiny-label">LÉGENDE {layerType.toUpperCase()}</span>
                        </div>
                        {layerType === 'infrared' && (
                            <div className="legend-numbers" style={{ display: 'block' }}>
                                Blanc = Nuages froids (Hauts)<br />Gris = Nuages chauds (Bas)
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SatelliteFrance;
