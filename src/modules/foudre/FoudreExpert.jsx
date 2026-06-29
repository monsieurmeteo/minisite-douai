import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { geoConicConformal, geoPath } from "d3-geo";
import { createClient } from '@supabase/supabase-js';
import { REGIONS, DEPARTMENTS } from "../../data/departments";
import { MAIN_CITIES } from "../../data/mainCities";
import { Download, RefreshCw, Zap, Calendar, Search, Maximize, Palette, LayoutGrid, X, MapPin } from "lucide-react";
import { LIGHTNING_DESIGNS } from './LightningStyles';
import html2canvas from "html2canvas";
import { format, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import './FoudreFrance.css';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

const GEO_CACHE = new Map();

const HOUR_COLORS = [
    "#0000FF","#0022FF","#0044FF","#0066FF","#0088FF","#00AAFF",
    "#00CCFF","#00EEFF","#00FFDD","#00FFBB","#00FF99","#00FF77",
    "#00FF00","#77FF00","#BBFF00","#FFFF00","#FFCC00","#FFAA00",
    "#FF8800","#FF6600","#FF4400","#FF2200","#FF0000","#8B0000"
];

const MAP_PALETTES = {
    default: { name: "Classique", fill: "#f1f5f9", stroke: "#000", bg: "#ffffff" },
    blue:    { name: "Océan",     fill: "#dbeafe", stroke: "#000", bg: "#f0f9ff" }
};

const ALL_DEPTS = [...DEPARTMENTS.map(d => d.code), '2A', '2B'].filter((v,i,a) => a.indexOf(v) === i);
const RADII_KM    = [1, 3, 5, 10, 20];
const RADII_COLORS = ['#cc0000','#cc2200','#cc5500','#cc8800','#ccaa00'];

const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const WIDTH = 960, HEIGHT = 720;

export default function FoudreExpert() {
    const navigate = useNavigate();

    // ── Géo ──────────────────────────────────────────────
    const [geoMode, setGeoMode]           = useState("france");
    const [selectedRegion, setSelectedRegion] = useState("Hauts-de-France");
    const [selectedDept, setSelectedDept]     = useState("59");
    const [geoData, setGeoData]           = useState(null);

    // ── Commune ───────────────────────────────────────────
    const [communeQuery, setCommuneQuery]       = useState('');
    const [communeSuggestions, setCommuneSuggestions] = useState([]);
    const [selectedCommune, setSelectedCommune]   = useState(null);
    const [showSuggestions, setShowSuggestions]   = useState(false);
    const inputRef      = useRef(null);
    const suggestRef    = useRef(null);

    // ── Données ───────────────────────────────────────────
    const [strikes, setStrikes] = useState([]);
    const [loading, setLoading] = useState(false);
    const todayLocal = new Date().toLocaleDateString('sv-SE');
    const [startDate, setStartDate] = useState(todayLocal);
    const [endDate, setEndDate]     = useState(todayLocal);
    const [isRange, setIsRange]     = useState(false);

    // ── Style ─────────────────────────────────────────────
    const [mapPalette, setMapPalette]   = useState("default");
    const [showCities, setShowCities]   = useState(true);
    const [showLogo, setShowLogo]       = useState(true);
    const [strikeSize, setStrikeSize]   = useState(4);
    const [foudreDesign, setFoudreDesign] = useState("Classic");

    // ── Chargement GeoJSON ────────────────────────────────
    useEffect(() => {
        const load = async () => {
            // En mode commune, on charge toujours la France entière
            const depts = (geoMode === "france" || geoMode === "commune")
                ? ALL_DEPTS
                : geoMode === "dept"
                    ? [selectedDept]
                    : (REGIONS[selectedRegion] || []);

            const key = geoMode === "commune" ? "geo-france"
                : `geo-${geoMode}-${geoMode==='region'?selectedRegion:geoMode==='dept'?selectedDept:'france'}`;

            if (GEO_CACHE.has(key)) { setGeoData(GEO_CACHE.get(key)); return; }
            if (!GEO_CACHE.has('base-fr')) {
                const res = await fetch("https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson");
                GEO_CACHE.set('base-fr', await res.json());
            }
            const filtered = { type:"FeatureCollection", features: GEO_CACHE.get('base-fr').features.filter(f => depts.includes(f.properties.code)) };
            GEO_CACHE.set(key, filtered);
            setGeoData(filtered);
        };
        load();
    }, [geoMode, selectedRegion, selectedDept]);

    // ── Recherche commune ─────────────────────────────────
    const searchCommune = useCallback(async (q) => {
        if (q.length < 2) { setCommuneSuggestions([]); setShowSuggestions(false); return; }
        try {
            const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&limit=8&fields=nom,code,codesPostaux,centre,codeDepartement&boost=population`);
            if (!res.ok) return;
            const data = await res.json();
            const list = data.map(c => ({
                name: c.nom, cp: c.codesPostaux?.[0]||'', dept: c.codeDepartement,
                lat: c.centre?.coordinates?.[1], lon: c.centre?.coordinates?.[0]
            })).filter(c => c.lat && c.lon);
            setCommuneSuggestions(list);
            setShowSuggestions(list.length > 0);
        } catch(e) {}
    }, []);

    useEffect(() => { const t = setTimeout(() => searchCommune(communeQuery), 300); return () => clearTimeout(t); }, [communeQuery, searchCommune]);

    useEffect(() => {
        const h = (e) => {
            if (suggestRef.current && !suggestRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) setShowSuggestions(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // ── Fetch impacts ─────────────────────────────────────
    const fetchStrikes = async () => {
        setLoading(true);
        try {
            const sDate = new Date(startDate), eDate = isRange ? new Date(endDate) : sDate;
            if (!isValid(sDate) || !isValid(eDate)) return;
            const getDays = (s,e) => { const a=[]; let c=new Date(s),lim=0; while(c<=e&&lim<31){a.push(c.toISOString().split('T')[0]);c.setDate(c.getDate()+1);lim++;} return a; };
            const todayStr = format(new Date(),"yyyy-MM-dd");
            let allAcc = [];

            if (startDate === todayStr && !isRange) {
                const ds = startDate.replace(/-/g,'');
                let res = await fetch(`/api-agate/ORAGE/orage/ws/wsOragesGMaps.php?date=${ds}&heureD=00&heureF=23&pass=jh2kH3,R&_=${Date.now()}`);
                const ct = res.headers.get("content-type");
                if (res.status===404||(ct&&ct.includes("text/html")))
                    res = await fetch(`/ORAGE/orage/ws/wsOragesGMaps.php?date=${ds}&heureD=00&heureF=23&pass=jh2kH3,R&_=${Date.now()}`);
                if (res.ok) {
                    const api = await res.json();
                    if (Array.isArray(api)) allAcc = api.map((s,i) => {
                        const d = new Date(`${s.date.replace(/\//g,'-')}T${s.heure}+01:00`);
                        return { lat:parseFloat(s.lat), lon:parseFloat(s.lon), time:d.getTime(), h:d.getHours(), raw:s.heure, date:s.date, id:`live-${d.getTime()}-${i}`, isRecent:(Date.now()-d.getTime())/60000<30 };
                    }).sort((a,b)=>b.time-a.time);
                }
            } else {
                const days = isRange ? getDays(startDate,endDate) : [startDate];
                let all = [];
                for (const dStr of days) {
                    let from=0;
                    while(true) {
                        const {data,error} = await supabase.from('lightning_strikes').select('lat,lon,strike_time')
                            .gte('strike_time',`${dStr}T00:00:00Z`).lte('strike_time',`${dStr}T23:59:59Z`).range(from,from+999);
                        if (error||!data||data.length===0) break;
                        all.push(...data);
                        if (data.length<1000) break;
                        from+=1000;
                    }
                }
                allAcc = all.map((s,i)=>{ const d=new Date(s.strike_time); return {lat:s.lat,lon:s.lon,time:d.getTime(),h:d.getHours(),raw:d.toLocaleTimeString('fr-FR'),date:d.toLocaleDateString('fr-FR'),id:`arch-${i}`}; }).sort((a,b)=>b.time-a.time);
            }
            setStrikes(allAcc);
        } catch(e){ console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchStrikes(); }, [startDate, endDate, isRange]);

    // ── Projection France (utilisée pour TOUS les modes) ──
    const projection = useMemo(() => {
        if (!geoData) return null;
        // Pour commune : on se base sur France entière mais on applique un zoom SVG ensuite
        const baseData = geoData;
        return geoConicConformal().fitExtent([[50,80],[WIDTH-50,HEIGHT-50]], baseData);
    }, [geoData]);

    const pathGenerator = useMemo(() => {
        if (!projection) return null;
        return geoPath().projection(projection);
    }, [projection]);

    // ── Zoom SVG pour mode commune ─────────────────────────
    // On projette la commune avec la projection France, puis on zoom/translate pour centrer
    const communeZoom = useMemo(() => {
        if (!selectedCommune || !projection || geoMode !== 'commune') return null;
        const [cx, cy] = projection([selectedCommune.lon, selectedCommune.lat]);
        // Calcul px/km en projetant un point 1km au nord
        const [, cy2] = projection([selectedCommune.lon, selectedCommune.lat + 1/111.32]);
        const pxPerKm = Math.abs(cy - cy2);
        // On veut que le rayon max (20km) occupe ~380px (sur 450 de demi-hauteur)
        const scale = 380 / (20 * pxPerKm);
        const tx = WIDTH/2 - cx*scale;
        const ty = HEIGHT/2 - cy*scale;
        return { cx, cy, scale, pxPerKm, tx, ty, svgTransform: `translate(${tx},${ty}) scale(${scale})` };
    }, [selectedCommune, projection, geoMode]);

    // ── Impacts par rayon ──────────────────────────────────
    const impactsByRadius = useMemo(() => {
        if (!selectedCommune) return {};
        return RADII_KM.reduce((acc, r) => {
            acc[r] = strikes.filter(s => haversineKm(selectedCommune.lat, selectedCommune.lon, s.lat, s.lon) <= r).length;
            return acc;
        }, {});
    }, [strikes, selectedCommune]);

    const closestStrike = useMemo(() => {
        if (!selectedCommune || strikes.length === 0) return null;
        let minDist = Infinity, best = null;
        for (const s of strikes) {
            const d = haversineKm(selectedCommune.lat, selectedCommune.lon, s.lat, s.lon);
            if (d < minDist) { minDist = d; best = s; }
        }
        return best && minDist <= 20 ? { ...best, distance: minDist } : null;
    }, [strikes, selectedCommune]);

    // ── Impacts visibles ───────────────────────────────────
    const visibleStrikes = useMemo(() => {
        if (geoMode === 'commune' && selectedCommune)
            return strikes.filter(s => haversineKm(selectedCommune.lat, selectedCommune.lon, s.lat, s.lon) <= 20);
        if (!projection) return [];
        return strikes.filter(s => { const c = projection([s.lon,s.lat]); return c&&c[0]>=0&&c[0]<=WIDTH&&c[1]>=0&&c[1]<=HEIGHT; });
    }, [strikes, geoMode, selectedCommune, projection]);

    const exportMap = () => {
        html2canvas(document.getElementById("export-foudre"),{scale:2}).then(canvas => {
            const a = document.createElement("a");
            a.download = `foudre-${geoMode==='commune'&&selectedCommune?selectedCommune.name:geoMode}-${startDate}.png`;
            a.href = canvas.toDataURL(); a.click();
        });
    };

    const mp = MAP_PALETTES[mapPalette];

    // ── Rendu d'un impact ──────────────────────────────────────────────────────
    // scale : facteur de zoom SVG appliqué (pour corriger les épaisseurs de trait)
    const renderStrike = (s, proj, sizeOverride, scale) => {
        const coords = proj([s.lon, s.lat]);
        if (!coords) return null;
        const sz = sizeOverride ?? strikeSize;
        const sw = scale ? 1 / scale : 1; // strokeWidth en espace projection
        const color = HOUR_COLORS[s.h] || '#ff0000';
        if (foudreDesign==='Glow')    return <g key={s.id}><circle cx={coords[0]} cy={coords[1]} r={sz*3} fill={color} fillOpacity={0.25}/><circle cx={coords[0]} cy={coords[1]} r={sz} fill="#fff"/></g>;
        if (foudreDesign==='Cross')   return <g key={s.id} stroke={color} strokeWidth={sw*1.5}><line x1={coords[0]-sz*1.5} y1={coords[1]} x2={coords[0]+sz*1.5} y2={coords[1]}/><line x1={coords[0]} y1={coords[1]-sz*1.5} x2={coords[0]} y2={coords[1]+sz*1.5}/><circle cx={coords[0]} cy={coords[1]} r={sz*0.4} fill="#fff" stroke="none"/></g>;
        if (foudreDesign==='Ring')    return <g key={s.id}><circle cx={coords[0]} cy={coords[1]} r={sz*1.5} fill="none" stroke={color} strokeWidth={sw*2}/><circle cx={coords[0]} cy={coords[1]} r={sz*0.5} fill={color}/></g>;
        if (foudreDesign==='Diamond') return <path key={s.id} d={`M${coords[0]} ${coords[1]-sz*1.5}L${coords[0]+sz*1.5} ${coords[1]}L${coords[0]} ${coords[1]+sz*1.5}L${coords[0]-sz*1.5} ${coords[1]}Z`} fill={color} stroke="rgba(255,255,255,0.5)" strokeWidth={sw*0.8}/>;
        if (foudreDesign==='Bolt')    return <path key={s.id} d={`M${coords[0]} ${coords[1]-sz*2}L${coords[0]-sz} ${coords[1]+sz*.5}L${coords[0]} ${coords[1]+sz*.5}L${coords[0]-sz*.5} ${coords[1]+sz*2}L${coords[0]+sz} ${coords[1]-sz*.5}L${coords[0]} ${coords[1]-sz*.5}Z`} fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={sw*0.4}/>;
        // Classic (default)
        return <circle key={s.id} cx={coords[0]} cy={coords[1]} r={s.isRecent?sz*1.3:sz} fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth={sw}/>;
    };

    return (
        <div style={{padding:'20px',background:'#f1f5f9',minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>

            {/* ── HEADER ── */}
            <header style={{maxWidth:'1200px',margin:'0 auto 15px',display:'flex',flexDirection:'column',gap:'15px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'15px'}}>
                        <div style={{background:'#ef4444',padding:'8px',borderRadius:'10px',color:'white',display:'flex'}}>
                            <Zap fill="white" size={24}/>
                        </div>
                        <div>
                            <h1 style={{margin:0,fontSize:'1.6rem',fontWeight:1000,color:'#0f172a'}}>Générateur Foudre Expert</h1>
                            <p style={{margin:0,fontSize:'0.8rem',color:'#64748b'}}>
                                {strikes.length.toLocaleString()} impacts nationaux | {visibleStrikes.length.toLocaleString()} sur la zone
                                {geoMode==='commune'&&selectedCommune&&closestStrike&&` | ⚡ Plus proche : ${closestStrike.distance.toFixed(1)} km`}
                            </p>
                        </div>
                    </div>
                    <div style={{display:'flex',gap:'10px'}}>
                        <button onClick={fetchStrikes} disabled={loading} style={{padding:'10px 15px',borderRadius:'10px',border:'1px solid #e2e8f0',background:'white',cursor:'pointer'}}>
                            <RefreshCw size={18} className={loading?"animate-spin":""} color="#0f172a"/>
                        </button>
                        <button onClick={exportMap} style={{padding:'10px 20px',borderRadius:'10px',background:'#0f172a',color:'white',border:'none',cursor:'pointer',fontWeight:900,display:'flex',alignItems:'center',gap:'10px'}}>
                            <Download size={18}/> EXPORTER PNG
                        </button>
                    </div>
                </div>

                {/* ── BARRE CONTRÔLE ── */}
                <div style={{display:'flex',flexWrap:'wrap',gap:'12px',background:'white',padding:'15px',borderRadius:'15px',border:'1px solid #e2e8f0',alignItems:'center',boxShadow:'0 4px 6px -1px rgba(0,0,0,0.05)'}}>

                    {/* Mode géo */}
                    <div style={{display:'flex',gap:'4px',background:'#f1f5f9',padding:'4px',borderRadius:'10px'}}>
                        {[['france','France'],['region','Région'],['dept','Dépt']].map(([m,l])=>(
                            <button key={m} onClick={()=>setGeoMode(m)} style={{padding:'6px 14px',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:800,fontSize:'0.8rem',background:geoMode===m?'white':'transparent',color:geoMode===m?'#ef4444':'#64748b'}}>{l}</button>
                        ))}
                        <button onClick={()=>setGeoMode('commune')} style={{padding:'6px 14px',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:800,fontSize:'0.8rem',background:geoMode==='commune'?'white':'transparent',color:geoMode==='commune'?'#ef4444':'#64748b',display:'flex',alignItems:'center',gap:'5px'}}>
                            <MapPin size={13}/> Commune
                        </button>
                    </div>

                    {geoMode==='region'&&<select value={selectedRegion} onChange={e=>setSelectedRegion(e.target.value)} style={{padding:'8px',borderRadius:'10px',border:'1px solid #cbd5e1',fontWeight:700,outline:'none'}}>{Object.keys(REGIONS).sort().map(r=><option key={r} value={r}>{r}</option>)}</select>}
                    {geoMode==='dept'&&<select value={selectedDept} onChange={e=>setSelectedDept(e.target.value)} style={{padding:'8px',borderRadius:'10px',border:'1px solid #cbd5e1',fontWeight:700,outline:'none'}}>{DEPARTMENTS.map(d=><option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}</select>}

                    {/* Recherche commune */}
                    {geoMode==='commune'&&(
                        <div style={{position:'relative'}}>
                            <div style={{display:'flex',alignItems:'center',gap:'8px',background:'#f8fafc',border:'1px solid #cbd5e1',borderRadius:'10px',padding:'6px 12px'}}>
                                <Search size={16} color="#64748b"/>
                                <input ref={inputRef} type="text" placeholder="Rechercher une commune..." value={communeQuery}
                                    onChange={e=>setCommuneQuery(e.target.value)}
                                    onFocus={()=>communeSuggestions.length>0&&setShowSuggestions(true)}
                                    style={{border:'none',background:'transparent',outline:'none',fontWeight:700,fontSize:'0.85rem',width:'210px',color:'#0f172a'}}/>
                                {communeQuery&&<button onClick={()=>{setCommuneQuery('');setSelectedCommune(null);setCommuneSuggestions([]);}} style={{border:'none',background:'none',cursor:'pointer',padding:0,display:'flex'}}><X size={14} color="#94a3b8"/></button>}
                            </div>
                            {showSuggestions&&communeSuggestions.length>0&&(
                                <div ref={suggestRef} style={{position:'absolute',top:'100%',left:0,marginTop:'4px',background:'white',border:'1px solid #e2e8f0',borderRadius:'12px',boxShadow:'0 10px 25px rgba(0,0,0,0.12)',zIndex:1000,minWidth:'260px',overflow:'hidden'}}>
                                    {communeSuggestions.map((c,i)=>(
                                        <button key={i} onClick={()=>{setSelectedCommune(c);setCommuneQuery(`${c.name} (${c.cp})`);setShowSuggestions(false);}}
                                            style={{display:'flex',alignItems:'center',gap:'10px',width:'100%',padding:'10px 14px',border:'none',borderBottom:i<communeSuggestions.length-1?'1px solid #f1f5f9':'none',background:'white',cursor:'pointer',textAlign:'left'}}
                                            onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                                            onMouseLeave={e=>e.currentTarget.style.background='white'}>
                                            <MapPin size={14} color="#ef4444"/>
                                            <div><div style={{fontWeight:800,fontSize:'0.85rem',color:'#0f172a'}}>{c.name}</div><div style={{fontSize:'0.72rem',color:'#64748b'}}>{c.cp} — Dép. {c.dept}</div></div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{width:'1px',height:'30px',background:'#e2e8f0'}}/>

                    {/* Date */}
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <Calendar size={18} color="#64748b"/>
                        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{padding:'8px',borderRadius:'10px',border:'1px solid #cbd5e1',fontWeight:800}}/>
                        {isRange&&<><span style={{fontWeight:700}}>au</span><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{padding:'8px',borderRadius:'10px',border:'1px solid #cbd5e1',fontWeight:800}}/></>}
                        <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.8rem',fontWeight:700,color:'#475569',cursor:'pointer'}}>
                            <input type="checkbox" checked={isRange} onChange={e=>setIsRange(e.target.checked)}/> Période
                        </label>
                    </div>

                    <div style={{width:'1px',height:'30px',background:'#e2e8f0'}}/>

                    {/* Style */}
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <Palette size={18} color="#64748b"/>
                        <select value={mapPalette} onChange={e=>setMapPalette(e.target.value)} style={{padding:'8px',borderRadius:'10px',border:'1px solid #cbd5e1',fontWeight:700,outline:'none'}}>
                            {Object.entries(MAP_PALETTES).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
                        </select>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <Maximize size={16} color="#64748b"/>
                            <input type="range" min="2" max="15" value={strikeSize} onChange={e=>setStrikeSize(parseInt(e.target.value))}/>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <LayoutGrid size={16} color="#64748b"/>
                            <select value={foudreDesign} onChange={e=>setFoudreDesign(e.target.value)} style={{padding:'8px',borderRadius:'10px',border:'1px solid #cbd5e1',fontWeight:700,outline:'none'}}>
                                {Object.entries(LIGHTNING_DESIGNS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
                            </select>
                        </div>
                        <div style={{width:'1px',height:'30px',background:'#e2e8f0'}}/>
                        <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.8rem',fontWeight:700,color:'#475569',cursor:'pointer'}}><input type="checkbox" checked={showCities} onChange={e=>setShowCities(e.target.checked)}/> Villes</label>
                        <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.8rem',fontWeight:700,color:'#475569',cursor:'pointer'}}><input type="checkbox" checked={showLogo} onChange={e=>setShowLogo(e.target.checked)}/> Logo</label>
                    </div>
                </div>
            </header>

            {/* ── CARTE ── */}
            <main style={{display:'flex',justifyContent:'center'}}>
                <div id="export-foudre" style={{width:WIDTH,height:HEIGHT,background:mp.bg,borderRadius:'24px',boxShadow:'0 20px 40px rgba(0,0,0,0.1)',overflow:'hidden',position:'relative',border:`8px solid ${mp.stroke}22`}}>
                    <svg width={WIDTH} height={HEIGHT}>
                        <defs>
                            <clipPath id="map-clip">
                                {geoData?.features.map((f,i)=><path key={i} d={pathGenerator?.(f)}/>)}
                            </clipPath>
                        </defs>

                        {/* ── MODE COMMUNE : zoom SVG centré sur la commune ── */}
                        {geoMode==='commune'&&(
                            <>
                                {/* Groupe zoomé (fond carte + impacts) */}
                                <g transform={communeZoom?.svgTransform||''}>
                                    {/* Tous les départements France */}
                                    {geoData?.features.map((f,i)=>(
                                        <path key={i} d={pathGenerator?.(f)}
                                            fill={mp.fill}
                                            stroke="#888"
                                            strokeWidth={communeZoom?1/communeZoom.scale:1}/>
                                    ))}

                                    {/* Impacts dans un rayon de 22km — couleurs identiques au mode national */}
                                    {projection&&strikes
                                        .filter(s=>selectedCommune?haversineKm(selectedCommune.lat,selectedCommune.lon,s.lat,s.lon)<=22:true)
                                        .map(s=>renderStrike(s, projection, communeZoom?strikeSize/communeZoom.scale:strikeSize, communeZoom?.scale))
                                    }

                                    {/* Cercles concentriques */}
                                    {selectedCommune&&communeZoom&&RADII_KM.map((r,idx)=>(
                                        <circle key={r}
                                            cx={communeZoom.cx} cy={communeZoom.cy}
                                            r={r*communeZoom.pxPerKm}
                                            fill="none"
                                            stroke={RADII_COLORS[idx]}
                                            strokeWidth={2/communeZoom.scale}
                                            strokeDasharray={`${8/communeZoom.scale} ${5/communeZoom.scale}`}
                                            opacity={0.9}/>
                                    ))}

                                    {/* Marqueur commune */}
                                    {selectedCommune&&communeZoom&&(
                                        <circle cx={communeZoom.cx} cy={communeZoom.cy}
                                            r={7/communeZoom.scale} fill="#cc0000" stroke="white" strokeWidth={2.5/communeZoom.scale}/>
                                    )}
                                </g>

                                {/* Labels des cercles (hors groupe zoomé = taille fixe) */}
                                {selectedCommune&&communeZoom&&RADII_KM.map((r,idx)=>{
                                    const rScreen = r*communeZoom.pxPerKm*communeZoom.scale;
                                    return (
                                        <text key={r} x={WIDTH/2} y={HEIGHT/2-rScreen+15}
                                            textAnchor="middle"
                                            style={{fontSize:'13px',fontWeight:800,fill:RADII_COLORS[idx],stroke:'white',strokeWidth:'3px',paintOrder:'stroke'}}>
                                            {r}km
                                        </text>
                                    );
                                })}

                                {/* Nom commune (hors groupe zoomé) */}
                                {selectedCommune&&communeZoom&&(
                                    <text x={WIDTH/2} y={HEIGHT/2+22} textAnchor="middle"
                                        style={{fontSize:'15px',fontWeight:900,fill:'#0f172a',stroke:'white',strokeWidth:'4px',paintOrder:'stroke'}}>
                                        {selectedCommune.name}
                                    </text>
                                )}

                                {/* Message si pas de commune sélectionnée */}
                                {!selectedCommune&&(
                                    <text x={WIDTH/2} y={HEIGHT/2} textAnchor="middle"
                                        style={{fontSize:'18px',fontWeight:700,fill:'#94a3b8'}}>
                                        Recherchez une commune ci-dessus pour centrer la carte
                                    </text>
                                )}
                            </>
                        )}

                        {/* ── MODE STANDARD (France / Région / Dépt) ── */}
                        {geoMode!=='commune'&&(
                            <>
                                <g>
                                    {geoData?.features.map((f,i)=>(
                                        <path key={i} d={pathGenerator?.(f)} fill={mp.fill} stroke="#000" strokeWidth={1.5}/>
                                    ))}
                                </g>
                                <g clipPath="url(#map-clip)">
                                    {projection&&strikes.map(s=>renderStrike(s,projection))}
                                </g>
                                {showCities&&(
                                    <g>
                                        {projection&&MAIN_CITIES.map((city,i)=>{
                                            const c=projection([city.lon,city.lat]);
                                            if(!c||c[0]<0||c[0]>WIDTH||c[1]<0||c[1]>HEIGHT) return null;
                                            return (
                                                <g key={i} transform={`translate(${c[0]},${c[1]})`}>
                                                    <circle r="3.5" fill="#000"/>
                                                    <text y="-10" textAnchor="middle" style={{fontSize:'15px',fontWeight:'1000',fill:'#000',stroke:'#fff',strokeWidth:'3.5px',paintOrder:'stroke'}}>{city.name}</text>
                                                </g>
                                            );
                                        })}
                                    </g>
                                )}
                            </>
                        )}
                    </svg>

                    {/* ── PANNEAU GAUCHE — Mode Commune ── */}
                    {geoMode==='commune'&&(
                        <div style={{position:'absolute',top:'20px',left:'20px',background:'rgba(15,23,42,0.92)',backdropFilter:'blur(12px)',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',width:'200px',overflow:'hidden',zIndex:10}}>
                            {/* En-tête */}
                            <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                                <div>
                                    <div style={{fontWeight:900,fontSize:'1rem',color:'white'}}>{selectedCommune?selectedCommune.name:'—'}</div>
                                    {selectedCommune&&<div style={{fontSize:'0.72rem',color:'#94a3b8',fontWeight:700}}>{selectedCommune.cp}</div>}
                                </div>
                                {selectedCommune&&(
                                    <button onClick={()=>{setSelectedCommune(null);setCommuneQuery('');}} style={{border:'none',background:'rgba(255,255,255,0.1)',borderRadius:'6px',color:'white',cursor:'pointer',padding:'3px 7px',fontSize:'0.75rem'}}>✕</button>
                                )}
                            </div>

                            {/* Rayons */}
                            <div style={{padding:'8px 0'}}>
                                {RADII_KM.map((r,idx)=>{
                                    const count = selectedCommune?(impactsByRadius[r]||0):0;
                                    return (
                                        <div key={r} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 16px',borderBottom:idx<RADII_KM.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                                                <div style={{width:'10px',height:'10px',borderRadius:'50%',border:`2px dashed ${RADII_COLORS[idx]}`,background:'transparent'}}/>
                                                <span style={{fontSize:'0.8rem',fontWeight:700,color:'#cbd5e1'}}>Rayon {r} km</span>
                                            </div>
                                            <span style={{fontSize:'0.85rem',fontWeight:900,color:count>0?'#38bdf8':'#475569',minWidth:'24px',textAlign:'right'}}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Plus proche */}
                            {selectedCommune&&closestStrike&&(
                                <div style={{padding:'10px 16px',borderTop:'1px solid rgba(255,255,255,0.08)',background:'rgba(239,68,68,0.1)'}}>
                                    <div style={{fontSize:'0.65rem',fontWeight:800,color:'#ef4444',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'3px'}}>⚡ Plus proche</div>
                                    <div style={{fontSize:'0.8rem',fontWeight:900,color:'white'}}>{closestStrike.distance.toFixed(1)} km</div>
                                    <div style={{fontSize:'0.68rem',color:'#94a3b8'}}>{closestStrike.raw}</div>
                                </div>
                            )}

                            {/* Télécharger */}
                            <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
                                <button onClick={exportMap} style={{width:'100%',padding:'9px',border:'none',borderRadius:'10px',background:'rgba(255,255,255,0.12)',color:'white',cursor:'pointer',fontWeight:800,fontSize:'0.78rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px'}}>
                                    <Download size={14}/> TÉLÉCHARGER LA VUE
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── LÉGENDE chronologie — Mode standard ── */}
                    {geoMode!=='commune'&&(
                        <div style={{position:'absolute',top:'25px',left:geoMode==='dept'?'auto':'25px',right:geoMode==='dept'?'25px':'auto',background:'rgba(255,255,255,0.94)',backdropFilter:'blur(10px)',padding:'12px 15px',borderRadius:'16px',border:'1px solid rgba(0,0,0,0.1)',boxShadow:'0 8px 20px rgba(0,0,0,0.12)',width:'240px',zIndex:10}}>
                            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                                <div style={{width:'30px',height:'30px',borderRadius:'8px',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center'}}><Zap size={15} color="white" fill="white"/></div>
                                <div>
                                    <h2 style={{margin:0,fontSize:'0.75rem',fontWeight:900,color:'#0f172a',textTransform:'uppercase',letterSpacing:'0.5px'}}>Chronologie</h2>
                                    <p style={{margin:0,fontSize:'0.65rem',color:'#64748b',fontWeight:700}}>
                                        {isValid(new Date(startDate))?(isRange&&endDate&&isValid(new Date(endDate))?`Du ${format(new Date(startDate),"dd/MM")} au ${format(new Date(endDate),"dd/MM/yy")}`:format(new Date(startDate),"d MMMM yyyy",{locale:fr})):"Date invalide"}
                                    </p>
                                </div>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'4px'}}>
                                {[0,4,8,12,16,20].map(h=>(
                                    <div key={h} style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                                        <div style={{width:'100%',height:'6px',background:HOUR_COLORS[h],borderRadius:'2px'}}/>
                                        <span style={{fontSize:'0.5rem',fontWeight:800,color:'#94a3b8',textAlign:'center'}}>{h}h</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{marginTop:'10px',paddingTop:'8px',borderTop:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ef4444',animation:'simple-pulse 1s infinite'}}/>
                                    <span style={{fontSize:'0.6rem',fontWeight:800,color:'#ef4444'}}>DIRECT</span>
                                </div>
                                <span style={{fontSize:'0.6rem',fontWeight:800,color:'#64748b'}}>{visibleStrikes.length} IMPACTS</span>
                            </div>
                        </div>
                    )}

                    {/* ── PANNEAU DROITE chronologie — Mode commune ── */}
                    {geoMode==='commune'&&(
                        <div style={{position:'absolute',top:'20px',right:'20px',background:'rgba(15,23,42,0.92)',backdropFilter:'blur(12px)',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',padding:'14px 16px',width:'220px',zIndex:10}}>
                            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
                                <Zap size={16} color="#fbbf24" fill="#fbbf24"/>
                                <div>
                                    <div style={{fontWeight:900,fontSize:'0.75rem',color:'white',textTransform:'uppercase',letterSpacing:'0.5px'}}>Impacts {isRange?'sur la période':'du jour'}</div>
                                    <div style={{fontSize:'0.65rem',color:'#94a3b8',fontWeight:700}}>{isValid(new Date(startDate))?format(new Date(startDate),"d MMM yyyy",{locale:fr}):''}</div>
                                </div>
                            </div>
                            {/* Histogramme */}
                            <div style={{marginBottom:'12px'}}>
                                <div style={{fontSize:'0.6rem',color:'#64748b',fontWeight:700,marginBottom:'5px'}}>CHRONOLOGIE (≤20 km)</div>
                                <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'3px'}}>
                                    {[0,4,8,12,16,20].map(hBase=>{
                                        const hCount = visibleStrikes.filter(s=>s.h>=hBase&&s.h<hBase+4).length;
                                        const maxH = Math.max(...[0,4,8,12,16,20].map(h=>visibleStrikes.filter(s=>s.h>=h&&s.h<h+4).length),1);
                                        return (
                                            <div key={hBase} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                                                <div style={{width:'100%',height:'30px',display:'flex',alignItems:'flex-end'}}>
                                                    <div style={{width:'100%',height:`${Math.max(2,(hCount/maxH)*30)}px`,background:HOUR_COLORS[hBase],borderRadius:'2px 2px 0 0'}}/>
                                                </div>
                                                <span style={{fontSize:'0.48rem',fontWeight:800,color:'#94a3b8'}}>{hBase}h</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:'10px'}}>
                                <div style={{fontSize:'0.6rem',color:'#94a3b8',fontWeight:700,marginBottom:'4px'}}>TOTAL (≤20 km)</div>
                                <div style={{fontSize:'1.4rem',fontWeight:900,color:'white'}}>{visibleStrikes.length.toLocaleString()}</div>
                                <div style={{fontSize:'0.65rem',color:'#94a3b8'}}>impacts détectés</div>
                            </div>
                        </div>
                    )}

                    {/* Logo */}
                    {showLogo&&<img src="/logo.jpg" style={{position:'absolute',bottom:'25px',left:'25px',height:'55px',borderRadius:'10px',opacity:0.95,filter:'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'}}/>}
                </div>
            </main>
        </div>
    );
}
