
// Native fetch used

async function checkIndex(path) {
    const url = `https://www.mwattest.fr${path}`;
    console.log(`Checking ${url}...`);
    try {
        const res = await fetch(url);
        if (res.ok) {
            const text = await res.text();
            console.log(`Response length: ${text.length}`);
            if (text.includes('Index of') || text.includes('Parent Directory')) {
                console.log("!!! DIRECTORY LISTING FOUND !!!");
                console.log(text.substring(0, 500));
            } else {
                console.log("Content is probably a normal page or empty:");
                console.log(text.substring(0, 200));
            }
        } else {
            console.log(`Status: ${res.status}`);
        }
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

async function run() {
    await checkIndex('/ORAGE/');
    await checkIndex('/ORAGE/images/');
    await checkIndex('/ORAGE/archives/');
}

run();
