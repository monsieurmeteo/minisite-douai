async function checkGeoJSON() {
    const res = await fetch("https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson");
    const geo = await res.json();
    const finistere = geo.features.find(f => f.properties.code === '29');
    console.log("Finistere in GeoJSON:", finistere ? finistere.properties : "NOT FOUND");
}

checkGeoJSON();
