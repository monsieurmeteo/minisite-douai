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
    // 1. Dédoublonnage des données (Garder uniquement l'entrée la plus récente par département)
    const activeVigilanceMap = new Map();
    vigilanceData.forEach(d => {
        const depCode = d.dep_code?.toString().trim();
        if (d.period === period && depCode && !['FRA', '99', 'METRO', '00'].includes(depCode)) {
            const existing = activeVigilanceMap.get(depCode);
            if (!existing || new Date(d.last_update) > new Date(existing.last_update)) {
                activeVigilanceMap.set(depCode, d);
            }
        }
    });
    const activeVigilance = Array.from(activeVigilanceMap.values());
    const maxLevel = Math.max(...activeVigilance.map(d => d.level || 1), 1);

    // 2. Calcul des phénomènes par niveau PRÉCIS
    const activePhenomsList = [];
    phenoms.forEach(p => {
        [4, 3, 2].forEach(lvl => {
            // On compte les départements où CE phénomène précis est à CE niveau précis
            const count = activeVigilance.filter(d => {
                const risk = d.risks?.find(r => r.id.toString() === p.id.toString());
                return risk && parseInt(risk.level) === lvl;
            }).length;

            if (count > 0) {
                activePhenomsList.push({
                    ...p,
                    maxLvl: lvl,
                    count: count,
                    uniqueKey: `${p.id}-${lvl}`
                });
            }
        });
    });

    // Tri par gravité (Rouge > Orange > Jaune)
    activePhenomsList.sort((a, b) => b.maxLvl - a.maxLvl);

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

                </div>
            </div>
        </div>
    );
};

export default VigilanceSocialCard;
