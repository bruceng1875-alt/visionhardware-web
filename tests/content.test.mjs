import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/index.js';
import {supplied} from '../src/content/supplied.js';
test('supplied categories, references, images and contact routes are complete',async()=>{
 assert.equal(supplied.categories.length,22);
 assert.equal(supplied.categories.reduce((n,c)=>n+c.references.length,0),56);
 for(const c of supplied.categories){
  const response=await worker.fetch(new Request('https://example.test/products/'+c.slug+'/'),{});
  assert.equal(response.status,200,c.slug);
  for(const p of [...c.photos,...c.references])assert.ok(existsSync(new URL('../public'+p.src,import.meta.url)),p.src);
  for(const p of c.references){const r=await worker.fetch(new Request('https://example.test/products/'+c.slug+'/'+p.cell.toLowerCase()+'/'),{});assert.equal(r.status,200);assert.ok((await r.text()).includes(encodeURIComponent(p.reference)));}
 }
 const contact=await (await worker.fetch(new Request('https://example.test/contact/'),{})).text();
 assert.ok(contact.includes('mailto:'+supplied.company.email));assert.ok(contact.includes(supplied.company.phoneHref));
});
test('category expansion preserves inquiries and notification relationships',()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_inquiries.sql',import.meta.url),'utf8'));
 db.exec("INSERT INTO inquiries VALUES ('old','2026-11-17','Test','test@example.invalid','Test','Test','metal-hardware',500,'Test','/request-quote/','v1','new','old-key','hash'); INSERT INTO notification_outbox(inquiry_id,next_attempt_at) VALUES ('old',0)");
 db.exec('BEGIN');db.exec(readFileSync(new URL('../migrations/0002_supplied_categories.sql',import.meta.url),'utf8'));db.exec('COMMIT');
 assert.equal(db.prepare('SELECT count(*) n FROM inquiries').get().n,1);assert.equal(db.prepare('SELECT inquiry_id FROM notification_outbox').get().inquiry_id,'old');assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 for(const c of supplied.categories)db.prepare('UPDATE inquiries SET product_interest=? WHERE id=?').run(c.slug,'old');
 db.close();
});
