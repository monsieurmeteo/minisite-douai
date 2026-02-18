async function testArch(dateStr) {
    const agateUrl = `https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${dateStr}&heureD=00&heureF=23&pass=jh2kH3,R`;
    console.log(`Testing ${dateStr}...`);
    try {
        const res = await fetch(agateUrl);
        const data = await res.json();
        console.log(`Found ${data.length} strikes for ${dateStr}`);
        if (data.length > 0) console.log("Sample:", data[0]);
    } catch (e) {
        console.error("Failed", e.message);
    }
}

// Test some random dates from 2024 and 2023
async function run() {
    await testArch('20240721'); // Summer 2024 (should be active)
    await testArch('20230615'); // Summer 2023
}
run();
