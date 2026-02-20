import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { geoConicConformal, geoPath } from "d3-geo";
import {
    Droplets, Waves, Wind, Zap, Snowflake, Info, Thermometer,
    ChevronDown, Activity, Loader, ShieldAlert, FileText, X
} from 'lucide-react';
import './VigilanceFrance.css';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

// OFFICIAL MF COLORS
const OFFICIAL_COLORS = {
    1: '#31aa35', // Vert
    2: '#fff600', // Jaune
    3: '#ffb21e', // Orange
    4: '#cc0000', // Rouge
};

const PHENOMENONS = [
    { id: "2", name: "Pluie-inondation", icon: Droplets },
    { id: "9", name: "Vagues-submersion", icon: Waves },
    { id: "4", name: "Crues", icon: Waves },
    { id: "1", name: "Vent", icon: Wind },
    { id: "3", name: "Orages", icon: Zap },
    { id: "5", name: "Neige-verglas", icon: Snowflake },
    { id: "6", name: "Canicule", icon: Thermometer },
    { id: "7", name: "Grand Froid", icon: Thermometer },
    { id: "8", name: "Avalanches", icon: Info },
];

const VigilanceFrance = () => {
    const [vigilanceData, setVigilanceData] = useState([]);
    const [bulletins, setBulletins] = useState([]);
    const [geoData, setGeoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDep, setSelectedDep] = useState(null);
    const [period, setPeriod] = useState(0);
    const [selectedPhenom, setSelectedPhenom] = useState(null);
    const [localData, setLocalData] = useState({ stations: [], obs: [] });
    const [localLoading, setLocalLoading] = useState(false);

    useEffect(() => {
        fetchInitialData();
        const interval = setInterval(fetchInitialData, 10 * 60 * 1000); // 10 min
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const dateLabel = new Date(new Date().getTime() + (period * 86400000)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        document.title = `Vigilance ${period === 0 ? 'Aujourd\'hui' : 'Demain'} (${dateLabel}) - Monsieur Météo`;
    }, [period]);

    useEffect(() => {
        if (selectedDep) fetchLocalDeptData(selectedDep);
    }, [selectedDep]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const res = await fetch("https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson");
            const geo = await res.json();
            setGeoData(geo);

            const [statusRes, bulletinRes] = await Promise.all([
                supabase.from('vigilance_status').select('*'),
                supabase.from('vigilance_bulletins').select('*')
            ]);
            if (!statusRes.error) setVigilanceData(statusRes.data);
            if (!bulletinRes.error) setBulletins(bulletinRes.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const fetchLocalDeptData = async (depCode) => {
        setLocalLoading(true);
        try {
            const { data: stations } = await supabase.from('stations').select('*').eq('dept', depCode);
            if (stations && stations.length > 0) {
                const ids = stations.map(s => s.id);
                const { data: obs } = await supabase
                    .from('observations_horaire')
                    .select('*')
                    .in('station_id', ids)
                    .order('timestamp', { ascending: false })
                    .limit(stations.length * 2);
                setLocalData({ stations, obs: obs || [] });
            } else {
                setLocalData({ stations: [], obs: [] });
            }
        } catch (err) { console.error(err); }
        setLocalLoading(false);
    };

    const currentMap = useMemo(() => {
        const map = {};
        vigilanceData.filter(d => d.period === period).forEach(d => {
            let displayLevel = d.level;
            if (selectedPhenom) {
                const risk = d.risks?.find(r => r.id === selectedPhenom);
                displayLevel = risk ? risk.level : 1;
            }
            map[d.dep_code] = { ...d, displayLevel };
        });
        return map;
    }, [vigilanceData, period, selectedPhenom]);

    const globalLastUpdate = useMemo(() => {
        if (!vigilanceData.length) return null;
        const updates = vigilanceData
            .filter(d => d.last_update)
            .map(d => new Date(d.last_update).getTime());
        if (updates.length === 0) return null;
        return new Date(Math.max(...updates));
    }, [vigilanceData]);

    const projection = useMemo(() => {
        if (!geoData) return null;
        return geoConicConformal().fitSize([800, 600], geoData);
    }, [geoData]);

    const pathGenerator = useMemo(() => projection ? geoPath().projection(projection) : null, [projection]);

    const mapTransform = useMemo(() => {
        return "scale(1)";
    }, [selectedDep, geoData, pathGenerator]);

    const renderHourlyTimeline = (risks, startTime, title) => {
        if (!risks || risks.length === 0) return null;

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const refDate = new Date(startTime);
        refDate.setHours(0, 0, 0, 0);
        const startDayTs = refDate.getTime();

        const activeRisks = risks.filter(r => r.level > 1);
        if (activeRisks.length === 0) return null;

        return (
            <div className="hourly-timeline-block">
                <h4 className="timeline-title">{title}</h4>
                <div className="hourly-grid-header">
                    {hours.filter(h => h % 4 === 0).map(h => (
                        <span key={h} className="h-label">{h}h</span>
                    ))}
                    <span className="h-label">24h</span>
                </div>
                <div className="phenom-hourly-rows">
                    {activeRisks.map(risk => {
                        const P = PHENOMENONS.find(p => p.id === risk.id);
                        const Icon = P?.icon || Activity;
                        return (
                            <div key={risk.id} className="hourly-row">
                                <div className="row-meta">
                                    <Icon size={14} style={{ color: OFFICIAL_COLORS[risk.level] }} />
                                    <span className="tiny-label">{P?.name}</span>
                                </div>
                                <div className="hour-boxes">
                                    {hours.map(h => {
                                        const hStart = startDayTs + (h * 3600000);
                                        const hEnd = hStart + 3600000;

                                        const segment = risk.timelines?.find(seg => {
                                            const b = new Date(seg.begin_time).getTime();
                                            const e = new Date(seg.end_time).getTime();
                                            return b < hEnd && e > hStart;
                                        });

                                        const color = segment ? OFFICIAL_COLORS[segment.color_id] : '#f1f5f9';
                                        return (
                                            <div
                                                key={h}
                                                className="hour-box"
                                                style={{ backgroundColor: color }}
                                                title={`${h}h-${h + 1}h: ${P?.name}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderBulletinCard = (bulletin, idx, titlePrefix = "") => {
        let Icon = FileText;
        let color = '#3453a2';

        const titleLower = (bulletin.title || "").toLowerCase();
        if (titleLower.includes('pluie')) { Icon = Droplets; color = OFFICIAL_COLORS[3]; }
        if (titleLower.includes('crues')) { Icon = Waves; color = OFFICIAL_COLORS[3]; }
        if (titleLower.includes('vent')) { Icon = Wind; color = OFFICIAL_COLORS[3]; }
        if (titleLower.includes('orage')) { Icon = Zap; color = OFFICIAL_COLORS[3]; }
        if (titleLower.includes('neige') || titleLower.includes('froid')) { Icon = Snowflake; color = OFFICIAL_COLORS[3]; }

        return (
            <div key={idx} className="bulletin-card">
                <div className="bulletin-header-mini">
                    <div className="bulletin-icon" style={{
                        background: color,
                        color: '#fff'
                    }}>
                        <Icon size={20} />
                    </div>
                    <div className="bulletin-title-group">
                        <h4>{titlePrefix} {bulletin.title || 'Bulletin de Vigilance'}</h4>
                        <span className="bulletin-time">
                            {bulletin.update_time ? new Date(bulletin.update_time).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            }) : ""}
                        </span>
                    </div>
                </div>
                <div className="bulletin-text-content" style={{ whiteSpace: 'pre-wrap' }}>
                    {bulletin.content || 'Contenu indisponible'}
                </div>
            </div>
        );
    };

    return (
        <div className="vigilance-container official">
            <div id="vigilance-capture-full" style={{ background: '#fff' }}>
                <div id="vigilance-capture-header" className="vigilance-capture-area">
                    <header className="header-top">
                        <div className="logo-section">
                            <img src="https://upload.wikimedia.org/wikipedia/fr/c/c3/Logo_R%C3%A9publique_Fran%C3%A7aise.svg" alt="RF" className="rf-logo" />
                            <div className="mf-logo-square">METEO<br />FRANCE</div>
                            <div className="title-section">
                                <h1>Vigilance météorologique et crues - {period === 0 ? 'Aujourd\'hui' : 'Demain'} {new Date(new Date().getTime() + (period * 86400000)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</h1>
                                <p>
                                    {globalLastUpdate ?
                                        `Données actualisées le ${globalLastUpdate.toLocaleDateString('fr-FR')} à ${globalLastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                                        : `chargement des données...`
                                    }
                                </p>
                            </div>
                        </div>
                    </header>

                </div>

                <div className="tabs-official no-capture">
                    <div className="tabs-left">
                        <div className={`tab-item ${period === 0 ? 'active' : ''}`} onClick={() => { setPeriod(0); setSelectedPhenom(null); }}>Aujourd'hui</div>
                        <div className={`tab-item ${period === 1 ? 'active' : ''}`} onClick={() => { setPeriod(1); setSelectedPhenom(null); }}>Demain</div>
                    </div>

                    <div className="dept-selector-inline">
                        <select
                            className="dept-select-official"
                            value={selectedDep || ""}
                            onChange={(e) => setSelectedDep(e.target.value || null)}
                        >
                            <option value="">Choisissez votre département</option>
                            {geoData?.features.sort((a, b) => a.properties.nom.localeCompare(b.properties.nom)).map(f => (
                                <option key={f.properties.code} value={f.properties.code}>
                                    {f.properties.code} - {f.properties.nom}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div id="vigilance-capture-main" className="vigilance-capture-area">
                    <div className="vigilance-main">
                        <main className="map-column">
                            <div className="map-panel">
                                <div className="map-view-box">
                                    {loading ? <div className="loader-center"><Loader className="spin" size={40} /></div> : (
                                        <svg id="vigilance-map-svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
                                            <g style={{ transform: mapTransform, transition: 'transform 0.6s ease' }}>
                                                {geoData?.features.map(f => {
                                                    const code = f.properties.code;
                                                    const d = currentMap[code];
                                                    const color = d ? OFFICIAL_COLORS[d.displayLevel] : '#f1f5f9';
                                                    const isActive = selectedDep === code;
                                                    return (
                                                        <path
                                                            key={code}
                                                            d={pathGenerator(f)}
                                                            fill={color}
                                                            stroke={isActive ? "#3453a2" : "#fff"}
                                                            strokeWidth={isActive ? 2 : 0.4}
                                                            onClick={() => setSelectedDep(code)}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    );
                                                })}
                                            </g>
                                        </svg>
                                    )}
                                </div>
                            </div>

                            {selectedDep && (
                                <div className="dept-info-footer animate-in">
                                    <div className="footer-top-row">
                                        <div className="f-title">
                                            <span className="f-code">{selectedDep}</span>
                                            <h3>{geoData?.features.find(f => f.properties.code === selectedDep)?.properties.nom}</h3>
                                            <button className="close-dept-btn" onClick={() => setSelectedDep(null)} title="Fermer la sélection"><X size={20} /></button>
                                        </div>
                                        <div className="f-level-tags">
                                            <div className="tag-group">
                                                <span className="tag-label">Aujourd'hui</span>
                                                <div className="f-level-tag" style={{ backgroundColor: OFFICIAL_COLORS[vigilanceData.find(d => d.dep_code === selectedDep && d.period === 0)?.level || 1] }}>
                                                    {vigilanceData.find(d => d.dep_code === selectedDep && d.period === 0)?.level === 1 ? "Vert" : "Vigilance"}
                                                </div>
                                            </div>
                                            <div className="tag-group">
                                                <span className="tag-label">Demain</span>
                                                <div className="f-level-tag" style={{ backgroundColor: OFFICIAL_COLORS[vigilanceData.find(d => d.dep_code === selectedDep && d.period === 1)?.level || 1] }}>
                                                    {vigilanceData.find(d => d.dep_code === selectedDep && d.period === 1)?.level === 1 ? "Vert" : "Vigilance"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="footer-chronology-grid">
                                        {renderHourlyTimeline(
                                            vigilanceData.find(d => d.dep_code === selectedDep && d.period === 0)?.risks,
                                            vigilanceData.find(d => d.dep_code === selectedDep && d.period === 0)?.start_time,
                                            "Chronologie Aujourd'hui"
                                        )}
                                        {renderHourlyTimeline(
                                            vigilanceData.find(d => d.dep_code === selectedDep && d.period === 1)?.risks,
                                            vigilanceData.find(d => d.dep_code === selectedDep && d.period === 1)?.start_time || new Date(new Date().getTime() + 86400000).toISOString(),
                                            "Chronologie Demain"
                                        )}
                                    </div>

                                    {/* Stations Météo (Déplacé ici) */}
                                    <section className="detail-section" style={{ marginTop: '30px' }}>
                                        <h3 className="section-label">Relevés Stations Météo ({selectedDep})</h3>
                                        {localLoading ? <Loader className="spin" size={20} /> : (
                                            <div className="station-grid-row">
                                                {localData.stations.length > 0 ? localData.stations.slice(0, 6).map(s => {
                                                    const obs = localData.obs.find(o => o.station_id === s.id);
                                                    let valStr = "--";
                                                    if (obs) {
                                                        if (selectedPhenom === "1") {
                                                            valStr = (obs.fxi || obs.ff) !== null ? `${obs.fxi || obs.ff} km/h` : "--";
                                                        } else if (selectedPhenom === "2" || selectedPhenom === "4") {
                                                            valStr = obs.rr1 !== null ? `${obs.rr1} mm` : "--";
                                                        } else {
                                                            valStr = obs.t !== null ? `${Math.round(obs.t)}°C` : "--";
                                                        }
                                                    }
                                                    return (
                                                        <div key={s.id} className="station-mini-card">
                                                            <span className="s-name">{s.name}</span>
                                                            <span className="s-val">{valStr}</span>
                                                        </div>
                                                    );
                                                }) : <p className="no-data">Aucune station disponible.</p>}
                                            </div>
                                        )}
                                    </section>

                                    {/* --- BLOC BULLETINS : NATIONAL + DEPARTEMENTAL --- */}
                                    {(() => {
                                        // 1. Bulletins Départementaux
                                        const deptBulletins = bulletins.filter(b => b.domain_id === selectedDep);
                                        // 2. Bulletins Nationaux
                                        const nationalBulletins = bulletins.filter(b => b.domain_id === 'france');

                                        // On affiche toujours le bloc si un département est sélectionné
                                        if (selectedDep) {
                                            return (
                                                <section className="detail-section bulletin-section">
                                                    <h3 className="section-label" style={{ fontSize: '1rem', marginBottom: '20px' }}>
                                                        📰 Bulletins de Suivi
                                                    </h3>

                                                    <div className="bulletins-container">
                                                        {/* Bulletins Locaux */}
                                                        <div className="sub-bulletin-group">
                                                            <h5 className="bulletin-sub-title">Focus Départemental ({selectedDep})</h5>
                                                            {deptBulletins.length > 0 ? (
                                                                deptBulletins.map((b, i) => renderBulletinCard(b, i, ""))
                                                            ) : (
                                                                <div className="no-bulletin-box">
                                                                    <Info size={16} />
                                                                    <span>Aucun bulletin spécifique émis pour ce département actuellement.</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Bulletins Nationaux */}
                                                        {nationalBulletins.length > 0 && (
                                                            <div className="sub-bulletin-group">
                                                                <h5 className="bulletin-sub-title">Contexte National</h5>
                                                                {nationalBulletins.map((b, i) => renderBulletinCard(b, `nat-${i}`, ""))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </section>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            )}
                        </main>

                        <aside className="phenomenon-sidebar">
                            <div className="sidebar-card">
                                <h3>Cartes par phénomène</h3>
                                <div className="phenom-list">
                                    <div
                                        className={`phenom-row ${selectedPhenom === null ? 'selected' : ''}`}
                                        onClick={() => setSelectedPhenom(null)}
                                    >
                                        <div className="phenom-left">
                                            <div className="icon-wrap" style={{ background: '#3453a2', color: '#fff' }}><ShieldAlert size={18} /></div>
                                            <span>Vigilance Globale</span>
                                        </div>
                                    </div>
                                    {PHENOMENONS.map(p => {
                                        const Icon = p.icon;
                                        const isSelected = selectedPhenom === p.id;
                                        const levels = vigilanceData.filter(d => d.period === period).map(d => d.risks?.find(r => r.id === p.id)?.level || 1);
                                        const maxLvl = Math.max(...levels);

                                        return (
                                            <div
                                                key={p.id}
                                                className={`phenom-row ${isSelected ? 'selected' : ''}`}
                                                onClick={() => setSelectedPhenom(isSelected ? null : p.id)}
                                            >
                                                <div className="phenom-left">
                                                    <div className="icon-wrap" style={{
                                                        background: OFFICIAL_COLORS[maxLvl] || OFFICIAL_COLORS[1],
                                                        color: maxLvl === 2 ? '#000' : '#fff'
                                                    }}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <span>{p.name}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="sidebar-card share-card no-capture">
                                <h3>Partager cette carte</h3>
                                <p className="share-desc">Lien direct vers l'image mise à jour en temps réel :</p>
                                <div className="share-link-box">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/vigilance-captures/vigilance_france_latest.png`}
                                        className="share-input"
                                    />
                                    <button
                                        className="copy-btn"
                                        onClick={() => {
                                            const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/vigilance-captures/vigilance_france_latest.png`;
                                            navigator.clipboard.writeText(url);
                                            alert('Lien copié !');
                                        }}
                                    >
                                        Copier
                                    </button>
                                </div>
                                <p className="share-note">Cette image est automatiquement mise à jour suite aux bulletins de Météo-France.</p>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>

            {/* LISTE DES DÉPARTEMENTS EN VIGILANCE */}
            <div className="vigilance-text-list-section">
                <div className="text-list-card">
                    <h3>État de la vigilance par phénomène</h3>
                    <div className="phenomenon-text-groups">
                        {PHENOMENONS.map(phenom => {
                            // Filter departments with vigilance >= 2 for this phenomenon
                            const activeDepts = vigilanceData
                                .filter(d => d.period === period)
                                .map(d => {
                                    const risk = d.risks?.find(r => r.id === phenom.id);
                                    return {
                                        ...d,
                                        riskLevel: risk ? risk.level : 1
                                    };
                                })
                                .filter(d => d.riskLevel >= 2)
                                .sort((a, b) => {
                                    // Sort by department code numerically (handling 2A/2B)
                                    const codeA = a.dep_code.replace('2A', '20.1').replace('2B', '20.2');
                                    const codeB = b.dep_code.replace('2A', '20.1').replace('2B', '20.2');
                                    return parseFloat(codeA) - parseFloat(codeB);
                                });

                            if (activeDepts.length === 0) return null;

                            const Icon = phenom.icon;

                            // Group by vigilance level
                            const deptsByLevel = { 4: [], 3: [], 2: [] };
                            activeDepts.forEach(d => {
                                if (deptsByLevel[d.riskLevel]) deptsByLevel[d.riskLevel].push(d);
                            });

                            return (
                                <div key={phenom.id} className="phenom-text-group">
                                    <div className="phenom-header">
                                        <Icon size={20} className="phenom-icon" />
                                        <h4>{phenom.name}</h4>
                                    </div>
                                    <div className="dept-text-list">
                                        {[4, 3, 2].map(lvl => {
                                            const depts = deptsByLevel[lvl];
                                            if (depts.length === 0) return null;

                                            const colorName = lvl === 4 ? "Rouge" : lvl === 3 ? "Orange" : "Jaune";
                                            const colorHex = OFFICIAL_COLORS[lvl];

                                            const deptString = depts.map(d => {
                                                const feature = geoData?.features.find(f => f.properties.code === d.dep_code);
                                                const name = feature ? feature.properties.nom : "";
                                                return `${d.dep_code} ${name}`;
                                            }).join(', ');

                                            return (
                                                <p key={lvl} className="vigilance-paragraph" style={{ borderLeft: `4px solid ${colorHex}`, paddingLeft: '10px', margin: '8px 0' }}>
                                                    <strong style={{ color: colorHex }}>Vigilance {colorName} :</strong> {deptString}.
                                                </p>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {!vigilanceData.some(d => d.period === period && d.level >= 2) && (
                            <p className="no-vigilance-text" style={{ textAlign: 'center', color: '#166534', padding: '20px' }}>
                                Aucune vigilance particulière en cours sur le territoire (Vert).
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VigilanceFrance;
