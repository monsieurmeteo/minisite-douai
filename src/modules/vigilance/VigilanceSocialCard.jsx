import React from 'react';
import { geoConicConformal, geoPath } from "d3-geo";
import { Activity, ShieldAlert, Info } from 'lucide-react';

const OFFICIAL_COLORS = {
    1: '#22c55e', // Vert plus lisible
    2: '#ffeb3b', // Jaune plus saturé
    3: '#ff9800', // Orange plus saturé
    4: '#d32f2f', // Rouge plus profond
};

const VigilanceSocialCard = ({ geoData, vigilanceData, period, lastUpdate, phenoms }) => {
    // 1. Calcul du niveau max et phénomènes actifs (Exclure Andorre et les codes globaux)
    const activeVigilance = vigilanceData.filter(d =>
        d.period === period &&
        d.dep_code &&
        !['FRA', '99', 'METRO', '00'].includes(d.dep_code.toString().trim())
    );
    const maxLevel = Math.max(...activeVigilance.map(d => d.level || 1), 1);

    // Trouver les phénomènes en vigilance (>= 2) globalement avec décompte
    const activePhenomsList = phenoms.map(p => {
        const levels = activeVigilance.map(d => d.risks?.find(r => r.id === p.id)?.level || 1);
        const maxLvl = Math.max(...levels);
        const count = levels.filter(lvl => lvl >= 2).length;
        return { ...p, maxLvl, count };
    }).filter(p => p.maxLvl >= 2)
        .sort((a, b) => b.maxLvl - a.maxLvl); // Priorité aux plus hauts niveaux

    // Phénomène principal pour le titre
    const mainPhenomName = activePhenomsList.length > 0 ? activePhenomsList[0].name.toUpperCase() : "MÉTÉOROLOGIQUE";

    // Projection optimisée pour verticalité
    const projection = geoConicConformal().fitSize([1100, 1100], geoData);
    const pathGenerator = geoPath().projection(projection);

    const mapData = {};
    activeVigilance.forEach(d => {
        mapData[d.dep_code] = d.level;
    });

    const now = new Date();
    const targetDate = new Date(now);
    if (period === 1) targetDate.setDate(now.getDate() + 1);

    const targetDateFullStr = targetDate.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const dateStr = lastUpdate ? new Date(lastUpdate).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    }) : "";
    const timeStr = lastUpdate ? new Date(lastUpdate).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit'
    }) : "";

    const headerClass = maxLevel === 4 ? 'bg-red-deep' : maxLevel === 3 ? 'bg-orange-vibrant' : maxLevel === 2 ? 'bg-yellow-bright' : 'bg-green-safe';

    return (
        <div className="social-fb-container">
            <div id="vigilance-social-card" className="social-fb-card">
                {/* 🔝 BLOC 1 - BANDEAU TITRE DYNAMIQUE AVEC DATE ET PHÉNOMÈNE */}
                <div className={`social-fb-header ${headerClass}`}>
                    <div className="header-top-line">
                        <ShieldAlert size={40} className="header-icon" />
                        <h1>⚠️ CARTE DE VIGILANCE DU {targetDateFullStr.toUpperCase()}</h1>
                    </div>
                    <div className="header-bottom-line">
                        <span>VIGILANCE {mainPhenomName}</span>
                    </div>
                </div>

                <div className="social-fb-body">
                    <div className="social-fb-map-area">
                        <svg viewBox="0 0 1100 1100" className="fb-svg-map">
                            <filter id="shadow-deep" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="15" />
                                <feOffset dx="0" dy="12" result="offsetblur" />
                                <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.3" />
                                </feComponentTransfer>
                                <feMerge>
                                    <feMergeNode />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                            <g filter="url(#shadow-deep)">
                                {geoData?.features.map(f => {
                                    const code = f.properties.code;
                                    const level = mapData[code] || 1;
                                    return (
                                        <path
                                            key={code}
                                            d={pathGenerator(f)}
                                            fill={OFFICIAL_COLORS[level]}
                                            stroke="#1e293b"
                                            strokeWidth="2"
                                            strokeLinejoin="round"
                                        />
                                    );
                                })}
                            </g>
                        </svg>

                        {/* Légende Bas Gauche (dans la carte) */}
                        <div className="fb-legend-minimal">
                            {[1, 2, 3, 4].map(lvl => (
                                <div key={lvl} className="legend-item">
                                    <span className="dot" style={{ backgroundColor: OFFICIAL_COLORS[lvl] }}></span>
                                    <span>{lvl === 1 ? 'Vert' : lvl === 2 ? 'Jaune' : lvl === 3 ? 'Orange' : 'Rouge'}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 🏷️ PHÉNOMÈNES EN DESSOUS DE LA CARTE */}
                    <div className="social-phenoms-footer-alt">
                        <div className="phenoms-pills-row">
                            {activePhenomsList.map(p => (
                                <div key={p.id} className={`status-pill-new lvl-${p.maxLvl}`}>
                                    <span className="pill-dot" style={{ backgroundColor: OFFICIAL_COLORS[p.maxLvl] }}></span>
                                    <span className="pill-text">{p.name.toUpperCase()} ({p.count})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VigilanceSocialCard;
