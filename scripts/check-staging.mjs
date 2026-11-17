import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function checkStaging(config,{activeTest=false}={}){
 const issues=[];
 if(config.name!=='visionhardware-web-staging')issues.push('Worker must be visionhardware-web-staging');
 if(config.main!=='src/index.js')issues.push('Unexpected entry point');
 if(config.routes?.length||config.route)issues.push('Staging must not have custom-domain routes');
 if(config.env)issues.push('Nested environments are not allowed in the dedicated staging file');
 const vars=config.vars||{};
 if(vars.ENVIRONMENT!=='staging')issues.push('ENVIRONMENT must be staging');
 if(activeTest){
  if(vars.INQUIRIES_ENABLED!=='true'||vars.ALLOW_EMAIL_SEND!=='true'||vars.STAGING_TESTS_ENABLED!=='true'||vars.PRIVACY_APPROVED!=='false')issues.push('Active tests require explicit staging gates and production privacy approval must remain false');
  if(!config.ratelimits?.some(x=>x.name==='RATE_LIMITER'&&x.simple?.limit===5&&x.simple?.period===60)||!config.triggers?.crons?.includes('*/5 * * * *'))issues.push('Active tests require rate limiting and notification recovery');
 }else if(vars.INQUIRIES_ENABLED!=='false'||vars.ALLOW_EMAIL_SEND!=='false')issues.push('Initial staging deployment must have collection and email disabled');
 if(vars.TURNSTILE_MODE!=='live')issues.push('Cloud staging must not use mock Turnstile');
 const db=config.d1_databases||[];
 if(db.length!==1||db[0].binding!=='DB'||db[0].database_name!=='visionhardware-rfq-staging'||!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(db[0].database_id)||/^0{8}-/.test(db[0].database_id))issues.push('A verified, separate staging D1 binding is required');
 try{const origin=new URL(vars.ALLOWED_ORIGINS);if(origin.protocol!=='https:'||origin.origin!==vars.ALLOWED_ORIGINS||!origin.hostname.startsWith('visionhardware-web-staging.')||!origin.hostname.endsWith('.workers.dev')||origin.hostname!==vars.TURNSTILE_HOSTNAME)throw new Error();}catch{issues.push('A matching, verified staging workers.dev origin and Turnstile hostname are required');}
 if(JSON.stringify(config).includes('visionhardware.net'))issues.push('Production domain is forbidden in staging');
 for(const key of ['TURNSTILE_SECRET_KEY','RESEND_API_KEY','RATE_LIMIT_HMAC_KEY'])if(key in vars)issues.push(key+' must use secret storage, not vars');
 return issues;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file=process.argv[2];if(!file)throw new Error('Provide a dedicated staging JSON configuration file');
 const issues=checkStaging(JSON.parse(await readFile(file,'utf8')),{activeTest:process.argv.includes('--active-test')});
 if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}else console.log('Static staging checks passed. Account and database ownership still require remote verification.');
}
