async function testArch(dateStr) {
    const agateUrl = `https://www.mwattest.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${dateStr}&heureD=00&heureF=23&pass=jh2kH3,R`;
    try {
        const res = await fetch(agateUrl);
        const data = await res.json();
        console.log(`${dateStr}: ${data.length} impacts found.`);
        return data.length;
    } catch (e) {
        console.log(`${dateStr}: Failed - ${e.message}`);
        return 0;
    }
}

async function run() {
    console.log("Probing Agate History...");
    await testArch('20220101');
    await testArch('20200101');
    await testArch('20180101');
    await testArch('20150101');
    await testArch('20100101');
}
run();
