import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

// URL RELATIVE pour passer par le Proxy Vite (contourne CORS)
const MF_BASE_URL = '/api-meteo';

// Client Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export const weatherAPI = {
    /**
     * Get 6-minute observations for a specific station from Supabase (History)
     */
    getStation6mnHistory: async (stationId, dateObj = null) => {
        if (!supabase) return [];
        try {
            let query = supabase
                .from('observations_6mn')
                .select('*')
                .eq('station_id', stationId);

            if (dateObj) {
                const start = new Date(dateObj);
                start.setHours(0, 0, 0, 0);
                const end = new Date(dateObj);
                end.setHours(23, 59, 59, 999);

                query = query
                    .gte('timestamp', start.toISOString())
                    .lte('timestamp', end.toISOString())
                    .limit(500);
            } else {
                query = query.limit(300);
            }

            const { data, error } = await query.order('timestamp', { ascending: false });
            if (error) throw error;

            let finalData = data || [];

            // FALLBACK ARCHIVES
            if (dateObj && finalData.length === 0) {
                try {
                    const y = dateObj.getFullYear();
                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const d = String(dateObj.getDate()).padStart(2, '0');
                    const filePath = `6mn/${y}/${m}/${d}.json`;

                    const { data: storageData, error: storageError } = await supabase.storage
                        .from('observations-archives')
                        .download(filePath);

                    if (!storageError && storageData) {
                        const text = await storageData.text();
                        const json = JSON.parse(text);
                        finalData = json.filter(obs => obs.station_id === stationId);
                        finalData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    }
                } catch (err) {
                    console.warn("[API] Archive fallback failed:", err);
                }
            }

            return finalData.map(obs => ({
                time: new Date(obs.timestamp),
                temp: obs.t,
                hum: obs.u,
                rain: obs.rr_per,
                rain_1h: obs.rr1,
                rain_3h: obs.rr3,
                rain_6h: obs.rr6,
                rain_12h: obs.rr12,
                rain_24h: obs.rr24,
                sun: obs.insolh,
                wind: obs.ff,
                gust: obs.fxi,
                dir: obs.dd,
                dewpoint: obs.td,
                pressure: obs.pres,
                vv: obs.vv
            })).reverse();
        } catch (e) {
            console.error("[API] getStation6mnHistory error:", e);
            return [];
        }
    },

    /**
     * Get hourly observations for a specific station from Supabase (History)
     */
    getStationHourlyHistory: async (stationId, dateObj = null) => {
        if (!supabase) return [];
        try {
            let query = supabase
                .from('observations_horaire')
                .select('*')
                .eq('station_id', stationId);

            if (dateObj) {
                const start = new Date(dateObj);
                start.setHours(0, 0, 0, 0);
                const end = new Date(dateObj);
                end.setHours(23, 59, 59, 999);

                query = query
                    .gte('timestamp', start.toISOString())
                    .lte('timestamp', end.toISOString());
            } else {
                // Default: last 7 days for historical context
                query = query.gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
            }

            const { data, error } = await query.order('timestamp', { ascending: false });

            if (error) throw error;
            return data.map(obs => ({
                time: new Date(obs.timestamp),
                temp: obs.t,
                hum: obs.u,
                rain: obs.rr1,
                wind: obs.ff,
                gust: obs.fxi,
                timestamp_raw: obs.timestamp,
                vv: obs.vv
            })).reverse();
        } catch (e) {
            console.error("[API] getStationHourlyHistory error:", e);
            return [];
        }
    },

    /**
     * Get hourly observations for a range of dates
     */
    getStationHourlyHistoryRange: async (stationId, startDate, endDate) => {
        if (!supabase) return [];
        try {
            // Broaden search window to account for Timezones (UTC vs Local)
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0); // Local start
            // Go back 2h to catch UTC late night previous day if needed (though data is usually UTC)
            // Actually, Supabase stores UTC. If input is '2023-01-01', new Date('2023-01-01') is local 00:00.
            // If local is GMT+1, that is '2022-12-31T23:00:00Z'.
            // To be safe, just take the full days.

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const { data, error } = await supabase
                .from('observations_horaire')
                .select('*')
                .eq('station_id', stationId)
                .gte('timestamp', start.toISOString())
                .lte('timestamp', end.toISOString())
                .order('timestamp', { ascending: true }); // Chronological order directly

            if (error) throw error;
            return data.map(obs => ({
                time: new Date(obs.timestamp),
                temp: obs.t,
                hum: obs.u,
                rain: obs.rr1,
                wind: obs.ff,
                gust: obs.fxi,
                timestamp_raw: obs.timestamp,
                vv: obs.vv
            }));
        } catch (e) {
            console.error("[API] getStationHourlyHistoryRange error:", e);
            return [];
        }
    },

    /**
     * Get latest HOURLY observations for a whole department
     * Faster for mapping huge areas
     */
    getDepartmentLatestHoraire: async (deptCode) => {
        if (!supabase) return [];
        try {
            // Special handling for Corsica (2A/2B -> 20)
            let searchCode = deptCode;
            if (deptCode === '2A' || deptCode === '2B') {
                searchCode = '20';
            }


            const { data, error } = await supabase
                .from('observations_horaire')
                .select('*')
                .like('station_id', `${searchCode}%`)
                // Pour récupérer les dernières données, on peut filtrer par date récente
                // PLUTÔT que order/limit qui peut rater des stations si une est très bavarde
                .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .order('timestamp', { ascending: false });

            if (error) throw error;

            // Group by station keeping only the very latest record
            const uniqueStations = {};
            data.forEach(obs => {
                // If we already have this station, check if this record is newer
                if (!uniqueStations[obs.station_id]) {
                    uniqueStations[obs.station_id] = obs;
                }
            });

            return Object.values(uniqueStations).map(obs => ({
                station_id: obs.station_id,
                latest: obs,
                history: [obs] // Map expects history array
            }));
        } catch (e) {
            console.error("[API] getDepartmentLatestHoraire error:", e);
            return [];
        }
    },

    /**
     * Get latest 6mn observations (Legacy / Detail view)
     */
    getDepartmentLatest: async (deptCode) => {
        if (!supabase) return [];
        try {
            let searchCode = deptCode;
            if (deptCode === '2A' || deptCode === '2B') {
                searchCode = '20';
            }

            // World mapping
            const worldMap = { 'M1': '0006', 'M2': '0001', 'M3': '0004', 'M5': '0002', 'M6': '0005', 'M7': '0007' };
            if (worldMap[deptCode]) searchCode = worldMap[deptCode];

            const { data, error } = await supabase
                .from('stations')
                .select('id, name')
                .like('id', `${searchCode}%`)
                .order('name', { ascending: true });

            if (error) throw error;

            return data.map(station => ({
                station_id: station.id,
                name: station.name,
                latest: null, // latest observation not strictly needed for the dropdown
                history: []
            }));
        } catch (e) {
            console.error("[API] getDepartmentLatest error:", e);
            return [];
        }
    },


    /**
     * Search communes (official Gouv API)
     */
    searchCity: async (query) => {
        try {
            const response = await fetch(
                `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&limit=8&fields=nom,code,codesPostaux,centre,codeDepartement&boost=population`
            );
            if (!response.ok) return [];
            const data = await response.json();
            return data.map(c => ({
                id: c.code,
                name: c.nom,
                lat: c.centre.coordinates[1],
                lon: c.centre.coordinates[0],
                dept: c.codeDepartement,
                postcodes: c.codesPostaux
            }));
        } catch (error) {
            console.error("[API] searchCity error:", error);
            return [];
        }
    }
};

