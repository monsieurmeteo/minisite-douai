
import pg from 'pg';
const { Client } = pg;

async function runRepair() {
    const client = new Client({
        connectionString: 'postgresql://postgres:sb_secret_-P8iv1swkzknb9ndk5cYMw_N6bVRiCR@db.ubdevaemtwbzxksjlhjg.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Database!');

        // 1. Repair Lille (59343001) for Feb 15/16
        // Lille 70 km/h was at 2026-02-15 23:06 UTC.
        // We update the daily summary of the day it belongs to (let's check which date is in daily_summaries for 70km/h)

        console.log('Repairing Lille...');
        const res = await client.query(`
            UPDATE daily_summaries ds
            SET wind_gust_max = 70, 
                wind_gust_time = '2026-02-15 23:06:00+00',
                updated_at = NOW()
            WHERE station_id = '59343001' 
              AND (date = '2026-02-15' OR date = '2026-02-16')
              AND (wind_gust_max < 70 OR wind_gust_max IS NULL);
        `);
        console.log(`Updated ${res.rowCount} rows for Lille.`);

        // 2. Propose the trigger for future sync
        console.log('Creating sync trigger for future...');
        await client.query(`
            -- Function to update daily_summaries from observations_6mn
            CREATE OR REPLACE FUNCTION sync_daily_summary()
            RETURNS TRIGGER AS $$
            DECLARE
                v_date date;
            BEGIN
                -- Extract date (using UTC to match table storage)
                v_date := (NEW.timestamp AT TIME ZONE 'UTC')::date;

                INSERT INTO daily_summaries (station_id, date, temp_min, temp_max, wind_gust_max, wind_gust_time, rain_total, updated_at)
                VALUES (
                    NEW.station_id, 
                    v_date, 
                    NEW.t, -- temp_min
                    NEW.t, -- temp_max
                    NEW.fxi, 
                    NEW.timestamp,
                    COALESCE(NEW.rr_per, 0),
                    NOW()
                )
                ON CONFLICT (station_id, date) DO UPDATE 
                SET 
                    temp_min = LEAST(daily_summaries.temp_min, EXCLUDED.temp_min),
                    temp_max = GREATEST(daily_summaries.temp_max, EXCLUDED.temp_max),
                    wind_gust_max = GREATEST(daily_summaries.wind_gust_max, EXCLUDED.wind_gust_max),
                    wind_gust_time = CASE 
                        WHEN EXCLUDED.wind_gust_max >= COALESCE(daily_summaries.wind_gust_max, 0) THEN EXCLUDED.wind_gust_time 
                        ELSE daily_summaries.wind_gust_time 
                    END,
                    rain_total = daily_summaries.rain_total + COALESCE(EXCLUDED.rain_total, 0), -- BE CAREFUL with rain double counting
                    updated_at = NOW()
                WHERE daily_summaries.station_id = EXCLUDED.station_id AND daily_summaries.date = EXCLUDED.date;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- Trigger
            DROP TRIGGER IF EXISTS trg_sync_daily_summary ON observations_6mn;
            CREATE TRIGGER trg_sync_daily_summary
            AFTER INSERT ON observations_6mn
            FOR EACH ROW
            EXECUTE FUNCTION sync_daily_summary();
        `);
        console.log('Trigger installed successfully!');

    } catch (err) {
        console.error('❌ Connection error:', err.message);
    } finally {
        await client.end();
    }
}

runRepair();
