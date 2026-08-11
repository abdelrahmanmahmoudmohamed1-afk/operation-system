import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[]; const warnings=[]; const passes=[];
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git'].includes(ent.name))continue;const p=path.join(dir,ent.name);ent.isDirectory()?walk(p):files.push(p);}}
walk(ROOT);
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const textFiles=files.filter(f=>/\.(js|mjs|css|html|json|md|txt|sql)$/.test(f));
const read=f=>fs.readFileSync(f,'utf8');

// Syntax
for(const f of files.filter(f=>/\.(js|mjs)$/.test(f))){try{execFileSync(process.execPath,['--check',f],{stdio:'pipe'});}catch(e){failures.push(`Syntax: ${rel(f)} :: ${String(e.stderr||e.message).slice(0,400)}`);}}
if(!failures.some(x=>x.startsWith('Syntax:')))passes.push('JavaScript syntax');

// Imports
for(const f of files.filter(f=>/\.js$/.test(f))){const s=read(f);for(const m of s.matchAll(/(?:from\s+|import\s*\()\s*["'](\.{1,2}\/[^"']+)["']/g)){let t=path.resolve(path.dirname(f),m[1]);const candidates=[t,t+'.js',path.join(t,'index.js')];if(!candidates.some(fs.existsSync))failures.push(`Missing import: ${rel(f)} -> ${m[1]}`);}}
if(!failures.some(x=>x.startsWith('Missing import:')))passes.push('Relative imports');

// API parity
const epFile=files.find(f=>rel(f).endsWith('assets/js/constants/endpoints.js')) || files.find(f=>rel(f).endsWith('assets/config/endpoints.js'));
const opsFile=path.join(ROOT,'api','ops.js');
if(!epFile) failures.push('Endpoint constants file not found.');
if(epFile&&fs.existsSync(opsFile)){
  const eps=[...read(epFile).matchAll(/:\s*["']([^"']+)["']/g)].map(x=>x[1]).filter(x=>/^[A-Za-z]/.test(x));
  const ops=read(opsFile); const arr=(ops.match(/const ACTIONS=\[([^\]]+)\]/s)?.[1]||'');const acts=[...arr.matchAll(/["']([^"']+)["']/g)].map(x=>x[1]);
  const missing=[...new Set(eps.filter(x=>!acts.includes(x)))]; if(missing.length)failures.push(`API endpoints missing in backend: ${missing.join(', ')}`); else passes.push(`API parity (${new Set(eps).size} frontend / ${new Set(acts).size} backend actions)`);
}

const runtimePrefixes=['api/','lib/','assets/','pages/','components/','layouts/'];
const runtimeExact=new Set(['index.html','settings.html','404.html','sw.js','vercel.json','package.json']);
const runtimeTextFiles=textFiles.filter(f=>{const r=rel(f);return runtimePrefixes.some(p=>r.startsWith(p))||runtimeExact.has(r);});
const aggregate=runtimeTextFiles.map(f=>`\n/* ${rel(f)} */\n${read(f)}`).join('\n');
for(const [label,re] of [
  ['Apps Script runtime remnants',/script\.google\.com|google\.script\.run/ig],
  ['Unsupported PDF colors',/\boklab\(|\boklch\(|\bcolor-mix\(/ig],
  ['Legacy unknown-action UI',/Unknown action:/ig]
]){const n=(aggregate.match(re)||[]).length;if(n)failures.push(`${label}: ${n} occurrence(s)`);else passes.push(label);}

for(const required of ['api/ops.js','api/health.js','lib/ai.js','lib/sheets.js','lib/gmail.js','lib/schema.js','assets/js/services/document-storage.service.js','assets/js/core/module-loader.js','supabase/migrations/001_operation_system.sql']){if(!fs.existsSync(path.join(ROOT,required)))failures.push(`Required file missing: ${required}`);}


// Module registry files
const modulesFile=path.join(ROOT,'assets','config','modules.config.js');
if(fs.existsSync(modulesFile)){
  const ms=read(modulesFile);
  for(const m of ms.matchAll(/folder:\s*["']([^"']+)["'][\s\S]{0,180}?controller:\s*["']([^"']+)["'][\s\S]{0,120}?service:\s*["']([^"']+)["'][\s\S]{0,120}?view:\s*["']([^"']+)["']/g)){
    const [_,folder,controller,service,view]=m; for(const file of [controller,service,view]){const f=path.join(ROOT,'assets','js','modules',folder,file);if(!fs.existsSync(f))failures.push(`Module file missing: ${folder}/${file}`);}
  }
  if(!failures.some(x=>x.startsWith('Module file missing:'))) passes.push('Module registry files');
}

// Hard-coded secrets
if(/sk-proj-[A-Za-z0-9_-]{20,}/.test(aggregate))failures.push('OpenAI secret appears hard-coded.');
if(/sb_secret_[A-Za-z0-9_-]{15,}/.test(aggregate))failures.push('Supabase secret appears hard-coded.');
if(!failures.some(x=>/secret appears/.test(x)))passes.push('No obvious secret keys in repository');

const report={ok:failures.length===0,generatedAt:new Date().toISOString(),passes,failures,warnings,fileCount:files.length};
console.log(JSON.stringify(report,null,2));
process.exit(failures.length?1:0);
