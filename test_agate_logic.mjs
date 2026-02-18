import fetch from 'node-fetch';

const testAgate = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const ds = today.replace(/-/g, '');
        // Note: Using a public proxy or dummy URL since we can't access local proxy from here directly without full server context
        // But let's try to construct a fetch that mimics what the browser sees if we were running it there? 
        // Actually, we can't hit the vite proxy from node script unless the server is running on localhost:5173 and we hit that.

        console.log(`Testing fetching for date: ${ds}`);

        // We will try to hit the direct PHP script if possible or just log what URL we would use
        // Since we are in Node, we probably can't hit the relative path '/api-agate/...' 
        // We need to check if we can reach the source or if the issue is in the data itself.

        // LET'S SIMULATE THE DATA PROCESSING LOGIC
        // Hypothetical payload:
        const dummyPayload = [
            { lat: "48.85", lon: "2.35", date: "2024/02/03", heure: "12:00:00" },
            { lat: "45.75", lon: "4.85", date: "2024/02/03", heure: "14:30:00" }
        ];

        console.log("Simulating processing of:", dummyPayload);
        const processed = dummyPayload.map(s => {
            const isoDate = (s.date || '').replace(/\//g, '-');
            const d = new Date(`${isoDate}T${s.heure}+01:00`);
            return {
                lat: parseFloat(s.lat), lon: parseFloat(s.lon),
                time: d.getTime(),
                h: d.getHours(),
                valid: !isNaN(d.getTime())
            };
        });
        console.log("Processed:", processed);

    } catch (e) {
        console.error("Error:", e);
    }
};

testAgate();
