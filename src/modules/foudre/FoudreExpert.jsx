import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { geoConicConformal, geoPath } from "d3-geo";
import { createClient } from '@supabase/supabase-js';
import { REGIONS, DEPARTMENTS } from "../../data/departments";
import { MAIN_CITIES } from "../../data/mainCities";
import { Download, RefreshCw, Zap, Calendar, Search, Map as MapIcon, Maximize, Palette, Type, Filter, Building2, LayoutGrid } from "lucide-react";
import { LIGHTNING_DESIGNS } from './LightningStyles';
import html2canvas from "html2canvas";
import { format, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import './FoudreFrance.css';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Cache global pour le GeoJSON
const GEO_CACHE = new Map();

const HOUR_COLORS = [
    "#0000FF", "#0022FF", "#0044FF", "#0066FF", "#0088FF", "#00AAFF", // 0h-5h (Bleus)
    "#00CCFF", "#00EEFF", "#00FFDD", "#00FFBB", "#00FF99", "#00FF77", // 6h-11h (Cyans/Verts)
    "#00FF00", "#77FF00", "#BBFF00", "#FFFF00", "#FFCC00", "#FFAA00", // 12h-17h (Vert/Jaune/Orange)
    "#FF8800", "#FF6600", "#FF4400", "#FF2200", "#FF0000", "#8B0000"  // 18h-23h (Rouge/Brun)
];

const MAP_PALETTES = {
    default: { name: "Classique", fill: "#f1f5f9", stroke: "#000", bg: "#ffffff" },
    blue: { name: "Océan", fill: "#dbeafe", stroke: "#000", bg: "#f0f9ff" }
};

const ALL_DEPTS = [...DEPARTMENTS.map(d => d.code), '2A', '2B'].filter((v, i, a) => a.indexOf(v) === i);

const FoudreExpert = () => {
    const navigate = useNavigate();
    const WIDTH = 1200;
    const HEIGHT = 900;

    // États Géographiques (Style Générateur)
    const [geoMode, setGeoMode] = useState("france"); // "region", "dept", "france"
    const [selectedRegion, setSelectedRegion] = useState("Hauts-de-France");
    const [selectedDept, setSelectedDept] = useState("59");
    const [geoData, setGeoData] = useState(null);

    // États Données
    const [strikes, setStrikes] = useState([]);
    const [loading, setLoading] = useState(false);
    const todayStr = new Date().toLocaleDateString('sv-SE');
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [isRange, setIsRange] = useState(false);

    // États Style
    const [mapPalette, setMapPalette] = useState("default");
    const [showLabels, setShowLabels] = useState(true);
    const [showCities, setShowCities] = useState(true);
    const [showLogo, setShowLogo] = useState(true);
    const [strikeSize, setStrikeSize] = useState(4);
    const [useHeatmap, setUseHeatmap] = useState(false);
    const [foudreDesign, setFoudreDesign] = useState("Classic");

    const isLive = !isRange && startDate === new Date().toISOString().split('T')[0];

    // Chargement du GeoJSON
    useEffect(() => {
        const loadGeo = async () => {
            const regionDepts = geoMode === "france" ? ALL_DEPTS :
                geoMode === "dept" ? [selectedDept] :
                    (REGIONS[selectedRegion] || []);

            const geoKey = `geo-${geoMode}-${geoMode === 'region' ? selectedRegion : geoMode === 'dept' ? selectedDept : 'france'}`;

            if (GEO_CACHE.has(geoKey)) {
                setGeoData(GEO_CACHE.get(geoKey));
                return;
            }

            if (!GEO_CACHE.has('base-fr')) {
                const res = await fetch("https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson");
                GEO_CACHE.set('base-fr', await res.json());
            }

            const filtered = {
                type: "FeatureCollection",
                features: GEO_CACHE.get('base-fr').features.filter(f => regionDepts.includes(f.properties.code))
            };
            GEO_CACHE.set(geoKey, filtered);
            setGeoData(filtered);
        };
        loadGeo();
    }, [geoMode, selectedRegion, selectedDept]);

    // Chargement des impacts
    const fetchStrikes = async () => {
        setLoading(true);
        try {
            if (!startDate || (isRange && !endDate)) return;
            const sDate = new Date(startDate);
            const eDate = isRange ? new Date(endDate) : sDate;
            if (!isValid(sDate) || !isValid(eDate)) return;

            const getDays = (s, e) => {
                const a = [];
                let curr = new Date(s);
                const end = new Date(e);
                // Sécurité pour éviter les boucles infinies ou trop longues
                let limit = 0;
                while (curr <= end && limit < 31) {
                    a.push(curr.toISOString().split('T')[0]);
                    curr.setDate(curr.getDate() + 1);
                    limit++;
                }
                return a;
            };

            // FETCH STRATEGY:
            // 1. If Date == TODAY (Browser Local) : Use Live API Agate
            // 2. If Date < TODAY : Use Supabase History

            const todayStr = format(new Date(), "yyyy-MM-dd");
            const isToday = startDate === todayStr;
            let allAcc = [];

            if (isToday && !isRange) {
                // LIVE MODE (Today only, no range)
                console.log("⚡ Fetching Live Agate data for Today...");
                const ds = startDate.replace(/-/g, '');
                const url = `/api-agate/ORAGE/orage/ws/wsOragesGMaps.php?date=${ds}&heureD=00&heureF=23&pass=jh2kH3,R&_=${Date.now()}`;

                let res = await fetch(url);

                // Route de secours
                const contentType = res.headers.get("content-type");
                if (res.status === 404 || (contentType && contentType.includes("text/html"))) {
                    const backupUrl = `/ORAGE/orage/ws/wsOragesGMaps.php?date=${ds}&heureD=00&heureF=23&pass=jh2kH3,R&_=${Date.now()}`;
                    res = await fetch(backupUrl);
                }

                if (res.ok) {
                    const api = await res.json();
                    if (Array.isArray(api)) {
                        allAcc = api.map((s, i) => {
                            const d = new Date(`${s.date.replace(/\//g, '-')}T${s.heure}+01:00`);
                            return {
                                lat: parseFloat(s.lat), lon: parseFloat(s.lon),
                                time: d.getTime(), h: d.getHours(),
                                raw: s.heure, date: s.date,
                                id: `live-${d.getTime()}-${i}`,
                                isRecent: (Date.now() - d.getTime()) / 60000 < 30
                            };
                        }).sort((a, b) => b.time - a.time);
                    }
                }
            } else {
                // ARCHIVE MODE (Supabase)
                console.log(`📜 Loading history from Supabase for ${startDate}...`);
                const targetDays = isRange ? getDays(startDate, endDate) : [startDate];
                let allFetched = [];


                for (const dStr of targetDays) {
                    let from = 0;
                    const dStart = `${dStr}T00:00:00Z`;
                    const dEnd = `${dStr}T23:59:59Z`;

                    while (true) {
                        const { data, error } = await supabase
                            .from('lightning_strikes')
                            .select('lat, lon, strike_time')
                            .gte('strike_time', dStart)
                            .lte('strike_time', dEnd)
                            .range(from, from + 999);

                        if (error) break;
                        if (!data || data.length === 0) break;

                        allFetched.push(...data);
                        if (data.length < 1000) break;
                        from += 1000;
                    }
                }

                allAcc = allFetched.map((s, i) => {
                    const d = new Date(s.strike_time);
                    return {
                        lat: s.lat, lon: s.lon,
                        time: d.getTime(), h: d.getHours(), // UTC stored, Local displayed via getHours()
                        raw: d.toLocaleTimeString('fr-FR'),
                        date: d.toLocaleDateString('fr-FR'),
                        id: `arch-${i}`
                    };
                }).sort((a, b) => b.time - a.time);
            }

            setStrikes(allAcc);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStrikes(); }, [startDate, endDate, isRange]);

    const projection = useMemo(() => {
        if (!geoData) return null;
        return geoConicConformal().fitExtent([[50, 80], [WIDTH - 50, HEIGHT - 50]], geoData);
    }, [geoData]);

    const pathGenerator = useMemo(() => {
        if (!projection) return null;
        return geoPath().projection(projection);
    }, [projection]);

    const exportMap = () => {
        const el = document.getElementById("export-foudre");
        html2canvas(el, { scale: 2 }).then(canvas => {
            const link = document.createElement("a");
            link.download = `carte-foudre-${geoMode}-${startDate}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    };

    const mp = MAP_PALETTES[mapPalette];

    return (
        <div style={{ padding: '20px', background: '#f1f5f9', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <header style={{ maxWidth: '1200px', margin: '0 auto 15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: '#ef4444', padding: '8px', borderRadius: '10px', color: 'white', display: 'flex' }}>
                            <Zap fill="white" size={24} />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 1000, color: '#0f172a' }}>Générateur Foudre Expert</h1>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                {strikes.length.toLocaleString()} impacts nationaux | {
                                    strikes.filter(s => {
                                        if (!projection) return false;
                                        const c = projection([s.lon, s.lat]);
                                        return c && c[0] >= 0 && c[0] <= WIDTH && c[1] >= 0 && c[1] <= HEIGHT;
                                    }).length.toLocaleString()
                                } sur la zone affichée
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={fetchStrikes} disabled={loading} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} color="#0f172a" />
                        </button>
                        <button onClick={exportMap} style={{ padding: '10px 20px', borderRadius: '10px', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Download size={18} /> EXPORTER PNG
                        </button>
                    </div>
                </div>

                {/* Barre de contrôle style Générateur */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: 'white', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    {/* Zone Géo */}
                    <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                        <button onClick={() => setGeoMode("france")} style={{ padding: '6px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', background: geoMode === 'france' ? 'white' : 'transparent', color: geoMode === 'france' ? '#ef4444' : '#64748b' }}>France</button>
                        <button onClick={() => setGeoMode("region")} style={{ padding: '6px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', background: geoMode === 'region' ? 'white' : 'transparent', color: geoMode === 'region' ? '#ef4444' : '#64748b' }}>Région</button>
                        <button onClick={() => setGeoMode("dept")} style={{ padding: '6px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', background: geoMode === 'dept' ? 'white' : 'transparent', color: geoMode === 'dept' ? '#ef4444' : '#64748b' }}>Dépt</button>
                    </div>

                    {geoMode === 'region' && (
                        <select
                            value={selectedRegion}
                            onChange={e => setSelectedRegion(e.target.value)}
                            style={{ padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }}
                        >
                            {Object.keys(REGIONS).sort().map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    )}
                    {geoMode === 'dept' && (
                        <select
                            value={selectedDept}
                            onChange={e => setSelectedDept(e.target.value)}
                            style={{ padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }}
                        >
                            {DEPARTMENTS.map(d => <option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}
                        </select>
                    )}

                    <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }} />

                    {/* Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={18} color="#64748b" />
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ p: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 800 }} />
                        {isRange && (
                            <><span style={{ fontWeight: 700 }}>au</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ p: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 800 }} /></>
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                            <input type="checkbox" checked={isRange} onChange={e => setIsRange(e.target.checked)} /> Période
                        </label>
                    </div>

                    <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }} />

                    {/* Style */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Palette size={18} color="#64748b" />
                        <select value={mapPalette} onChange={e => setMapPalette(e.target.value)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }}>
                            {Object.entries(MAP_PALETTES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Maximize size={16} color="#64748b" />
                            <input type="range" min="2" max="15" value={strikeSize} onChange={e => setStrikeSize(parseInt(e.target.value))} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <LayoutGrid size={16} color="#64748b" />
                            <select value={foudreDesign} onChange={e => setFoudreDesign(e.target.value)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }}>
                                {Object.entries(LIGHTNING_DESIGNS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                            </select>
                        </div>

                        <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }} />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showCities} onChange={e => setShowCities(e.target.checked)} /> Villes
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} /> Logo
                        </label>
                    </div>
                </div>
            </header>

            <main style={{ display: 'flex', justifyContent: 'center' }}>
                <div id="export-foudre" style={{ width: WIDTH, height: HEIGHT, background: mp.bg, borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative', border: `8px solid ${mp.stroke}22` }}>
                    <svg width={WIDTH} height={HEIGHT}>
                        {/* Définitions pour le masquage (Clipping) */}
                        <defs>
                            <clipPath id="region-clip">
                                {geoData && geoData.features.map((f, i) => (
                                    <path key={i} d={pathGenerator(f)} />
                                ))}
                            </clipPath>
                        </defs>

                        {/* Fond Carte */}
                        <g>
                            {geoData && pathGenerator && geoData.features.map((f, i) => (
                                <path key={i} d={pathGenerator(f)} fill={mp.fill} stroke="#000" strokeWidth={1.5} />
                            ))}
                        </g>

                        {/* Impacts (Masqués par la région) */}
                        <g clipPath="url(#region-clip)">
                            {projection && strikes.map((s) => {
                                const coords = projection([s.lon, s.lat]);
                                if (!coords) return null;
                                const color = HOUR_COLORS[s.h] || '#ff0000';

                                if (foudreDesign === 'Classic') {
                                    return (
                                        <circle
                                            key={s.id}
                                            cx={coords[0]}
                                            cy={coords[1]}
                                            r={s.isRecent ? strikeSize * 1.3 : strikeSize}
                                            fill={color}
                                            fillOpacity={1}
                                            stroke="#000"
                                            strokeWidth={1}
                                        />
                                    );
                                } else if (foudreDesign === 'Glow') {
                                    return (
                                        <g key={s.id}>
                                            <circle cx={coords[0]} cy={coords[1]} r={strikeSize * 3} fill={color} fillOpacity={0.3} />
                                            <circle cx={coords[0]} cy={coords[1]} r={strikeSize} fill="#fff" />
                                        </g>
                                    );
                                } else if (foudreDesign === 'Cross') {
                                    return (
                                        <g key={s.id} stroke={color} strokeWidth={2}>
                                            <line x1={coords[0] - strikeSize * 1.5} y1={coords[1]} x2={coords[0] + strikeSize * 1.5} y2={coords[1]} />
                                            <line x1={coords[0]} y1={coords[1] - strikeSize * 1.5} x2={coords[0]} y2={coords[1] + strikeSize * 1.5} />
                                            <circle cx={coords[0]} cy={coords[1]} r={strikeSize * 0.5} fill="#fff" stroke="none" />
                                        </g>
                                    );
                                } else if (foudreDesign === 'Bolt') {
                                    return (
                                        <path
                                            key={s.id}
                                            d={`M ${coords[0]} ${coords[1] - strikeSize * 2} L ${coords[0] - strikeSize} ${coords[1] + strikeSize * 0.5} L ${coords[0]} ${coords[1] + strikeSize * 0.5} L ${coords[0] - strikeSize * 0.5} ${coords[1] + strikeSize * 2} L ${coords[0] + strikeSize} ${coords[1] - strikeSize * 0.5} L ${coords[0]} ${coords[1] - strikeSize * 0.5} Z`}
                                            fill={color}
                                            stroke="#000"
                                            strokeWidth={0.5}
                                        />
                                    );
                                } else if (foudreDesign === 'Ring') {
                                    return (
                                        <g key={s.id}>
                                            <circle cx={coords[0]} cy={coords[1]} r={strikeSize * 1.5} fill="none" stroke={color} strokeWidth={2.5} />
                                            <circle cx={coords[0]} cy={coords[1]} r={strikeSize * 0.6} fill={color} />
                                        </g>
                                    );
                                } else if (foudreDesign === 'Diamond') {
                                    return (
                                        <path
                                            key={s.id}
                                            d={`M ${coords[0]} ${coords[1] - strikeSize * 1.5} L ${coords[0] + strikeSize * 1.5} ${coords[1]} L ${coords[0]} ${coords[1] + strikeSize * 1.5} L ${coords[0] - strikeSize * 1.5} ${coords[1]} Z`}
                                            fill={color}
                                            stroke="#fff"
                                            strokeWidth={1}
                                        />
                                    );
                                } else if (foudreDesign === 'Square') {
                                    return (
                                        <rect
                                            key={s.id}
                                            x={coords[0] - strikeSize}
                                            y={coords[1] - strikeSize}
                                            width={strikeSize * 2}
                                            height={strikeSize * 2}
                                            fill={color}
                                            stroke="#000"
                                            strokeWidth={1}
                                        />
                                    );
                                } else if (foudreDesign === 'Triangle') {
                                    return (
                                        <path
                                            key={s.id}
                                            d={`M ${coords[0]} ${coords[1] - strikeSize * 1.5} L ${coords[0] + strikeSize * 1.5} ${coords[1] + strikeSize * 1.2} L ${coords[0] - strikeSize * 1.5} ${coords[1] + strikeSize * 1.2} Z`}
                                            fill={color}
                                            stroke="#000"
                                            strokeWidth={1}
                                        />
                                    );
                                } else if (foudreDesign === 'Hexagon') {
                                    const points = [];
                                    for (let i = 0; i < 6; i++) {
                                        const angle = i * Math.PI / 3;
                                        points.push(`${coords[0] + strikeSize * 1.6 * Math.cos(angle)},${coords[1] + strikeSize * 1.6 * Math.sin(angle)}`);
                                    }
                                    return (
                                        <polygon
                                            key={s.id}
                                            points={points.join(' ')}
                                            fill={color}
                                            stroke="rgba(255,255,255,0.5)"
                                            strokeWidth={1}
                                        />
                                    );
                                } else {
                                    return (
                                        <circle
                                            key={s.id}
                                            cx={coords[0]}
                                            cy={coords[1]}
                                            r={strikeSize}
                                            fill={color}
                                            stroke="#000"
                                            strokeWidth={1}
                                        />
                                    );
                                }
                            })}
                        </g>

                        {/* Villes Principales */}
                        {showCities && (
                            <g>
                                {projection && MAIN_CITIES.map((city, i) => {
                                    const coords = projection([city.lon, city.lat]);
                                    if (!coords) return null;

                                    // Vérifier si la ville est dans le GeoJSON affiché
                                    if (coords[0] < 0 || coords[0] > WIDTH || coords[1] < 0 || coords[1] > HEIGHT) return null;

                                    return (
                                        <g key={i} transform={`translate(${coords[0]}, ${coords[1]})`}>
                                            <circle r="3.5" fill="#000" />
                                            <text
                                                y="-10"
                                                textAnchor="middle"
                                                style={{
                                                    fontSize: '15px',
                                                    fontWeight: '1000',
                                                    fill: '#000',
                                                    stroke: '#fff',
                                                    strokeWidth: '3.5px',
                                                    paintOrder: 'stroke'
                                                }}
                                            >
                                                {city.name}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        )}
                    </svg>

                    {/* Légende flottante Compacte */}
                    <div style={{
                        position: 'absolute',
                        top: '25px',
                        left: (geoMode === 'dept' || geoMode === 'region' && ['Corse', 'Bretagne'].some(r => selectedRegion.includes(r))) ? 'auto' : '25px',
                        right: (geoMode === 'dept' || geoMode === 'region' && ['Corse', 'Bretagne'].some(r => selectedRegion.includes(r))) ? '25px' : 'auto',
                        background: 'rgba(255,255,255,0.94)',
                        backdropFilter: 'blur(10px)',
                        padding: '12px 15px',
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                        width: '240px',
                        zIndex: 10
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={15} color="white" fill="white" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chronologie</h2>
                                <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>
                                    {isValid(new Date(startDate))
                                        ? (isRange && endDate && isValid(new Date(endDate))
                                            ? `Du ${format(new Date(startDate), "dd/MM")} au ${format(new Date(endDate), "dd/MM/yy")}`
                                            : format(new Date(startDate), "d MMMM yyyy", { locale: fr }))
                                        : "Date invalide"}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                            {[0, 4, 8, 12, 16, 20].map((hBase) => (
                                <div key={hBase} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ width: '100%', height: '6px', background: HOUR_COLORS[hBase], borderRadius: '2px' }} />
                                    <span style={{ fontSize: '0.5rem', fontWeight: 800, color: '#94a3b8', textAlign: 'center' }}>{hBase}h</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'simple-pulse 1s infinite' }} />
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#ef4444' }}>DIRECT</span>
                            </div>
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b' }}>
                                {strikes.filter(s => {
                                    if (!projection) return false;
                                    const c = projection([s.lon, s.lat]);
                                    return c && c[0] >= 0 && c[0] <= WIDTH && c[1] >= 0 && c[1] <= HEIGHT;
                                }).length} IMPACTS
                            </span>
                        </div>
                    </div>

                    {/* Logo (Positionné en bas à gauche et débrayable) */}
                    {showLogo && (
                        <img
                            src="/logo.jpg"
                            style={{
                                position: 'absolute',
                                bottom: '25px',
                                left: '25px',
                                height: '55px',
                                borderRadius: '10px',
                                opacity: 0.95,
                                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                            }}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default FoudreExpert;
