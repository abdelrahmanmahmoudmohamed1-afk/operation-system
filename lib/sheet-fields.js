import { MASTER_COLUMNS } from '../assets/config/master-columns.js';
export const headerKey = value => String(value ?? '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const aliases = {'Indoor Area':['In Door Area'],'Outdoor Area':['Out Door Area'],'Client Phone 1':['Client Phone Number','Client Phone','Phone','Mobile'],'Client Phone 2':['Client Phone Number 2','Mobile 2'],'Sourse':['Source'],'Reservition Date':['Reservation Date'],'Opertion':['Operation'],'Instalment':['Installment','Instalment Amount']};
const names = new Map(MASTER_COLUMNS.map(name=>[headerKey(name),name]));
for (const [name, values] of Object.entries(aliases)) for (const value of values) names.set(headerKey(value), name);
export function normalizeRow(row) {
 const out = {...row};
 for (const [key,value] of Object.entries(row)) { const name=names.get(headerKey(key)) || String(key).replace(/\s+/g,' ').trim(); if (out[name]===undefined || out[name]==='') out[name]=value; }
 return out;
}
export function pickField(row, keys, fallback='') {
 for (const key of keys) { const value=row[key]; if(value!==undefined && value!==null && String(value).trim()!=='') return value; }
 const values=new Map(Object.entries(row).map(([key,value])=>[headerKey(key),value]));
 for (const key of keys) {const value=values.get(headerKey(key));if(value!==undefined&&value!==null&&String(value).trim()!=='')return value;}
 return fallback;
}
export function parseSheetNumber(value) {
 const text=String(value??'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/٬|,/g,'').replace(/٫/g,'.');
 const number=Number(text.replace(/[^0-9.-]/g,''));return Number.isFinite(number)?number:0;
}
export function parseSheetRows(values, groups, preferredRow=2) {
 const candidates=[preferredRow-1,...Array.from({length:Math.min(values.length,15)},(_,i)=>i)];
 const hi=[...new Set(candidates)].find(i=>groups.every(group=>group.some(name=>(values[i]||[]).some(h=>headerKey(h)===headerKey(name)))));
 if(hi===undefined)throw new Error(`Required sheet headers not found in first 15 rows: ${groups.map(g=>g[0]).join(', ')}`);
 const headers=(values[hi]||[]).map(x=>String(x||'').replace(/\s+/g,' ').trim());
 return values.slice(hi+1).map((row,i)=>({row,index:hi+i+2})).filter(({row})=>row.some(v=>String(v??'').trim())).map(({row,index})=>normalizeRow(Object.fromEntries([...headers.map((h,i)=>[h,row[i]??'']).filter(([h])=>h),['__rowNumber',index]])));
}
export function completeSalesRows(units, clients) {
 const key=r=>`${String(r.project||'').trim().toLowerCase()}|${String(r.unit_code||'').trim().toLowerCase()}`;
 const map=new Map(units.map(u=>[key(u),{...u,value:u.price,raw_data:u.raw_data||{}}]));
 for(const c of clients){const id=key(c);if(!c.unit_code)continue;const old=map.get(id)||{};const nonempty=obj=>Object.fromEntries(Object.entries(obj||{}).filter(([,v])=>v!==null&&v!==undefined&&v!==''));const defined=nonempty(c);map.set(id,{...old,...defined,raw_data:{...old.raw_data,...nonempty(c.raw_data)}});}
 return [...map.values()];
}
