import React, { useEffect, useRef, useState } from 'react';
import { supabase, weatherAPI } from '../../services/api';
import { DEPARTMENTS } from '../../data/departments';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FileText, Calendar, Thermometer, CloudRain, Wind, ShieldCheck, Download, Printer, Copy, Eraser, Save, Mail, Phone, Briefcase, Trash2 } from 'lucide-react';
import './CertificatMeteoManager.css';

const CertificatMeteoManager = () => {
    // --- États du formulaire demandeur ---
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientCity, setClientCity] = useState('');
    const [clientZip, setClientZip] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');

    // --- États Emetteur (Météo Climat Pro) ---
    const [emitterAddress, setEmitterAddress] = useState('400 rue Paul Larfargue');
    const [emitterZip, setEmitterZip] = useState('59283');
    const [emitterCity, setEmitterCity] = useState('RAIMBEAUCOURT');
    const [emitterPhone, setEmitterPhone] = useState('06 83 90 91 60');
    const [emitterEmail, setEmitterEmail] = useState('patrick.marliere@wanadoo.fr');
    const [companyLogo, setCompanyLogo] = useState('/logo.jpg');

    // --- États de l'événement ---
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isPeriod, setIsPeriod] = useState(false);
    const [eventTime, setEventTime] = useState('');
    const [eventRange, setEventRange] = useState(''); // Ex: "Matin", "14h-16h"
    const [certType, setCertType] = useState('Vent violent');
    const [certRef, setCertRef] = useState('CERT-' + Date.now().toString().slice(-6));

    // --- États techniques & Données ---
    const [stations, setStations] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedStationId, setSelectedStationId] = useState('');
    const [stationMeteo, setStationMeteo] = useState('');
    const [loadingStations, setLoadingStations] = useState(false);
    const [stationNames, setStationNames] = useState({});

    const [globalData, setGlobalData] = useState({});
    const [status, setStatus] = useState('');
    const [reportOutput, setReportOutput] = useState('');
    const [showCharts, setShowCharts] = useState(true);
    const [multiChartMode, setMultiChartMode] = useState(false);
    const [chartDesign, setChartDesign] = useState('architect');
    const [showWindAvg, setShowWindAvg] = useState(false);
    const [nearbyStations, setNearbyStations] = useState([]);
    const [selectedStationDist, setSelectedStationDist] = useState(null);

    const [customConclusion, setCustomConclusion] = useState(''); // Pour l'édition manuelle
    const [customSynthesis, setCustomSynthesis] = useState(''); // Pour l'édition manuelle
    const [showValuesUnderTitle, setShowValuesUnderTitle] = useState(true); // Toggle pour les highlights

    // --- États d'affichage des paramètres ---
    const [showWindParams, setShowWindParams] = useState(true);
    const [showRainParams, setShowRainParams] = useState(true);
    const [showTempParams, setShowTempParams] = useState(true);
    const [showHumiParams, setShowHumiParams] = useState(false);
    const [showPresParams, setShowPresParams] = useState(false);
    const [showVisParams, setShowVisParams] = useState(false);

    // --- États d'affichage Annexe ---
    const [showDetailedHumi, setShowDetailedHumi] = useState(false);
    const [showDetailedPres, setShowDetailedPres] = useState(false);
    const [showDetailedVis, setShowDetailedVis] = useState(false);

    const [archives, setArchives] = useState([]);
    const [showArchivesModal, setShowArchivesModal] = useState(false);
    const [loadingArchives, setLoadingArchives] = useState(false);

    const chartRefs = useRef({});

    // --- Constantes ---
    const CERT_TYPES = [
        "Vent violent",
        "Tempête",
        "Forte pluie",
        "Inondation / Ruissellement",
        "Grêle",
        "Orage / Foudre",
        "Chaleur / Canicule",
        "Gel / Grand froid",
        "Neige",
        "Autre phénomène"
    ];

    // Synchro dates
    useEffect(() => {
        if (isPeriod && new Date(endDate) < new Date(startDate)) {
            setEndDate(startDate);
        }
    }, [startDate, isPeriod]);

    // Auto-ajustement des paramètres selon le phénomène
    // Auto-ajustement des paramètres selon le phénomène
    useEffect(() => {
        const type = certType.toLowerCase();
        // Reset optionnels (Humi / Press / Vis) restent décochés par défaut sauf si l'utilisateur les coche manuellement
        setShowHumiParams(false); setShowPresParams(false); setShowVisParams(false);

        if (type.includes('vent') || type.includes('tempête')) {
            setShowWindParams(true); setShowRainParams(false); setShowTempParams(false);
        } else if (type.includes('pluie') || type.includes('inondation')) {
            setShowWindParams(false); setShowRainParams(true); setShowTempParams(false);
        } else if (type.includes('chaleur') || type.includes('canicule') || type.includes('froid') || type.includes('gel')) {
            setShowWindParams(false); setShowRainParams(false); setShowTempParams(true);
        } else if (type.includes('orage') || type.includes('grêle')) {
            setShowWindParams(true); setShowRainParams(true); setShowTempParams(false);
        } else if (type.includes('neige')) {
            setShowWindParams(false); setShowRainParams(true); setShowTempParams(true);
        } else {
            setShowWindParams(true); setShowRainParams(true); setShowTempParams(true);
        }
    }, [certType]);

    // Initialisation
    useEffect(() => {
        if (!window.Chart) {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/chart.js";
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    // Chargement des stations quand le département change
    useEffect(() => {
        if (!selectedDept) { setStations([]); return; }
        async function getStations() {
            setLoadingStations(true);
            try {
                let data = await weatherAPI.getDepartmentLatestHoraire(selectedDept);
                if (data.length === 0) {
                    // Fallback local
                    const stationNamesData = await import('../../data/stationNames.json');
                    const deptPrefix = (selectedDept === '2A' || selectedDept === '2B') ? '20' : selectedDept;
                    const filtered = Object.entries(stationNamesData.default || stationNamesData)
                        .filter(([id]) => id.startsWith(deptPrefix))
                        .map(([id, name]) => ({ station_id: id, nom_station: name }));
                    data = filtered;
                }
                setStations(data);

                // Récupération des noms
                const names = { ...stationNames };
                const { geoService } = await import('../../services/geoService');
                for (const s of data) {
                    const sid = s.station_id || s.id_station;
                    if (!names[sid]) {
                        if (s.nom_station) names[sid] = s.nom_station;
                        else names[sid] = await geoService.getCommuneName(sid.substring(0, 5), sid);
                    }
                }
                setStationNames(names);
            } catch (e) {
                console.error("Erreur chargement stations:", e);
                setStatus('❌ Erreur chargement stations');
            } finally {
                setLoadingStations(false);
            }
        }
        getStations();
    }, [selectedDept]);

    // Mise à jour du rapport quand les données changent
    useEffect(() => {
        generateReport();
    }, [globalData, clientName, clientAddress, clientCity, clientZip, startDate, endDate, isPeriod, certType, showCharts, multiChartMode, chartDesign, showWindAvg, nearbyStations, selectedStationDist, showValuesUnderTitle, showWindParams, showRainParams, showTempParams]);

    // --- Calcul "Live" des stations proches si la ville change ---
    useEffect(() => {
        const timer = setTimeout(() => {
            if (clientCity && globalData.rows) {
                const finalEndDate = isPeriod ? endDate : startDate;
                refreshNearbyStations(startDate, finalEndDate);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [clientCity, selectedStationId, certType, startDate, endDate, isPeriod]);

    const refreshNearbyStations = async (startDate, endDate) => {
        if (!clientCity) return;

        try {
            console.log("[Certificat] Refresh Stations Proches pour:", clientCity);
            const cityResults = await weatherAPI.searchCity(clientCity);
            if (!cityResults || cityResults.length === 0) {
                console.warn("Ville inconnue:", clientCity);
                return;
            }

            const cityLat = cityResults[0].lat;
            const cityLon = cityResults[0].lon;

            // Calcul distances via RPC Supabase (toutes stations confondues)
            // On demande plus de stations (30) pour pouvoir filtrer celles qui ne mesurent pas le paramètre requis
            const { data: dists, error } = await supabase.rpc('find_nearest_stations', {
                lat_input: cityLat,
                lon_input: cityLon,
                limit_count: 30
            });

            if (error) { console.error("RPC Error", error); return; }
            if (!dists || dists.length === 0) return;

            console.log(`[Certificat] ${dists.length} stations candidates trouvées.`);

            // Extraire la distance de la station SÉLECTIONNÉE si elle est dans la liste (ce qui est probable si on a pris large)
            const currentStation = dists.find(s => s.id === selectedStationId);
            if (currentStation) {
                setSelectedStationDist(currentStation.dist_km);
            } else {
                // Si pas trouvée dans le top 20, on peut essayer de calculer manuellement si on a ses coords dans 'stations'
                const sLocal = stations.find(s => s.station_id === selectedStationId);
                if (sLocal && (sLocal.lat || sLocal.latest?.lat)) {
                    const latS = sLocal.lat || sLocal.latest.lat;
                    const lonS = sLocal.lon || sLocal.latest.lon;
                    const R = 6371;
                    const dLat = (latS - cityLat) * Math.PI / 180;
                    const dLon = (lonS - cityLon) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(cityLat * Math.PI / 180) * Math.cos(latS * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    setSelectedStationDist(R * c);
                } else {
                    setSelectedStationDist(null);
                }
            }

            // Filtrer la station sélectionnée et limiter à 8 candidats pour la rapidité
            const candidates = dists.filter(s => s.id !== selectedStationId).slice(0, 8);

            // Fetch Data pour tous les candidats (en parallèle)
            const enrichedCandidates = await Promise.all(candidates.map(async (s) => {
                try {
                    const { meteoFrancePosteService } = await import('../../services/meteoFrancePosteService');
                    let sHistory = await weatherAPI.getStationHourlyHistoryRange(s.id, startDate, endDate);

                    if (!sHistory || sHistory.length === 0) {
                        try {
                            sHistory = await meteoFrancePosteService.getStationHourlyHistory(s.id, startDate, endDate);
                        } catch (e) { }
                    }

                    // Fallback to 6mn aggregation if still empty
                    if (!sHistory || sHistory.length === 0) {
                        try {
                            const data6mn = await weatherAPI.getStation6mnHistory(s.id, new Date(startDate));
                            if (data6mn && data6mn.length > 0) {
                                // Simple aggregation for max gust and rain sum on the whole day
                                const maxGustRow = data6mn.reduce((prev, curr) => ((curr.gust || 0) > (prev.gust || 0)) ? curr : prev, { gust: 0 });
                                const maxG = maxGustRow.gust || 0;
                                const maxGustDate = maxG > 0 ? maxGustRow.time : null;

                                const sumR = data6mn.reduce((acc, d) => acc + (d.rain || 0), 0);

                                // On essaie aussi de choper la temp si dispo
                                const validTemps = data6mn.filter(d => d.temp !== undefined);
                                let maxTemp = undefined;
                                let minTemp = undefined;
                                let maxTempDate = null;
                                let minTempDate = null;

                                if (validTemps.length > 0) {
                                    const maxTRow = validTemps.reduce((prev, curr) => (curr.temp > prev.temp) ? curr : prev);
                                    const minTRow = validTemps.reduce((prev, curr) => (curr.temp < prev.temp) ? curr : prev);
                                    maxTemp = maxTRow.temp;
                                    maxTempDate = maxTRow.time;
                                    minTemp = minTRow.temp;
                                    minTempDate = minTRow.time;
                                }

                                return {
                                    id: s.id,
                                    name: s.name || s.id,
                                    dist: s.dist_km,
                                    maxGust: Math.round(maxG),
                                    maxGustDate: maxGustDate,
                                    rain: sumR.toFixed(1),
                                    maxTemp: maxTemp !== undefined ? Math.round(maxTemp * 10) / 10 : '-',
                                    maxTempDate: maxTempDate,
                                    minTemp: minTemp !== undefined ? Math.round(minTemp * 10) / 10 : '-',
                                    minTempDate: minTempDate
                                };
                            }
                        } catch (e) { }
                    }

                    let sMaxGust = '-';
                    let sRain = '-';
                    let sMaxTemp = '-';
                    let sMinTemp = '-';
                    let sSnow = '-';

                    let sMaxGustDate = null;
                    let sMaxTempDate = null;
                    let sMinTempDate = null;

                    if (sHistory && sHistory.length > 0) {
                        // Find Row with Max Gust
                        const maxGustRow = sHistory.reduce((prev, curr) => {
                            const prevGust = prev.gust || prev.w_gst || prev.fxi || 0;
                            const currGust = curr.gust || curr.w_gst || curr.fxi || 0;
                            return (currGust > prevGust) ? curr : prev;
                        }, { gust: 0, w_gst: 0, fxi: 0, time: null }); // Initialize with a default object

                        const maxG = maxGustRow.gust || maxGustRow.w_gst || maxGustRow.fxi || 0;
                        sMaxGustDate = maxG > 0 ? maxGustRow.time : null;

                        const sumR = sHistory.reduce((acc, r) => acc + (r.rain || r.rr1 || 0), 0);

                        // Temps
                        let maxTempRow = null;
                        let minTempRow = null;
                        const validTempRows = sHistory.filter(r => (r.temp !== undefined && r.temp !== null && r.temp > -100 && r.temp < 100)); // Filter out sentinel values
                        if (validTempRows.length > 0) {
                            maxTempRow = validTempRows.reduce((prev, curr) => (curr.temp > prev.temp) ? curr : prev);
                            minTempRow = validTempRows.reduce((prev, curr) => (curr.temp < prev.temp) ? curr : prev);
                        }
                        const maxT = maxTempRow ? maxTempRow.temp : -999;
                        const minT = minTempRow ? minTempRow.temp : 999;
                        if (maxTempRow) sMaxTempDate = maxTempRow.time;
                        if (minTempRow) sMinTempDate = minTempRow.time;

                        // Estimation Neige: Si T < 0, on considère la pluie comme neige (1mm = 1cm)
                        const snowSum = sHistory.reduce((acc, r) => {
                            const t = r.temp || r.t || 99;
                            const rVal = r.rain || r.rr1 || 0;
                            return acc + (t < 0 ? rVal : 0);
                        }, 0);

                        sMaxGust = maxG > 0 ? Math.round(maxG) : '-';
                        sRain = sumR >= 0 ? sumR.toFixed(1) : '-';
                        sMaxTemp = maxT > -100 ? Math.round(maxT * 10) / 10 : '-';
                        sMinTemp = minT < 100 ? Math.round(minT * 10) / 10 : '-';
                        sSnow = snowSum > 0 ? snowSum.toFixed(1) : (minT < 0 ? '0' : '-'); // Affiche 0 si froid mais pas de neige
                    }
                    return {
                        id: s.id,
                        name: s.name || s.id,
                        dist: s.dist_km,
                        maxGust: sMaxGust,
                        maxGustDate: sMaxGustDate,
                        rain: sRain,
                        maxTemp: sMaxTemp,
                        maxTempDate: sMaxTempDate,
                        minTemp: sMinTemp,
                        minTempDate: sMinTempDate,
                        snow: sSnow
                    };
                } catch (err) {
                    return { id: s.id, name: s.name || s.id, dist: s.dist_km, maxGust: '?', rain: '?', maxTemp: '?', minTemp: '?', snow: '?' };
                }
            }));

            console.log("[Certificat] Candidats enrichis (sample):", enrichedCandidates.slice(0, 3));

            // Filtrage Intelligent : On ne garde que les stations qui ont la donnée pertinente !
            const validStations = enrichedCandidates.filter(s => {
                const type = certType.toLowerCase();
                if (type.includes('vent') || type.includes('tempête') || type.includes('orage')) {
                    if (s.maxGust !== '-' && s.maxGust !== '?' && parseFloat(s.maxGust) > 0) return true;
                }
                else if (type.includes('pluie') || type.includes('inondation')) {
                    if (s.rain !== '-' && s.rain !== '?') return true;
                }
                else if (type.includes('froid') || type.includes('gel')) {
                    if (s.minTemp !== '-' && s.minTemp !== '?') return true;
                }
                else if (type.includes('chaleur') || type.includes('canicule')) {
                    if (s.maxTemp !== '-' && s.maxTemp !== '?') return true;
                }
                else if (type.includes('neige')) {
                    if (s.snow !== '-' && s.snow !== '?') return true;
                    if (s.minTemp !== '-' && s.minTemp !== '?') return true; // Fallback temperature
                }
                else {
                    // Par défaut si on a au moins une donnée
                    if (s.maxTemp !== '-' || s.maxGust !== '-') return true;
                }
                return false;
            });

            console.log(`[Certificat] Stations valides: ${validStations.length} `, validStations);

            setNearbyStations(validStations.slice(0, 4));
        } catch (errGeo) {
            console.error("Erreur refreshNearbyStations:", errGeo);
        }
    };

    const handleSaveToDB = async () => {
        if (!globalData.rows) return;
        setStatus('⏳ Enregistrement...');
        try {
            const payload = {
                nom_client: clientName || 'Sans Nom',
                adresse: clientAddress,
                ville: clientCity,
                code_postal: clientZip,
                email_client: clientEmail,
                date_sinistre: startDate,
                heure_sinistre: eventTime,
                type_certificat: certType,
                station_reference: stationMeteo,
                station_id: selectedStationId,
                donnees_brutes_json: {
                    stats: globalData.stats,
                    rows: globalData.rows,
                    summary: customSynthesis,
                    conclusion: customConclusion
                },
                date_generation: new Date()
            };

            const { error } = await supabase.from('certificats_meteo').insert([payload]);
            if (error) throw error;
            setStatus('✅ Certificat enregistré en base avec succès.');
        } catch (e) {
            console.error(e);
            setStatus('❌ Erreur : ' + e.message);
        }
    };

    const fetchArchives = async () => {
        setLoadingArchives(true);
        try {
            const { data, error } = await supabase
                .from('certificats_meteo')
                .select('*')
                .order('date_generation', { ascending: false });
            if (error) throw error;
            setArchives(data || []);
            setShowArchivesModal(true);
        } catch (e) {
            console.error(e);
            alert("Erreur lors du chargement des archives");
        } finally {
            setLoadingArchives(false);
        }
    };

    const deleteArchive = async (id) => {
        if (!window.confirm("Voulez-vous vraiment supprimer ce certificat ?")) return;
        try {
            const { error } = await supabase.from('certificats_meteo').delete().eq('id', id);
            if (error) throw error;
            setArchives(archives.filter(a => a.id !== id));
            setStatus('🗑️ Certificat supprimé.');
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la suppression");
        }
    };

    const loadArchive = (a) => {
        setClientName(a.nom_client || '');
        setClientAddress(a.adresse || '');
        setClientCity(a.ville || '');
        setClientZip(a.code_postal || '');
        setClientEmail(a.email_client || '');
        setStartDate(a.date_sinistre || '');
        setEventTime(a.heure_sinistre || '');
        setCertType(a.type_certificat || 'Vent violent');
        setSelectedStationId(a.station_id || '');
        if (a.donnees_brutes_json) {
            setGlobalData({
                rows: a.donnees_brutes_json.rows || [],
                stats: a.donnees_brutes_json.stats || {},
                date: a.date_sinistre
            });
            setCustomSynthesis(a.donnees_brutes_json.summary || '');
            setCustomConclusion(a.donnees_brutes_json.conclusion || '');
        }
        setShowArchivesModal(false);
        setStatus(`📂 Certificat chargé : ${a.nom_client} (${a.date_sinistre})`);
    };

    // --- Logique de récupération des données (Similaire BTP mais simplifiée) ---
    const handleFetchData = async () => {
        if (!selectedStationId || !startDate) {
            setStatus('⚠️ Veuillez sélectionner une station et une date.');
            return;
        }

        setStatus('⏳ Récupération des données météorologiques...');
        setGlobalData({});

        try {
            const finalEndDate = isPeriod ? endDate : startDate;
            let history = [];

            // Calcul durée pour décider stratégie
            const d1 = new Date(startDate);
            const d2 = new Date(finalEndDate);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const useHighPrecision = diffDays <= 31;

            // STRATÉGIE 1 : HAUTE PRÉCISION (6mn -> Horaire Agrégé)
            // Prioritaire pour les courtes durées afin de capturer les pics intra-horaires réels
            if (useHighPrecision) {
                console.log("[Certificat] Stratégie Haute Précision activée (6mn agreg)...");
                try {
                    const startD = new Date(startDate); startD.setHours(0, 0, 0, 0);
                    const endD = new Date(finalEndDate); endD.setHours(23, 59, 59, 999);
                    const aggregatedHistory = [];
                    const currentD = new Date(startD);

                    while (currentD <= endD) {
                        const dayData6mn = await weatherAPI.getStation6mnHistory(selectedStationId, new Date(currentD));
                        if (dayData6mn && dayData6mn.length > 0) {
                            // On filtre pour ne garder que les piles (indiquant la fin de l'heure)
                            // et on agrège ce qui précède
                            const dayHourly = [];
                            // On génère 24h
                            for (let h = 0; h < 24; h++) {
                                const hourTarget = new Date(currentD); hourTarget.setHours(h, 0, 0, 0);
                                // On cherche les données de l'heure écoulée [H-59mn, H]
                                // Ex: pour 10h00, on prend 09h01 -> 10h00. 
                                // Note: getStation6mnHistory retourne timestamps exacts.

                                // Simplification : On groupe par heure.
                                // On prend toutes les données dont l'heure est 'h'.
                                const hourlySegment = dayData6mn.filter(d => d.time.getHours() === h);

                                if (hourlySegment.length > 0) {
                                    // On prend la dernière mesure pour les vals instantanées (temp, press)
                                    // Ou la mesure pile à l'heure si elle existe
                                    const lastMeas = hourlySegment.find(d => d.time.getMinutes() === 0) || hourlySegment[hourlySegment.length - 1];

                                    const hourlyRain = hourlySegment.reduce((sum, d) => sum + (d.rain || 0), 0);

                                    // Rafale Max
                                    const hourlyGust = Math.max(...hourlySegment.map(d => d.gust || 0));

                                    // Vent Moyen Max (le max des vents moyens relevés toutes les 6mn)
                                    const hourlyWindMax = Math.max(...hourlySegment.map(d => d.wind || 0));

                                    // Température Max
                                    const hourlyTempMax = Math.max(...hourlySegment.map(d => d.temp !== null ? d.temp : -999));
                                    const finalTemp = hourlyTempMax > -900 ? hourlyTempMax : lastMeas.temp;

                                    dayHourly.push({
                                        time: lastMeas.time, // Timestamp de l'heure
                                        temp: finalTemp, // Max sur l'heure
                                        rain: hourlyRain, // Somme
                                        wind: hourlyWindMax, // Max des moyens
                                        gust: hourlyGust > 0 ? hourlyGust : lastMeas.gust, // Max
                                        hum: lastMeas.hum,
                                        vv: lastMeas.vv,
                                        pres: lastMeas.pressure
                                    });
                                }
                            }
                            aggregatedHistory.push(...dayHourly);
                        }
                        currentD.setDate(currentD.getDate() + 1);
                    }

                    if (aggregatedHistory.length > 0) {
                        history = aggregatedHistory.sort((a, b) => a.time - b.time);
                        console.log(`[Certificat] ${history.length} heures récupérées via 6mn.`);
                    }
                } catch (e) {
                    console.warn("Echec stratégie haute précision", e);
                }
            }

            // STRATÉGIE 2 : STANDARD (Horaire BDD)
            // Si stratégie 1 échouée ou période longue
            if (!history || history.length === 0) {
                console.log("[Certificat] Fallback Standard Horaire...");
                history = await weatherAPI.getStationHourlyHistoryRange(selectedStationId, startDate, finalEndDate);
            }

            // STRATÉGIE 3 : ARCHIVES MF
            if (!history || history.length === 0) {
                const { meteoFrancePosteService } = await import('../../services/meteoFrancePosteService');
                try {
                    const apiData = await meteoFrancePosteService.getStationHourlyHistory(selectedStationId, startDate, finalEndDate);
                    if (apiData && apiData.length > 0) history = apiData;
                } catch (e) {
                    console.warn("Echec fallback MF", e);
                }
            }

            if (!history || history.length === 0) {
                setStatus('❌ Aucune donnée trouvée pour cette date et cette station.');
                return;
            }

            // Formatage des données
            // On garde le timestamp complet pour identifier le jour/heure exact
            const rows = history.map(obs => ({
                time: new Date(obs.time),
                h: new Date(obs.time).getHours(),
                temp: obs.temp,
                rain: obs.rain || 0,
                w_avg: obs.wind,
                w_gst: obs.gust,
                humi: obs.hum,
                pres: obs.pres,
                vv: obs.vv
            })).sort((a, b) => a.time - b.time);

            // Calcul des stats de la période
            const windMaxRow = rows.reduce((prev, curr) => (Number(prev.w_gst) >= Number(curr.w_gst) ? prev : curr), rows[0]);
            const rainMaxRow = rows.reduce((prev, curr) => (Number(prev.rain) >= Number(curr.rain) ? prev : curr), rows[0]);

            const tempMaxRow = rows.reduce((prev, curr) => (Number(prev.temp) >= Number(curr.temp) ? prev : curr), rows[0]);
            const tempMinRow = rows.reduce((prev, curr) => (Number(prev.temp) <= Number(curr.temp) ? prev : curr), rows[0]);

            const stats = {
                tempMax: tempMaxRow.temp,
                tempMaxTime: tempMaxRow.time,
                tempMin: tempMinRow.temp,
                tempMinTime: tempMinRow.time,
                rainTotal: rows.reduce((acc, r) => acc + (Number(r.rain) || 0), 0),
                snowTotal: rows.reduce((acc, r) => acc + (Number(r.temp) <= 0 ? (Number(r.rain) || 0) : 0), 0),
                windGustMax: windMaxRow.w_gst,
                windGustMaxTime: windMaxRow.time, // Renamed to match usage
                windAvgMax: Math.max(...rows.map(r => Number(r.w_avg) || 0)),
                rainMaxH: rainMaxRow.rain,
                rainMaxTime: rainMaxRow.time,
                humMax: Math.max(...rows.map(r => Number(r.humi) || 0)),
            };

            setGlobalData({
                date: startDate,
                endDate: isPeriod ? endDate : null,
                isPeriod,
                rows,
                stats
            });
            const autoConclusion = generateConclusion(stats, certType);
            setCustomConclusion(autoConclusion); // Init avec la version auto

            const autoSynthesis = generateSynthesisText(stats, rows);
            setCustomSynthesis(autoSynthesis);

            setStationMeteo(stationNames[selectedStationId] || selectedStationId);
            setStatus('✅ Données récupérées avec succès (Station principale).');

            // On lance le calcul des stations proches (async)
            refreshNearbyStations(startDate, finalEndDate);

        } catch (e) {
            console.error(e);
            setStatus('❌ Erreur : ' + e.message);
        }
    };

    // --- Helpers de Classification & Rapport ---
    const getPhenomenonClassification = (type, stats) => {
        // Style du bloc avec fond bleu clair et bordure
        // Style du bloc avec fond bleu clair et bordure - COMPACT
        const boxStyle = "margin-bottom: 5px; font-family: sans-serif; color: #334155; border: 1px solid #dbeafe; padding: 10px 15px; background: #eff6ff; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;";

        // Texte gauche
        const leftStyle = "text-align: left;";
        const titleStyle = "font-size: 7.5pt; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; color: #003366;";

        // Texte Droite (Valeur)
        const rightStyle = "text-align: right; min-width: 100px; border-left: 1px solid #cbd5e1; padding-left: 15px; margin-left: 15px;";
        const valLabelStyle = "font-size: 7pt; color: #64748b; text-transform: uppercase; margin-bottom: 1px; font-weight: bold;";
        const valStyle = "font-size: 22pt; font-weight: 900; color: #dc2626;"; // Rouge par défaut pour valeur
        const unitStyle = "font-size: 9pt; font-weight: 700; color: #64748b; margin-left: 2px;";

        if (type.includes('Vent') || type.includes('Tempête')) {
            const gust = stats.windGustMax || 0;
            let label = '';
            let color = '#334155';

            // Classification Beaufort / Echelle
            if (gust < 20) label = "Vents faibles (0 à 19 km/h)";
            else if (gust < 40) { label = "Vents modérés (20 à 39 km/h)"; color = '#334155'; }
            else if (gust < 70) { label = "Vents forts (40 à 69 km/h)"; color = '#d97706'; } // Orange
            else if (gust < 100) { label = "Vents très forts (70 à 99 km/h)"; color = '#dc2626'; } // Rouge
            else { label = "Vents tempétueux (≥ 100 km/h)"; color = '#7f1d1d'; } // Bordeaux

            return `
                <div style="${boxStyle}">
                    <div style="${leftStyle}">
                        <div style="${titleStyle}">CLASSEMENT DES RAFALES</div>
                        <div style="font-size: 11pt; font-weight: bold; color: ${color}; margin-bottom: 3px; display: block;">${label}</div>
                        <div style="font-size: 7.5pt; color: #64748b;">(Basé sur la rafale maximale relevée)</div>
                    </div>
                    <div style="${rightStyle}">
                        <div style="${valLabelStyle}">RAFALE MAX</div>
                        <div style="${valStyle} color: ${color};">${Math.round(gust)}<span style="${unitStyle}">km/h</span></div>
                    </div>
                </div>
            `;
        } else if (type.includes('Pluie') || type.includes('Inondation')) {
            const rain = stats.rainTotal || 0;
            let label = '';
            let color = '#334155';

            if (rain < 5) label = "Pluies faibles (< 5 mm)";
            else if (rain < 10) { label = "Pluies modérées (5 à 9 mm)"; color = '#334155'; }
            else if (rain < 20) { label = "Pluies fortes (10 à 19 mm)"; color = '#ca8a04'; }
            else if (rain < 30) { label = "Pluies très fortes (20 à 29 mm)"; color = '#ea580c'; }
            else if (rain < 40) { label = "Pluies abondantes (30 à 39 mm)"; color = '#dc2626'; }
            else { label = "Pluies exceptionnelles (≥ 40 mm)"; color = '#7f1d1d'; }

            return `
                <div style="${boxStyle}">
                    <div style="${leftStyle}">
                        <div style="${titleStyle}">SEUIL DES PRECIPITATIONS</div>
                        <div style="font-size: 11pt; font-weight: bold; color: ${color}; margin-bottom: 3px;">${label}</div>
                        <div style="font-size: 7.5pt; color: #64748b;">(Basé sur le cumul relevé)</div>
                    </div>
                    <div style="${rightStyle}">
                        <div style="${valLabelStyle}">CUMUL PLUIE</div>
                        <div style="${valStyle} color: ${color};">${rain.toFixed(1).replace('.', ',')}<span style="${unitStyle}">mm</span></div>
                    </div>
                </div>
            `;
        } else if (type.includes('Canicule') || type.includes('Froid') || type.includes('Gel')) {
            return `
                <div style="${boxStyle}">
                    <div style="${leftStyle}">
                        <div style="${titleStyle}">EXTRÊMES THERMIQUES</div>
                        <div style="font-size: 11pt; font-weight: bold; color: #334155; margin-bottom: 3px;">Températures relevées</div>
                        <div style="font-size: 7.5pt; color: #64748b;">(Minimale et Maximale sur la période)</div>
                    </div>
                    <div style="${rightStyle}">
                        <div style="${valLabelStyle}">TEMP. MIN / MAX</div>
                        <div style="${valStyle} font-size: 20pt; color: #334155;">${stats.tempMin}°C / ${stats.tempMax}°C</div>
                    </div>
                </div>
            `;
        }

        return '';
    };


    const generateSynthesisText = (stats, rows) => {
        const startD = new Date(startDate);
        let dateLabel = `le ${startD.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;

        if (isPeriod && endDate) {
            const endD = new Date(endDate);
            dateLabel = `du ${startD.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${endD.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        }

        const cityLabel = clientCity ? clientCity.toUpperCase() : 'LA ZONE CONCERNÉE';

        let intro = `L'analyse des conditions météorologiques relevées par la station de référence <strong>${dateLabel}</strong>, sur le secteur de <strong>${cityLabel}</strong>, met en évidence `;
        let body = "";

        if (certType.includes('Vent') || certType.includes('Tempête') || certType.includes('Orage')) {
            const gustVal = Math.round(stats.windGustMax);
            const gustTime = new Date(stats.windGustMaxTime || startDate);
            const timeStr = `${gustTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).replace(':', 'h')} à ${gustTime.getHours()}h${gustTime.getMinutes().toString().padStart(2, '0')}`;
            const typeLabel = certType.includes('Orage') ? "un épisode orageux actif" : "un épisode venteux marqué";

            body = `${typeLabel}. Les relevés indiquent des rafales maximales atteignant <strong style="color: #c0392b; font-size: 11pt;">${gustVal} km/h</strong>. Ce pic d'intensité a été enregistré le <strong style="color: #c0392b;">${timeStr}</strong>.`;

        } else if (certType.includes('Pluie') || certType.includes('Inondation')) {
            const rainVal = stats.rainTotal.toFixed(1).replace('.', ',');
            body = `des précipitations significatives. Le cumul pluviométrique total s'élève à <strong style="color: #2980b9; font-size: 11pt;">${rainVal} mm</strong> sur la période considérée.`;

        } else if (certType.includes('Neige') || certType.includes('Verglas')) {
            body = `des conditions hivernales. Les températures sont descendues jusqu'à <strong style="color: #2980b9;">${stats.tempMin}°C</strong>, favorisant les phénomènes glissants ou neigeux.`;

        } else if (certType.includes('Canicule')) {
            const maxTime = new Date(stats.tempMaxTime || startDate);
            const timeStr = `${maxTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
            body = `une vague de chaleur. Une température maximale de <strong style="color: #c0392b; font-size: 11pt;">${stats.tempMax}°C</strong> a été relevée le ${timeStr}.`;

        } else if (certType.includes('Froid') || certType.includes('Gel')) {
            const minTime = new Date(stats.tempMinTime || startDate);
            const timeStr = `${minTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
            body = `une période de grand froid. Une température minimale de <strong style="color: #2980b9; font-size: 11pt;">${stats.tempMin}°C</strong> a été relevée le ${timeStr}.`;

        } else {
            body = `des conditions météorologiques notables en lien avec la demande.`;
        }

        return intro + body;
    };


    const generateConclusion = (stats, type) => {
        let conclusion = `L'analyse des données atteste de la survenue de conditions météorologiques `;
        if ((type.includes('Vent') && stats.windGustMax >= 100) || (type.includes('Pluie') && stats.rainTotal >= 50)) {
            conclusion += `<strong>exceptionnelles</strong> ayant pu occasionner des dommages sur la zone de ${clientCity || '... cascades'}.`;
        } else {
            conclusion += `significatives pouvant expliquer des désordres ponctuels.`;
        }
        return conclusion;
    };

    const getMeasureRows = (stats, rows, type) => {
        let htmlRows = '';
        const tLower = (type || '').toLowerCase();

        const addRow = (param, val, time, classification) => {
            htmlRows += `<tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 3px 8px;">${param}</td>
                <td style="padding: 3px 8px;"><span class="cert-value-essential">${val}</span></td>
                <td style="padding: 3px 8px; color:#475569;">${time}</td>
                <td style="padding: 3px 8px; color:#003366; font-size:8.5pt; font-weight:bold;">${classification}</td>
            </tr>`;
        };

        const formatTime = (d) => d ? `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${d.getHours()}h${d.getMinutes().toString().padStart(2, '0')}` : '-';
        const formatTimeShort = (d) => d ? `${d.getHours()}h${d.getMinutes().toString().padStart(2, '0')}` : '-';

        // Use appropriate time format depending if it's a multi-day period or single day
        const timeDisplay = (d) => isPeriod ? formatTime(d) : formatTimeShort(d);

        if (showWindParams) {
            const t = stats.windGustMaxTime ? new Date(stats.windGustMaxTime) : null;
            const g = Math.round(stats.windGustMax);
            let label = "Vents Faibles";
            if (g >= 100) label = "TEMPÊTE";
            else if (g >= 70) label = "VENTS TRÈS FORTS";
            else if (g >= 40) label = "VENTS FORTS";
            else if (g >= 20) label = "VENTS MODÉRÉS";

            addRow("Rafale Max", `${g} km/h`, t ? timeDisplay(t) : '-', label);
        }
        if (showRainParams) {
            const r = stats.rainTotal;

            if (tLower.includes('neige')) {
                const snow = stats.snowTotal || 0;
                let label = "Chutes faibles";
                if (snow >= 15) label = "CHUTES EXCEPTIONNELLES";
                else if (snow >= 10) label = "CHUTES IMPORTANTES";
                else if (snow >= 5) label = "CHUTES MODÉRÉES";

                addRow("Cumul Neige (estimé)", `${snow.toFixed(1).replace('.', ',')} cm`, "Période", label);
            } else {
                let label = "Pluies Faibles";
                if (r >= 40) label = "PLUIES EXCEPTIONNELLES";
                else if (r >= 30) label = "PLUIES ABONDANTES";
                else if (r >= 20) label = "PLUIES TRÈS FORTES";
                else if (r >= 10) label = "PLUIES FORTES";
                else if (r >= 5) label = "Pluies Modérées";

                addRow("Cumul Pluie", `${r.toFixed(1).replace('.', ',')} mm`, "Période", label);
            }
        }
        if (showTempParams) {
            const tMax = stats.tempMaxTime ? new Date(stats.tempMaxTime) : null;
            const tMin = stats.tempMinTime ? new Date(stats.tempMinTime) : null;

            let label = "Températures Normales";

            if (tLower.includes('froid') || tLower.includes('gel') || tLower.includes('neige') || tLower.includes('verglas')) {
                if (stats.tempMin <= -10) label = "GRAND FROID";
                else if (stats.tempMin <= -5) label = "FROID INTENSE";
                else if (stats.tempMin <= 0) label = "GEL";
                addRow("Temp. Min", `${stats.tempMin}°C`, tMin ? timeDisplay(tMin) : '-', label);
            } else {
                if (stats.tempMax >= 35) label = "CANICULE";
                else if (stats.tempMax >= 30) label = "TRÈS CHAUD";
                else if (stats.tempMax >= 25) label = "CHALEUR";
                addRow("Temp. Max", `${stats.tempMax}°C`, tMax ? timeDisplay(tMax) : '-', label);
            }
        }
        return htmlRows;
    };

    const getHighlights = (stats, type) => {
        // Style "Simple Bordered Box" (pour aller sous le classement)
        const card = (title, val, unit) => `
            <div class="highlight-card" style="width: 100%; text-align: center; border: 2px solid #000; padding: 10px; box-sizing: border-box;">
                <div class="hc-title" style="font-size: 9pt; font-weight: bold; color: #64748b; margin-bottom: 2px; text-transform: uppercase;">${title}</div>
                <div class="hc-val" style="font-size: 24pt; font-weight: 900; color: #000;">${val}<span class="hc-unit" style="font-size: 14pt; margin-left: 5px; color: #64748b;">${unit}</span></div>
            </div>`;

        if (type.includes('Vent') || type.includes('Tempête')) {
            return card("RAFALE MAX", Math.round(stats.windGustMax), "km/h");
        } else if (type.includes('Pluie') || type.includes('Inondation')) {
            return card("CUMUL PLUIE", stats.rainTotal.toFixed(1).replace('.', ','), "mm");
        } else if (type.includes('Canicule') || type.includes('Froid') || type.includes('Gel')) {
            return card("TEMP. MIN / MAX", `${stats.tempMin}/${stats.tempMax}`, "°C");
        } else if (type.includes('Orage') || type.includes('Foudre')) {
            return card("RAFALE MAX", Math.round(stats.windGustMax), "km/h");
        }

        // Fallback
        return card("RAFALE MAX", Math.round(stats.windGustMax), "km/h");
    };

    const getNearbyStationsTable = () => {
        if (!nearbyStations || nearbyStations.length === 0) return '';

        // Determine what to show based on cert type
        let valueLabel = "VALEUR";
        let getValue = (s) => "-";

        if (certType.includes('Vent') || certType.includes('Tempête') || certType.includes('Orage')) {
            valueLabel = "RAFALE MAX";
            getValue = (s) => {
                if (!s.maxGust || s.maxGust === '-') return '-';
                // Correct property is maxGustDate based on refreshNearbyStations
                const tDate = s.maxGustDate ? new Date(s.maxGustDate) : new Date(startDate);
                return `<strong>${s.maxGust} km/h</strong> <span style="font-size:7pt; color:#64748b; font-weight:normal;">(${tDate.getHours()}h${tDate.getMinutes().toString().padStart(2, '0')})</span>`;
            };
        } else if (certType.includes('Pluie') || certType.includes('Inondation')) {
            valueLabel = "CUMUL PLUIE";
            getValue = (s) => !s.rain || s.rain === '-' ? '-' : `<strong>${s.rain} mm</strong>`;
        } else {
            valueLabel = "T° MIN / MAX";
            getValue = (s) => `${s.minTemp} / ${s.maxTemp} °C`;
        }

        return `
            <div class="cert-section-header" style="margin-top: 10px; margin-bottom: 2px;">COMPARAISON STATIONS ENVIRONNANTES</div>
            <div style="font-size: 8pt; color: #475569; margin-bottom: 4px; font-style:italic;">
                Relevés des 4 stations officielles les plus proches.
            </div>
            <table class="cert-table" style="margin-top: 0; font-size: 8pt;">
                <thead>
                    <tr>
                        <th style="padding: 3px 5px; text-align:left;">STATION</th>
                        <th style="padding: 3px 5px;">DIST.</th>
                        <th style="padding: 3px 5px;">${valueLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    ${nearbyStations.slice(0, 4).map(s => `
                        <tr>
                            <td style="padding: 2px 5px; text-align:left; font-weight:bold; color:#0f172a;">${s.name}</td>
                            <td style="padding: 2px 5px; font-size:7.5pt; color:#64748b;">${s.dist ? Math.round(s.dist) + ' km' : '-'}</td>
                            <td style="padding: 2px 5px; font-weight:900; color:#334155;">${getValue(s)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };




    const getDetailedRecordsHtml = (rows) => {
        if (!rows || rows.length === 0) return '';

        // Group rows by day for pagination
        const days = {};
        rows.forEach(r => {
            const dateStr = r.time.toLocaleDateString('fr-FR'); // Group by "DD/MM/YYYY"
            if (!days[dateStr]) days[dateStr] = [];
            days[dateStr].push(r);
        });

        const dayKeys = Object.keys(days);
        const totalPages = 1 + dayKeys.length + (showCharts ? 1 : 0); // Page 1 is Cert, then Days, then Chart

        // Generate a page for each day
        return dayKeys.map((dateKey, index) => {
            const dayRows = days[dateKey];
            // Sort by hour to be sure
            dayRows.sort((a, b) => a.time - b.time);

            // Date formatting for title (e.g. "Lundi 2 Février 2026")
            const dateObj = dayRows[0].time;
            const dateFull = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const dateShort = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); // 02/02

            const pageNum = index + 2; // Start at Page 2

            return `
            <div class="cert-page" style="page-break-before: always; border-top: 1px dashed #cbd5e1; display: flex; flex-direction: column;">
                <div style="border: 2px solid #000; padding: 10px 5px; text-align: center; margin-top: 20px; margin-bottom: 20px;">
                    <h2 style="color: #003366; font-size: 13pt; margin: 0; font-weight: 900; text-transform: uppercase;">ANNEXE : DONNÉES HORAIRES DÉTAILLÉES</h2>
                    <div style="font-size: 10pt; font-weight: 700; color: #000; margin-top: 5px; text-transform: capitalize;">
                        ${dateFull} - Station : ${stationMeteo}
                    </div>
                    <div style="font-size: 9pt; color: #64748b; margin-top: 5px;">
                        Page ${pageNum} / ${totalPages}
                    </div>
                </div>

                <table class="cert-table" style="font-size: 8pt; margin-top: 0;">
                    <thead>
                        <tr style="background:#1e293b; color: white;">
                            <th style="width: 60px;">DATE</th>
                            <th>HEURE</th>
                            <th>TEMP. (°C)</th>
                            <th>PLUIE (MM)</th>
                            <th>VENT (KM/H)</th>
                            <th>RAFALES</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dayRows.map(r => `
                            <tr>
                                <td style="color:#475569;">${dateShort}</td>
                                <td style="font-weight:bold; color:#003366;">${r.h}h</td>
                                <td style="font-weight:600;">${r.temp !== null ? r.temp.toFixed(1) : '-'}</td>
                                <td ${r.rain > 0 ? 'style="color:#2563eb; font-weight:bold;"' : ''}>${r.rain > 0 ? r.rain.toFixed(1).replace('.', ',') : '0,0'}</td>
                                <td>${Math.round(r.w_avg || 0)}</td>
                                <td ${r.w_gst > 60 ? 'style="color:#dc2626; font-weight:bold;"' : ''}>${Math.round(r.w_gst || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top: auto; font-size: 7.5pt; color: #94a3b8; text-align: center; padding-bottom: 20px;">
                    Données certifiées par Météo Climat Pro
                </div>
            </div>
            `;
        }).join('');
    };

    const renderCertChart = (data) => {
        const canvas = document.getElementById('cert-chart-preview');
        if (!canvas || !window.Chart) return;

        const ctx = canvas.getContext('2d');
        if (chartRefs.current['preview']) chartRefs.current['preview'].destroy();

        const labels = data.map(d => {
            const h = d.h + 'h';
            return isPeriod ? d.time.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + h : h;
        });

        const datasets = [];
        if (certType.includes('Vent') || certType.includes('Tempête')) {
            datasets.push({
                label: 'Rafales (km/h)',
                data: data.map(d => d.w_gst),
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            });
        } else if (certType.includes('Pluie')) {
            datasets.push({
                type: 'bar',
                label: 'Pluie (mm)',
                data: data.map(d => d.rain),
                backgroundColor: '#2563eb',
                borderRadius: 4
            });
        } else {
            datasets.push({
                label: 'Température (°C)',
                data: data.map(d => d.temp),
                borderColor: '#ea580c',
                borderWidth: 2,
                fill: false,
                tension: 0.4
            });
        }

        chartRefs.current['preview'] = new window.Chart(ctx, {
            type: datasets[0].type || 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    };

    const generateReport = () => {
        if (!globalData.rows) return;
        const { stats, rows } = globalData;
        const todayFr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

        let html = `
            <div class="cert-page">
                <style>
                    .cert-page { font-family: Arial, sans-serif; color: #334155; }
                    /* PREMIUM DARK BLUE THEME (Match Attestation) */
                    .cert-section-header { 
                        background: #f1f5f9 !important; 
                        color: #000 !important; 
                        padding: 5px 8px; 
                        font-weight: 900; 
                        font-size: 10pt;
                        text-transform: uppercase; 
                        margin-top: 15px; 
                        margin-bottom: 5px; 
                        border-left: 6px solid #003366; 
                        -webkit-print-color-adjust: exact;
                    }
                    .cert-main-title-box { 
                        border: 2px solid #000; 
                        padding: 5px; 
                        text-align: center; 
                        margin-top: 10px; 
                        margin-bottom: 10px; 
                        background: #fff; 
                    }
                    .cert-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9pt; }
                    .cert-table th { 
                        background: #1e293b !important; 
                        color: white !important; 
                        padding: 8px; 
                        border: 1px solid #000; 
                        text-transform: uppercase; 
                        font-size: 8.5pt; 
                    }
                    .cert-table td { 
                        padding: 6px; 
                        border: 1px solid #64748b; 
                        font-size: 9pt; 
                        text-align: center; 
                    }
                    .cert-table tr:nth-child(even) { background-color: #f8fafc; }
                    
                    .highlight-card { flex: 1; padding: 10px; border: 1px solid #000; border-radius: 4px; background: #fff; text-align: center; box-shadow: 2px 2px 0px rgba(0,0,0,0.1); }
                    .hc-title { font-size: 7.5pt; color: #64748b; text-transform: uppercase; margin-bottom: 2px; font-weight: bold; }
                    .hc-val { font-size: 14pt; font-weight: 900; color: #003366; }
                    .hc-unit { font-size: 9pt; color: #64748b; margin-left: 2px; }
                    
                    .cert-value-essential { font-weight: bold; color: #003366; }
                </style>
                
                <div class="cert-header-combined" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                    <div class="header-left">
                        <div class="cert-logo"><img src="${companyLogo || '/logo_mcp.png'}" alt="MÉTÉO CLIMAT PRO" style="max-height: 50px;" /></div>
                        <div class="cert-emitter-info" style="margin-top: 5px; font-size: 8pt; color: #475569;">
                            ${emitterAddress || '---'}<br/>${emitterZip || '---'} ${emitterCity || '---'}<br/>
                            Tel : <span style="font-weight: 600; color: #0f172a;">${emitterPhone || '---'}</span>
                            <div style="font-weight: 700; color: #003366; text-transform: uppercase; margin-top: 2px;">Expertise Météo-Climatologique</div>
                        </div>
                    </div>
                    <div class="header-right" style="margin-top: 10px;">
                        <div class="cert-client-box" style="border-left: 3px solid #003366; padding-left: 10px;">
                            <div class="cert-client-info">
                                <div class="cert-main-title" style="font-size: 11pt; font-weight: 900; color: #0f172a; text-transform: uppercase;">${clientName || '---'}</div>
                                <div style="font-size: 9pt; color: #334155;">${clientAddress || '---'}</div>
                                <div style="font-size: 9pt; color: #334155;">${clientZip || ''} ${clientCity || ''}</div>
                                <div class="ref-box" style="margin-top: 5px; background: #003366; color: white; padding: 2px 8px; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 7.5pt;">Réf. ${certRef || '---'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="cert-main-title-box">
                    <h1 style="margin: 0; font-size: 16pt; letter-spacing: 1px; color: #003366; text-transform: uppercase;">CERTIFICAT D'INTEMPÉRIE</h1>
                    <div style="font-weight: 800; color: #000; margin-top: 2px; font-size: 10pt; text-transform: uppercase;">${certType}</div>
                </div>

                <div style="margin-top: 10px;">
                     ${getPhenomenonClassification(certType, stats)}
                </div>

                <div class="cert-section-header">DESCRIPTION DE LA SITUATION MÉTÉOROLOGIQUE</div>
                <div class="cert-text-block" style="line-height: 1.4; text-align: justify; font-size: 9.5pt;">${customSynthesis || generateSynthesisText(stats, rows)}</div>

                <div class="cert-section-header">MESURES OBSERVÉES - STATION DE RÉFÉRENCE</div>
                <div style="font-size: 8.5pt; margin-top: 2px; color: #475569; font-style: italic;">Station officielle : <strong>${stationMeteo} (${selectedStationId})</strong>.</div>
                <table class="cert-table" style="margin-top: 5px;">
                    <thead><tr><th>PARAMÈTRE</th><th>VALEUR RELEVÉE</th><th>HEURE / PÉRIODE</th><th>CLASSEMENT</th></tr></thead>
                    <tbody>${getMeasureRows(stats, rows, certType)}</tbody>
                </table>

                ${getNearbyStationsTable()}

                <div class="cert-section-header">CONCLUSION DE L'ANALYSE</div>
                <div class="cert-text-block" style="line-height: 1.4; font-weight: 500; font-size: 10pt; border: 1px solid #e2e8f0; padding: 8px; background: #f8fafc; border-left: 4px solid #003366;">${customConclusion || generateConclusion(stats, certType)}</div>

                <div class="cert-signature-block" style="margin-top: 20px; text-align: right; padding-right: 20px;">
                    <div class="signature-date" style="font-style: italic; color: #64748b; font-size: 8.5pt;">Fait à Raimbeaucourt, le ${todayFr}</div>
                    <div style="margin-top: 10px;">
                        <div class="signature-title" style="font-weight: bold; text-decoration: underline; font-size: 9pt;">Signature de l'expert</div>
                        <div class="signature-name" style="font-size: 11pt; font-weight: 900; color: #003366; margin-top: 5px;">Patrick Marlière</div>
                    </div>
                </div>
            </div>
            
            ${getDetailedRecordsHtml(rows)}
        `;

        if (showCharts) {
            const chartPageNum = 1 + Object.keys(rows.reduce((acc, r) => {
                const d = r.time.toLocaleDateString('fr-FR');
                if (!acc[d]) acc[d] = 1;
                return acc;
            }, {})).length + 1;

            const totalPages = chartPageNum; // Last page

            const dateRangeLabel = isPeriod && endDate
                ? `du ${startDate.split('-').reverse().join('/')} au ${endDate.split('-').reverse().join('/')}`
                : new Date(startDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            html += `
                <div class="cert-page" style="page-break-before: always; display: flex; flex-direction: column;">
                     <div style="border: 2px solid #000; padding: 10px 5px; text-align: center; margin-top: 20px; margin-bottom: 20px;">
                        <h2 style="color: #003366; font-size: 13pt; margin: 0; font-weight: 900; text-transform: uppercase;">ANNEXE : REPRÉSENTATION GRAPHIQUE</h2>
                        <div style="font-size: 10pt; font-weight: 700; color: #000; margin-top: 5px; text-transform: capitalize;">
                            ${dateRangeLabel} - Station : ${stationMeteo}
                        </div>
                        <div style="font-size: 9pt; color: #64748b; margin-top: 5px;">
                            Page ${chartPageNum} / ${totalPages}
                        </div>
                    </div>
                    
                    <div style="height: 500px; width: 100%; margin-top: 30px; border: 1px solid #e2e8f0; padding: 20px; box-sizing: border-box; background: white;">
                        <canvas id="cert-chart-preview"></canvas>
                    </div>

                    <div style="margin-top: auto; font-size: 9pt; color: #64748b; font-style: italic; text-align: center; padding-bottom: 20px;">
                        Visualisation chronologique des principaux paramètres météorologiques de la période.
                    </div>
                </div>
            `;
        }

        setReportOutput(html);

        if (showCharts) {
            setTimeout(() => renderCertChart(rows), 100);
        }
    };

    useEffect(() => {
        if (globalData.rows) generateReport();
    }, [globalData, customSynthesis, customConclusion, showCharts, showWindAvg, showValuesUnderTitle, showWindParams, showRainParams, showTempParams, showDetailedHumi, showDetailedPres, showDetailedVis]);

    const getCommonStyles = () => `
        <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; font-family: 'Arial', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .cert-page {
                width: 210mm;
                min-height: 297mm;
                padding: 15mm 15mm;
                box-sizing: border-box;
                background: white;
                color: #334155;
                font-size: 9pt;
                display: flex;
                flex-direction: column;
            }
            .cert-section-header { 
                background: #003366 !important; 
                color: white !important; 
                padding: 6px 10px; 
                font-weight: bold; 
                text-transform: uppercase; 
                margin-top: 20px; 
                margin-bottom: 10px; 
                border-left: 5px solid #000; 
                -webkit-print-color-adjust: exact;
            }
            .cert-table th { 
                background: #1e293b !important; 
                color: white !important; 
                -webkit-print-color-adjust: exact;
            }
            .cert-page:last-child { page-break-after: avoid; }
            .cert-header-combined { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; width: 100%; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
            .cert-logo img { max-height: 55px; object-fit: contain; }
            .cert-emitter-info { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .cert-emitter-info div { font-size: 8.5pt; color: #475569; line-height: 1.3; }
            .cert-emitter-info span { color:#0f172a; font-weight: 600; }
            .cert-emitter-info .signature-title { font-weight: 700; color: #003366; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; }
            .cert-client-box { text-align: left; min-width: 250px; border-left: 2px solid #e2e8f0; padding-left: 15px; }
            .cert-client-info { font-family: sans-serif; }
            .cert-client-info div { font-size: 9.5pt; color: #1e293b; line-height: 1.3; }
            .cert-client-info .cert-main-title { font-size: 11pt; color: #0f172a; text-transform: uppercase; margin-bottom: 2px; font-weight: 900; }
            .cert-client-info .ref-box { margin-top: 8px; padding: 4px 10px; background: #003366; color: white; border-radius: 4px; display: inline-block; }
            .cert-client-info .ref-box div { font-size: 9pt; font-weight: 700; }
            .cert-main-title-box { margin-bottom: 4px; border: 2px solid #000; padding: 2px 8px; box-shadow: none; width: 100%; box-sizing: border-box; }
            .cert-main-title-box h1 { letter-spacing: 1px; margin-bottom: 0px; font-size: 13pt; color: #000; }
            .cert-main-title-box div { font-size: 9pt; color: #003366; font-weight: 800; border-top: 1px solid #000; padding-top: 1px; margin-top: 1px; text-transform: uppercase; }
            .cert-info-row { display: flex; margin-bottom: 0; }
            .cert-info-label { width: 130px; font-size: 8pt; }
            .cert-info-val { font-size: 8pt; }
            .cert-section-header { margin-top: 2px; font-size: 9pt; padding: 2px 8px; background: #e2e8f0; color: #003366; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .cert-text-block { margin-bottom: 8px; font-size: 9.5pt; line-height: 1.35; }
            .cert-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 10px; }
            .cert-table th, .cert-table td { border: 1px solid #e2e8f0; padding: 4px 8px; text-align: center; }
            .cert-table th { background-color: #f8fafc; font-weight: bold; color: #003366; }
            .cert-table td { color: #334155; }
            .cert-table tbody tr:nth-child(even) { background-color: #f8fafc; }
            .cert-value-essential { font-weight: 700; color: #0f172a; }
            .highlight-card { padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; background: #f8fafc; text-align: center; }
            .highlight-card .hc-title { font-size: 7pt; margin-bottom: 0px; color: #64748b; text-transform: uppercase; }
            .highlight-card .hc-val { font-size: 11pt; font-weight: bold; color: #0f172a; }
            .highlight-card .hc-unit { font-size: 7.5pt; color: #64748b; margin-left: 2px; }
            .cert-signature-block { margin-top: 2px; width: 220px; text-align: left; margin-left: auto; margin-right: 0; }
            .signature-date { font-size: 9pt; font-style: italic; margin-bottom: 5px; color: #475569; }
            .signature-title { font-size: 10pt; font-weight: bold; text-decoration: underline; margin-bottom: 30px; color: #003366; }
            .signature-name { font-size: 11pt; font-weight: 900; color: #003366; }
            .btp-modal {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5);
    display: flex; justify-content: center; align-items: center; z-index: 1000;
}
            .btp-modal-content {
    background: white; padding: 20px; border-radius: 8px; max-height: 90vh; overflow-y: auto;
    width: 90%; max-width: 800px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
            .btp-modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
            .btp-modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: bold; color: #003366; }
            .btp-modal-header button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
            .btp-modal-header button:hover { color: #64748b; }
            .btp-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 10px 15px; border-radius: 6px; font-weight: 600; cursor: pointer;
    transition: all 0.2s ease-in-out;
}
            .btp-btn-primary { background-color: #003366; color: white; border: 1px solid #003366; }
            .btp-btn-primary:hover { background-color: #002244; }
            .btp-btn-print { background-color: #22c55e; color: white; border: 1px solid #22c55e; }
            .btp-btn-print:hover { background-color: #16a34a; }
            .btp-btn-save { background-color: #f97316; color: white; border: 1px solid #f97316; }
            .btp-btn-save:hover { background-color: #ea580c; }
            .text-xs { font-size: 0.75rem; }
            .font-bold { font-weight: 700; }
            .text-blue-600 { color: #2563eb; }
            .bg-blue-50 { background-color: #eff6ff; }
            .px-10 { padding-left: 10px; padding-right: 10px; }
            .py-5 { padding-top: 5px; padding-bottom: 5px; }
            .rounded { border-radius: 0.25rem; }
            .border { border-width: 1px; border-style: solid; }
            .border-blue-200 { border-color: #bfdbfe; }
            .hover\:bg-blue-100:hover { background-color: #dbeafe; }
            .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .gap-2 { gap: 8px; }
            .mb-15 { margin-bottom: 15px; }
            .btp-layout { display: flex; height: 100vh; }
            .btp-panel { width: 350px; flex-shrink: 0; background-color: #f8fafc; border-right: 1px solid #e2e8f0; padding: 20px; overflow-y: auto; }
            .btp-preview-container { flex-grow: 1; background-color: #e2e8f0; display: flex; justify-content: center; align-items: center; padding: 20px; overflow-y: auto; }
            .certificat-full-preview {
    background: white;
    width: 210mm; /* A4 width */
    min-height: 297mm; /* A4 height */
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    overflow: hidden; /* To contain page-break-after */
}
            .no-print { display: block; }
@media print {
                body { margin: 0; }
                .no-print { display: none!important; }
                .cert-page {
        width: 210mm;
        min-height: 297mm;
        padding: 15mm 15mm 10mm 15mm;
        box-sizing: border-box;
        background: white;
        color: #334155;
        font-size: 9pt;
        page-break-inside: avoid;
    }
                .certificat-full-preview {
        width: auto;
        min-height: auto;
        box-shadow: none;
        padding: 0;
        margin: 0;
    }
}
        </style >
    `;

    const handlePrint = () => {
        let contentToPrint = reportOutput;

        // Convert Chart Canvas to Image for Print if it exists
        const chartCanvas = document.getElementById('cert-chart-preview');
        if (chartCanvas) {
            try {
                const chartImgUrl = chartCanvas.toDataURL('image/png');
                contentToPrint = contentToPrint.replace(
                    '<canvas id="cert-chart-preview"></canvas>',
                    `<img src="${chartImgUrl}" style="width:100%; height:auto;" />`
                );
            } catch (e) {
                console.error("Error converting chart to image", e);
            }
        }

        const win = window.open('', '', 'width=1200,height=900');
        win.document.write(`
            <html>
                <head>
                    <title>Certificat Météo - ${clientName || 'Export'}</title>
                    ${getCommonStyles()}
                </head>
                <body>
                    ${contentToPrint}
                    <script>
                        setTimeout(() => {
                            window.print();
                            // window.close();
                        }, 1000);
                    </script>
                </body>
            </html>
        `);
        win.document.close();
    };

    // Fonction export Word (HTML -> .doc hack)
    const exportWord = () => {
        if (!globalData.rows) return;

        // CSS inliné pour Word
        const css = `< style >
    body { font - family: 'Arial', sans - serif; color: #000; }
            h1 { color: #059669; font - size: 24pt; text - transform: uppercase; text - align: center; }
            h3 { color: #0f172a; font - size: 14pt; border - bottom: 2px solid #000; margin - top: 20px; }
            table { width: 100 %; border - collapse: collapse; margin - top: 15px; }
            th { background - color: #eee; border: 1px solid #999; padding: 5px; }
            td { border: 1px solid #999; padding: 5px; text - align: center; }
            .highlight { background - color: #dcfce7; }
            .value - alert { color: red; font - weight: bold; }
        </style > `;

        // Nettoyage basique des classes pour l'export
        let content = reportOutput;
        // On enlève les div qui ne servent à rien dans Word ou qui cassent la mise en page
        content = content.replace(/<div class="cert-page">/g, '<div class="doc-section">');

        const html = `< html ><head><meta charset='utf-8'>${css}</head><body>${content}</body></html > `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Certificat_Meteo_${clientName || 'Client'}_${startDate}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Copie texte pour email
    const copyText = () => {
        if (!globalData.stats) return;
        const { stats, isPeriod: globalIsPeriod, endDate: globalEndDate } = globalData;

        let dateLabel = startDate;
        if (globalIsPeriod && globalEndDate) dateLabel = `du ${startDate} au ${globalEndDate} `;

        const txt = `
CERTIFICAT MÉTÉO - SYNTHÈSE RAPIDE
Période: ${dateLabel}
Lieu: ${clientCity} (${clientZip})
Phénomène: ${certType}

OBSERVATIONS STATION ${stationMeteo} :
- Température Min / Max : ${stats.tempMin}°C / ${stats.tempMax}°C
    - Pluie cumulée: ${stats.rainTotal.toFixed(1)} mm
        - Rafale Max: ${stats.windGustMax} km / h ${stats.windGustTime ? `(le ${stats.windGustTime.toLocaleDateString('fr-FR')})` : ''}
- Intensité Pluie Max: ${stats.rainMaxH?.toFixed(1) || '-'} mm / h

Ce relevé est certifié conforme aux données de la station météorologique de référence.
        `.trim();

        navigator.clipboard.writeText(txt).then(() => alert("Texte copié dans le presse-papier !"));
    };

    // --- Rendu UI Principal ---
    return (
        <div className="btp-manager-body">
            <div style={{ position: 'fixed', bottom: 10, left: 10, fontSize: '10px', color: '#94a3b8', zIndex: 1000, pointerEvents: 'none' }}>Certificat v2.1.0</div>

            <div className="btp-layout">
                {/* SIDEBAR UNIFIÉE (Comme Attestation Intempérie) */}
                <div className="btp-panel no-print" style={{ width: '350px', flexShrink: 0, backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '20px', overflowY: 'auto' }}>
                    <div className="flex justify-between items-center mb-15">
                        <button className="text-xs font-bold text-blue-600 bg-blue-50 px-10 py-5 rounded border border-blue-200 hover:bg-blue-100 transition-all flex items-center gap-2" onClick={fetchArchives}>
                            <Briefcase size={14} /> Consulter les Archives
                        </button>
                    </div>

                    {/* 1. CONFIGURATION */}
                    <div className="btp-panel-head">
                        <div className="flex items-center">
                            <div className="btp-step-num">1</div>
                            <div className="btp-panel-title">Configuration</div>
                        </div>
                    </div>

                    <div className="btp-form-grid">
                        <div className="btp-form-group">
                            <label>Nom du Client / Tiers</label>
                            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex: Jean Dupont" />
                        </div>

                        <div className="btp-form-group mt-10">
                            <label>Adresse du Sinistre</label>
                            <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="12 rue des Fleurs" className="mb-5" />
                            <div className="flex gap-2">
                                <input value={clientZip} onChange={(e) => setClientZip(e.target.value)} placeholder="CP" style={{ width: '80px' }} />
                                <input value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="Ville" style={{ flex: 1 }} />
                            </div>
                        </div>

                        <div className="btp-separator"><span>Détails de l'événement</span></div>

                        <div className="btp-form-group">
                            <label>Type de Phénomène</label>
                            <select value={certType} onChange={(e) => setCertType(e.target.value)}>
                                {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="btp-form-group mt-10">
                            <div className="flex justify-between items-center mb-5">
                                <label>Date / Période</label>
                                <div
                                    className="flex items-center gap-2 cursor-pointer bg-slate-100 rounded-full p-1 border border-slate-200"
                                    onClick={() => setIsPeriod(!isPeriod)}
                                    title="Basculer entre Date unique et Période"
                                >
                                    <span className={`text - xs px - 3 py - 1 rounded - full transition - all ${!isPeriod ? 'bg-white shadow font-bold text-blue-600' : 'text-slate-500'} `}>Date</span>
                                    <span className={`text - xs px - 3 py - 1 rounded - full transition - all ${isPeriod ? 'bg-white shadow font-bold text-blue-600' : 'text-slate-500'} `}>Période</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-400 mb-1 block">Début / Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                {isPeriod && (
                                    <div className="flex-1">
                                        <label className="text-xs text-slate-400 mb-1 block">Fin (Inclus)</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="btp-form-group mt-5">
                            <label>Référence Dossier</label>
                            <input value={certRef} onChange={(e) => setCertRef(e.target.value)} placeholder="Ex: SIN-2023-001" />
                        </div>

                        <div className="btp-separator"><span>Source des données</span></div>

                        <div className="flex gap-2">
                            <div className="btp-form-group" style={{ width: '80px' }}>
                                <label>Dép.</label>
                                <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
                                    <option value="">--</option>
                                    {DEPARTMENTS.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
                                </select>
                            </div>
                            <div className="btp-form-group flex-1">
                                <label>Station Officielle</label>
                                <select value={selectedStationId} onChange={(e) => setSelectedStationId(e.target.value)} disabled={loadingStations}>
                                    <option value="">{loadingStations ? 'Chargement...' : 'Choisir...'}</option>
                                    {stations.map(s => <option key={s.station_id} value={s.station_id}>{s.nom_station || s.station_id}</option>)}
                                </select>
                            </div>
                        </div>

                        <button className="btp-btn btp-btn-primary mt-15" onClick={handleFetchData}>
                            <Download size={18} /> Générer le Certificat
                        </button>

                        {status && <div className="mt-10 p-10 border rounded text-xs bg-slate-50 border-blue-100 text-blue-800" dangerouslySetInnerHTML={{ __html: status }} />}
                    </div>

                    {/* 2. PERSONNALISATION */}
                    {globalData.rows && (
                        <>
                            <div className="btp-panel-head mt-20">
                                <div className="flex items-center">
                                    <div className="btp-step-num">2</div>
                                    <div className="btp-panel-title">Personnalisation</div>
                                </div>
                            </div>

                            <div className="btp-form-grid">
                                <div className="btp-form-group">
                                    <label className="text-xs font-bold text-slate-500 mb-5 uppercase">Synthèse de l'Expert</label>
                                    <textarea
                                        value={customSynthesis}
                                        onChange={(e) => setCustomSynthesis(e.target.value)}
                                        placeholder="Synthèse auto..."
                                        style={{ height: '100px', fontSize: '11px' }}
                                    />
                                </div>
                                <div className="btp-form-group mt-10">
                                    <label className="text-xs font-bold text-slate-500 mb-5 uppercase">Conclusion</label>
                                    <textarea
                                        value={customConclusion}
                                        onChange={(e) => setCustomConclusion(e.target.value)}
                                        placeholder="Conclusion auto..."
                                        style={{ height: '80px', fontSize: '11px' }}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 mt-10">
                                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                                        <input type="checkbox" checked={showCharts} onChange={e => setShowCharts(e.target.checked)} />
                                        Inclure Graphique
                                    </label>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                                        <input type="checkbox" checked={showValuesUnderTitle} onChange={e => setShowValuesUnderTitle(e.target.checked)} />
                                        Inclure Tableaux Synthèse
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {/* 3. ACTIONS */}
                    {globalData.rows && (
                        <>
                            <div className="btp-panel-head mt-20">
                                <div className="flex items-center">
                                    <div className="btp-step-num">3</div>
                                    <div className="btp-panel-title">Actions</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-5 mt-10">
                                <button className="btp-btn btp-btn-print" onClick={handlePrint} style={{ background: '#0f172a' }}>
                                    <Printer size={18} /> Imprimer (PDF)
                                </button>
                                <button className="btp-btn btp-btn-save" onClick={handleSaveToDB}>
                                    <Save size={18} /> Enregistrer
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button className="btp-btn btp-btn-primary" onClick={exportWord} style={{ background: '#2b579a', padding: '10px' }}>
                                        <FileText size={16} /> Word
                                    </button>
                                    <button className="btp-btn btp-btn-primary" onClick={copyText} style={{ background: '#64748b', padding: '10px' }}>
                                        <Copy size={16} /> Copier
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* MAIN PREVIEW AREA */}
                <div className="btp-preview-container">
                    {!globalData.rows ? (
                        <div style={{ textAlign: 'center', padding: '100px', color: 'white', opacity: 0.6 }}>
                            <CloudRain size={80} strokeWidth={1} style={{ marginBottom: '20px' }} />
                            <h2 className="text-2xl font-bold">Certificat Météo</h2>
                            <p>Configurez les paramètres à gauche pour <br />visualiser le rapport officiel.</p>
                        </div>
                    ) : (
                        <div
                            className="certificat-full-preview"
                            style={{ width: '100%' }}
                            dangerouslySetInnerHTML={{ __html: reportOutput }}
                        />
                    )}
                </div>
            </div>

            {/* ARCHIVES MODAL */}
            {
                showArchivesModal && (
                    <div className="btp-modal open">
                        <div className="btp-modal-content" style={{ maxWidth: '900px' }}>
                            <div className="btp-modal-header">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Briefcase /> Archives des Certificats</h2>
                                <button onClick={() => setShowArchivesModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
                            </div>
                            <div className="mt-10 overflow-x-auto">
                                {archives.length === 0 ? (
                                    <p className="text-center py-20 text-slate-500 italic">Aucune archive disponible.</p>
                                ) : (
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100">
                                                <th className="p-10 text-left border">Généré le</th>
                                                <th className="p-10 text-left border">Client</th>
                                                <th className="p-10 text-left border">Ville</th>
                                                <th className="p-10 text-left border">Type</th>
                                                <th className="p-10 text-center border">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {archives.map(a => (
                                                <tr key={a.id} className="hover:bg-slate-50 border-b">
                                                    <td className="p-10 border">{new Date(a.date_generation).toLocaleDateString()}</td>
                                                    <td className="p-10 border font-bold">{a.nom_client}</td>
                                                    <td className="p-10 border">{a.ville}</td>
                                                    <td className="p-10 border text-xs">{a.type_certificat}</td>
                                                    <td className="p-10 border text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <button
                                                                className="bg-accent text-white px-8 py-4 rounded text-xs font-bold hover:opacity-90 transition-all"
                                                                onClick={() => loadArchive(a)}
                                                            >
                                                                Charger
                                                            </button>
                                                            <button
                                                                className="text-red-500 hover:text-red-700 p-5 rounded hover:bg-red-50 transition-all"
                                                                onClick={() => deleteArchive(a.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CertificatMeteoManager;
