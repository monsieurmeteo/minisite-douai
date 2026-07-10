import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Waves, RefreshCw, Anchor, Compass, Info, Search, ShieldAlert } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './SeaTemperatureMap.css';

// Temperature color scale for marine observations
const SEA_TEMP_SCALE = [
    { min: -Infinity, max: 12, color: '#1e3a8a', label: '< 12°C' },
    { min: 12, max: 14, color: '#2563eb', label: '12 - 14°C' },
    { min: 14, max: 16, color: '#0ea5e9', label: '14 - 16°C' },
    { min: 16, max: 18, color: '#14b8a6', label: '16 - 18°C' },
    { min: 18, max: 20, color: '#10b981', label: '18 - 20°C' },
    { min: 20, max: 22, color: '#eab308', label: '20 - 22°C' },
    { min: 22, max: 24, color: '#f97316', label: '22 - 24°C' },
    { min: 24, max: 26, color: '#ef4444', label: '24 - 26°C' },
    { min: 26, max: Infinity, color: '#db2777', label: '> 26°C' },
];

const getSeaTempColor = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '#64748b';
    const range = SEA_TEMP_SCALE.find(r => value >= r.min && value < r.max);
    return range ? range.color : '#db2777';
};

export default function SeaTemperatureMap() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'bouee', 'bateau'
    const [selectedStation, setSelectedStation] = useState(null);

    // Fetch data from public Supabase Storage URL
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Append timestamp to bust CDN cache
            const url = `https://ubdevaemtwbzxksjlhjg.supabase.co/storage/v1/object/public/vigilance-captures/sea_temperatures.json?t=${Date.now()}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Erreur de chargement des données de température de mer");
            const data = await res.json();
            setStations(data);
            
            // Auto-select first station if available
            if (data.length > 0) {
                setSelectedStation(data[0]);
            }
        } catch (e) {
            console.error("Error loading sea temperatures:", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter and search stations
    const filteredStations = useMemo(() => {
        return stations.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  s.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || s.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [stations, searchQuery, filterType]);

    // Create custom circle marker with Leaflet divIcon
    const createMarkerIcon = (temp, type) => {
        const color = getSeaTempColor(temp);
        const isBateau = type === 'bateau';
        const displayVal = temp !== null && temp !== undefined ? temp.toFixed(1) : '?';
        return L.divIcon({
            className: 'custom-sea-marker',
            html: `<div class="sea-marker-circle" style="background-color: ${color}; border-color: ${isBateau ? '#000000' : '#ffffff'};">
                     <span>${displayVal}</span>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
    };

    return (
        <div className="sea-map-container">
            <header className="sea-map-header">
                <h1>
                    <Waves size={24} style={{ color: '#0ea5e9' }} />
                    <span>Température de la Mer (SST)</span>
                </h1>
                
                <div className="sea-map-header-actions">
                    <button className="sea-btn" onClick={loadData} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span>Actualiser</span>
                    </button>
                </div>
            </header>

            <div className="sea-map-body">
                {/* Map Area */}
                <div className="leaflet-map-wrapper">
                    {loading && (
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center flex-col gap-3">
                            <RefreshCw className="animate-spin text-sky-400" size={36} />
                            <span className="text-slate-300 font-semibold">Chargement des données marines...</span>
                        </div>
                    )}
                    
                    {error && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-[1000] flex items-center justify-center flex-col gap-4 p-4 text-center">
                            <ShieldAlert className="text-rose-500" size={48} />
                            <h3 className="text-xl font-bold text-white">Impossible de charger la carte</h3>
                            <p className="text-slate-400 max-w-md">{error}</p>
                            <button className="sea-btn" onClick={loadData}>Réessayer</button>
                        </div>
                    )}

                    <MapContainer 
                        center={[46.2, -1.0]} 
                        zoom={5.5} 
                        style={{ height: '100%', width: '100%', background: '#0f172a' }}
                        zoomControl={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        
                        {filteredStations.map(stn => (
                            <Marker
                                key={stn.id}
                                position={[stn.latitude, stn.longitude]}
                                icon={createMarkerIcon(stn.temperature, stn.type)}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedStation(stn);
                                    }
                                }}
                            >
                                <Popup>
                                    <div className="popup-details">
                                        <h3 className="popup-title">{stn.name}</h3>
                                        <div className="sea-info-row">
                                            <span className="label">Type :</span>
                                            <span className="value capitalize">{stn.type === 'bouee' ? 'Bouée météo' : 'Bateau / Navire'}</span>
                                        </div>
                                        <div className="sea-info-row">
                                            <span className="label">Température :</span>
                                            <span className="value text-warning">{stn.temperature !== null ? `${stn.temperature.toFixed(1)} °C` : 'N/A'}</span>
                                        </div>
                                        <div className="sea-info-row">
                                            <span className="label">Relevé :</span>
                                            <span className="value">{stn.time || 'N/A'} (UTC)</span>
                                        </div>
                                        <div className="sea-info-row">
                                            <span className="label">Coords :</span>
                                            <span className="value">{stn.latitude.toFixed(3)}N, {stn.longitude.toFixed(3)}E</span>
                                        </div>
                                        <a 
                                            href={`https://www.meteociel.fr/temps-reel/obs_boueebateau.php?code2=${stn.id}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="popup-link"
                                        >
                                            Fiche Meteociel complète &rarr;
                                        </a>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                {/* Sidebar Controls */}
                <div className="sea-sidebar">
                    <div className="filter-section">
                        <span className="filter-title">Recherche</span>
                        <input
                            type="text"
                            placeholder="Nom ou code station..."
                            className="sea-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="filter-section">
                        <span className="filter-title">Filtrer par type</span>
                        <div className="filter-buttons">
                            <button 
                                className={`sea-btn ${filterType === 'all' ? 'active' : ''}`}
                                onClick={() => setFilterType('all')}
                            >
                                <Compass size={16} />
                                <span>Tous ({stations.length})</span>
                            </button>
                            <button 
                                className={`sea-btn ${filterType === 'bouee' ? 'active' : ''}`}
                                onClick={() => setFilterType('bouee')}
                            >
                                <Waves size={16} />
                                <span>Bouées ({stations.filter(s => s.type === 'bouee').length})</span>
                            </button>
                            <button 
                                className={`sea-btn ${filterType === 'bateau' ? 'active' : ''}`}
                                onClick={() => setFilterType('bateau')}
                            >
                                <Anchor size={16} />
                                <span>Bateaux ({stations.filter(s => s.type === 'bateau').length})</span>
                            </button>
                        </div>
                    </div>

                    {selectedStation && (
                        <div className="sea-info-card">
                            <h2>Détail Station</h2>
                            <div className="sea-info-row">
                                <span className="label">Nom</span>
                                <span className="value">{selectedStation.name}</span>
                            </div>
                            <div className="sea-info-row">
                                <span className="label">Code</span>
                                <span className="value">{selectedStation.id}</span>
                            </div>
                            <div className="sea-info-row">
                                <span className="label">Température</span>
                                <span className="value temp">
                                    {selectedStation.temperature !== null ? `${selectedStation.temperature.toFixed(1)} °C` : 'N/A'}
                                </span>
                            </div>
                            <div className="sea-info-row">
                                <span className="label">Heure (UTC)</span>
                                <span className="value">{selectedStation.time || 'N/A'}</span>
                            </div>
                            <div className="sea-info-row">
                                <span className="label">Latitude</span>
                                <span className="value">{selectedStation.latitude}° N</span>
                            </div>
                            <div className="sea-info-row">
                                <span className="label">Longitude</span>
                                <span className="value">{selectedStation.longitude}° E</span>
                            </div>
                        </div>
                    )}

                    <div className="filter-section">
                        <span className="filter-title">Légende</span>
                        <div className="legend-grid">
                            {SEA_TEMP_SCALE.map((item, idx) => (
                                <div className="legend-item" key={idx}>
                                    <div className="legend-color-box" style={{ backgroundColor: item.color }}></div>
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="sea-info-card" style={{ background: 'rgba(14, 165, 233, 0.05)', borderColor: 'rgba(14, 165, 233, 0.2)' }}>
                        <div className="flex gap-2 text-sky-400 mb-1 items-center">
                            <Info size={16} />
                            <span className="font-semibold text-xs text-sky-400 uppercase tracking-wider">Source</span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed m-0">
                            Données temps réel issues de Meteociel (SST Medspiration & RGHSST).
                            Mise à jour quotidiennement en soirée.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
