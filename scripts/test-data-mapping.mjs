import assert from 'node:assert/strict';
import { MASTER_COLUMNS } from '../assets/config/master-columns.js';
import { parseSheetRows, pickField, parseSheetNumber, completeSalesRows } from '../lib/sheet-fields.js';
import { readAllPages } from '../lib/read-pages.js';
assert.equal(MASTER_COLUMNS.length,51);
const headers=MASTER_COLUMNS.map(x=>x==='Total Area'?' Total Area ':x==='Out Door & In Door Price'?'Out Door & In Door \nPrice ':x);
const sample=MASTER_COLUMNS.map((x,i)=>`v${i}`);
sample[0]='A-101';sample[4]='Sold';sample[10]='145';sample[37]='01001234567';sample[38]='01007654321';
for(const padding of [0,1,4]){
 const values=[...Array.from({length:padding},()=>['Report title']),headers,sample];
 const [row]=parseSheetRows(values,[['Unit Code'],['Status']]);
 for(const [i,key] of MASTER_COLUMNS.entries())assert.equal(row[key],sample[i],key);
 assert.equal(row.__rowNumber,padding+2);
 assert.equal(pickField(row,['Client Phone 1']), '01001234567');
 assert.equal(pickField(row,['Total Area','Indoor Area']), '145');
}
assert.equal(parseSheetNumber('١٬٢٥٠٫٥٠'),1250.5);
assert.equal(parseSheetNumber('1,250.50 EGP'),1250.5);
assert.equal(pickField({'Remaining DP':0},['Remaining DP'],99),0);
assert.throws(()=>parseSheetRows([['Wrong tab']],[['Unit Code'],['Status']]));
const merged=completeSalesRows([{project:'P',unit_code:'A',price:100,status:'Sold',raw_data:{Floor:0}},{project:'P',unit_code:'B',price:200,status:'Reserved'}],[{project:'P',unit_code:'A',value:120,status:'Sold'}]);
assert.equal(merged.length,2);assert.equal(merged.reduce((a,r)=>a+r.value,0),320);assert.equal(merged[0].raw_data.Floor,0);
const all=Array.from({length:1205},(_,i)=>i);
const read=await readAllPages(async from=>all.slice(from,from+200));
assert.deepEqual(read,all);
console.log('PASS: all 51 headers, multi-line names, shifted headers, phones, zero values, Arabic numbers, partial CRM merge and 1,205-row pagination.');
