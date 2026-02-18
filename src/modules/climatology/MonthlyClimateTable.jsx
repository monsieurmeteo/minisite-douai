import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Calendar, Thermometer, CloudRain, Sun, Download, Activity, AlertTriangle } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, ComposedChart, Line
} from 'recharts';
import './MonthlyClimateTable.css';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function MonthlyClimateTable({ stationId, stationName }) {
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [monthlyData, setMonthlyData] = useState([]);
    const [stats, setStats] = useState(null);
    const [normals, setNormals] = useState(null);

    useEffect(() => {
        if (stationId) {
            fetchMonthlyData();
            fetchNormals();
        }
    }, [stationId, selectedMonth, selectedYear]);

    const fetchNormals = async () => {
        try {
            const { data } = await supabase.from('station_climatology').select('data').eq('station_id', stationId).single();
            if (data?.data) {
                setNormals(data.data.normals);
            }
        } catch (e) {
            console.warn("Normals not found in DB");
        }
    };

    const fetchMonthlyData = async () => {
        setLoading(true);
        try {
            const startDate = new Date(Date.UTC(selectedYear, selectedMonth, 1));
            const endDate = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59));

            // On prend une marge massive de 3 jours pour garantir les fenêtres Tn J-1 et Tx J+1
            const fetchStart = new Date(startDate); fetchStart.setDate(fetchStart.getDate() - 3);
            const fetchEnd = new Date(endDate); fetchEnd.setDate(fetchEnd.getDate() + 3);

            const { data, error } = await supabase
                .from('observations_horaire')
                .select('*')
                .eq('station_id', stationId)
                .gte('timestamp', fetchStart.toISOString())
                .lte('timestamp', fetchEnd.toISOString())
                .order('timestamp');

            if (error) throw error;

            // --- DÉDOUBLONNAGE ---
            // On s'assure de n'avoir qu'un seul point par timestamp pour éviter de fausser RR
            const uniqueDataMap = new Map();
            data.forEach(obs => uniqueDataMap.set(obs.timestamp, obs));
            const cleanData = Array.from(uniqueDataMap.values());

            const dailyData = aggregateOMM(cleanData);
            setMonthlyData(dailyData);
            setStats(calculateMonthStats(dailyData));
        } catch (e) {
            console.error('Erreur OMM:', e);
        }
        setLoading(false);
    };

    const aggregateOMM = (obs) => {
        if (!obs) return [];
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const results = [];

        for (let d = 1; d <= daysInMonth; d++) {
            // FENETRES OMM STRICTES (UTC)
            // Tx et RR : 06h TU le jour J à 06h TU le jour J+1
            const txStart = Date.UTC(selectedYear, selectedMonth, d, 6, 0, 0);
            const txEnd = Date.UTC(selectedYear, selectedMonth, d + 1, 6, 0, 0);

            // Tn : 18h TU le jour J-1 à 18h TU le jour J
            const tnStart = Date.UTC(selectedYear, selectedMonth, d - 1, 18, 0, 0);
            const tnEnd = Date.UTC(selectedYear, selectedMonth, d, 18, 0, 0);

            const sunStart = Date.UTC(selectedYear, selectedMonth, d, 0, 0, 0);
            const sunEnd = Date.UTC(selectedYear, selectedMonth, d + 1, 0, 0, 0);

            // Filtrage Inclusif
            const obsTx = obs.filter(o => {
                const t = new Date(o.timestamp).getTime();
                return t > txStart && t <= txEnd;
            });

            const obsTn = obs.filter(o => {
                const t = new Date(o.timestamp).getTime();
                return t > tnStart && t <= tnEnd;
            });

            const obsSun = obs.filter(o => {
                const t = new Date(o.timestamp).getTime();
                return t >= sunStart && t < sunEnd;
            });

            // CRITERE DE VALIDITE : Un jour est valide dès lors que Tx ET Tn existent
            // (Conformément aux correctifs attendus : "Valider un jour dès lors que Tx et Tn existent")

            let tx = null, tn = null, rr = 0, sun = 0;

            // Tx : On extrait le maximum absolu (via tx12 si dispo, sinon t)
            const tx12s = obsTx.map(o => o.tx12).filter(v => v != null);
            if (tx12s.length > 0) {
                tx = Math.max(...tx12s);
            } else {
                const tvs = obsTx.map(o => o.t).filter(v => v != null);
                tx = tvs.length > 0 ? Math.max(...tvs) : null;
            }

            // Tn : On extrait le minimum absolu (via tn12 si dispo, sinon t)
            const tn12s = obsTn.map(o => o.tn12).filter(v => v != null);
            if (tn12s.length > 0) {
                tn = Math.min(...tn12s);
            } else {
                const tvs = obsTn.map(o => o.t).filter(v => v != null);
                tn = tvs.length > 0 ? Math.min(...tvs) : null;
            }

            const isValid = tx !== null && tn !== null;

            if (isValid) {
                // RR : Cumul strict entre 06h TU et 06h TU+1
                // On s'assure de ne pas compter les valeurs négatives ou de surestimer
                rr = obsTx.reduce((sum, o) => {
                    const val = parseFloat(o.rr1);
                    return sum + (val > 0 ? val : 0);
                }, 0);

                // SUN : Somme
                sun = obsSun.reduce((sum, o) => sum + (o.insolh > 0 ? o.insolh : 0), 0);
            } else {
                // Si non valide selon les critères OMM, on peut tout de même essayer d'afficher 
                // ce qu'on a pour les RR et Sun si la fenêtre Tx est complète
                if (obsTx.length >= 20) {
                    rr = obsTx.reduce((sum, o) => sum + (o.rr1 > 0 ? o.rr1 : 0), 0);
                }
            }

            results.push({ day: d, tx, tn, rr, sun, isValid });
        }
        return results;
    };

    const calculateMonthStats = (daily) => {
        const valids = daily.filter(d => d.isValid);
        // On autorise le calcul si on a des données, même si incomplet
        if (daily.filter(d => d.tx !== null || d.tn !== null).length === 0) return null;

        const txs = daily.map(d => d.tx).filter(v => v != null);
        const tns = daily.map(d => d.tn).filter(v => v != null);
        const rrs = daily.map(d => d.rr).filter(v => v != null);
        const suns = daily.map(d => d.sun).filter(v => v != null);

        return {
            isFull: valids.length >= 25,
            count: valids.length,
            meanTx: txs.length ? txs.reduce((a, b) => a + b, 0) / txs.length : null,
            meanTn: tns.length ? tns.reduce((a, b) => a + b, 0) / tns.length : null,
            totalRr: rrs.reduce((a, b) => a + b, 0),
            totalSun: suns.reduce((a, b) => a + b, 0),
            rainDays: daily.filter(d => d.rr >= 1).length
        };
    };

    const exportCSV = () => {
        const headers = ["Jour;Tx;Tn;RR;Soleil"];
        const rows = monthlyData.map(d => `${d.day};${d.tx ?? '-'};${d.tn ?? '-'};${d.isValid ? d.rr.toFixed(1) : '-'};${d.isValid ? d.sun.toFixed(1) : '-'}`);
        const blob = new Blob(["\ufeff" + [headers, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `OMM_${stationId}_${selectedYear}_${selectedMonth + 1}.csv`;
        link.click();
    };

    if (loading) return <div className="monthly-loading">Chargement des normes OMM...</div>;

    return (
        <div className="monthly-climate-table">
            <div className="monthly-header">
                <div className="monthly-title">
                    <span className="station-label">RELEVÉS CLIMATOLOGIQUES OMM</span>
                    <h2>{MONTHS[selectedMonth]} {selectedYear}</h2>
                    <p className="station-meta">{stationName} ({stationId})</p>
                </div>

                <div className="monthly-controls">
                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <button className="export-btn" onClick={exportCSV}><Download size={18} /> CSV</button>
                </div>
            </div>

            {stats && (
                <div className="monthly-chart-section card animate-fade-in" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'white' }}>
                    <h3 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Comparaison Températures vs Normales
                    </h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="day"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <YAxis
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    unit="°"
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(value, name) => {
                                        if (name === 'Normale Tx' || name === 'Normale Tn') return [`${value.toFixed(1)}°C`];
                                        return [`${value.toFixed(1)}°C`];
                                    }}
                                />
                                {/* Zone Tx/Tn */}
                                <Area type="monotone" dataKey="tx" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} name="Tx (Max)" connectNulls />
                                <Area type="monotone" dataKey="tn" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} name="Tn (Min)" connectNulls />

                                {/* Lignes des Normales (Statiques sur le mois) */}
                                {normals && normals.tx && normals.tx[selectedMonth] !== undefined && (
                                    <Line type="monotone" dataKey={() => normals.tx[selectedMonth]} stroke="#fca5a5" strokeDasharray="5 5" dot={false} strokeWidth={1} name="Normale Tx" />
                                )}
                                {normals && normals.tn && normals.tn[selectedMonth] !== undefined && (
                                    <Line type="monotone" dataKey={() => normals.tn[selectedMonth]} stroke="#93c5fd" strokeDasharray="5 5" dot={false} strokeWidth={1} name="Normale Tn" />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {!stats?.isFull && (
                <div className="incomplete-banner">
                    <AlertTriangle size={18} />
                    <span>Statistiques basées sur {stats?.count || 0}/25 jours minima requis.</span>
                </div>
            )}

            <div className="monthly-table-wrapper">
                <table className="monthly-table omm-strict-style">
                    <thead>
                        <tr>
                            <th>Jour</th>
                            <th>Tx (06-06 TU)</th>
                            <th>Tn (18-18 TU)</th>
                            <th>RR (06-06 TU)</th>
                            <th>Soleil (h)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {monthlyData.map(d => (
                            <tr key={d.day} className={!d.isValid ? 'invalid-row' : ''}>
                                <td className="day-col">{d.day}</td>
                                <td className={`tx-col ${d.tx >= 25 ? 'is-hot' : ''}`}>{d.tx !== null ? d.tx.toFixed(1) + '°' : '-'}</td>
                                <td className={`tn-col ${d.tn <= 0 ? 'is-frost' : ''}`}>{d.tn !== null ? d.tn.toFixed(1) + '°' : '-'}</td>
                                <td className="rr-col">{d.isValid ? d.rr.toFixed(1) + ' mm' : '-'}</td>
                                <td className="sun-col">{d.isValid ? d.sun.toFixed(1) + ' h' : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                    {stats?.isFull && (
                        <tfoot>
                            <tr className="monthly-summary">
                                <td>MOYENNES/TOT</td>
                                <td>{stats.meanTx.toFixed(1)}°</td>
                                <td>{stats.meanTn.toFixed(1)}°</td>
                                <td>{stats.totalRr.toFixed(1)} mm</td>
                                <td>{stats.totalSun.toFixed(1)} h</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
