
const token = 'eyJ4NXQiOiJZV0kxTTJZNE1qWTNOemsyTkRZeU5XTTRPV014TXpjek1UVmhNbU14T1RSa09ETXlOVEE0Tnc9PSIsImtpZCI6ImdhdGV3YXlfY2VydGlmaWNhdGVfYWxpYXMiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJHcmVnNTk4ODBAY2FyYm9uLnN1cGVyIiwiYXBwbGljYXRpb24iOnsib3duZXIiOiJHcmVnNTk4ODAiLCJ0aWVyUXVvdGFUeXBlIjpudWxsLCJ0aWVyIjoiVW5saW1pdGVkIiwibmFtZSI6IkRlZmF1bHRBcHBsaWNhdGlvbiIsImlkIjoyMzg0MCwidXVpZCI6IjA3YTRhZjk0LWE4MzktNDllZC05MjJlLTAyZDMyMTM1ZjVlZSJ9LCJpc3MiOiJodHRwczpcL1wvcG9ydGFpbC1hcGkubWV0ZW9mcmFuY2UuZnI6NDQzXC9vYXV0aDJcL3Rva2VuIiwidGllckluZm8iOnsiNTBQZXJNaW4iOnsidGllclF1b3RhVHlwZSI6InJlcXVlc3RDb3VudCIsImdyYXBoUUxNYXhDb21wbGV4aXR5IjowLCJncmFwaFFMTWF4RGVwdGgiOjAsInN0b3BPblF1b3RhUmVhY2giOnRydWUsInNwaWtlQXJyZXN0TGltaXQiOjAsInNwaWtlQXJyZXN0VW5pdCI6InNlYyJ9LCI2MFJlcVBhck1pbiI6eyJ0aWVyUXVvdGFUeXBlIjoicmVxdWVzdENvdW50IiwiZ3JhcGhRTE1heENvbXBsZXhpdHkiOjAsImdyYXBoUUxNYXhEZXB0aCI6MCwic3RvcE9uUXVvdGFSZWFjaCI6dHJ1ZSwic3Bpa2VBcnJlc3RMaW1pdCI6MCwic3Bpa2VBcnJlc3RVbml0Ijoic2VjIn19LCJrZXl0eXBlIjoiUFJPRFVDVElPTiIsInN1YnNjcmliZWRBUElzIjpbeyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNWaWdpbGFuY2UiLCJjb250ZXh0IjoiXC9wdWJsaWNcL0RQVmlnaWxhbmNlXC92MSIsInB1Ymxpc2hlciI6ImFkbWluIiwidmVyc2lvbiI6InYxIiwic3Vic2NyaXB0aW9uVGllciI6IjYwUmVxUGFyTWluIn0seyJzdWJzY3JpYmVyVGVuYW50RG9tYWluIjoiY2FyYm9uLnN1cGVyIiwibmFtZSI6IkRvbm5lZXNQdWJsaXF1ZXNPYnNlcnZhdGlvbiIsImNvbnRleHQiOiJcL3B1YmxpY1wvRFBPYnNcL3YxIiwicHVibGlzaGVyIjoiYmFzdGllbmciLCJ2ZXJzaW9uIjoidjEiLCJzdWJzY3JpcHRpb25UaWVyIjoiNTBQZXJNaW4ifSx7InN1YnNjcmliZXJUZW5hbnREb21haW4iOiJjYXJib24uc3VwZXIiLCJuYmVuYW1lIjoiRG9ubmVlc1B1YmxpcXVlc1BhcXVldE9ic2VydmF0aW9uIiwiY29udGV4dCI6IlwvcHVibGljXC9EUFBhcXVldE9ic1wvdjEiLCJwdWJsaXNoZXIiOiJiYXN0aWVuZyIsInZlcnNpb24iOiJ2MSIsInN1YnNjcmlwdGlvblRpZXIiOiI1MFBlck1pbiJ9XSwiZXhwIjoxNzk1MDYwMDIzLCJ0b2tlbl90eXBlIjoiYXBpS2V5IiwiaWF0IjoxNzY4NzYyMDIzLCJqdGkiOiJiMTNmNjBiNS0wMDQyLTQyYTItYjFiMy00ZjQyMDA3YmMzY2QifQ==.TaiiHqCk1yXeOeYIKiaWK2rPxbd9Mru8Kv-U_H5K7kXHfwhjDY045cJAr-aYo1blFsaTz0WySGe58NuhlKNDSTZNMijbmQVOa2O9mWETWDTQMt9ZIppvpT_hQYUYLr2jZsiamA4y05h5Igl-XD2K3NxoXhAcCeUrKcvpDXW0OPY4CFNVbyvt1a3I7HoOS09YjPn2CQWGeOOQXA7G_Xa6Me37VnZ7OXITQnKMxHld9rxfMeuvtsJG_FbutFWYRm2QpWtvtEn-AxTHeKv7qyrEer0o-si0mJhYqhYZ5mDlwSN73uqbw1Gj-eiusBfHmhpvDPQZp9prwQ2z6qcB7gREfg==';

async function testWorkingPaquet() {
    const testDate = '2026-01-18T18:42:00Z';
    const baseUrl = 'https://public-api.meteofrance.fr/public/DPPaquetObs/v1';
    const url = `${baseUrl}/paquet/stations/infrahoraire-6m?date=${testDate}&format=json`;

    console.log(`Testing REAL token on Paquet: ${url}`);
    try {
        const res = await fetch(url, {
            headers: { 'accept': 'application/json', 'apikey': token }
        });
        console.log("Status:", res.status);
        if (res.status === 200) {
            const data = await res.json();
            console.log("SUCCESS! Found", Array.isArray(data) ? data.length : "object", "stations.");
        } else {
            console.log("Error body:", await res.text());
        }
    } catch (e) {
        console.log("Error:", e.message);
    }
}

testWorkingPaquet();
