import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public');
// Only browser resources belong in the static output. Vercel builds api/
// separately; server libraries, environment files and archives stay at root.
const entries = ['index.html', '404.html', 'settings.html', 'sw.js',
    'assets', 'layouts', 'components', 'pages'];
for (const entry of entries) {
    if (!fs.existsSync(path.join(root, entry))) throw new Error(`Missing static input: ${entry}`);
}
const assertShell = (file) => {
    const html = fs.readFileSync(file, 'utf8');
    for (const marker of ['<!DOCTYPE html>', 'id="app"', 'id="bootLoader"', './assets/js/core/app.js', './assets/css/operation-blue.css']) {
        if (!html.includes(marker)) throw new Error(`Invalid application HTML: ${file} is missing ${marker}`);
    }
};
assertShell(path.join(root, 'index.html'));
fs.mkdirSync(output, { recursive: true });
for (const entry of entries) {
    fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}
for (const entry of ['index.html', 'assets/css/operation-blue.css', 'assets/js/core/app.js', 'layouts/main.html']) {
    if (!fs.existsSync(path.join(output, entry))) throw new Error(`Missing build output: ${entry}`);
}
console.log('Static build completed: public/ (API functions remain in api/).');
assertShell(path.join(output, 'index.html'));
if (!fs.readFileSync(path.join(output, 'index.html')).equals(fs.readFileSync(path.join(root, 'index.html')))) {
    throw new Error('Published index.html differs from source');
}
fs.writeFileSync(path.join(output, 'build-info.json'), JSON.stringify({
    build: 'operation-blue-entry-repair-2',
    generatedAt: new Date().toISOString(),
    indexBytes: fs.statSync(path.join(output, 'index.html')).size
}, null, 2));
console.log('Verified application HTML and published build-info.json');
