// Local adapter only. For Cloudflare bindings use Wrangler before release.
import {createServer} from 'node:http';
import worker from '../src/index.js';
import {openLocalDB} from './local-db.mjs';
import {mkdirSync} from 'node:fs';
import {safelyProcessNotifications} from '../src/rfq/notifications.js';
import {readFile} from 'node:fs/promises';

const host='127.0.0.1';
const port=Number(process.env.PORT || 8787);
const localDirectory=new URL('../.local/',import.meta.url);mkdirSync(localDirectory,{recursive:true});
const db=openLocalDB(new URL('inquiries.sqlite',localDirectory));
const env={DB:db,ENVIRONMENT:'local',INQUIRIES_ENABLED:'true',ALLOWED_ORIGINS:`http://${host}:${port}`,TURNSTILE_MODE:'mock',MAIL_PROVIDER:process.env.MOCK_MAIL_FAIL==='true'?'mock-fail':'mock',ALLOW_EMAIL_SEND:'false'};
env.ASSETS={async fetch(request){const pathname=new URL(request.url).pathname;if(!/^\/images\/(?:supplied\/[a-z0-9-]+\.webp|(?:hero-cutouts|applications)\/[a-z0-9-]+\.webp)$/.test(pathname))return new Response('Not found',{status:404});try{const data=await readFile(new URL('../public'+pathname,import.meta.url));return new Response(request.method==='HEAD'?null:data,{headers:{'Content-Type':pathname.endsWith('.png')?'image/png':'image/webp'}});}catch{return new Response('Not found',{status:404});}}};
setInterval(()=>safelyProcessNotifications(env),10000).unref();
createServer(async (req,res)=>{
  try {
    if(req.headers.host!==`${host}:${port}`){res.writeHead(403);res.end('Invalid host');return;}
    const options={method:req.method,headers:req.headers};
    if(!['GET','HEAD'].includes(req.method)){options.body=req;options.duplex='half';}
    const request=new Request(new URL(req.url,`http://${host}:${port}`),options);
    const response=await worker.fetch(request,env,{waitUntil:promise=>promise.catch(()=>{})});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch(error) {
    console.error(error);
    res.writeHead(500);res.end('Local preview error');
  }
}).listen(port,host,()=>console.log(`Local preview: http://${host}:${port}`));
