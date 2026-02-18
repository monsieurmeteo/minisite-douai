import h5wasm from 'h5wasm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

async function analyze() {
    await h5wasm.ready;

    const dir = path.join(rootDir, 'tmp_radar');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.h5'));

    if (files.length === 0) { console.log('No H5 files found'); return; }

    const filePath = path.join(dir, files[0]);
    console.log('Analyzing:', files[0]);

    const f = new h5wasm.File(filePath, 'r');

    function listItems(group, prefix = '', depth = 0) {
        const keys = group.keys();
        for (const key of keys) {
            const item = group.get(key);
            const fullPath = prefix + '/' + key;
            const indent = '  '.repeat(depth);

            if (item.type === 'Group') {
                console.log(indent + 'GROUP: ' + fullPath);
                // List attributes
                try {
                    const attrKeys = item.attrs ? Object.keys(item.attrs) : [];
                    for (const aKey of attrKeys) {
                        try {
                            const val = item.attrs[aKey];
                            const valObj = val.value !== undefined ? val.value : val;
                            const valStr = typeof valObj === 'object' ? JSON.stringify(valObj).substring(0, 150) : String(valObj).substring(0, 150);
                            console.log(indent + '  ATTR: ' + aKey + ' = ' + valStr);
                        } catch (e) { console.log(indent + '  ATTR: ' + aKey + ' (error reading)'); }
                    }
                } catch (e) { }
                listItems(item, fullPath, depth + 1);
            } else if (item.type === 'Dataset') {
                console.log(indent + 'DATASET: ' + fullPath + ' shape=' + JSON.stringify(item.shape) + ' dtype=' + item.dtype);
                // List attributes
                try {
                    const attrKeys = item.attrs ? Object.keys(item.attrs) : [];
                    for (const aKey of attrKeys) {
                        try {
                            const val = item.attrs[aKey];
                            const valObj = val.value !== undefined ? val.value : val;
                            const valStr = typeof valObj === 'object' ? JSON.stringify(valObj).substring(0, 150) : String(valObj).substring(0, 150);
                            console.log(indent + '  ATTR: ' + aKey + ' = ' + valStr);
                        } catch (e) { console.log(indent + '  ATTR: ' + aKey + ' (error reading)'); }
                    }
                } catch (e) { }

                // Print a small slice of data if numeric
                try {
                    if (item.shape && item.shape.length > 0) {
                        const slice = item.value;
                        if (slice && slice.length > 0) {
                            // Just show first 10 values
                            const sample = Array.from(slice.slice(0, 10));
                            console.log(indent + '  SAMPLE DATA: ' + JSON.stringify(sample));
                            // Show min/max
                            let min = Infinity, max = -Infinity;
                            for (let i = 0; i < slice.length; i++) {
                                if (slice[i] < min) min = slice[i];
                                if (slice[i] > max) max = slice[i];
                            }
                            console.log(indent + '  MIN=' + min + ' MAX=' + max);
                        }
                    }
                } catch (e) { console.log(indent + '  (cannot read data: ' + e.message + ')'); }
            }
        }
    }

    // Root attributes
    console.log('=== ROOT ATTRIBUTES ===');
    try {
        const rootAttrKeys = f.attrs ? Object.keys(f.attrs) : [];
        for (const key of rootAttrKeys) {
            try {
                const val = f.attrs[key];
                const valObj = val.value !== undefined ? val.value : val;
                const valStr = typeof valObj === 'object' ? JSON.stringify(valObj).substring(0, 200) : String(valObj).substring(0, 200);
                console.log('  ' + key + ' = ' + valStr);
            } catch (e) { console.log('  ' + key + ' (error)'); }
        }
    } catch (e) { console.log('Error reading root attrs:', e.message); }

    console.log('\n=== FILE STRUCTURE ===');
    listItems(f, '', 0);

    f.close();
}

analyze().catch(e => console.error('Error:', e));
