import {supplied} from './content/supplied.js';
import {escape} from './content/views.js';
const origin='https://visionhardware.net';
const mainPages=['/','/products/','/custom-solutions/','/about/','/contact/'];
export const publicPaths=[...mainPages,...supplied.categories.filter(c=>c.photos.length||c.references.length).map(c=>'/products/'+c.slug+'/'),...supplied.categories.flatMap(c=>c.references.map(p=>'/products/'+c.slug+'/'+p.cell.toLowerCase()+'/'))];
export function indexingEnabled(url,env){return env.ENVIRONMENT==='production'&&env.SEARCH_INDEXING==='true'&&url.origin===origin;}
export function seoHead(path,title,status,url,env){
 const canIndex=indexingEnabled(url,env)&&status===200&&publicPaths.includes(path);
 let description='Explore garment accessories and metal hardware from Vision Hardware in Shishi, China. Sample-based customization with a minimum order of 500 pieces.';
 let pageTitle=title==='Home'?'Garment Accessories & Custom Metal Hardware':title;
 const parts=path.split('/').filter(Boolean),category=supplied.categories.find(c=>c.slug===parts[1]);
 if(category){const product=category.references.find(p=>p.cell.toLowerCase()===parts[2]);description=product?`Explore ${product.reference} ${category.name.toLowerCase()}: product photos, supplied dimensions and weight. Contact Vision Hardware for sample-based customization.`:`Browse ${category.name.toLowerCase()} for apparel, bags and accessories. View product photos and discuss sample-based customization with Vision Hardware.`;}
 if(path==='/about/')description='Learn about Shishi Vision Clothing Accessories Co., LTD. Explore our garment accessory collections, sample-based customization and workshop photographs.';
 if(path==='/contact/')description='Contact Vision Hardware for garment accessories and metal hardware. Email, telephone and WhatsApp QR code for product and customization inquiries.';
 const canonical=status===200?`<link rel="canonical" href="${escape(origin+path)}">`:'';
 return `<meta name="robots" content="${canIndex?'index,follow':'noindex,follow'}"><title>${escape(pageTitle)} | Vision Hardware</title><meta name="description" content="${escape(description)}">${canonical}<meta property="og:type" content="website"><meta property="og:site_name" content="Vision Hardware"><meta property="og:title" content="${escape(pageTitle)} | Vision Hardware"><meta property="og:description" content="${escape(description)}">`;
}
export function seoEndpoint(request,env){
 const url=new URL(request.url);if(!['/robots.txt','/sitemap.xml'].includes(url.pathname))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const enabled=indexingEnabled(url,env);let body,type;
 if(url.pathname==='/robots.txt'){type='text/plain; charset=utf-8';body=enabled?`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';}
 else{type='application/xml; charset=utf-8';body='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+(enabled?publicPaths.map(path=>`<url><loc>${escape(origin+path)}</loc></url>`).join(''):'')+'</urlset>';}
 return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':type,'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
}
