// Vérification des archives foudre Agate
const dates = [
    '20260208', '20260207', '20260206', '20260205',
    '20260204', '20260203', '20260202', '20260201'
];

console.log('📅 Vérification des archives foudre Agate...\n');

let total = 0;

for (const d of dates) {
    const url = `https://www.agate-ge.fr/ORAGE/orage/ws/wsOragesGMaps.php?date=${d}&heureD=00&heureF=23&pass=jh2kH3,R`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : 0;
        total += count;
        const dateStr = `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
        console.log(`${dateStr}: ${count.toString().padStart(5)} impacts ${count > 0 ? '✅' : '⚫'}`);
    } catch (e) {
        console.log(`${d}: ERREUR - ${e.message}`);
    }
}

console.log(`\n📊 TOTAL: ${total} impacts sur ${dates.length} jours`);
