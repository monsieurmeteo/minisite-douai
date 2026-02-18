import https from 'https';

const url = 'https://www.mwattest.fr/ORAGE/images/foudre.jpg';

https.get(url, (res) => {
    console.log(`Image URL: ${url}`);
    console.log(`Status Code: ${res.statusCode}`);
});
