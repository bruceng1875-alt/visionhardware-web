import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkStaging} from '../scripts/check-staging.mjs';
import {readFile} from 'node:fs/promises';
const sample=JSON.parse(await readFile(new URL('../wrangler.staging.example.json',import.meta.url),'utf8'));
test('unconfigured staging template is blocked',()=>assert.ok(checkStaging(sample).length));
test('production route, enabled collection and plaintext secrets are blocked',()=>{
 const result=checkStaging({...sample,routes:[{pattern:'visionhardware.net',custom_domain:true}],vars:{...sample.vars,INQUIRIES_ENABLED:'true',RESEND_API_KEY:'fake-test-value'}});
 assert.ok(result.some(x=>x.includes('routes')));assert.ok(result.some(x=>x.includes('disabled')));assert.ok(result.some(x=>x.includes('secret storage')));
});
test('separate configured staging passes static checks only',()=>{
 const config=structuredClone(sample);config.d1_databases[0].database_id='11111111-1111-4111-8111-111111111111';config.vars.ALLOWED_ORIGINS='https://visionhardware-web-staging.example.workers.dev';config.vars.TURNSTILE_HOSTNAME='visionhardware-web-staging.example.workers.dev';assert.deepEqual(checkStaging(config),[]);
});
