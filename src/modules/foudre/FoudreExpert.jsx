import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { geoConicConformal, geoPath } from "d3-geo";
import { createClient } from '@supabase/supabase-js';
import { REGIONS, DEPARTMENTS } from "../../data/departments";
import { MAIN_CITIES } from "../../data/mainCities";
import { Download, RefreshCw, Zap, Calendar, Search, Maximize, Palette, LayoutGrid, X, MapPin, Target } from "lucide-react";
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
    default: { name: "Classique", fill: "#eef2f7", stroke: "#000", bg: "#ffffff" },
    blue:    { name: "Océan",     fill: "#dbeafe", stroke: "#000", bg: "#f0f9ff" }
};

const ALL_DEPTS = [...DEPARTMENTS.map(d => d.code), '2A', '2B'].filter((v,i,a) => a.indexOf(v) === i);
const RADII_KM    = [1, 3, 5, 10, 20];
const RADII_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6'];

// Dimensions
const STD_W = 960, STD_H = 720;     // Mode standard
const COM_PANEL = 252;               // Largeur panneau gauche commune
const COM_MAP   = 728;               // Largeur SVG carte commune (carré)
const COM_H     = 728;               // Hauteur totale en mode commune

const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function FoudreExpert() {
    // ── Géo ──────────────────────────────────────────────
    const [geoMode, setGeoMode]               = useState("france");
    const [selectedRegion, setSelectedRegion] = useState("Hauts-de-France");
    const [selectedDept, setSelectedDept]     = useState("59");
    const [geoData, setGeoData]               = useState(null);

    // ── Commune ───────────────────────────────────────────
    const [communeQuery, setCommuneQuery]           = useState('');
    const [communeSuggestions, setCommuneSuggestions] = useState([]);
    const [selectedCommune, setSelectedCommune]     = useState(null);
    const [showSuggestions, setShowSuggestions]     = useState(false);
    const inputRef   = useRef(null);
    const suggestRef = useRef(null);

    // ── Données ───────────────────────────────────────────
    const [strikes, setStrikes] = useState([]);
    const [loading, setLoading] = useState(false);
    const todayLocal = new Date().toLocaleDateString('sv-SE');
    const [startDate, setStartDate] = useState(todayLocal);
    const [endDate, setEndDate]     = useState(todayLocal);
    const [isRange, setIsRange]     = useState(false);

    // ── Style ─────────────────────────────────────────────
    const [mapPalette, setMapPalette]     = useState("default");
    const [showCities, setShowCities]     = useState(true);
    const [showLogo, setShowLogo]         = useState(true);
    const [strikeSize, setStrikeSize]     = useState(4);
    const [foudreDesign, setFoudreDesign] = useState("Classic");

    // ── Chargement GeoJSON ────────────────────────────────
    useEffect(() => {
        const load = async () => {
            const depts = (geoMode === "france" || geoMode === "commune")
                ? ALL_DEPTS
                : geoMode === "dept" ? [selectedDept] : (REGIONS[selectedRegion] || []);
            const key = (geoMode === "france" || geoMode === "commune") ? "geo-france"
                : `geo-${geoMode}-${geoMode==='region'?selectedRegion:selectedDept}`;
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
            const list = data.map(c => ({ name:c.nom, cp:c.codesPostaux?.[0]||'', dept:c.codeDepartement, lat:c.centre?.coordinates?.[1], lon:c.centre?.coordinates?.[0] })).filter(c=>c.lat&&c.lon);
            setCommuneSuggestions(list);
            setShowSuggestions(list.length > 0);
        } catch(e) {}
    }, []);
    useEffect(() => { const t = setTimeout(()=>searchCommune(communeQuery),300); return ()=>clearTimeout(t); }, [communeQuery, searchCommune]);
    useEffect(() => {
        const h = e => { if (suggestRef.current&&!suggestRef.current.contains(e.target)&&inputRef.current&&!inputRef.current.contains(e.target)) setShowSuggestions(false); };
        document.addEventListener('mousedown', h);
        return ()=>document.removeEventListener('mousedown', h);
    }, []);

    // ── Fetch impacts ─────────────────────────────────────
    const fetchStrikes = async () => {
        setLoading(true);
        try {
            const sDate=new Date(startDate), eDate=isRange?new Date(endDate):sDate;
            if (!isValid(sDate)||!isValid(eDate)) return;
            const getDays=(s,e)=>{const a=[];let c=new Date(s),lim=0;while(c<=e&&lim<31){a.push(c.toISOString().split('T')[0]);c.setDate(c.getDate()+1);lim++;}return a;};
            const todayStr=format(new Date(),"yyyy-MM-dd");
            let allAcc=[];
            if (startDate===todayStr&&!isRange) {
                const ds=startDate.replace(/-/g,'');
                let res=await fetch(`/api-agate/ORAGE/orage/ws/wsOragesGMaps.php?date=${ds}&heureD=00&heureF=23&pass=jh2kH3,R&_=${Date.now()}`);
                const ct=res.headers.get("content-type");
                if (res.status===404||(ct&&ct.includes("text/html"))) res=await fetch(`/ORAGE/orage/ws/wsOragesGMaps.php?date=${ds}&heureD=00&heureF=23&pass=jh2kH3,R&_=${Date.now()}`);
                if (res.ok){const api=await res.json();if(Array.isArray(api))allAcc=api.map((s,i)=>{const d=new Date(`${s.date.replace(/\//g,'-')}T${s.heure}+01:00`);return{lat:parseFloat(s.lat),lon:parseFloat(s.lon),time:d.getTime(),h:d.getHours(),raw:s.heure,date:s.date,id:`live-${d.getTime()}-${i}`,isRecent:(Date.now()-d.getTime())/60000<30};}).sort((a,b)=>b.time-a.time);}
            } else {
                const days=isRange?getDays(startDate,endDate):[startDate];
                let all=[];
                for(const dStr of days){let from=0;while(true){const{data,error}=await supabase.from('lightning_strikes').select('lat,lon,strike_time').gte('strike_time',`${dStr}T00:00:00Z`).lte('strike_time',`${dStr}T23:59:59Z`).range(from,from+999);if(error||!data||data.length===0)break;all.push(...data);if(data.length<1000)break;from+=1000;}}
                allAcc=all.map((s,i)=>{const d=new Date(s.strike_time);return{lat:s.lat,lon:s.lon,time:d.getTime(),h:d.getHours(),raw:d.toLocaleTimeString('fr-FR'),date:d.toLocaleDateString('fr-FR'),id:`arch-${i}`};}).sort((a,b)=>b.time-a.time);
            }
            setStrikes(allAcc);
        } catch(e){console.error(e);}
        finally{setLoading(false);}
    };
    useEffect(()=>{fetchStrikes();},[startDate,endDate,isRange]);

    // ── Projection standard ───────────────────────────────
    const projection = useMemo(()=>{
        if (!geoData) return null;
        return geoConicConformal().fitExtent([[50,80],[STD_W-50,STD_H-50]],geoData);
    },[geoData]);
    const pathGenerator = useMemo(()=>projection?geoPath().projection(projection):null,[projection]);

    // ── Zoom commune : projection France + transform SVG ──
    // La carte commune est un carré COM_MAP × COM_MAP
    const communeZoom = useMemo(()=>{
        if (!selectedCommune||!projection||geoMode!=='commune') return null;
        const [cx,cy]=projection([selectedCommune.lon,selectedCommune.lat]);
        const [,cy2]=projection([selectedCommune.lon,selectedCommune.lat+1/111.32]);
        const pxPerKm=Math.abs(cy-cy2);
        // On veut que le rayon 20km tienne dans (COM_MAP/2 - 40px) de marge
        const scale=(COM_MAP/2-50)/(20*pxPerKm);
        const tx=COM_MAP/2-cx*scale;
        const ty=COM_H/2-cy*scale;
        return{cx,cy,scale,pxPerKm,tx,ty,svgTransform:`translate(${tx},${ty}) scale(${scale})`};
    },[selectedCommune,projection,geoMode]);

    // ── Impacts par rayon ──────────────────────────────────
    const impactsByRadius = useMemo(()=>{
        if (!selectedCommune) return {};
        return RADII_KM.reduce((acc,r)=>{ acc[r]=strikes.filter(s=>haversineKm(selectedCommune.lat,selectedCommune.lon,s.lat,s.lon)<=r).length; return acc; },{});
    },[strikes,selectedCommune]);

    const closestStrike = useMemo(()=>{
        if (!selectedCommune||strikes.length===0) return null;
        let minDist=Infinity,best=null;
        for(const s of strikes){const d=haversineKm(selectedCommune.lat,selectedCommune.lon,s.lat,s.lon);if(d<minDist){minDist=d;best=s;}}
        return best&&minDist<=20?{...best,distance:minDist}:null;
    },[strikes,selectedCommune]);

    const visibleStrikes = useMemo(()=>{
        if (geoMode==='commune'&&selectedCommune) return strikes.filter(s=>haversineKm(selectedCommune.lat,selectedCommune.lon,s.lat,s.lon)<=20);
        if (!projection) return [];
        return strikes.filter(s=>{const c=projection([s.lon,s.lat]);return c&&c[0]>=0&&c[0]<=STD_W&&c[1]>=0&&c[1]<=STD_H;});
    },[strikes,geoMode,selectedCommune,projection]);

    const exportMap = ()=>{
        html2canvas(document.getElementById("export-foudre"),{scale:2}).then(canvas=>{
            const a=document.createElement("a");
            a.download=`foudre-${geoMode==='commune'&&selectedCommune?selectedCommune.name:geoMode}-${startDate}.png`;
            a.href=canvas.toDataURL();a.click();
        });
    };

    // ── Rendu d'un impact ──────────────────────────────────
    const renderStrike = (s,proj,sz,scale)=>{
        const coords=proj([s.lon,s.lat]);
        if (!coords) return null;
        const sw=scale?1/scale:1;
        const color=HOUR_COLORS[s.h]||'#ff0000';
        if (foudreDesign==='Glow')    return <g key={s.id}><circle cx={coords[0]} cy={coords[1]} r={sz*3} fill={color} fillOpacity={0.2}/><circle cx={coords[0]} cy={coords[1]} r={sz} fill={color}/></g>;
        if (foudreDesign==='Cross')   return <g key={s.id} stroke={color} strokeWidth={sw*1.5}><line x1={coords[0]-sz*1.5} y1={coords[1]} x2={coords[0]+sz*1.5} y2={coords[1]}/><line x1={coords[0]} y1={coords[1]-sz*1.5} x2={coords[0]} y2={coords[1]+sz*1.5}/></g>;
        if (foudreDesign==='Ring')    return <g key={s.id}><circle cx={coords[0]} cy={coords[1]} r={sz*1.5} fill="none" stroke={color} strokeWidth={sw*2}/><circle cx={coords[0]} cy={coords[1]} r={sz*0.5} fill={color}/></g>;
        if (foudreDesign==='Diamond') return <path key={s.id} d={`M${coords[0]} ${coords[1]-sz*1.5}L${coords[0]+sz*1.5} ${coords[1]}L${coords[0]} ${coords[1]+sz*1.5}L${coords[0]-sz*1.5} ${coords[1]}Z`} fill={color} strokeWidth={0}/>;
        if (foudreDesign==='Bolt')    return <path key={s.id} d={`M${coords[0]} ${coords[1]-sz*2}L${coords[0]-sz} ${coords[1]+sz*.5}L${coords[0]} ${coords[1]+sz*.5}L${coords[0]-sz*.5} ${coords[1]+sz*2}L${coords[0]+sz} ${coords[1]-sz*.5}L${coords[0]} ${coords[1]-sz*.5}Z`} fill={color}/>;
        return <circle key={s.id} cx={coords[0]} cy={coords[1]} r={s.isRecent?sz*1.3:sz} fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth={sw*0.8}/>;
    };

    const mp = MAP_PALETTES[mapPalette];
    const dateLabel = isValid(new Date(startDate))
        ? (isRange&&endDate&&isValid(new Date(endDate))
            ? `Du ${format(new Date(startDate),"dd/MM")} au ${format(new Date(endDate),"dd/MM/yy")}`
            : format(new Date(startDate),"d MMMM yyyy",{locale:fr}))
        : "Date invalide";

    return (
        <div style={{padding:'20px',background:'#f1f5f9',minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>

            {/* ── BARRE CONTRÔLE ── */}
            <header style={{maxWidth:'1220px',margin:'0 auto 15px',display:'flex',flexDirection:'column',gap:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                        <div style={{background:'linear-gradient(135deg,#ef4444,#dc2626)',padding:'9px',borderRadius:'12px',color:'white',display:'flex',boxShadow:'0 4px 12px rgba(239,68,68,0.4)'}}>
                            <Zap fill="white" size={22}/>
                        </div>
                        <div>
                            <h1 style={{margin:0,fontSize:'1.5rem',fontWeight:900,color:'#0f172a',letterSpacing:'-0.5px'}}>Générateur Foudre Expert</h1>
                            <p style={{margin:0,fontSize:'0.78rem',color:'#64748b'}}>
                                {strikes.length.toLocaleString()} impacts · {visibleStrikes.length.toLocaleString()} sur zone
                                {geoMode==='commune'&&closestStrike&&` · ⚡ Plus proche : ${closestStrike.distance.toFixed(1)} km`}
                            </p>
                        </div>
                    </div>
                    <div style={{display:'flex',gap:'8px'}}>
                        <button onClick={fetchStrikes} disabled={loading} style={{padding:'9px 14px',borderRadius:'10px',border:'1px solid #e2e8f0',background:'white',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontWeight:700,fontSize:'0.8rem',color:'#374151'}}>
                            <RefreshCw size={16} className={loading?"animate-spin":""}/>
                        </button>
                        <button onClick={exportMap} style={{padding:'9px 18px',borderRadius:'10px',background:'#0f172a',color:'white',border:'none',cursor:'pointer',fontWeight:800,display:'flex',alignItems:'center',gap:'8px',fontSize:'0.82rem'}}>
                            <Download size={16}/> EXPORTER PNG
                        </button>
                    </div>
                </div>

                <div style={{display:'flex',flexWrap:'wrap',gap:'10px',background:'white',padding:'12px 16px',borderRadius:'14px',border:'1px solid #e2e8f0',alignItems:'center',boxShadow:'0 2px 4px rgba(0,0,0,0.04)'}}>
                    {/* Modes */}
                    <div style={{display:'flex',gap:'3px',background:'#f1f5f9',padding:'3px',borderRadius:'9px'}}>
                        {[['france','France'],['region','Région'],['dept','Dépt']].map(([m,l])=>(
                            <button key={m} onClick={()=>setGeoMode(m)} style={{padding:'5px 12px',border:'none',borderRadius:'7px',cursor:'pointer',fontWeight:800,fontSize:'0.78rem',background:geoMode===m?'white':'transparent',color:geoMode===m?'#ef4444':'#64748b',transition:'all .15s'}}>{l}</button>
                        ))}
                        <button onClick={()=>setGeoMode('commune')} style={{padding:'5px 12px',border:'none',borderRadius:'7px',cursor:'pointer',fontWeight:800,fontSize:'0.78rem',background:geoMode==='commune'?'white':'transparent',color:geoMode==='commune'?'#ef4444':'#64748b',display:'flex',alignItems:'center',gap:'4px'}}>
                            <Target size={12}/> Commune
                        </button>
                    </div>

                    {geoMode==='region'&&<select value={selectedRegion} onChange={e=>setSelectedRegion(e.target.value)} style={{padding:'7px',borderRadius:'9px',border:'1px solid #cbd5e1',fontWeight:700,outline:'none',fontSize:'0.82rem'}}>{Object.keys(REGIONS).sort().map(r=><option key={r} value={r}>{r}</option>)}</select>}
                    {geoMode==='dept'&&<select value={selectedDept} onChange={e=>setSelectedDept(e.target.value)} style={{padding:'7px',borderRadius:'9px',border:'1px solid #cbd5e1',fontWeight:700,outline:'none',fontSize:'0.82rem'}}>{DEPARTMENTS.map(d=><option key={d.code} value={d.code}>{d.code} - {d.name}</option>)}</select>}

                    {/* Recherche commune */}
                    {geoMode==='commune'&&(
                        <div style={{position:'relative'}}>
                            <div style={{display:'flex',alignItems:'center',gap:'7px',background:'#f8fafc',border:'1.5px solid #cbd5e1',borderRadius:'9px',padding:'5px 11px'}}>
                                <Search size={15} color="#64748b"/>
                                <input ref={inputRef} type="text" placeholder="Rechercher une commune..." value={communeQuery}
                                    onChange={e=>setCommuneQuery(e.target.value)} onFocus={()=>communeSuggestions.length>0&&setShowSuggestions(true)}
                                    style={{border:'none',background:'transparent',outline:'none',fontWeight:700,fontSize:'0.83rem',width:'200px',color:'#0f172a'}}/>
                                {communeQuery&&<button onClick={()=>{setCommuneQuery('');setSelectedCommune(null);setCommuneSuggestions([]);}} style={{border:'none',background:'none',cursor:'pointer',padding:0,display:'flex'}}><X size={13} color="#94a3b8"/></button>}
                            </div>
                            {showSuggestions&&communeSuggestions.length>0&&(
                                <div ref={suggestRef} style={{position:'absolute',top:'100%',left:0,marginTop:'4px',background:'white',border:'1px solid #e2e8f0',borderRadius:'12px',boxShadow:'0 10px 25px rgba(0,0,0,0.12)',zIndex:1000,minWidth:'260px',overflow:'hidden'}}>
                                    {communeSuggestions.map((c,i)=>(
                                        <button key={i} onClick={()=>{setSelectedCommune(c);setCommuneQuery(`${c.name} (${c.cp})`);setShowSuggestions(false);}}
                                            style={{display:'flex',alignItems:'center',gap:'9px',width:'100%',padding:'9px 13px',border:'none',borderBottom:i<communeSuggestions.length-1?'1px solid #f1f5f9':'none',background:'white',cursor:'pointer',textAlign:'left'}}
                                            onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
                                            <MapPin size={13} color="#ef4444"/>
                                            <div><div style={{fontWeight:800,fontSize:'0.83rem',color:'#0f172a'}}>{c.name}</div><div style={{fontSize:'0.7rem',color:'#64748b'}}>{c.cp} — Dép. {c.dept}</div></div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{width:'1px',height:'28px',background:'#e2e8f0'}}/>

                    {/* Date */}
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <Calendar size={16} color="#64748b"/>
                        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{padding:'6px 8px',borderRadius:'9px',border:'1px solid #cbd5e1',fontWeight:800,fontSize:'0.82rem'}}/>
                        {isRange&&<><span style={{fontWeight:700,fontSize:'0.82rem'}}>au</span><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{padding:'6px 8px',borderRadius:'9px',border:'1px solid #cbd5e1',fontWeight:800,fontSize:'0.82rem'}}/></>}
                        <label style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'0.78rem',fontWeight:700,color:'#475569',cursor:'pointer'}}><input type="checkbox" checked={isRange} onChange={e=>setIsRange(e.target.checked)}/> Période</label>
                    </div>

                    <div style={{width:'1px',height:'28px',background:'#e2e8f0'}}/>

                    {/* Style */}
                    <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
                        <Palette size={16} color="#64748b"/>
                        <select value={mapPalette} onChange={e=>setMapPalette(e.target.value)} style={{padding:'6px',borderRadius:'9px',border:'1px solid #cbd5e1',fontWeight:700,outline:'none',fontSize:'0.82rem'}}>
                            {Object.entries(MAP_PALETTES).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
                        </select>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                            <Maximize size={14} color="#64748b"/>
                            <input type="range" min="2" max="15" value={strikeSize} onChange={e=>setStrikeSize(parseInt(e.target.value))} style={{width:'70px'}}/>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                            <LayoutGrid size={14} color="#64748b"/>
                            <select value={foudreDesign} onChange={e=>setFoudreDesign(e.target.value)} style={{padding:'6px',borderRadius:'9px',border:'1px solid #cbd5e1',fontWeight:700,outline:'none',fontSize:'0.82rem'}}>
                                {Object.entries(LIGHTNING_DESIGNS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
                            </select>
                        </div>
                        <div style={{width:'1px',height:'28px',background:'#e2e8f0'}}/>
                        <label style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'0.78rem',fontWeight:700,color:'#475569',cursor:'pointer'}}><input type="checkbox" checked={showCities} onChange={e=>setShowCities(e.target.checked)}/> Villes</label>
                        <label style={{display:'flex',alignItems:'center',gap:'5px',fontSize:'0.78rem',fontWeight:700,color:'#475569',cursor:'pointer'}}><input type="checkbox" checked={showLogo} onChange={e=>setShowLogo(e.target.checked)}/> Logo</label>
                    </div>
                </div>
            </header>

            {/* ══════════════════════════════════════════════════════
                MODE COMMUNE — layout splitté premium
            ══════════════════════════════════════════════════════ */}
            {geoMode==='commune'&&(
                <main style={{display:'flex',justifyContent:'center'}}>
                    <div id="export-foudre" style={{display:'flex',width:COM_PANEL+COM_MAP,height:COM_H,borderRadius:'20px',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,0.18)',border:'1px solid rgba(255,255,255,0.1)'}}>

                        {/* ── PANNEAU GAUCHE ── */}
                        <div style={{width:COM_PANEL,minWidth:COM_PANEL,height:COM_H,background:'linear-gradient(180deg,#0d1b2a 0%,#0f172a 60%,#0d1b2a 100%)',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
                            {/* Dégradé déco */}
                            <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:'linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6)'}}/>

                            {/* En-tête commune */}
                            <div style={{padding:'20px 20px 14px'}}>
                                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'4px'}}>
                                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                                        <div style={{background:'rgba(239,68,68,0.15)',borderRadius:'8px',padding:'5px',display:'flex'}}>
                                            <Target size={14} color="#ef4444"/>
                                        </div>
                                        <div>
                                            <div style={{fontWeight:900,fontSize:'1.1rem',color:'white',lineHeight:1.1}}>{selectedCommune?.name||'—'}</div>
                                            {selectedCommune&&<div style={{fontSize:'0.7rem',color:'#64748b',fontWeight:600}}>{selectedCommune.cp}</div>}
                                        </div>
                                    </div>
                                    {selectedCommune&&(
                                        <button onClick={()=>{setSelectedCommune(null);setCommuneQuery('');}} style={{border:'none',background:'rgba(255,255,255,0.08)',borderRadius:'6px',color:'#94a3b8',cursor:'pointer',padding:'4px 7px',fontSize:'0.72rem',lineHeight:1}}>✕</button>
                                    )}
                                </div>
                                <div style={{fontSize:'0.68rem',color:'#475569',fontWeight:700,marginTop:'8px',textTransform:'uppercase',letterSpacing:'0.5px'}}>{dateLabel}</div>
                            </div>

                            {/* Ligne séparatrice */}
                            <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'0 16px'}}/>

                            {/* Titre section */}
                            <div style={{padding:'12px 20px 8px',display:'flex',alignItems:'center',gap:'7px'}}>
                                <Zap size={13} color="#fbbf24" fill="#fbbf24"/>
                                <span style={{fontSize:'0.65rem',fontWeight:900,color:'#fbbf24',textTransform:'uppercase',letterSpacing:'1px'}}>Impacts foudre par rayon</span>
                            </div>

                            {/* Rayons */}
                            <div style={{padding:'0 16px',flex:'0 0 auto'}}>
                                {RADII_KM.map((r,idx)=>{
                                    const count=selectedCommune?(impactsByRadius[r]||0):0;
                                    const prev=idx>0?(impactsByRadius[RADII_KM[idx-1]]||0):0;
                                    const ring=count-prev; // impacts dans l'anneau
                                    return (
                                        <div key={r} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderRadius:'10px',background:count>0?'rgba(255,255,255,0.04)':'transparent',marginBottom:'3px',border:'1px solid',borderColor:count>0?'rgba(255,255,255,0.07)':'transparent'}}>
                                            {/* Indicateur couleur */}
                                            <div style={{width:'28px',height:'28px',borderRadius:'50%',border:`2px dashed ${RADII_COLORS[idx]}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:`${RADII_COLORS[idx]}10`}}>
                                                <span style={{fontSize:'0.55rem',fontWeight:900,color:RADII_COLORS[idx]}}>{r}k</span>
                                            </div>
                                            <div style={{flex:1}}>
                                                <div style={{fontSize:'0.8rem',fontWeight:700,color:'#cbd5e1'}}>≤ {r} km</div>
                                                {idx>0&&ring>0&&<div style={{fontSize:'0.62rem',color:'#475569'}}>+{ring} dans l'anneau</div>}
                                            </div>
                                            <div style={{fontSize:'1.05rem',fontWeight:900,color:count>0?RADII_COLORS[idx]:'#334155',minWidth:'30px',textAlign:'right'}}>{count}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Plus proche */}
                            {closestStrike?(
                                <div style={{margin:'10px 16px',padding:'10px 12px',borderRadius:'10px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)'}}>
                                    <div style={{fontSize:'0.6rem',fontWeight:900,color:'#ef4444',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'4px'}}>⚡ Impact le plus proche</div>
                                    <div style={{fontSize:'1.1rem',fontWeight:900,color:'white'}}>{closestStrike.distance.toFixed(1)} km</div>
                                    <div style={{fontSize:'0.7rem',color:'#94a3b8'}}>{closestStrike.raw}</div>
                                </div>
                            ):(
                                <div style={{margin:'10px 16px',padding:'10px 12px',borderRadius:'10px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                                    <div style={{fontSize:'0.62rem',color:'#334155',fontWeight:700}}>{selectedCommune?'Aucun impact dans les 20 km':'Sélectionnez une commune'}</div>
                                </div>
                            )}

                            {/* Chronologie */}
                            {selectedCommune&&visibleStrikes.length>0&&(
                                <div style={{margin:'0 16px 10px'}}>
                                    <div style={{fontSize:'0.6rem',fontWeight:900,color:'#475569',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>Chronologie (≤20 km)</div>
                                    <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'3px'}}>
                                        {[0,4,8,12,16,20].map(hBase=>{
                                            const hCount=visibleStrikes.filter(s=>s.h>=hBase&&s.h<hBase+4).length;
                                            const maxH=Math.max(...[0,4,8,12,16,20].map(h=>visibleStrikes.filter(s=>s.h>=h&&s.h<h+4).length),1);
                                            return (
                                                <div key={hBase} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                                                    <div style={{width:'100%',height:'28px',display:'flex',alignItems:'flex-end'}}>
                                                        <div style={{width:'100%',height:`${Math.max(2,(hCount/maxH)*28)}px`,background:HOUR_COLORS[hBase],borderRadius:'2px 2px 0 0',opacity:hCount?1:0.2}}/>
                                                    </div>
                                                    <span style={{fontSize:'0.44rem',fontWeight:800,color:'#475569'}}>{hBase}h</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* TOTAL */}
                            <div style={{margin:'0 16px',padding:'10px 12px',borderRadius:'10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',textAlign:'center'}}>
                                <div style={{fontSize:'0.58rem',fontWeight:900,color:'#475569',textTransform:'uppercase',letterSpacing:'0.8px'}}>Total ≤ 20 km</div>
                                <div style={{fontSize:'1.8rem',fontWeight:900,color:'white',lineHeight:1.1}}>{visibleStrikes.length.toLocaleString()}</div>
                                <div style={{fontSize:'0.62rem',color:'#64748b'}}>impacts détectés</div>
                            </div>

                            {/* Spacer */}
                            <div style={{flex:1}}/>

                            {/* Légende chrono couleurs */}
                            <div style={{padding:'8px 16px'}}>
                                <div style={{fontSize:'0.58rem',fontWeight:800,color:'#334155',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'5px'}}>Heure de l'impact</div>
                                <div style={{display:'flex',borderRadius:'5px',overflow:'hidden',height:'8px'}}>
                                    {[0,4,8,12,16,20].map(h=><div key={h} style={{flex:1,background:HOUR_COLORS[h]}}/>)}
                                </div>
                                <div style={{display:'flex',justifyContent:'space-between',marginTop:'3px'}}>
                                    {['0h','4h','8h','12h','16h','20h'].map(l=><span key={l} style={{fontSize:'0.5rem',color:'#475569',fontWeight:700}}>{l}</span>)}
                                </div>
                            </div>

                            {/* Bouton téléchargement */}
                            <div style={{padding:'10px 16px'}}>
                                <button onClick={exportMap} style={{width:'100%',padding:'10px',border:'none',borderRadius:'10px',background:'rgba(255,255,255,0.1)',color:'white',cursor:'pointer',fontWeight:800,fontSize:'0.75rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',letterSpacing:'0.3px',transition:'background .15s'}}
                                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.16)'}
                                    onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                                    <Download size={13}/> TÉLÉCHARGER LA VUE
                                </button>
                            </div>

                            {/* Logo */}
                            {showLogo&&<div style={{padding:'0 16px 14px',display:'flex',alignItems:'center',gap:'8px'}}>
                                <img src="/logo.jpg" style={{height:'36px',borderRadius:'7px',opacity:0.9}}/>
                            </div>}
                        </div>

                        {/* ── CARTE SVG COMMUNE (carrée) ── */}
                        <div style={{flex:1,background:mp.bg,position:'relative',overflow:'hidden'}}>
                            <svg width={COM_MAP} height={COM_H}>
                                {/* Groupe zoomé sur la commune */}
                                <g transform={communeZoom?.svgTransform||''}>
                                    {/* Fond départements */}
                                    {geoData?.features.map((f,i)=>(
                                        <path key={i} d={pathGenerator?.(f)} fill={mp.fill} stroke="#999" strokeWidth={communeZoom?0.6/communeZoom.scale:0.6}/>
                                    ))}

                                    {/* Cercles concentriques (dans l'espace projection) */}
                                    {selectedCommune&&communeZoom&&RADII_KM.map((r,idx)=>(
                                        <circle key={r} cx={communeZoom.cx} cy={communeZoom.cy}
                                            r={r*communeZoom.pxPerKm}
                                            fill={`${RADII_COLORS[idx]}08`}
                                            stroke={RADII_COLORS[idx]}
                                            strokeWidth={2/communeZoom.scale}
                                            strokeDasharray={`${10/communeZoom.scale} ${5/communeZoom.scale}`}/>
                                    ))}

                                    {/* Impacts */}
                                    {projection&&strikes
                                        .filter(s=>selectedCommune?haversineKm(selectedCommune.lat,selectedCommune.lon,s.lat,s.lon)<=22:true)
                                        .map(s=>renderStrike(s,projection,communeZoom?strikeSize/communeZoom.scale:strikeSize,communeZoom?.scale))
                                    }

                                    {/* Marqueur commune */}
                                    {selectedCommune&&communeZoom&&(
                                        <g>
                                            <circle cx={communeZoom.cx} cy={communeZoom.cy} r={12/communeZoom.scale} fill="rgba(204,0,0,0.15)" stroke="none"/>
                                            <circle cx={communeZoom.cx} cy={communeZoom.cy} r={6/communeZoom.scale} fill="#cc0000" stroke="white" strokeWidth={2/communeZoom.scale}/>
                                            <circle cx={communeZoom.cx} cy={communeZoom.cy} r={2/communeZoom.scale} fill="white"/>
                                        </g>
                                    )}
                                </g>

                                {/* Labels cercles (hors groupe zoomé = taille écran fixe) */}
                                {selectedCommune&&communeZoom&&RADII_KM.map((r,idx)=>{
                                    const rScreen=r*communeZoom.pxPerKm*communeZoom.scale;
                                    return (
                                        <text key={r} x={COM_MAP/2} y={COM_H/2-rScreen+14}
                                            textAnchor="middle"
                                            style={{fontSize:'12px',fontWeight:800,fill:RADII_COLORS[idx],stroke:'rgba(255,255,255,0.9)',strokeWidth:'3px',paintOrder:'stroke'}}>
                                            {r} km
                                        </text>
                                    );
                                })}

                                {/* Nom commune */}
                                {selectedCommune&&communeZoom&&(
                                    <text x={COM_MAP/2} y={COM_H/2+20} textAnchor="middle"
                                        style={{fontSize:'14px',fontWeight:900,fill:'#0f172a',stroke:'rgba(255,255,255,0.95)',strokeWidth:'4px',paintOrder:'stroke'}}>
                                        {selectedCommune.name}
                                    </text>
                                )}

                                {/* Message si pas de commune */}
                                {!selectedCommune&&(
                                    <text x={COM_MAP/2} y={COM_H/2} textAnchor="middle" style={{fontSize:'16px',fontWeight:700,fill:'#94a3b8'}}>
                                        Recherchez une commune ci-dessus
                                    </text>
                                )}

                                {/* Watermark date en bas de carte */}
                                {selectedCommune&&(
                                    <text x={COM_MAP-12} y={COM_H-12} textAnchor="end"
                                        style={{fontSize:'10px',fontWeight:700,fill:'rgba(0,0,0,0.2)',fontFamily:'monospace'}}>
                                        {dateLabel} · météo-climat-pro.fr
                                    </text>
                                )}
                            </svg>
                        </div>
                    </div>
                </main>
            )}

            {/* ══════════════════════════════════════════════════════
                MODE STANDARD (France / Région / Dépt)
            ══════════════════════════════════════════════════════ */}
            {geoMode!=='commune'&&(
                <main style={{display:'flex',justifyContent:'center'}}>
                    <div id="export-foudre" style={{width:STD_W,height:STD_H,background:mp.bg,borderRadius:'20px',boxShadow:'0 20px 40px rgba(0,0,0,0.1)',overflow:'hidden',position:'relative',border:`6px solid ${mp.stroke}18`}}>
                        <svg width={STD_W} height={STD_H}>
                            <defs><clipPath id="map-clip">{geoData?.features.map((f,i)=><path key={i} d={pathGenerator?.(f)}/>)}</clipPath></defs>
                            <g>{geoData?.features.map((f,i)=><path key={i} d={pathGenerator?.(f)} fill={mp.fill} stroke="#000" strokeWidth={1.5}/>)}</g>
                            <g clipPath="url(#map-clip)">{projection&&strikes.map(s=>renderStrike(s,projection,strikeSize))}</g>
                            {showCities&&<g>{projection&&MAIN_CITIES.map((city,i)=>{
                                const c=projection([city.lon,city.lat]);
                                if(!c||c[0]<0||c[0]>STD_W||c[1]<0||c[1]>STD_H) return null;
                                return <g key={i} transform={`translate(${c[0]},${c[1]})`}><circle r="3.5" fill="#000"/><text y="-10" textAnchor="middle" style={{fontSize:'14px',fontWeight:'1000',fill:'#000',stroke:'#fff',strokeWidth:'3.5px',paintOrder:'stroke'}}>{city.name}</text></g>;
                            })}</g>}
                        </svg>

                        {/* Légende chronologie */}
                        <div style={{position:'absolute',top:'20px',left:geoMode==='dept'?'auto':'20px',right:geoMode==='dept'?'20px':'auto',background:'rgba(15,23,42,0.88)',backdropFilter:'blur(10px)',padding:'12px 15px',borderRadius:'14px',border:'1px solid rgba(255,255,255,0.1)',width:'230px',zIndex:10}}>
                            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                                <Zap size={14} color="#fbbf24" fill="#fbbf24"/>
                                <div>
                                    <div style={{fontSize:'0.7rem',fontWeight:900,color:'white',textTransform:'uppercase',letterSpacing:'0.5px'}}>Chronologie</div>
                                    <div style={{fontSize:'0.62rem',color:'#64748b',fontWeight:700}}>{dateLabel}</div>
                                </div>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'4px'}}>
                                {[0,4,8,12,16,20].map(h=><div key={h} style={{display:'flex',flexDirection:'column',gap:'2px'}}><div style={{width:'100%',height:'6px',background:HOUR_COLORS[h],borderRadius:'2px'}}/><span style={{fontSize:'0.48rem',fontWeight:800,color:'#94a3b8',textAlign:'center'}}>{h}h</span></div>)}
                            </div>
                            <div style={{marginTop:'8px',paddingTop:'7px',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'7px',height:'7px',borderRadius:'50%',background:'#ef4444',animation:'simple-pulse 1s infinite'}}/><span style={{fontSize:'0.58rem',fontWeight:800,color:'#ef4444'}}>DIRECT</span></div>
                                <span style={{fontSize:'0.6rem',fontWeight:800,color:'#94a3b8'}}>{visibleStrikes.length.toLocaleString()} impacts</span>
                            </div>
                        </div>

                        {showLogo&&<img src="/logo.jpg" style={{position:'absolute',bottom:'20px',left:'20px',height:'50px',borderRadius:'9px',opacity:0.9,filter:'drop-shadow(0 3px 6px rgba(0,0,0,0.15))'}}/>}
                    </div>
                </main>
            )}
        </div>
    );
}
