import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
const Index = () => {
  const [activeTrades, setActiveTrades] = useState<string[]>([]);
  const [TRADES_FULL, setTRADES_FULL] = useState<string[]>([
    "Terrassement / Terrassement Voiries", "VRD – Voiries et Réseaux Divers", "Renforcement de sol / Traitement de sol", "Traitement de plateforme (chaux / ciment)", "Travaux Asphalte / Enrobés", "Rabattage de nappes", "Gros œuvre", "Fondations / Fondations spéciales", "Béton armé", "Coulage béton armé / Dalles", "Dallage", "Charpente", "Murs coupe-feu", "Couverture", "Bardage / Panneaux", "Étanchéité", "Isolation", "Menuiseries extérieures", "Métallerie", "Clôtures", "Espaces verts", "Ravalement / Peinture extérieure", "Grues / Bétonnières", "Levage d'éléments techniques", "Aires de béquillage", "Tous travaux extérieurs / Tâches extérieures"
  ]);
  const [globalData, setGlobalData] = useState<any>({});
  const [rules, setRules] = useState<any[]>([
    {lots:[...["Terrassement / Terrassement Voiries", "VRD – Voiries et Réseaux Divers", "Renforcement de sol / Traitement de sol", "Traitement de plateforme (chaux / ciment)", "Travaux Asphalte / Enrobés", "Rabattage de nappes", "Gros œuvre", "Fondations / Fondations spéciales", "Béton armé", "Coulage béton armé / Dalles", "Dallage", "Charpente", "Murs coupe-feu", "Couverture", "Bardage / Panneaux", "Étanchéité", "Isolation", "Menuiseries extérieures", "Métallerie", "Clôtures", "Espaces verts", "Ravalement / Peinture extérieure", "Grues / Bétonnières", "Levage d'éléments techniques", "Aires de béquillage", "Tous travaux extérieurs / Tâches extérieures"]], var:"pluie", type:"cond1", op:">=", val:10, dur:0, h1:0, h2:23},
    {lots:[...["Terrassement / Terrassement Voiries", "VRD – Voiries et Réseaux Divers", "Renforcement de sol / Traitement de sol", "Traitement de plateforme (chaux / ciment)", "Travaux Asphalte / Enrobés", "Rabattage de nappes", "Gros œuvre", "Fondations / Fondations spéciales", "Béton armé", "Coulage béton armé / Dalles", "Dallage", "Charpente", "Murs coupe-feu", "Couverture", "Bardage / Panneaux", "Étanchéité", "Isolation", "Menuiseries extérieures", "Métallerie", "Clôtures", "Espaces verts", "Ravalement / Peinture extérieure", "Grues / Bétonnières", "Levage d'éléments techniques", "Aires de béquillage", "Tous travaux extérieurs / Tâches extérieures"]], var:"vent_rafale", type:"cond1", op:">=", val:60, dur:0, h1:0, h2:23},
    {lots:[...["Terrassement / Terrassement Voiries", "VRD – Voiries et Réseaux Divers", "Renforcement de sol / Traitement de sol", "Traitement de plateforme (chaux / ciment)", "Travaux Asphalte / Enrobés", "Rabattage de nappes", "Gros œuvre", "Fondations / Fondations spéciales", "Béton armé", "Coulage béton armé / Dalles", "Dallage", "Charpente", "Murs coupe-feu", "Couverture", "Bardage / Panneaux", "Étanchéité", "Isolation", "Menuiseries extérieures", "Métallerie", "Clôtures", "Espaces verts", "Ravalement / Peinture extérieure", "Grues / Bétonnières", "Levage d'éléments techniques", "Aires de béquillage", "Tous travaux extérieurs / Tâches extérieures"]], var:"temp", type:"cond1", op:"<=", val:0, dur:0, h1:0, h2:23}
  ]);
  const [annexCols, setAnnexCols] = useState({ temp: true, rain: true, snow: true, windA: true, windG: true, humi: true, soil: true, windAvgPdf: false });
  const [emptyCellStyle, setEmptyCellStyle] = useState<'gray' | 'white'>('gray');
  const [openRuleIdx, setOpenRuleIdx] = useState(-1);
  const [currentRuleIndex, setCurrentRuleIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState(0);
  const [activeOutTab, setActiveOutTab] = useState('out-report');
  const [tradesModalOpen, setTradesModalOpen] = useState(false);
  const [ruleTradesModalOpen, setRuleTradesModalOpen] = useState(false);
  const [colsModalOpen, setColsModalOpen] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [displaySimple, setDisplaySimple] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [checkPeriod, setCheckPeriod] = useState(false);
  const [autoSnow, setAutoSnow] = useState(true);
  const [snowTempLimit, setSnowTempLimit] = useState(0);
  const [txEnt, setTxEnt] = useState('');
  const [txCli, setTxCli] = useState('');
  const [emailCli, setEmailCli] = useState('');
  const [stationMeteo, setStationMeteo] = useState('');
  const [logoL, setLogoL] = useState('');
  const [logoR, setLogoR] = useState('');
  const [rawData, setRawData] = useState<string[]>(Array(31).fill(''));
  const [dates, setDates] = useState<string[]>([]);
  const [soilData, setSoilData] = useState<string[]>(Array(31).fill(''));
  const [heatData, setHeatData] = useState<boolean[]>(Array(31).fill(false));
  const [frozeData, setFrozeData] = useState<boolean[]>(Array(31).fill(false));
  const [status, setStatus] = useState('');
  const [newTradeInput, setNewTradeInput] = useState('');
  const [reportOutput, setReportOutput] = useState('<div style="text-align:center; padding:50px; color:#ccc;">Veuillez remplir au moins un jour et cliquer sur "Analyser Tout".</div>');
  const [chartsOutput, setChartsOutput] = useState('<div style="text-align:center; padding:50px; color:#ccc;">Veuillez remplir au moins un jour et cliquer sur "Analyser Tout".</div>');
  const [forecastLocation, setForecastLocation] = useState('');
  const [forecastDays] = useState(14); // Always fetch 14 days
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [searchResult, setSearchResult] = useState<{ location: string; coordinates: { lat: number; lon: number } } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const chartRefs = useRef<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const colsLabels: {[key: string]: string} = { temp: "Température", rain: "Pluie", snow: "Neige", windA: "Vent Moyen", windG: "Rafales", humi: "Humidité Air", soil: "Humidité Sol", windAvgPdf: "Vent Moyen (PDF)" };

  const AI_PROMPT = `Agis comme un expert en nettoyage de données.
Je vais te coller ci-dessous des données météorologiques brutes, copiées verticalement depuis un site web.
Ta mission : Reformater ces données pour obtenir une liste propre, une ligne par heure.

Règles strictes d'extraction :
1. L'Heure : Garde le format "XX h".
2. La Température : Trouve le chiffre avant "°C".
3. La Pluie : Trouve le chiffre avant "mm".
   ⚠️ IMPORTANT : Si tu vois le mot "traces" ou "aucune", remplace-le par "0 mm".
   Si plusieurs valeurs apparaissent, garde la plus élevée.
4. Le Vent et les Rafales : Repère le motif "XX km/h (YY km/h)".
   - La première valeur (XX) est le "Vent Moyen".
   - La valeur entre parenthèses (YY) est la "Rafale".
5. L'Humidité : Trouve le pourcentage (ex: 85%).

Format de sortie attendu (Texte brut, séparateurs clairs) :
[Heure] : T [Temp]°C | Pluie [Pluie]mm | Vent [Moyen]km/h | Rafales [Rafale]km/h | Humidité [Humi]%

Voici les données brutes :`;

  useEffect(() => {
    const initialDates: string[] = [];
    for(let i = 0; i < 31; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      initialDates.push(d.toISOString().split('T')[0]);
    }
    setDates(initialDates);
    setActiveTrades([...TRADES_FULL]);
  }, []);

  useEffect(() => {
    upd();
  }, [globalData, rules, activeTrades, displaySimple, showCharts, checkPeriod, txEnt, txCli, logoL, logoR, annexCols, emptyCellStyle]);

  const parseTextV96 = (txt: string, autoSnowFlag: boolean, snowLim: number) => {
    let t = txt.replace(/\n/g, " ").replace(/\u00a0/g, " ").replace(/\t/g, " ").replace(/\s+/g, " ");
    const regex = /(\d{1,2})\s*h\s+(.*?)(?=(\d{1,2}\s*h)|$)/gi;
    let m;
    const p: any[] = [];
    while ((m = regex.exec(t)) !== null) {
      const h = parseInt(m[1]);
      const c = m[2];
      const tMatch = c.match(/(-?\d+[.,]?\d*)\s*°C/);
      const valT = tMatch ? parseFloat(tMatch[1].replace(',', '.')) : null;
      const winds = [...c.matchAll(/(\d+)\s*km\/h/g)].map(m => parseInt(m[1]));
      let wA = 0, wG = 0;
      if (winds.length >= 2) { wG = Math.max(...winds); wA = Math.min(...winds); } 
      else if (winds.length === 1) { wA = winds[0]; wG = wA; }
      let safeContent = c.replace(/hPa/gi, "");
      let r = 0;
      if (safeContent.toLowerCase().includes("traces")) r = 0;
      else if (!safeContent.toLowerCase().includes("aucune")) {
        const rMatches = [...safeContent.matchAll(/(\d+(?:[.,]\d+)?)\s*mm/gi)];
        if (rMatches.length > 0) { 
          const lastMatch = rMatches[rMatches.length - 1]; 
          r = parseFloat(lastMatch[1].replace(',', '.')); 
        }
      }
      let hu = 0; 
      const hM = c.match(/(\d{1,3})\s*%/); 
      if (hM) hu = parseInt(hM[1]);
      let sn = 0; 
      const snM = c.match(/(\d+(?:[.,]\d+)?)\s*cm/i);
      if (snM && c.toLowerCase().includes('neige')) sn = parseFloat(snM[1].replace(',', '.'));
      if (autoSnowFlag && sn === 0 && r > 0 && valT !== null && valT <= snowLim) { sn = r; r = 0; }
      if (valT !== null) { p.push({ h: h, temp: valT, rain: r, snow: sn, w_avg: wA, w_gst: wG, humi: hu }); }
    }
    return p.sort((a, b) => a.h - b.h);
  };

  const parseAll = () => {
    const newGlobalData: any = {};
    for (let i = 0; i < 31; i++) {
      const raw = rawData[i];
      const dateStr = dates[i];
      let soilInput = soilData[i];
      let soil = 0;
      if (soilInput) { soil = parseFloat(soilInput.replace(',', '.')); if (isNaN(soil)) soil = 0; }
      const forceHeat = heatData[i];
      const forceFroze = frozeData[i];
      if (raw && raw.trim()) {
        const parsed = parseTextV96(raw, autoSnow, snowTempLimit);
        if (parsed.length > 0) {
          const [y, mo, d] = dateStr.split('-');
          newGlobalData[`${d}/${mo}/${y}`] = { rows: parsed, soil: soil, forceHeat: forceHeat, forceFroze: forceFroze };
        }
      }
    }
    setGlobalData(newGlobalData);
    if (Object.keys(newGlobalData).length > 0) {
      setStatus(`<span style="color:#16a34a">✅ ${Object.keys(newGlobalData).length} jours analysés.</span>`);
    } else {
      setStatus(`<span style="color:#dc2626">❌ Aucune donnée.</span>`);
    }
  };

  // Search for a location (just geocoding, no weather data)
  const searchLocation = async () => {
    if (!forecastLocation.trim()) {
      setForecastError('Veuillez entrer un code postal ou une commune');
      return;
    }
    
    setSearchLoading(true);
    setForecastError('');
    setSearchResult(null);
    setForecastResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('weather-forecast', {
        body: { location: forecastLocation.trim(), action: 'search' }
      });
      
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      setSearchResult(data);
      setForecastError('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la recherche';
      setForecastError(errorMessage);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch weather forecast from Open-Meteo API (after confirming location)
  const fetchForecast = async () => {
    if (!searchResult) {
      setForecastError('Veuillez d\'abord rechercher une commune');
      return;
    }
    
    setForecastLoading(true);
    setForecastError('');
    setForecastResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('weather-forecast', {
        body: { location: forecastLocation.trim(), days: forecastDays }
      });
      
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      setForecastResult(data);
      setForecastError('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la récupération des prévisions';
      setForecastError(errorMessage);
    } finally {
      setForecastLoading(false);
    }
  };

  // Apply a specific forecast day to a specific input tab
  const applyForecastDayToInput = (forecastIndex: number, tabIndex: number) => {
    if (!forecastResult || !forecastResult.forecast || !forecastResult.forecast[forecastIndex]) return;
    
    const day = forecastResult.forecast[forecastIndex];
    const newRawData = [...rawData];
    const newDates = [...dates];
    
    // Format date
    newDates[tabIndex] = day.date;
    
    // Format hourly data in the expected format (0h-23h)
    const formattedLines = day.hours.map((h: any) => {
      const rain = h.rain || h.precipitation || 0;
      return `${h.hour} h : T ${h.temp.toFixed(1)}°C | Pluie ${rain.toFixed(1)}mm | Vent ${Math.round(h.windSpeed)}km/h | Rafales ${Math.round(h.windGusts)}km/h | Humidité ${h.humidity}%`;
    });
    
    newRawData[tabIndex] = formattedLines.join('\n');
    
    setDates(newDates);
    setRawData(newRawData);
    setStatus(`<span style="color:#16a34a">✅ J${tabIndex + 1} : Prévisions du ${new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} importées depuis ${forecastResult.location}.</span>`);
  };

  const safeFloat = (valStr: any) => {
    if (!valStr) return 0;
    return parseFloat(String(valStr).replace(',', '.'));
  };

  const chk = (a: number, op: string, b: number) => {
    if (op == '<') return a < b;
    if (op == '<=') return a <= b;
    if (op == '>') return a > b;
    if (op == '>=') return a >= b;
    return false;
  };

  const calculateKoV96 = (r: any, d: any[], soilVal: number, forceHeat: boolean, forceFroze: boolean) => {
    if (r.var === 'canicule') return forceHeat === true ? "DÉCLARÉE" : false;
    if (r.var === 'soil') return chk(soilVal, r.op, safeFloat(r.val)) ? `${soilVal}%` : false;
    if (r.var === 'heat' && forceHeat) return "DÉCLARÉE";
    if (r.var === 'temp' && forceFroze && r.val <= 0) return "GELÉ";

    let k = r.var == 'vent_rafale' ? 'w_gst' : (r.var == 'vent_avg' ? 'w_avg' : (r.var == 'pluie' ? 'rain' : (r.var == 'neige' ? 'snow' : (r.var == 'humi_max' ? 'humi' : 'temp'))));
    let v1 = safeFloat(r.val);
    if (r.var === 'heat') k = 'temp';
    let unit = (r.var.includes('pluie') || r.var.includes('neige')) ? 'mm' : ((r.var.includes('temp') || r.var.includes('heat')) ? '°C' : (r.var.includes('soil') ? '%' : 'km/h'));

    if (r.type == 'cond1') {
      if (r.var == 'pluie' || r.var == 'neige') { 
        const s = d.reduce((a, b) => a + b[k], 0); 
        if (chk(s, r.op, v1)) return `${s.toFixed(1)}${unit} (24h)`; 
      } else { 
        const ext = d.find(x => chk(x[k], r.op, v1)); 
        if (ext) return `${ext[k]}${unit} (à ${ext.h}h)`; 
      }
    } else if (r.type == 'cond2') {
      const sub = d.filter(x => x.h >= r.h1 && x.h <= r.h2);
      if (r.var == 'pluie') { 
        const s = sub.reduce((a, b) => a + b[k], 0); 
        if (chk(s, r.op, v1)) return `${s.toFixed(1)}${unit} (${r.h1}h-${r.h2}h)`; 
      } else { 
        const ext = sub.find(x => chk(x[k], r.op, v1)); 
        if (ext) return `${ext[k]}${unit} (à ${ext.h}h)`; 
      }
    } else if (r.type == 'cond3') {
      const sub = d.filter(x => x.h >= r.h1 && x.h <= r.h2);
      let s = 0, maxS = 0, lastH = 0;
      sub.forEach(x => { 
        if (chk(x[k], r.op, v1)) { s++; lastH = x.h; } else s = 0; 
        if (s > maxS) maxS = s; 
      });
      if (maxS >= r.dur) return `Pdt ${maxS}h (fin ${lastH}h)`;
    } else if (r.type == 'cond4') {
      const row = d.find(x => x.h == r.h1);
      if (row && chk(row[k], r.op, v1)) return `${row[k]}${unit} (à ${row.h}h)`;
    } else if (r.type == 'cond5') {
      const v2 = safeFloat(r.val2);
      const row1 = d.find(x => x.h == r.h1);
      const row2 = d.find(x => x.h == r.h3);
      const res1 = (row1 && chk(row1[k], r.op, v1));
      const res2 = (row2 && chk(row2[k], r.op2 || r.op, v2));
      const vStr1 = row1 ? `${row1[k]}${unit} (${r.h1}h)` : `?`;
      const vStr2 = row2 ? `${row2[k]}${unit} (${r.h3}h)` : `?`;
      if (r.logic === 'OR') { if (res1 || res2) return `${vStr1} OU ${vStr2}`; }
      else { if (res1 && res2) return `${vStr1} ET ${vStr2}`; }
    } else if (r.type == 'cond6') {
      const fullData = new Array(24).fill(0);
      d.forEach(row => { if (row.h >= 0 && row.h < 24) fullData[row.h] = row[k]; });
      const duration = r.dur || 1;
      const isCumulative = (r.var == 'pluie' || r.var == 'neige');
      for (let h = 0; h <= 24 - duration; h++) {
        let val = 0;
        if (isCumulative) {
          for (let t = 0; t < duration; t++) val += fullData[h + t];
          val = Math.round(val * 100) / 100;
          if (chk(val, r.op, v1)) return `${val}${unit} (${h}h-${h + duration}h)`;
        } else {
          let matchCount = 0;
          for (let t = 0; t < duration; t++) { if (chk(fullData[h + t], r.op, v1)) matchCount++; }
          if (matchCount === duration) return `Pdt ${duration}h (${h}h-${h + duration}h)`;
        }
      }
    }
    return false;
  };

  const upd = () => {
    const ent = (txEnt || "Entreprise...").replace(/\n/g, '<br>');
    const cli = (txCli || "Chantier...").replace(/\n/g, '<br>');
    const imgL = logoL ? `<img src="${logoL}" style="max-height:80px">` : '';
    const imgR = logoR ? `<img src="${logoR}" style="max-height:80px">` : '';
    const simpleMode = displaySimple;
    const showChartsFlag = showCharts;

    let html = '';
    let chartsHtml = '';
    
    if (checkPeriod && Object.keys(globalData).length > 0) {
      let totalDays = Object.keys(globalData).length;
      let totalRainPeriod = 0;
      const daysKO = new Set();
      let pageHtml = `<div class="doc-section"><div class="doc-head"><div style="width:250px;"><div class="logo-zone" style="border:none;background:none;justify-content:flex-start;">${imgL}</div><div>${ent}</div></div><div style="flex-grow:1;text-align:center;"><h1 style="color:var(--primary);font-size:2rem;margin:0;">SYNTHÈSE PÉRIODE</h1><div style="font-weight:bold;margin-top:10px;font-size:1.1rem;">${totalDays} Jours Analysés</div></div><div style="width:250px;text-align:right;"><div class="logo-zone" style="border:none;background:none;justify-content:flex-end;">${imgR}</div><div>${cli}</div></div></div><h3>Résumé Global</h3><table><thead><tr><th>Date</th><th>T° Min/Max</th><th>Pluie</th><th>Vent Max</th><th>Intempérie ?</th></tr></thead><tbody>`;
      
      for (const [date, dataObj] of Object.entries(globalData) as any) {
        const ts = dataObj.rows.map((d: any) => d.temp);
        const rs = dataObj.rows.map((d: any) => d.rain).reduce((a: number, b: number) => a + b, 0);
        const ws = Math.max(...dataObj.rows.map((d: any) => d.w_gst));
        totalRainPeriod += rs;
        let dayIsKo = false;
        rules.forEach(r => {
          const res = calculateKoV96(r, dataObj.rows, dataObj.soil, dataObj.forceHeat, dataObj.forceFroze);
          if (res && r.lots && r.lots.some((t: string) => activeTrades.includes(t))) dayIsKo = true;
        });
        if (dayIsKo) daysKO.add(date);
        const statusHtml = dayIsKo ? `<span class="tag tag-ko">OUI</span>` : `<span class="tag tag-ok">NON</span>`;
        pageHtml += `<tr><td>${date}</td><td>${Math.min(...ts)}° / ${Math.max(...ts)}°</td><td>${rs.toFixed(1)} mm</td><td>${ws} km/h</td><td>${statusHtml}</td></tr>`;
      }
      pageHtml += `</tbody></table><div style="margin-top:20px;padding:15px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;"><strong>Bilan :</strong> Sur ${totalDays} jours, <strong>${daysKO.size}</strong> jour(s) d'intempéries constatés.<br>Cumul Pluie total : ${totalRainPeriod.toFixed(1)} mm.</div></div>`;
      html += pageHtml;
    }

    const entries = Object.entries(globalData);
    const sortedActiveTrades = [...activeTrades].sort((a, b) => a.localeCompare(b, 'fr'));

    for (let i = 0; i < entries.length; i++) {
      const [date, dataObj] = entries[i] as any;
      const dData = dataObj.rows;
      const soilVal = dataObj.soil;
      const forceHeat = dataObj.forceHeat;
      const forceFroze = dataObj.forceFroze;

      let pageStyle = i === entries.length - 1 ? 'page-break-after:auto;' : '';
      let pageHtml = `<div class="doc-section" style="${pageStyle}">`;
      const stationInfo = stationMeteo ? `<div style="font-size:0.9rem;color:#64748b;margin-top:5px;">Poste météo de référence : ${stationMeteo}</div>` : '';
      pageHtml += `<div class="doc-head"><div style="width:250px;"><div class="logo-zone" style="border:none;background:none;justify-content:flex-start;">${imgL}</div><div>${ent}</div></div><div style="flex-grow:1;text-align:center;"><h1 style="color:var(--primary);font-size:2rem;margin:0;">RELEVÉ INTEMPÉRIES</h1><div style="font-weight:bold;margin-top:10px;font-size:1.1rem;">${date}</div>${stationInfo}</div><div style="width:250px;text-align:right;"><div class="logo-zone" style="border:none;background:none;justify-content:flex-end;">${imgR}</div><div>${cli}</div></div></div>`;

      // Charts are now added at the end of the document

      pageHtml += `<div class="keep-together"><h3>1. Synthèse Décisionnelle</h3><table><thead><tr><th>Métiers / Critères</th>`;
      const ruleCols: any[] = [];
      rules.forEach((r, idx) => {
        let k = r.var;
        if (r.var == 'vent_rafale') k = 'Rafale';
        if (r.var == 'vent_avg') k = 'V.Moy';
        if (r.var == 'temp') k = 'Temp';
        if (r.var == 'pluie') k = 'Pluie';
        if (r.var == 'soil') k = 'Hum.Sol';
        if (r.var == 'heat') k = 'T° Élevée';
        if (r.var == 'canicule') k = 'Canicule';
        let desc = `${k} ${r.op} ${r.val}`;
        if (r.var === 'canicule') desc = "Canicule (Déclarée)";
        if (r.type == 'cond1' && r.var !== 'canicule') desc += ` (24h)`;
        if (r.type == 'cond2') desc += ` (${r.h1}h-${r.h2}h)`;
        if (r.type == 'cond3') desc += ` (pdt ${r.dur}h)`;
        if (r.type == 'cond4') desc += ` (à ${r.h1}h)`;
        if (r.type == 'cond5') desc += ` (${r.logic == 'OR' ? 'OU' : 'ET'})`;
        if (r.type == 'cond6') desc += ` (glissant ${r.dur}h)`;
        const result = calculateKoV96(r, dData, soilVal, forceHeat, forceFroze);
        ruleCols.push({ desc: desc, result: result, lots: r.lots || [] });
        pageHtml += `<th>${desc}</th>`;
      });
      pageHtml += `</tr></thead><tbody>`;

      sortedActiveTrades.forEach(t => {
        pageHtml += `<tr><td>${t}</td>`;
        ruleCols.forEach(col => {
          if (col.lots.includes(t)) {
            if (col.result !== false) {
              const txt = simpleMode ? "INTEMPÉRIE" : col.result;
              pageHtml += `<td><span class="tag tag-ko">${txt}</span></td>`;
            } else {
              pageHtml += `<td><span class="tag tag-ok">RAS</span></td>`;
            }
          } else {
            const cellClass = emptyCellStyle === 'gray' ? 'cell-empty' : 'cell-white';
            pageHtml += `<td class="${cellClass}"></td>`;
          }
        });
        pageHtml += `</tr>`;
      });
      pageHtml += `</tbody></table></div>`;

      // GROUP ANNEXES
      pageHtml += `<div class="group-annexes">`;

      const ts = dData.map((d: any) => d.temp);
      const rs = dData.map((d: any) => d.rain);
      const humis = dData.map((d: any) => d.humi);
      const totR = rs.reduce((a: number, b: number) => a + b, 0).toFixed(1);
      const maxH = Math.max(...humis);
      const maxGust = Math.max(...dData.map((d: any) => d.w_gst));

      // TABLEAU 2: RÉSUMÉ DU JOUR
      let sumHeaders = "";
      let sumRow = "";

      if (annexCols.temp) { sumHeaders += "<th>T.Min</th><th>T.Max</th>"; sumRow += `<td>${Math.min(...ts)}°</td><td>${Math.max(...ts)}°</td>`; }
      if (annexCols.rain) { sumHeaders += "<th>Pluie Tot.</th>"; sumRow += `<td>${totR} mm</td>`; }
      if (annexCols.snow) { sumHeaders += "<th>Neige Tot.</th>"; const totS = dData.reduce((a: number, b: any) => a + b.snow, 0).toFixed(1); sumRow += `<td>${totS} cm</td>`; }
      if (annexCols.windAvgPdf) { const maxAvg = Math.max(...dData.map((d: any) => d.w_avg)); sumHeaders += "<th>Vent Moy. Max</th>"; sumRow += `<td>${maxAvg} km/h</td>`; }
      if (annexCols.windG) { sumHeaders += "<th>Rafale Max</th>"; sumRow += `<td>${maxGust} km/h</td>`; }
      if (annexCols.humi) { sumHeaders += "<th>Hum. Max</th>"; sumRow += `<td>${maxH}%</td>`; }
      if (annexCols.soil) { sumHeaders += "<th>Hum. Sol</th>"; sumRow += `<td>${soilVal !== 0 ? soilVal + '%' : 'N/A'}</td>`; }

      pageHtml += `<div class="keep-together"><h3>2. Résumé du jour – ${date}</h3><table id="tbSum"><thead><tr>${sumHeaders}</tr></thead><tbody><tr>${sumRow}</tr></tbody></table></div>`;

      // TABLEAU 3: ANNEXE HORAIRE
      let annexHeaders = "<th>Heure</th>";
      if (annexCols.temp) annexHeaders += "<th>Temp (°C)</th>";
      if (annexCols.rain) annexHeaders += "<th>Pluie (mm)</th>";
      if (annexCols.snow) annexHeaders += "<th>Neige (cm)</th>";
      if (annexCols.windA) annexHeaders += "<th>Vent (km/h)</th>";
      if (annexCols.windG) annexHeaders += "<th>Rafale (km/h)</th>";
      if (annexCols.humi) annexHeaders += "<th>Hum. (%)</th>";

      pageHtml += `<div class="keep-together"><h3>3. Annexe : Données Horaires Brutes – ${date}</h3><table class="annex-table" id="tbAnnex"><thead><tr>${annexHeaders}</tr></thead><tbody>`;

      dData.forEach((r: any) => {
        let sT = ""; let sW = ""; let sWa = ""; let sR = "";
        rules.forEach(rule => {
          if (rule.var == 'temp' && rule.type == 'cond1' && chk(r.temp, rule.op, safeFloat(rule.val))) sT = 'text-alert';
          if (rule.var == 'vent_rafale' && rule.type == 'cond1' && chk(r.w_gst, rule.op, safeFloat(rule.val))) sW = 'text-alert';
          if (rule.var == 'vent_avg' && rule.type == 'cond1' && chk(r.w_avg, rule.op, safeFloat(rule.val))) sWa = 'text-alert';
        });
        if (r.rain > 5) sR = 'text-alert';

        let rowHtml = `<tr class="stripe"><td>${r.h}h</td>`;
        if (annexCols.temp) rowHtml += `<td class="${sT}">${r.temp}</td>`;
        if (annexCols.rain) rowHtml += `<td class="${sR}">${r.rain}</td>`;
        if (annexCols.snow) rowHtml += `<td>${r.snow}</td>`;
        if (annexCols.windA) rowHtml += `<td class="${sWa}">${r.w_avg}</td>`;
        if (annexCols.windG) rowHtml += `<td class="${sW}">${r.w_gst}</td>`;
        if (annexCols.humi) rowHtml += `<td>${r.humi}</td>`;
        rowHtml += `</tr>`;

        pageHtml += rowHtml;
      });
      pageHtml += `</tbody></table></div>`;

      pageHtml += `</div>`; // FIN GROUP ANNEXES
      pageHtml += `</div>`; // FIN DOC-SECTION
      html += pageHtml;

      if (showChartsFlag) {
        const chartIdTab = `chart-tab-${date.replace(/\//g, '-')}`;
        chartsHtml += `<h3 style="margin-top:30px;">${date}</h3><div class="chart-wrapper" style="height:350px;"><canvas id="${chartIdTab}"></canvas></div>`;
      }
    }

    // Add charts section at the end of the document if enabled - avoid empty pages
    if (showChartsFlag && Object.keys(globalData).length > 0) {
      html += `<div class="charts-section-container">`;
      html += `<div class="doc-head" style="margin-top:40px;"><div style="width:250px;"><div class="logo-zone" style="border:none;background:none;justify-content:flex-start;">${imgL}</div><div>${ent}</div></div><div style="flex-grow:1;text-align:center;"><h1 style="color:var(--primary);font-size:2rem;margin:0;">RELEVÉS GRAPHIQUES</h1></div><div style="width:250px;text-align:right;"><div class="logo-zone" style="border:none;background:none;justify-content:flex-end;">${imgR}</div><div>${cli}</div></div></div>`;
      for (const [date, dataObj] of Object.entries(globalData) as any) {
        const chartId = `chart-print-${date.replace(/\//g, '-')}`;
        html += `<div class="chart-block"><h3 style="margin-bottom:10px;">${date}</h3><div class="chart-wrapper"><canvas id="${chartId}"></canvas></div></div>`;
      }
      html += `</div>`;
    }

    if (Object.keys(globalData).length === 0) {
      html = `<div style="padding:50px;text-align:center;color:#ccc;">Aucune donnée.</div>`;
      chartsHtml = `<div style="padding:50px;text-align:center;color:#ccc;">Aucune donnée.</div>`;
    }

    setReportOutput(html);
    setChartsOutput(chartsHtml);

    // Render charts after DOM update
    if (showChartsFlag && Object.keys(globalData).length > 0) {
      setTimeout(() => {
        for (const [date, dataObj] of Object.entries(globalData) as any) {
          const chartId = `chart-print-${date.replace(/\//g, '-')}`;
          const chartIdTab = `chart-tab-${date.replace(/\//g, '-')}`;
          renderChart(chartId, dataObj.rows);
          renderChart(chartIdTab, dataObj.rows);
        }
      }, 200);
    }
  };

  const renderChart = (canvasId: string, data: any[]) => {
    const ctxEl = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!ctxEl) return;

    // Destroy existing chart if any
    if (chartRefs.current[canvasId]) {
      chartRefs.current[canvasId].destroy();
    }

    const ctx = ctxEl.getContext('2d');
    if (!ctx) return;

    const labels = data.map(d => d.h + 'h');
    const temps = data.map(d => d.temp);
    const rains = data.map(d => d.rain);
    const gusts = data.map(d => d.w_gst);

    // @ts-ignore
    const chart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { type: 'line', label: 'Température (°C)', data: temps, borderColor: '#dc2626', backgroundColor: '#dc2626', borderWidth: 2, tension: 0.4, yAxisID: 'y', pointRadius: 1 },
          { type: 'line', label: 'Rafales (km/h)', data: gusts, borderColor: '#94a3b8', backgroundColor: 'transparent', borderWidth: 1, borderDash: [5, 5], tension: 0.4, yAxisID: 'y1', pointRadius: 0 },
          { type: 'bar', label: 'Pluie (mm)', data: rains, backgroundColor: '#3b82f6', yAxisID: 'y1' }
        ]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Température (°C)' }, grid: { drawOnChartArea: false } },
          y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Pluie / Vent' }, grid: { drawOnChartArea: true } }
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } }
        }
      }
    });
    chartRefs.current[canvasId] = chart;
  };

  const addRule = (t?: string) => {
    const newRule: any = { lots: [...TRADES_FULL], var: t || "temp", type: "cond1", op: "<", val: 0, dur: 0, h1: 0, h2: 23 };
    if (t == 'temp') newRule.op = "<=";
    if (t == 'pluie') { newRule.op = ">="; newRule.val = "10"; }
    if (t == 'vent_rafale') { newRule.op = ">"; newRule.val = "60"; }
    if (t == 'soil') { newRule.op = ">="; newRule.val = "20"; }
    if (t == 'heat') { newRule.op = ">"; newRule.val = "35"; newRule.var = "heat"; }
    if (t == 'canicule') { newRule.var = "canicule"; newRule.val = "Déclarée"; newRule.type = "cond1"; }
    if (t == 'neige') { newRule.var = "neige"; newRule.op = ">="; newRule.val = "1"; }
    if (t == 'vent_avg') { newRule.var = "vent_avg"; newRule.op = ">="; newRule.val = "40"; }
    setRules([...rules, newRule]);
    setOpenRuleIdx(rules.length);
  };

  const delRule = (i: number) => {
    if (confirm("Supprimer?")) {
      const newRules = [...rules];
      newRules.splice(i, 1);
      setRules(newRules);
      setOpenRuleIdx(-1);
    }
  };

  const uR = (i: number, k: string, v: any) => {
    const newRules = [...rules];
    if (k === 'val' || k === 'val2') newRules[i][k] = v;
    else if (['dur', 'h1', 'h2', 'h3'].includes(k)) newRules[i][k] = parseFloat(v);
    else newRules[i][k] = v;
    setRules(newRules);
  };

  const getInputs = (r: any, i: number) => {
    const opOpts = `<option value="<" ${r.op == '<' ? 'selected' : ''}>&lt;</option><option value="<=" ${r.op == '<=' ? 'selected' : ''}>&le;</option><option value=">" ${r.op == '>' ? 'selected' : ''}>&gt;</option><option value=">=" ${r.op == '>=' ? 'selected' : ''}>&ge;</option>`;
    if (r.var == 'canicule') return `<div style="grid-column:span 3;color:#f97316;font-size:0.8rem;padding:5px;background:#fff7ed;border-radius:4px;">Règle basée sur la case "Canicule Déclarée" dans les Données.</div>`;

    let com = `<div class="form-group"><label>Op</label><select class="rule-select" data-index="${i}" data-key="op">${opOpts}</select></div><div class="form-group"><label>Seuil</label><input class="rule-input" data-index="${i}" data-key="val" value="${r.val}"></div>`;
    if (r.type == 'cond1') return com;
    if (r.type == 'cond2') return com + `<div class="form-group"><label>H1</label><input type="number" class="rule-input" data-index="${i}" data-key="h1" value="${r.h1}"></div><div class="form-group"><label>H2</label><input type="number" class="rule-input" data-index="${i}" data-key="h2" value="${r.h2}"></div>`;
    if (r.type == 'cond3') return com + `<div class="form-group"><label>Durée</label><input type="number" class="rule-input" data-index="${i}" data-key="dur" value="${r.dur}"></div><div class="form-group"><label>H1</label><input type="number" class="rule-input" data-index="${i}" data-key="h1" value="${r.h1}"></div><div class="form-group"><label>H2</label><input type="number" class="rule-input" data-index="${i}" data-key="h2" value="${r.h2}"></div>`;
    if (r.type == 'cond4') return com + `<div class="form-group"><label>Heure</label><input type="number" class="rule-input" data-index="${i}" data-key="h1" value="${r.h1}"></div>`;
    if (r.type == 'cond5') {
      const logicOpts = `<option value="AND" ${r.logic == 'AND' ? 'selected' : ''}>ET (Les 2)</option><option value="OR" ${r.logic == 'OR' ? 'selected' : ''}>OU (L'un des 2)</option>`;
      return `<div class="form-group"><label>Logique</label><select class="rule-select" data-index="${i}" data-key="logic">${logicOpts}</select></div>
      <div class="form-group"><label>Cond 1 (Op / Seuil)</label><div style="display:flex"><select class="rule-select" data-index="${i}" data-key="op">${opOpts}</select><input class="rule-input" data-index="${i}" data-key="val" value="${r.val}" placeholder="Val 1"></div></div>
      <div class="form-group"><label>Heure 1</label><input type="number" class="rule-input" data-index="${i}" data-key="h1" value="${r.h1}"></div>
      <div class="form-group"><label>Cond 2 (Op / Seuil)</label><div style="display:flex"><select class="rule-select" data-index="${i}" data-key="op2">${opOpts.replace(/selected/g, '')}</select><input class="rule-input" data-index="${i}" data-key="val2" value="${r.val2 || ''}" placeholder="Val 2"></div></div>
      <div class="form-group"><label>Heure 2</label><input type="number" class="rule-input" data-index="${i}" data-key="h3" value="${r.h3}"></div>`;
    }
    if (r.type == 'cond6') return `<div class="form-group"><label>Op</label><select class="rule-select" data-index="${i}" data-key="op">${opOpts}</select></div><div class="form-group"><label>Seuil Cumul</label><input class="rule-input" data-index="${i}" data-key="val" value="${r.val}"></div><div class="form-group"><label>Durée Glissante (h)</label><input type="number" class="rule-input" data-index="${i}" data-key="dur" value="${r.dur}"></div>`;
    return "";
  };

  const handleRuleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const index = parseInt(e.target.getAttribute('data-index') || '0');
    const key = e.target.getAttribute('data-key') || '';
    uR(index, key, e.target.value);
  };

  const exportConfig = () => {
    let fileName = prompt("Entrez le nom du fichier de sauvegarde :", "config_chantier");
    if (fileName === null) return;
    if (!fileName.trim()) fileName = "config_chantier";
    if (!fileName.toLowerCase().endsWith(".json")) fileName += ".json";

    const config = {
      tradesFull: TRADES_FULL,
      activeTrades: activeTrades,
      rules: rules,
      annexCols: annexCols,
      entText: txEnt,
      cliText: txCli,
      emailCli: emailCli,
      stationMeteo: stationMeteo,
      displaySimple: displaySimple,
      showCharts: showCharts,
      // Logos
      logoL: logoL,
      logoR: logoR,
      // Données météo
      rawData: rawData,
      dates: dates,
      soilData: soilData,
      heatData: heatData,
      frozeData: frozeData,
      globalData: globalData
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", fileName);
    dlAnchorElem.click();
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const config = JSON.parse(e.target?.result as string);
        if (config.tradesFull) setTRADES_FULL(config.tradesFull);
        if (config.activeTrades) setActiveTrades(config.activeTrades);
        if (config.rules) setRules(config.rules);
        if (config.annexCols) setAnnexCols(config.annexCols);
        if (config.entText) setTxEnt(config.entText);
        if (config.cliText) setTxCli(config.cliText);
        if (config.cliEmail) setEmailCli(config.cliEmail);
        if (config.stationMeteo) setStationMeteo(config.stationMeteo);
        if (config.displaySimple !== undefined) setDisplaySimple(config.displaySimple);
        if (config.showCharts !== undefined) setShowCharts(config.showCharts);
        // Restauration des données météo
        if (config.rawData) setRawData(config.rawData);
        if (config.dates) setDates(config.dates);
        if (config.soilData) setSoilData(config.soilData);
        if (config.heatData) setHeatData(config.heatData);
        if (config.frozeData) setFrozeData(config.frozeData);
        if (config.globalData) setGlobalData(config.globalData);
        // Restauration des logos
        if (config.logoL) setLogoL(config.logoL);
        if (config.logoR) setLogoR(config.logoR);
        alert("Configuration, logos et données météo chargés avec succès !");
      } catch (err) {
        alert("Erreur fichier");
      }
    };
    reader.readAsText(file);
  };

  const ldImg = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setter(ev.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const generateMailBody = () => {
    const ent = txEnt || "Entreprise";
    const cli = txCli || "Client";
    let body = `Bonjour,\n\nVoici le relevé d'intempéries pour le chantier ${cli}.\nEntreprise : ${ent}\n\n`;
    let hasData = false;
    for (const [date, dataObj] of Object.entries(globalData) as any) {
      hasData = true;
      body += `\n--- DATE : ${date} ---\n`;
      let dayHasKo = false;
      const details: string[] = [];
      rules.forEach(r => {
        const affectsActive = r.lots && r.lots.some((t: string) => activeTrades.includes(t));
        if (affectsActive) {
          const res = calculateKoV96(r, dataObj.rows, dataObj.soil, dataObj.forceHeat, dataObj.forceFroze);
          if (res) {
            dayHasKo = true;
            let k = r.var;
            if (r.var == 'vent_rafale') k = 'Rafale';
            if (r.var == 'vent_avg') k = 'Vent Moy';
            if (r.var == 'temp') k = 'Temp';
            if (r.var == 'pluie') k = 'Pluie';
            details.push(`- ${k} (${r.op} ${r.val}): ${res}`);
          }
        }
      });
      if (dayHasKo) { body += `[!] INTEMPÉRIE CONSTATÉE\nCauses :\n${details.join('\n')}\n`; } else { body += `[OK] RAS\n`; }
    }
    if (!hasData) body += "Aucune donnée analysée.\n";
    return body;
  };

  const sendMail = () => {
    const body = generateMailBody();
    const encodedBody = encodeURIComponent(body).replace(/%0A/g, '%0D%0A');
    window.location.href = `mailto:${emailCli}?subject=Relevé Intempéries - ${txCli}&body=${encodedBody}`;
  };

  const copyMailBody = () => {
    const body = generateMailBody();
    navigator.clipboard.writeText(body).then(() => {
      alert("Rapport copié ! Vous pouvez le coller dans votre mail (Ctrl+V).");
    });
  };

  const exportWord = () => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title><style>body{font-family:Arial;color:#000;} .doc-head{border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px;} table{width:100%;border-collapse:collapse;margin-top:10px;font-size:10pt;} td,th{border:1px solid #999;padding:4px;text-align:center;} th{background-color:#eee;} .text-alert{color:#dc2626;font-weight:bold;} .tag-ko{color:#991b1b;background-color:#fee2e2;font-weight:bold;} .tag-ok{color:#166534;background-color:#dcfce7;} .annex-table{font-size:9pt;} .force-break{page-break-before:always;} .annex{page-break-before:always;} #tbSum td:first-child { width: auto; font-weight: bold; } #tbAnnex td:first-child { width: 80px; font-weight: bold; } .cell-void { background-color: #ffffff; border: 1px solid #eee; } .cell-na { background-color: #e2e8f0; color:#999; }</style></head><body>";
    const footer = "</body></html>";
    let htmlContent = reportOutput;
    htmlContent = htmlContent.replace(/<div class="annex">/g, '<div class="annex force-break">');
    const sourceHTML = header + htmlContent + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'Releve_Intemperies.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT).then(() => {
      alert("Prompt copié !");
    });
  };

  const addCustomTrade = () => {
    const val = newTradeInput.trim();
    if (val && !TRADES_FULL.includes(val)) {
      setTRADES_FULL([...TRADES_FULL, val]);
      if (!activeTrades.includes(val)) setActiveTrades([...activeTrades, val]);
      setNewTradeInput('');
    }
  };

  const checkAll = (checkboxListId: string, checked: boolean) => {
    document.querySelectorAll(`#${checkboxListId} input[type="checkbox"]`).forEach((c: any) => c.checked = checked);
  };

  const saveGlobalTrades = () => {
    const newActiveTrades: string[] = [];
    document.querySelectorAll('#tradesCheckboxes input:checked').forEach((c: any) => newActiveTrades.push(c.value));
    setActiveTrades(newActiveTrades);
    setTradesModalOpen(false);
  };

  const closeRuleTradesModal = () => {
    if (currentRuleIndex === -1) return;
    const sel: string[] = [];
    document.querySelectorAll('#ruleTradesList input:checked').forEach((c: any) => sel.push(c.value));
    const newRules = [...rules];
    newRules[currentRuleIndex].lots = sel;
    setRules(newRules);
    setRuleTradesModalOpen(false);
  };

  const sortedTrades = [...TRADES_FULL].sort((a, b) => a.localeCompare(b, 'fr'));
  const sortedActiveTrades = [...activeTrades].sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --primary: #1e293b; --accent: #2563eb; --bg: #f8fafc; --surface: #ffffff;
          --border: #cbd5e1; --success: #16a34a; --danger: #dc2626; --text: #334155;
          --orange: #f97316; --word-blue: #2b579a;
        }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; line-height: 1.5; }
        
        .layout { display: grid; grid-template-columns: 500px 1fr; gap: 30px; max-width: 1900px; margin: 0 auto; align-items: start; }
        
        .panel { background: var(--surface); border-radius: 12px; padding: 25px; box-shadow: 0 4px 10px rgba(0,0,0,0.03); border: 1px solid var(--border); margin-bottom: 25px; }
        .panel-head { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; justify-content: space-between; }
        .step-num { background: var(--primary); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; margin-right: 12px; }
        .panel-title { font-weight: 700; color: var(--primary); font-size: 1.1rem; }

        .tabs { display: flex; gap: 5px; overflow-x: auto; margin-bottom: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 0; }
        .tab { padding: 8px 15px; background: #f1f5f9; border: 1px solid #cbd5e1; border-bottom: none; border-radius: 8px 8px 0 0; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #64748b; }
        .tab.active { background: white; color: var(--accent); border-top: 3px solid var(--accent); padding-top: 6px; border-bottom: 1px solid white; margin-bottom: -1px; z-index: 10; }
        .tab-content { display: none; padding: 15px; border: 1px solid #e2e8f0; border-top: none; background: white; border-radius: 0 0 8px 8px; }
        .tab-content.active { display: block; }

        textarea { width: 100%; height: 120px; border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 0.85rem; resize: vertical; box-sizing: border-box; }
        input, select { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem; margin-bottom: 5px; box-sizing: border-box; background: white; }
        
        .btn { width: 100%; padding: 14px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 8px; transition: 0.2s; font-size: 1rem; color:white; }
        .btn-primary { background: var(--accent); } .btn-primary:hover { background: #1d4ed8; }
        .btn-print { background: var(--success); margin-top: 10px; } .btn-print:hover { background: #15803d; }
        .btn-word { background-color: #2b579a !important; color: white !important; margin-top: 10px; } .btn-word:hover { background-color: #1e3a8a !important; }
        .btn-mail { background: var(--orange); margin-top: 10px; } .btn-mail:hover { background: #c2410c; }
        .btn-copy { background: #64748b; margin-top: 10px; } .btn-copy:hover { background: #475569; }
        .btn-save { background: #7c3aed; color: white; margin-bottom: 5px; } .btn-save:hover { background: #6d28d9; }
        .btn-load { background: white; color: #7c3aed; border: 2px solid #7c3aed; } .btn-load:hover { background: #f3e8ff; }

        .btn-config { background: #e2e8f0; color: var(--primary); padding: 5px 12px; font-size: 0.85rem; border-radius: 6px; width: auto; font-weight: 600; cursor: pointer; border: none; }
        .btn-add-main { background: white; border: 2px dashed var(--accent); color: var(--accent); font-size: 1rem; margin-bottom: 15px; padding: 12px; width:100%; }
        .btn-del { width: auto; background: white; border: 1px solid var(--danger); color: var(--danger); padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-top: 10px; align-self: start; }
        .btn-select-trades { background: white; border: 1px solid var(--border); color: var(--text); padding: 10px; text-align: left; display: flex; justify-content: space-between; align-items: center; cursor: pointer; width: 100%; border-radius: 6px; font-size: 0.95rem; }
        .btn-help { background: #dcfce7; color: #166534; padding: 8px 12px; font-size: 0.85rem; border-radius: 6px; font-weight: 600; cursor: pointer; border: 1px solid #86efac; display:flex; align-items:center; gap:5px; width:100%; justify-content:center; margin-bottom:15px; }

        .separator { display: flex; align-items: center; text-align: center; color: #94a3b8; font-size: 0.8rem; margin: 15px 0; }
        .separator::before, .separator::after { content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; }
        
        .quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
        .btn-quick { background: #f8fafc; border: 1px solid var(--border); padding: 8px 4px; border-radius: 8px; cursor: pointer; font-size: 0.75rem; text-align: center; color: var(--text); transition:0.2s; font-weight: 500; display:flex; flex-direction:column; align-items:center; gap:3px; }
        .btn-quick:hover { border-color: var(--accent); color: var(--accent); background: white; }

        .options-bar { display: flex; gap: 15px; align-items: center; background: #fff7ed; padding: 10px; border: 1px solid #fed7aa; border-radius: 6px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap; }
        .options-bar label { cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: 600; color: #7c2d12; transition: 0.2s; font-size: 0.85rem; }
        .options-bar input { width: 18px; height: 18px; cursor: pointer; margin:0; }

        .rules-list { max-height: 600px; overflow-y: auto; padding-right: 5px; }
        .rule-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 12px; overflow: hidden; transition: 0.2s; border-left: 5px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .rule-header { padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .rule-title { font-weight: 700; font-size: 0.95rem; color: var(--primary); }
        .rule-summary { font-size: 0.85rem; color: #64748b; margin-top: 2px; }
        .rule-body { padding: 20px; display: none; border-top: 1px solid #f1f5f9; background: #fcfcfc; }
        .rule-body.open { display: block; }
        
        .form-grid { display: grid; gap: 15px; margin-bottom: 15px; }
        .cols-2 { grid-template-columns: 1fr 1fr; }
        .cols-3 { grid-template-columns: 1fr 1fr 1fr; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .badge-count { background: var(--primary); color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.75rem; }

        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 1000; }
        .modal.open { display: flex; }
        .modal-content { background: white; padding: 25px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .trade-item { display: block; margin-bottom: 8px; font-size: 0.9rem; cursor: pointer; padding: 5px; border-radius: 4px; }
        .trade-item:hover { background: #f8fafc; }
        .trade-item input { width: auto; margin-right: 10px; }

        .preview { background: white; padding: 40px; min-height: 900px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); position: relative; }
        .doc-head { display: flex; justify-content: space-between; border-bottom: 4px solid var(--primary); padding-bottom: 20px; margin-bottom: 30px; }
        .doc-head div { line-height: 1.4; font-size: 0.9rem; } 
        .logo-zone { width: 160px; height: 80px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 2px dashed #cbd5e1; cursor: pointer; overflow: hidden; border-radius: 6px; }
        .logo-zone img { max-width: 100%; max-height: 100%; }
        .doc-title h1 { font-size: 1.8rem; text-transform: uppercase; margin: 0; color: var(--primary); text-align: center; }
        
        h3 { color: var(--primary); border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px; font-size: 1.1rem; }
        table { width: 100%; border-collapse: collapse; font-size: 0.8rem; page-break-inside: auto; margin-top: 10px; }
        tr { page-break-inside: avoid; }
        th { background: #f1f5f9; padding: 8px; border: 1px solid #94a3b8; color: var(--primary); text-transform: uppercase; font-size: 0.7rem; vertical-align: middle; }
        td { border: 1px solid #cbd5e1; padding: 5px; text-align: center; color: var(--text); vertical-align: middle; }
        
        .stripe:nth-child(even) { background-color: #f8fafc; }
        
        #tbAnnex td:first-child { width: 60px !important; min-width: 60px !important; font-weight: bold; background: #f8fafc; text-align: left !important; }
        #tbSum td:first-child { width: auto !important; font-weight: bold; text-align: center !important; }
        #tbSum td, #tbAnnex td { text-align: center !important; }
        #tbAnnex td:first-child { text-align: left !important; }

        .tag { padding: 3px 6px; border-radius: 4px; font-weight: 700; font-size: 0.65rem; border: 1px solid transparent; display: inline-block; white-space: nowrap; }
        .tag-ok { background: #dcfce7; color: #15803d; border-color: #86efac; }
        .tag-ko { background: #fee2e2; color: #b91c1c; border-color: #fca5a5; font-size: 0.7rem; white-space: normal; line-height: 1.2; font-weight: 800; }
        .cell-na { background-color: #e2e8f0 !important; background-image: linear-gradient(45deg, #f1f5f9 25%, transparent 25%, transparent 50%, #f1f5f9 50%, #f1f5f9 75%, transparent 75%, transparent); background-size: 10px 10px; color: #94a3b8; font-size: 0.8rem; }
        .cell-empty { background-color: #f3f4f6 !important; color: #9ca3af; font-size: 0.8rem; }
        .cell-white { background-color: #ffffff !important; color: #9ca3af; font-size: 0.8rem; }
        .text-alert { color: #dc2626 !important; font-weight: 900 !important; }
        
        .chart-wrapper { position: relative; width: 100%; max-width: 100%; height: 200px; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background:white; page-break-inside: avoid; box-sizing: border-box; }
        
        .keep-together { page-break-inside: avoid; break-inside: avoid; display: block; }
        
        .doc-section { page-break-after: always; padding-top: 0; }
        .doc-section:last-child { page-break-after: auto; }
        
        .charts-section-container { page-break-before: always; padding-top: 20px; }
        .charts-section-container:empty { display: none; page-break-before: auto; }
        
        .chart-block { margin-bottom: 30px; page-break-inside: avoid; break-inside: avoid; }
        
        .group-annexes { page-break-inside: avoid; break-inside: avoid; }
        
        table { page-break-inside: auto; }
        thead { display: table-header-group; }
        tbody { display: table-row-group; }
        tr { page-break-inside: avoid; break-inside: avoid; }

        .print-option { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px; border-radius: 6px; margin-top: 10px; font-size: 0.85rem; color: #166534; display: flex; align-items: center; gap: 8px; }
        
        #saveNotif { position: fixed; top: 20px; right: 20px; background: #22c55e; color: white; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: none; z-index: 2000; font-weight: bold; }

        @media print {
          body { background: white; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print, .tabs { display: none !important; } 
          .layout { display: block; max-width: none; margin: 0; }
          .preview { box-shadow: none; padding: 0; width: 100%; }
          .logo-zone { border: none; background: none; }
          
          .tab-content { display: none !important; } 
          #out-report { display: block !important; } 
          #out-charts { display: none !important; }

          .group-annexes { page-break-inside: avoid !important; }
          
          .chart-wrapper { break-inside: avoid; page-break-inside: avoid; display: block !important; height: 200px !important; width: 100% !important; max-width: 700px !important; }
          .keep-together { page-break-inside: avoid !important; }
          
          .doc-section { page-break-after: always; }
          .doc-section:last-child { page-break-after: auto; }
          
          .charts-section-container { page-break-before: always; }
          .charts-section-container:empty { display: none !important; page-break-before: auto !important; }
          
          .cell-empty { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .cell-white { background-color: #ffffff !important; }
        }
      `}} />

      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div id="saveNotif">✅ Sauvegarde effectuée</div>

      {/* Trades Modal */}
      <div id="tradesModal" className={`modal ${tradesModalOpen ? 'open' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>Gérer les Métiers</h2>
            <button onClick={() => setTradesModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>Filtre Principal : Décochez les métiers absents.</div>
          <div style={{ marginBottom: '15px' }}>
            <button className="btn-config" onClick={() => checkAll('tradesCheckboxes', true)}>Tout Cocher</button>
            <button className="btn-config" onClick={() => checkAll('tradesCheckboxes', false)} style={{ marginLeft: '5px' }}>Tout Décocher</button>
          </div>
          <div id="tradesCheckboxes" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '15px' }}>
            {sortedTrades.map(t => (
              <label key={t} className="trade-item">
                <input type="checkbox" value={t} defaultChecked={activeTrades.includes(t)} /> {t}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '5px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
            <input type="text" value={newTradeInput} onChange={(e) => setNewTradeInput(e.target.value)} placeholder="Nouveau métier..." />
            <button className="btn-config" onClick={addCustomTrade}>Ajouter</button>
          </div>
          <button className="btn btn-primary" onClick={saveGlobalTrades} style={{ marginTop: '20px' }}>Valider</button>
        </div>
      </div>

      {/* Rule Trades Modal */}
      <div id="ruleTradesModal" className={`modal ${ruleTradesModalOpen ? 'open' : ''}`}>
        <div className="modal-content">
          <h3 style={{ marginTop: 0 }}>Métiers concernés par cette règle</h3>
          <div style={{ marginBottom: '10px' }}>
            <button className="btn-config" onClick={() => checkAll('ruleTradesList', true)}>Tous</button>
            <button className="btn-config" onClick={() => checkAll('ruleTradesList', false)} style={{ marginLeft: '5px' }}>Aucun</button>
          </div>
          <div id="ruleTradesList" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {activeTrades.length === 0 ? (
              <div style={{ color: '#666', fontStyle: 'italic' }}>Aucun métier activé sur le chantier.<br />Veuillez d'abord "Gérer les Métiers du Chantier".</div>
            ) : (
              sortedActiveTrades.map(t => (
                <label key={t} className="trade-item">
                  <input type="checkbox" value={t} defaultChecked={currentRuleIndex >= 0 && rules[currentRuleIndex]?.lots?.includes(t)} /> {t}
                </label>
              ))
            )}
          </div>
          <button className="btn btn-primary" onClick={closeRuleTradesModal} style={{ marginTop: '20px' }}>Valider</button>
        </div>
      </div>

      {/* Cols Modal */}
      <div id="colsModal" className={`modal ${colsModalOpen ? 'open' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>Colonnes du Tableau (Annexe)</h2>
            <button onClick={() => setColsModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>Choisissez les paramètres météo à afficher dans les tableaux "Résumé du jour" et "Annexe".</p>
          <div id="colsCheckboxes" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(colsLabels).filter(([key]) => key !== 'windAvgPdf').map(([key, label]) => (
              <label key={key} className="trade-item">
                <input type="checkbox" checked={annexCols[key as keyof typeof annexCols]} onChange={(e) => setAnnexCols({ ...annexCols, [key]: e.target.checked })} /> {label}
              </label>
            ))}
          </div>
          <div style={{ marginTop: '15px', padding: '10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0369a1', marginBottom: '8px' }}>📄 Options PDF supplémentaires :</p>
            <label className="trade-item">
              <input type="checkbox" checked={annexCols.windAvgPdf} onChange={(e) => setAnnexCols({ ...annexCols, windAvgPdf: e.target.checked })} /> Afficher Vent Moyen Max dans le résumé PDF
            </label>
          </div>
          <div style={{ marginTop: '15px', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>🎨 Fond des cases vides (synthèse décisionnelle) :</p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label className="trade-item" style={{ marginBottom: 0 }}>
                <input type="radio" name="emptyCellStyle" checked={emptyCellStyle === 'gray'} onChange={() => setEmptyCellStyle('gray')} style={{ width: 'auto', marginRight: '8px' }} /> Gris très clair (recommandé)
              </label>
              <label className="trade-item" style={{ marginBottom: 0 }}>
                <input type="radio" name="emptyCellStyle" checked={emptyCellStyle === 'white'} onChange={() => setEmptyCellStyle('white')} style={{ width: 'auto', marginRight: '8px' }} /> Blanc simple
              </label>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setColsModalOpen(false)} style={{ marginTop: '20px' }}>Valider & Mettre à jour</button>
        </div>
      </div>

      {/* Prompt Modal */}
      <div id="promptModal" className={`modal ${promptModalOpen ? 'open' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>Prompt IA pour Météociel</h2>
            <button onClick={() => setPromptModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
          </div>
          <textarea value={AI_PROMPT} readOnly style={{ height: '350px', fontSize: '0.8rem', background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', padding: '10px' }} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button className="btn btn-primary" onClick={copyPrompt}>📋 Copier le Prompt</button>
            <a href="https://www.meteociel.fr/" target="_blank" className="btn" style={{ background: '#0ea5e9', textDecoration: 'none' }}>🌍 Aller sur Météociel</a>
          </div>
        </div>
      </div>

      <div className="layout">
        <div className="no-print">
          <h1 style={{ textAlign: 'center', color: 'var(--primary)', marginTop: 0, fontSize: '1.8rem' }}>🌦️ Météo BTP <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.6 }}>V101 (Gold Master)</span></h1>

          <div className="panel">
            <div className="panel-head">
              <div className="head-left" style={{ display: 'flex', alignItems: 'center' }}>
                <div className="step-num">1</div>
                <span className="panel-title">Données (31 Jours)</span>
              </div>
            </div>
            
            {/* Open-Meteo Forecast Section */}
            <div style={{ marginBottom: '20px', padding: '15px', background: 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)', borderRadius: '10px', border: '1px solid #93c5fd' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.4rem' }}>🌍</span>
                <span style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '1rem' }}>Prévisions Open-Meteo (France) → Import J1</span>
              </div>
              
              {/* Step 1: Search location */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#3730a3', display: 'block', marginBottom: '4px' }}>Étape 1 : Code postal ou Commune</label>
                  <input 
                    type="text" 
                    value={forecastLocation} 
                    onChange={(e) => {
                      setForecastLocation(e.target.value);
                      setSearchResult(null);
                      setForecastResult(null);
                    }}
                    placeholder="Ex: 59264 ou Onnaing"
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #a5b4fc', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <button 
                  onClick={searchLocation}
                  disabled={searchLoading}
                  style={{ 
                    padding: '10px 20px', 
                    background: searchLoading ? '#94a3b8' : '#6366f1', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontWeight: 'bold', 
                    cursor: searchLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {searchLoading ? '⏳ Recherche...' : '🔍 Rechercher'}
                </button>
              </div>
              
              {/* Search result confirmation */}
              {searchResult && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#92400e', fontSize: '1rem' }}>
                        📍 Commune trouvée : {searchResult.location}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#a16207', marginTop: '4px' }}>
                        Coordonnées : {searchResult.coordinates.lat.toFixed(4)}, {searchResult.coordinates.lon.toFixed(4)}
                      </div>
                    </div>
                    <button 
                      onClick={fetchForecast}
                      disabled={forecastLoading}
                      style={{ 
                        padding: '10px 20px', 
                        background: forecastLoading ? '#94a3b8' : '#16a34a', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        fontWeight: 'bold', 
                        cursor: forecastLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {forecastLoading ? '⏳ Chargement...' : '✅ Récupérer les prévisions (14 jours)'}
                    </button>
                  </div>
                </div>
              )}
              
              {forecastError && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#b91c1c', fontSize: '0.85rem' }}>
                  ❌ {forecastError}
                </div>
              )}
              
              {forecastResult && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ padding: '10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '5px' }}>
                      ✅ {forecastResult.location} - {forecastResult.days} jours de prévisions horaires (0h-23h)
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                      Cliquez sur "Importer J1" pour importer les données horaires dans l'onglet J1
                    </div>
                  </div>
                  
                  <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'white', borderRadius: '6px', padding: '10px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                    <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>Date</th>
                          <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>T° Min/Max</th>
                          <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Pluie</th>
                          <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Vent Max</th>
                          <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Rafales</th>
                          <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastResult.forecast.map((day: any, idx: number) => (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                            <td style={{ padding: '6px', borderBottom: '1px solid #e2e8f0' }}>
                              {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                              <span style={{ color: '#2563eb' }}>{day.summary.tempMin.toFixed(1)}°</span> / 
                              <span style={{ color: '#dc2626' }}> {day.summary.tempMax.toFixed(1)}°</span>
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: day.summary.precipitationTotal > 5 ? '#2563eb' : '#64748b' }}>
                              {day.summary.precipitationTotal.toFixed(1)} mm
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                              {Math.round(day.summary.windMax)} km/h
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: day.summary.gustsMax > 50 ? '#dc2626' : '#64748b', fontWeight: day.summary.gustsMax > 50 ? 'bold' : 'normal' }}>
                              {Math.round(day.summary.gustsMax)} km/h
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                              <button
                                onClick={() => applyForecastDayToInput(idx, 0)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  background: '#4f46e5',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                                title="Importer cette journée vers J1"
                              >
                                Importer J1
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="separator" style={{ marginBottom: '15px' }}>OU saisie manuelle</div>
            
            <button className="btn-help" onClick={() => setPromptModalOpen(true)}>📋 Récupérer le Prompt IA (Nettoyage Données)</button>
            <div className="tabs" style={{ flexWrap: 'wrap', gap: '3px' }}>
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className={`tab ${activeTab === i ? 'active' : ''}`} style={{ padding: '6px 10px', fontSize: '0.85rem' }} onClick={() => setActiveTab(i)}>J{i + 1}</div>
              ))}
            </div>
            <div id="tabsContainer">
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className={`tab-content ${activeTab === i ? 'active' : ''}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Date du Jour {i + 1} :</label>
                    <input type="date" value={dates[i] || ''} onChange={(e) => { const newDates = [...dates]; newDates[i] = e.target.value; setDates(newDates); }} style={{ width: '150px', padding: '5px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '6px', border: '1px solid #bfdbfe', flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>💧</span>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e3a8a' }}>Humidité Sol (%):</label>
                      <input type="number" value={soilData[i]} onChange={(e) => { const newSoil = [...soilData]; newSoil[i] = e.target.value; setSoilData(newSoil); parseAll(); }} placeholder="Ex: 25.5" step="0.1" style={{ width: '80px', padding: '4px', margin: 0, fontWeight: 'bold' }} />
                    </div>
                    <div style={{ background: '#fff7ed', padding: '8px', borderRadius: '6px', border: '1px solid #fed7aa', flex: 1, display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🔥</span>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#9a3412' }}>Canicule</label>
                        <input type="checkbox" checked={heatData[i]} onChange={(e) => { const newHeat = [...heatData]; newHeat[i] = e.target.checked; setHeatData(newHeat); parseAll(); }} style={{ width: 'auto', margin: 0 }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>❄️</span>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1e3a8a' }}>Gelé</label>
                        <input type="checkbox" checked={frozeData[i]} onChange={(e) => { const newFroze = [...frozeData]; newFroze[i] = e.target.checked; setFrozeData(newFroze); parseAll(); }} style={{ width: 'auto', margin: 0 }} />
                      </div>
                    </div>
                  </div>
                  <textarea value={rawData[i]} onChange={(e) => { const newRaw = [...rawData]; newRaw[i] = e.target.value; setRawData(newRaw); }} placeholder={`Collez les données horaires pour le jour ${i + 1} ici...`} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={parseAll} style={{ marginTop: '15px' }}>⚡ Analyser Tout</button>
            <div style={{ marginTop: '15px', padding: '10px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>❄️</span>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0369a1' }}>
                  <input type="checkbox" checked={autoSnow} onChange={(e) => { setAutoSnow(e.target.checked); parseAll(); }} /> Déduire automatiquement la neige
                </label>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '25px' }}>
                Si coché, la pluie est convertie en neige si T° &lt;
                <input type="number" value={snowTempLimit} onChange={(e) => { setSnowTempLimit(parseFloat(e.target.value) || 0); parseAll(); }} step="0.5" style={{ width: '50px', padding: '2px', textAlign: 'center' }} /> °C
              </div>
            </div>
            <div id="status" style={{ marginTop: '10px', fontSize: '0.9rem', fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: status }} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="head-left" style={{ display: 'flex', alignItems: 'center' }}>
                <div className="step-num">2</div>
                <span className="panel-title">En-tête & Client</span>
              </div>
            </div>
            <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button className="btn btn-save" onClick={exportConfig}>💾 Sauvegarder (Fichier JSON)</button>
              <div style={{ position: 'relative' }}>
                <button className="btn btn-load" onClick={() => fileInputRef.current?.click()}>📂 Charger (Fichier JSON)</button>
                <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={importConfig} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <div className="logo-zone" onClick={() => document.getElementById('inL')?.click()}>
                  {logoL ? <img src={logoL} style={{ maxHeight: '80px' }} /> : '+ Logo Ent.'}
                  <input type="file" id="inL" hidden onChange={(e) => ldImg(e, setLogoL)} />
                </div>
                <textarea id="txEnt" value={txEnt} onChange={(e) => setTxEnt(e.target.value)} placeholder="Adresse Entreprise... (Saut de ligne supporté)" style={{ height: '60px', marginTop: '10px' }} />
              </div>
              <div>
                <div className="logo-zone" onClick={() => document.getElementById('inR')?.click()}>
                  {logoR ? <img src={logoR} style={{ maxHeight: '80px' }} /> : '+ Logo Cli.'}
                  <input type="file" id="inR" hidden onChange={(e) => ldImg(e, setLogoR)} />
                </div>
                <textarea id="txCli" value={txCli} onChange={(e) => setTxCli(e.target.value)} placeholder="Adresse Chantier... (Saut de ligne supporté)" style={{ height: '60px', marginTop: '10px' }} />
              </div>
            </div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text)', marginTop: '10px', display: 'block' }}>Email Client (pour envoi) :</label>
            <input type="email" value={emailCli} onChange={(e) => setEmailCli(e.target.value)} placeholder="client@chantier.com" />
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text)', marginTop: '10px', display: 'block' }}>🌡️ Poste météo de référence :</label>
            <input type="text" value={stationMeteo} onChange={(e) => setStationMeteo(e.target.value)} placeholder="Ex: Station Météo-France Valenciennes" />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="head-left" style={{ display: 'flex', alignItems: 'center' }}>
                <div className="step-num">3</div>
                <span className="panel-title">Règles & Conditions</span>
              </div>
              <button className="btn-config" onClick={() => setTradesModalOpen(true)}>⚙️ Gérer les Métiers du Chantier</button>
            </div>
            <button className="btn btn-add-main" onClick={() => addRule()}>➕ AJOUTER UNE RÈGLE</button>

            <div className="options-bar">
              <label>
                <input type="checkbox" checked={displaySimple} onChange={(e) => setDisplaySimple(e.target.checked)} />
                <span className="option-label">👁️ Mode Simplifié</span>
              </label>
              <div style={{ width: '1px', height: '20px', background: '#fed7aa' }}></div>
              <label>
                <input type="checkbox" checked={showCharts} onChange={(e) => setShowCharts(e.target.checked)} />
                <span className="option-label" style={{ color: '#2563eb' }}>📊 Graphiques</span>
              </label>
              <div style={{ width: '1px', height: '20px', background: '#fed7aa' }}></div>
              <button className="btn-config" style={{ background: 'white', border: '1px solid #fed7aa', color: '#c2410c' }} onClick={() => setColsModalOpen(true)}>👁️ Colonnes PDF</button>
            </div>

            <div className="separator">OU raccourcis</div>
            <div className="quick-actions">
              <div className="btn-quick" onClick={() => addRule('temp')}><span>❄️</span>Gel</div>
              <div className="btn-quick" onClick={() => addRule('vent_rafale')}><span>💨</span>Rafales</div>
              <div className="btn-quick" onClick={() => addRule('vent_avg')}><span>🍃</span>V. Moy.</div>
              <div className="btn-quick" onClick={() => addRule('pluie')}><span>☔</span>Pluie</div>
              <div className="btn-quick" onClick={() => addRule('neige')}><span>⛄</span>Neige</div>
              <div className="btn-quick" onClick={() => addRule('soil')}><span>💧</span>Sol</div>
              <div className="btn-quick" onClick={() => addRule('heat')}><span>☀️</span>T° Élevée</div>
              <div className="btn-quick" onClick={() => addRule('canicule')}><span>🔥</span>Canicule</div>
            </div>
            <div id="ruleList" className="rules-list">
              {rules.map((r, i) => {
                let color = '#cbd5e1';
                if (r.var == 'temp' || r.var == 'heat') color = '#3b82f6';
                if (r.var == 'canicule') color = '#f97316';
                if (r.var == 'pluie' || r.var == 'soil') color = '#06b6d4';
                if (r.var.includes('vent')) color = '#64748b';
                let cTitle = "Condition 1 : Toute la journée";
                if (r.type == 'cond2') cTitle = "Condition 2 : Plage horaire";
                if (r.type == 'cond3') cTitle = "Condition 3 : Consécutif";
                if (r.type == 'cond4') cTitle = "Condition 4 : Heure fixe";
                if (r.type == 'cond5') cTitle = "Condition 5 : Avancée";
                if (r.type == 'cond6') cTitle = "Condition 6 : Cumul Glissant";
                if (r.var == 'canicule') cTitle = "Déclaration Manuelle";
                let vName = r.var;
                if (r.var == 'vent_rafale') vName = 'Rafale';
                if (r.var == 'vent_avg') vName = 'Vent Moy';
                if (r.var == 'soil') vName = 'Hum. Sol';
                if (r.var == 'humi_max') vName = 'Humidité Air Max';
                if (r.var == 'heat') vName = 'Fortes Chaleurs';
                if (r.var == 'canicule') vName = 'Canicule';
                let summ = `${vName} ${r.op} ${r.val}`;
                if (r.var == 'canicule') summ = "Canicule (Déclarée)";
                const activeCount = r.lots ? r.lots.filter((t: string) => activeTrades.includes(t)).length : 0;
                const isOpen = i === openRuleIdx;

                return (
                  <div key={i} className="rule-card" style={{ borderLeftColor: color }}>
                    <div className="rule-header" onClick={() => setOpenRuleIdx(isOpen ? -1 : i)}>
                      <div>
                        <div className="rule-title">{summ} ({activeCount} métiers concernés)</div>
                        <div className="rule-summary">{cTitle}</div>
                      </div>
                      <div style={{ fontSize: '1.2rem', color: '#ccc' }}>✏️</div>
                    </div>
                    <div className={`rule-body ${isOpen ? 'open' : ''}`}>
                      <div className="form-grid cols-2">
                        <div className="form-group">
                          <label>Métiers</label>
                          <button className="btn-select-trades" onClick={() => { setCurrentRuleIndex(i); setRuleTradesModalOpen(true); }}>
                            <span>Sélectionner...</span>
                            <span className="badge-count">{activeCount}</span>
                          </button>
                        </div>
                        <div className="form-group">
                          <label>Paramètre</label>
                          <select value={r.var} onChange={(e) => uR(i, 'var', e.target.value)}>
                            <option value="temp">Température</option>
                            <option value="heat">Fortes Chaleurs</option>
                            <option value="canicule">Canicule (Déclarée)</option>
                            <option value="vent_rafale">Vent Rafale</option>
                            <option value="vent_avg">Vent Moyen</option>
                            <option value="pluie">Pluie</option>
                            <option value="neige">Neige</option>
                            <option value="soil">Humidité Sol</option>
                            <option value="humi_max">Humidité Air</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Condition</label>
                        <select value={r.type} onChange={(e) => uR(i, 'type', e.target.value)} style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                          <option value="cond1">Condition 1 : Toute la journée</option>
                          <option value="cond2">Condition 2 : Plage horaire</option>
                          <option value="cond3">Condition 3 : Consécutif</option>
                          <option value="cond4">Condition 4 : Heure fixe</option>
                          <option value="cond5">Condition 5 : Avancée (ET/OU)</option>
                          <option value="cond6">Condition 6 : Cumul Glissant</option>
                        </select>
                      </div>
                      <div className="form-grid cols-3">
                        {r.var === 'canicule' ? (
                          <div style={{ gridColumn: 'span 3', color: '#f97316', fontSize: '0.8rem', padding: '5px', background: '#fff7ed', borderRadius: '4px' }}>
                            Règle basée sur la case "Canicule Déclarée" dans les Données.
                          </div>
                        ) : (
                          <>
                            <div className="form-group">
                              <label>Op</label>
                              <select value={r.op} onChange={(e) => uR(i, 'op', e.target.value)}>
                                <option value="<">&lt;</option>
                                <option value="<=">&le;</option>
                                <option value=">">&gt;</option>
                                <option value=">=">&ge;</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Seuil</label>
                              <input value={r.val} onChange={(e) => uR(i, 'val', e.target.value)} />
                            </div>
                            {r.type === 'cond2' && (
                              <>
                                <div className="form-group">
                                  <label>H1</label>
                                  <input type="number" value={r.h1} onChange={(e) => uR(i, 'h1', e.target.value)} />
                                </div>
                                <div className="form-group">
                                  <label>H2</label>
                                  <input type="number" value={r.h2} onChange={(e) => uR(i, 'h2', e.target.value)} />
                                </div>
                              </>
                            )}
                            {r.type === 'cond3' && (
                              <>
                                <div className="form-group">
                                  <label>Durée</label>
                                  <input type="number" value={r.dur} onChange={(e) => uR(i, 'dur', e.target.value)} />
                                </div>
                                <div className="form-group">
                                  <label>H1</label>
                                  <input type="number" value={r.h1} onChange={(e) => uR(i, 'h1', e.target.value)} />
                                </div>
                                <div className="form-group">
                                  <label>H2</label>
                                  <input type="number" value={r.h2} onChange={(e) => uR(i, 'h2', e.target.value)} />
                                </div>
                              </>
                            )}
                            {r.type === 'cond4' && (
                              <div className="form-group">
                                <label>Heure</label>
                                <input type="number" value={r.h1} onChange={(e) => uR(i, 'h1', e.target.value)} />
                              </div>
                            )}
                            {r.type === 'cond5' && (
                              <>
                                <div className="form-group">
                                  <label>Logique</label>
                                  <select value={r.logic || 'AND'} onChange={(e) => uR(i, 'logic', e.target.value)}>
                                    <option value="AND">ET (Les 2)</option>
                                    <option value="OR">OU (L'un des 2)</option>
                                  </select>
                                </div>
                                <div className="form-group">
                                  <label>Heure 1</label>
                                  <input type="number" value={r.h1} onChange={(e) => uR(i, 'h1', e.target.value)} />
                                </div>
                                <div className="form-group">
                                  <label>Val 2</label>
                                  <input value={r.val2 || ''} onChange={(e) => uR(i, 'val2', e.target.value)} placeholder="Val 2" />
                                </div>
                                <div className="form-group">
                                  <label>Heure 2</label>
                                  <input type="number" value={r.h3 || ''} onChange={(e) => uR(i, 'h3', e.target.value)} />
                                </div>
                              </>
                            )}
                            {r.type === 'cond6' && (
                              <div className="form-group">
                                <label>Durée Glissante (h)</label>
                                <input type="number" value={r.dur} onChange={(e) => uR(i, 'dur', e.target.value)} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <button className="btn-del" onClick={() => delRule(i)}>Supprimer cette règle</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <label className="print-option">
            <input type="checkbox" checked={checkPeriod} onChange={(e) => setCheckPeriod(e.target.checked)} />
            📄 Ajouter une page de Synthèse Globale (Période)
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <button className="btn btn-print" onClick={() => window.print()}>🖨️ PDF / IMPRIMER</button>
            <button className="btn btn-word" onClick={exportWord}>📄 WORD (.doc)</button>
            <div>
              <button className="btn btn-mail" onClick={sendMail}>📧 ENVOYER MAIL</button>
              <button className="btn btn-copy" style={{ fontSize: '0.7rem', padding: '5px', marginTop: '5px', width: '100%', cursor: 'pointer' }} onClick={copyMailBody}>📋 Copier Texte</button>
            </div>
          </div>
        </div>

        <div className="preview" id="previewPanel">
          <div className="tabs" style={{ marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
            <div className={`tab ${activeOutTab === 'out-report' ? 'active' : ''}`} onClick={() => setActiveOutTab('out-report')}>📄 Rapport Écrit</div>
            <div className={`tab ${activeOutTab === 'out-charts' ? 'active' : ''}`} onClick={() => setActiveOutTab('out-charts')}>📊 Graphiques (Vue Écran)</div>
          </div>

          <div id="out-report" className="tab-content" style={{ display: activeOutTab === 'out-report' ? 'block' : 'none' }}>
            <div id="reportOutput" dangerouslySetInnerHTML={{ __html: reportOutput }} />
          </div>

          <div id="out-charts" className="tab-content" style={{ display: activeOutTab === 'out-charts' ? 'block' : 'none' }}>
            <div id="chartsOutput" dangerouslySetInnerHTML={{ __html: chartsOutput }} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
