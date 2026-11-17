export const clientScript=String.raw`(()=>{
const form=document.getElementById('rfq-form');if(!form)return;
const local=form.dataset.local==='true';
const status=document.getElementById('rfq-status'),button=form.querySelector('[type=submit]'),newButton=document.getElementById('rfq-new');
let key=crypto.randomUUID(),lastPayload='',done=false;button.disabled=false;
const query=new URLSearchParams(location.search).get('category');
const select=form.elements.productInterest;
const reference=new URLSearchParams(location.search).get('reference');if(reference&&/^[a-zA-Z0-9 _-]{1,80}$/.test(reference))form.elements.message.value='Product reference: '+reference+'\n';
for(const option of select.options)if(option.value===query||option.textContent===query)select.value=option.value;
newButton.addEventListener('click',()=>{form.reset();key=crypto.randomUUID();lastPayload='';done=false;button.disabled=false;newButton.hidden=true;status.textContent='';form.elements.name.focus();});
form.addEventListener('submit',async event=>{
event.preventDefault();if(done||button.disabled||!form.reportValidity())return;
const fields=new FormData(form);const data=Object.fromEntries(fields);
data.estimatedQuantity=Number(data.estimatedQuantity);data.privacyConsent=fields.has('privacyConsent');data.sourcePage=location.pathname;
const content=JSON.stringify(data);if(lastPayload&&lastPayload!==content)key=crypto.randomUUID();lastPayload=content;
data.idempotencyKey=key;
data.turnstileToken=local?'local-test-pass':(window.turnstile?.getResponse()||'');
if(!data.turnstileToken){status.textContent='Please complete the verification, or reload if it did not load.';return;}
button.disabled=true;status.textContent='Saving your test inquiry…';
try{const response=await fetch('/api/rfq',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});const result=await response.json();
if(response.ok&&result.ok){done=true;status.textContent='Test inquiry saved. Reference: '+result.reference+(local?'. No email has been sent.':'. Notification delivery is processed separately.');newButton.hidden=false;}
else{status.textContent=result.message||'Submission unavailable. Please retry.';if(result.fields){status.textContent+=' '+Object.values(result.fields).join(' ');const first=Object.keys(result.fields).find(name=>form.elements[name]);if(first)form.elements[first].focus();}}
}catch{status.textContent='Receipt could not be confirmed. Your entries are retained. Retry unchanged to avoid a duplicate.';}
finally{if(!local&&window.turnstile)window.turnstile.reset();button.disabled=done;status.focus();}
});})();`;
