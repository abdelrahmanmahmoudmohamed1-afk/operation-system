import assert from 'node:assert/strict';
import { optionalPrice } from '../lib/optional-price.js';
const numeric = v => Number(String(v).replaceAll(',',''));
for (const missing of [null,undefined,'','  ']) assert.equal(optionalPrice(missing,numeric),null);
assert.equal(optionalPrice('0',numeric),0);
assert.equal(optionalPrice(0,numeric),0);
assert.equal(optionalPrice('1,250,000',numeric),1250000);
assert.equal(optionalPrice('not a price',numeric),null);
console.log('Optional-price tests passed: missing vs zero vs valid vs invalid.');
