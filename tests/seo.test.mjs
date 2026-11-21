import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import {publicPaths} from '../src/seo.js';
const production={ENVIRONMENT:'production',SEARCH_INDEXING:'true'};
const fetchPage=(path,env=production,origin='https://visionhardware.net')=>worker.fetch(new Request(origin+path),env);
test('sitemap contains unique canonical pages that return indexable HTML',async()=>{
 const sitemap=await fetchPage('/sitemap.xml');assert.equal(sitemap.status,200);assert.match(sitemap.headers.get('content-type'),/xml/);const xml=await sitemap.text();const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);assert.equal(urls.length,publicPaths.length);assert.equal(new Set(urls).size,urls.length);
 for(const url of urls){assert.ok(url.startsWith('https://visionhardware.net/'));const res=await worker.fetch(new Request(url),production);assert.equal(res.status,200,url);const html=await res.text();assert.ok(html.includes('content="index,follow"'),url);assert.ok(html.includes('rel="canonical" href="'+url+'"'));assert.ok(!html.includes('solutions preview.'));}
});
test('indexing is enabled only on the production domain; thin pages and errors stay excluded',async()=>{
 for(const [env,origin] of [[{ENVIRONMENT:'staging',SEARCH_INDEXING:'true'},'https://visionhardware.net'],[production,'https://visionhardware-web.bruceng1875.workers.dev'],[{ENVIRONMENT:'production'},'https://visionhardware.net']]){assert.ok((await (await fetchPage('/',env,origin)).text()).includes('content="noindex,follow"'));assert.equal(await (await fetchPage('/robots.txt',env,origin)).text(),'User-agent: *\nDisallow: /\n');assert.ok(!(await (await fetchPage('/sitemap.xml',env,origin)).text()).includes('<loc>'));}
 for(const path of ['/request-quote/','/products/insert-buckles/','/missing/'])assert.ok((await (await fetchPage(path)).text()).includes('content="noindex,follow"'));
 const robots=await (await fetchPage('/robots.txt')).text();assert.ok(robots.includes('Allow: /'));assert.ok(robots.includes('Sitemap: https://visionhardware.net/sitemap.xml'));
 const head=await worker.fetch(new Request('https://visionhardware.net/sitemap.xml',{method:'HEAD'}),production);assert.equal(await head.text(),'');assert.equal(head.status,200);
});
