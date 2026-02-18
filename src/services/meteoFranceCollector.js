/**
 * Collecteur de données Météo France en temps réel
 * Récupère les 2000+ stations toutes les 6 minutes
 * Utilise un token manuel (OAuth ne fonctionne pas dans le navigateur à cause de CORS)
 */

// Utilisation du Proxy pour contourner CORS
const API_BASE = '/api-meteo-paquet';
// Note: On va ajouter une règle spécifique dans netlify.toml pour celui-là car c'est DPPaquetObs

// Import Supabase pour l'archivage automatique depuis le navigateur
import { supabase } from './supabaseClient';

class MeteoFranceCollector {
    constructor() {
        this.isCollecting = false;
        this.collectionInterval = null;
        this.latestData = null; // Tableau des dernières observations (pour la carte)
        this.stationsHistory = new Map(); // Map de stationId -> Array d'observations (pour les détails)
        this.maxHistorySize = 25;

        const token = import.meta.env.VITE_METEO_MANUAL_TOKEN;
        if (!token) {
            console.error('[MeteoCollector] ❌ Token manquant dans les variables d environneement (VITE_METEO_MANUAL_TOKEN)');
        } else {
            console.log('[MeteoCollector] 🔑 Token détecté (début):', token.substring(0, 10));
        }

        // Charger l'historique au démarrage si possible
        this.loadHistoryFromStorage();
    }

    /**
     * Obtenir un token valide (token manuel)
     */
    async getValidToken() {
        const token = import.meta.env.VITE_METEO_MANUAL_TOKEN;
        if (!token) {
            throw new Error('Token non trouvé. Vérifiez les variables d environnement sur Vercel : VITE_METEO_MANUAL_TOKEN');
        }
        return token;
    }

    /**
     * Obtenir les dernières données (compatible avec l'ancien format)
     */
    getLatestData() {
        return this.latestData || [];
    }

    /**
     * Obtenir l'historique pour une station spécifique
     */
    getStationHistory(stationId) {
        return this.stationsHistory.get(stationId) || [];
    }

    /**
     * Calculer le timestamp du dernier cycle de 6 minutes complété
     * Les données ont un délai de ~20-24 minutes, donc on utilise -24 min
     */
    getLatestCycleTime() {
        const now = new Date();
        const minutes = now.getUTCMinutes();

        // Arrondir aux 6 minutes inférieures
        const roundedMinutes = Math.floor(minutes / 6) * 6;

        // Créer la date arrondie
        const cycleTime = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            roundedMinutes,
            0,
            0
        ));

        // Soustraire 24 minutes pour être sûr que les données sont disponibles
        // (délai de publication de l'API)
        cycleTime.setMinutes(cycleTime.getMinutes() - 24);

        // Format sans millisecondes : AAAA-MM-JJThh:mm:00Z
        return cycleTime.toISOString().split('.')[0] + 'Z';
    }

    /**
     * Collecter les données de toutes les stations
     */
    async collectAllStations() {
        try {
            const token = await this.getValidToken();
            const cycleTime = this.getLatestCycleTime();

            const url = `${API_BASE}/paquet/stations/infrahoraire-6m?date=${cycleTime}&format=json`;

            console.log(`[MeteoCollector] Collecte des données pour ${cycleTime}...`);

            console.log("[MeteoCollector] Token utilisé (début):", token.substring(0, 10));
            const response = await fetch(url, {
                headers: {
                    'apikey': token,
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const stations = await response.json();

            // Enrichir les données avec timestamp de collecte
            const enrichedStations = stations.map(station => ({
                ...station,
                // Conversion Kelvin -> Celsius
                temp_celsius: station.t ? Math.round((station.t - 273.15) * 10) / 10 : null,
                dewpoint_celsius: station.td ? Math.round((station.td - 273.15) * 10) / 10 : null,
                // Conversion m/s -> km/h
                wind_kmh: station.ff ? Math.round(station.ff * 3.6 * 10) / 10 : null,
                gust_kmh: station.fxi10 ? Math.round(station.fxi10 * 3.6 * 10) / 10 : null,
                vv: station.vv ?? station.vis ?? station.visibility ?? null
            }));

            // DEBUG VISIBILITÉ
            const stationsAvecVisibilite = enrichedStations.filter(s => s.vv !== null);
            if (stationsAvecVisibilite.length > 0) {
                console.log(`[MeteoCollector] 👁️ Visibilité trouvée sur ${stationsAvecVisibilite.length} stations`);
                // Log spécifique pour Rennes (35281001)
                const rennes = stationsAvecVisibilite.find(s => s.geo_id_insee === '35281001' || s.id === '35281001');
                if (rennes) {
                    console.log(`[MeteoCollector] 🌫️ Rennes St Jacques: Visibilité = ${rennes.vv}m`);
                }
            } else {
                console.warn('[MeteoCollector] ⚠️ Aucune donnée de visibilité reçue ce cycle');
            }

            console.log(`[MeteoCollector] ✅ ${enrichedStations.length} stations collectées`);

            return enrichedStations;

        } catch (error) {
            console.error('[MeteoCollector] Erreur de collecte:', error);
            throw error;
        }
    }

    /**
     * Démarrer la collecte automatique
     */
    startAutoCollection() {
        if (this.isCollecting) {
            console.log('[MeteoCollector] Collecte déjà en cours');
            // Si données déjà présentes, renvoyer true pour dire "c'est bon"
            return this.latestData !== null;
        }

        console.log('[MeteoCollector] 🚀 Démarrage de la collecte automatique (6 min)');
        this.isCollecting = true;

        // Première collecte immédiate
        this.runCollectionCycle();

        // Puis toutes les 6 minutes
        this.collectionInterval = setInterval(() => {
            this.runCollectionCycle();
        }, 6 * 60 * 1000);
    }

    /**
     * Cycle de collecte unique
     */
    async runCollectionCycle() {
        try {
            const data = await this.collectAllStations();
            if (data && data.length > 0) {
                // IMPORTANT: On force save=true pour déclencher l'archivage Supabase
                this.processNewData(data, true);
            }
        } catch (error) {
            console.error('[MeteoCollector] Erreur cycle:', error);
        }
    }

    /**
     * Traiter les nouvelles données et mettre à jour l'historique
     */
    processNewData(newData, save = true) {
        this.latestData = newData;
        const now = new Date();
        this.lastCollectedAt = now.toISOString();

        // Mettre à jour l'historique pour chaque station
        newData.forEach(obs => {
            const id = obs.geo_id_insee || obs.id;
            if (!id) return;

            if (!this.stationsHistory.has(id)) {
                this.stationsHistory.set(id, []);
            }

            const history = this.stationsHistory.get(id);

            // Ajouter la nouvelle observation
            // On ajoute un timestamp "reçu à" pour trier
            const entry = {
                ...obs,
                receivedAt: now.toISOString(),
                // S'assurer que les valeurs numériques sont bien des nombres
                t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null, // Convertir en Celsius et arrondir
                u: obs.u,
                ff: obs.ff ? Math.round(obs.ff * 3.6) : null, // km/h (arrondi entier pour le vent)
                td: obs.td ? Math.round((obs.td - 273.15) * 10) / 10 : null,
                min_t: obs.min_t ? Math.round((obs.min_t - 273.15) * 10) / 10 : null,
                max_t: obs.max_t ? Math.round((obs.max_t - 273.15) * 10) / 10 : null,
                gust_kmh: (obs.fxi || obs.fxi10) ? Math.round((obs.fxi || obs.fxi10) * 3.6) : null,
                rr_per: obs.rr_per !== undefined ? obs.rr_per : 0,
                vv: obs.vv
            };

            // Vérifier doublons
            const last = history[history.length - 1];
            let isDuplicate = false;

            if (last) {
                // 1. Si on a un validity_time (cas idéal), on compare
                if (obs.validity_time && last.validity_time === obs.validity_time) {
                    isDuplicate = true;
                }
                // 2. Sinon, détection heuristique (si données identiques et fetch < 5 min)
                else if (last.t === entry.t && last.u === entry.u && last.pres === entry.pres) {
                    const timeDiff = new Date(entry.receivedAt).getTime() - new Date(last.receivedAt).getTime();
                    // Si on reçoit la même donnée exacte moins de 5 min après, c'est surement un doublon de refresh
                    // MAIS attention : Météo France publie toutes les 6 minutes pile.
                    if (timeDiff < 5 * 60 * 1000) {
                        isDuplicate = true;
                    }
                }
            }

            if (!isDuplicate) {
                history.push(entry);
            }

            // Limiter la taille (garder les 50 derniers points)
            if (history.length > 50) {
                history.shift(); // Enlever le plus vieux
            }
        });

        // Sauvegarder (partiellement pour perf)
        if (save) {
            this.saveToLocalStorage();
            this.archiveToSupabase(newData);
        }
        console.log(`[MeteoCollector] ✅ Données traitées et historique mis à jour (${newData.length} stations)`);
    }

    /**
     * Tente d'archiver les données dans Supabase (Table observations_6mn)
     * VERSION BATCH optimisée et complète
     */
    async archiveToSupabase(data) {
        if (!data || data.length === 0) return;

        console.log(`[MeteoCollector] 💾 Préparation archivage chiffré pour ${data.length} stations...`);

        // Mapping complet (y compris rafales fxi et direction dd)
        const now = new Date();
        const allRows = data.map(obs => ({
            station_id: obs.geo_id_insee || obs.id, // ID Station
            timestamp: obs.validity_time || now.toISOString(), // Heure observation
            t: obs.t ? Math.round((obs.t - 273.15) * 10) / 10 : null,
            u: obs.u,
            ff: obs.ff ? Math.round(obs.ff * 3.6) : null,
            rr_per: obs.rr_per ?? 0,
            pres: obs.pres,
            fxi: (obs.fxi || obs.fxi10 || (obs.gust_kmh ? obs.gust_kmh / 3.6 : 0)) ? Math.round(((obs.fxi || obs.fxi10 || 0) * 3.6)) : null,
            dd: obs.dd,
            vv: obs.vv ?? obs.vis ?? obs.visibility ?? null
        }));

        // BATCHING: Découpage par paquets de 100 pour éviter le timeout/refus navigateur
        const BATCH_SIZE = 100;
        let totalSaved = 0;

        for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
            const batch = allRows.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;

            try {
                const { error } = await supabase
                    .from('observations_6mn')
                    .upsert(batch, { onConflict: 'station_id, timestamp', ignoreDuplicates: true });

                if (error) {
                    console.error(`❌ Erreur Lot ${batchNum} :`, error.message);
                } else {
                    totalSaved += batch.length;
                }
            } catch (e) {
                console.error(`❌ Crash Lot ${batchNum}`, e);
            }
        }

        if (totalSaved > 0) {
            console.log(`[MeteoCollector] ✅ SUCCÈS : ${totalSaved} / ${allRows.length} lignes archivées.`);
        }
    }

    /**
     * Arrêter la collecte automatique
     */
    stopAutoCollection() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
            this.isCollecting = false;
            console.log('[MeteoCollector] ⏸️ Collecte automatique arrêtée');
        }
    }

    /**
     * Sauvegarder les données dans le localStorage
     */
    saveToLocalStorage() {
        try {
            if (typeof window === 'undefined') return;
            // On ne sauvegarde que les dernières données pour éviter de saturer localStorage (max 5MB)
            localStorage.setItem('meteo_latest', JSON.stringify(this.latestData));
            // Pour l'historique, c'est trop gros pour localStorage.
            // On pourrait utiliser IndexedDB mais pour l'instant restons simple.
        } catch (e) {
            console.warn('Erreur sauvegarde localStorage', e);
        }
    }

    /**
     * Charger les données depuis le localStorage
     */
    loadHistoryFromStorage() {
        try {
            if (typeof window === 'undefined') return;

            const saved = localStorage.getItem('meteo_latest');
            if (saved) {
                this.latestData = JSON.parse(saved);
                console.log('[MeteoCollector] 📂 Données chargées depuis le cache');

                // IMPORTANT : Reconstruire l'historique (au moins le dernier point)
                // pour que le mode "Détail" de la liste fonctionne tout de suite sans rappeler l'API
                if (Array.isArray(this.latestData)) {
                    // On ne sauvegarde pas pour éviter une boucle, on remplit juste la Map
                    this.processNewData(this.latestData, false);
                }
            }
        } catch (e) {
            console.error('Erreur lecture localStorage', e);
        }
    }

    /**
     * Exporter les données en JSON (pour téléchargement)
     */
    exportToJSON() {
        const exportData = {
            exportedAt: new Date().toISOString(),
            latestData: this.latestData,
            history: this.dataHistory
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meteo-france-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('[MeteoCollector] 📥 Export JSON créé');
    }

    /**
     * Obtenir les statistiques globales
     */
    getStatistics() {
        if (!this.latestData) return null;

        const stations = this.latestData;
        const withTemp = stations.filter(s => s.temp_celsius !== null);
        const withWind = stations.filter(s => s.wind_kmh !== null);
        const withRain = stations.filter(s => s.rr_per !== null);

        const temps = withTemp.map(s => s.temp_celsius);

        return {
            totalStations: stations.length,
            stationsWithTemp: withTemp.length,
            stationsWithWind: withWind.length,
            stationsWithRain: withRain.length,
            temperature: {
                min: Math.min(...temps),
                max: Math.max(...temps),
                avg: temps.reduce((a, b) => a + b, 0) / temps.length
            },
            lastUpdate: this.lastCollectedAt,
            historySize: 0 // Plus de historique global, c'est par station
        };
    }
}

// Instance singleton
export const meteoCollector = new MeteoFranceCollector();

// Auto-démarrage au chargement
if (typeof window !== 'undefined') {
    meteoCollector.loadHistoryFromStorage();
    // Toujours démarrer la collecte pour activer la boucle de mise à jour (et l'archivage)
    // Le collecteur gère lui-même pour ne pas lancer deux intervalles.
    setTimeout(() => {
        meteoCollector.startAutoCollection();
    }, 1000);
}

export default meteoCollector;
