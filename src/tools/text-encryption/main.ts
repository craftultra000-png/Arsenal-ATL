import { getArgon2 } from '@shared/runtime/argon2';
import { bootstrapStandaloneTool } from '@shared/ui/standalone-tool';
import { toolBySlug } from '@shared/tools';
import { iconSvg } from '@shared/ui/icons';
import { t } from '@shared/i18n';
import './text-encryption.css';

const encoder=new TextEncoder();
const decoder=new TextDecoder();

type Mode='encrypt'|'decrypt';

void bootstrapStandaloneTool('text-encryption',(shell)=>{
  if(!toolBySlug('text-encryption'))throw new Error('تعذر العثور على تعريف أداة التشفير.');
  shell.content.innerHTML=`<section class="text-encryption">
    <header class="te-header">${iconSvg('lock', 'te-icon')}<div><h1>${t('مشفّر النصوص الآمن')}</h1><p>${t('شفّر وفك تشفير النصوص باستخدام')} <b>AES-256-GCM</b> ${t('واشتق المفتاح عبر')} <b>Argon2id</b> ${t('محلياً.')}</p></div></header>
    <div class="te-security">${iconSvg('lock', 'te-security__icon')}<p>${t('النص والمفتاح لا يغادران متصفحك. استخدم مفتاحاً قوياً وشاركه فقط عبر قناة آمنة.')}</p></div>
    <div class="te-tabs" role="tablist"><button id="te-tab-encrypt" class="active" type="button" role="tab" aria-selected="true">${iconSvg('lock', 'te-inline-icon')} ${t('تشفير نص')}</button><button id="te-tab-decrypt" type="button" role="tab" aria-selected="false">${iconSvg('text', 'te-inline-icon')} ${t('فك التشفير')}</button></div>
    <section id="te-encrypt-panel" class="te-panel active"><label class="te-label" for="te-plain">${t('النص المراد تشفيره وحمايته')}</label><div class="te-card te-text-card"><textarea id="te-plain" class="te-textarea" placeholder="${t('اكتب أو الصق النص السري هنا…')}"></textarea></div><label class="te-label" for="te-encrypt-key">${t('المفتاح السري')}</label><div class="te-card"><div class="te-key-row"><input id="te-encrypt-key" class="te-input" type="text" autocomplete="off" placeholder="${t('اكتب مفتاحك هنا، أو ولّد مفتاحاً معقداً…')}"><button id="te-generate" class="te-icon-button" type="button" title="${t('توليد مفتاح عشوائي')}">${iconSvg('shuffle', 'te-inline-icon')}</button><button id="te-copy-key" class="te-icon-button mint" type="button" title="${t('نسخ المفتاح')}">${iconSvg('copy', 'te-inline-icon')}</button></div><p>${t('شارك هذا المفتاح مع الطرف الآخر عبر قناة آمنة ليتمكن من فك النص.')}</p></div><button id="te-encrypt" class="te-action primary" type="button">${iconSvg('lock', 'te-inline-icon')}<b>${t('تشفير وقفل النص')}</b></button></section>
    <section id="te-decrypt-panel" class="te-panel"><label class="te-label" for="te-cipher">${t('النص المشفّر المراد فتحه')}</label><div class="te-card te-text-card"><textarea id="te-cipher" class="te-textarea mono" placeholder="${t('ألصق النص المشفّر (الكود) هنا…')}"></textarea></div><label class="te-label" for="te-decrypt-key">${t('المفتاح الخاص لفك التشفير')}</label><div class="te-card"><input id="te-decrypt-key" class="te-input" type="text" autocomplete="off" placeholder="${t('أدخل المفتاح السري لفتح النص…')}"></div><button id="te-decrypt" class="te-action mint-action" type="button">${iconSvg('check', 'te-inline-icon')}<b>${t('فتح وفك التشفير')}</b></button></section>
    <section id="te-result" class="te-result" hidden><div class="te-result-header"><b id="te-result-title">${t('النتيجة:')}</b><button id="te-copy-result" type="button">${iconSvg('copy', 'te-inline-icon')} <span>${t('نسخ الناتج')}</span></button></div><pre id="te-result-output"></pre></section>
  </section>`;

  const $=<T extends Element>(selector:string)=>required<T>(shell.content,selector);
  const encryptPanel=$<HTMLElement>('#te-encrypt-panel');
  const decryptPanel=$<HTMLElement>('#te-decrypt-panel');
  const encryptTab=$<HTMLButtonElement>('#te-tab-encrypt');
  const decryptTab=$<HTMLButtonElement>('#te-tab-decrypt');
  const plain=$<HTMLTextAreaElement>('#te-plain');
  const encryptKey=$<HTMLInputElement>('#te-encrypt-key');
  const cipher=$<HTMLTextAreaElement>('#te-cipher');
  const decryptKey=$<HTMLInputElement>('#te-decrypt-key');
  const result=$<HTMLElement>('#te-result');
  const resultTitle=$<HTMLElement>('#te-result-title');
  const resultOutput=$<HTMLElement>('#te-result-output');

  const changeMode=(mode:Mode)=>{
    const encrypting=mode==='encrypt';
    encryptPanel.classList.toggle('active',encrypting);
    decryptPanel.classList.toggle('active',!encrypting);
    encryptTab.classList.toggle('active',encrypting);
    decryptTab.classList.toggle('active',!encrypting);
    encryptTab.setAttribute('aria-selected',String(encrypting));
    decryptTab.setAttribute('aria-selected',String(!encrypting));
    result.hidden=true;
  };
  encryptTab.addEventListener('click',()=>changeMode('encrypt'));
  decryptTab.addEventListener('click',()=>changeMode('decrypt'));

  const showResult=(title:string,value:string,kind:'encrypt'|'decrypt')=>{
    resultTitle.textContent=title;
    resultOutput.textContent=value;
    result.dataset.kind=kind;
    result.hidden=false;
    result.scrollIntoView({block:'nearest',behavior:'smooth'});
  };
  const copy=async(value:string,success:string)=>{
    if(!value){shell.setStatus(t('لا يوجد نص لنسخه بعد.'),'error');return;}
    try{await navigator.clipboard.writeText(value);shell.setStatus(success,'success');}catch{shell.setStatus(t('تعذر النسخ تلقائياً. انسخ النص يدوياً.'),'error');}
  };
  const withBusy=async(button:HTMLButtonElement,working:string,work:()=>Promise<void>)=>{
    const label=button.querySelector('b');
    const original=label?.textContent??'';
    button.disabled=true;if(label)label.textContent=working;
    try{await work();}finally{button.disabled=false;if(label)label.textContent=original;}
  };

  $('#te-generate').addEventListener('click',()=>{encryptKey.value=generatePassword();shell.setStatus(t('تم توليد مفتاح عشوائي بطول 64 رمزاً.'),'success');});
  $('#te-copy-key').addEventListener('click',()=>void copy(encryptKey.value,t('تم نسخ المفتاح السري.')));
  $('#te-copy-result').addEventListener('click',()=>void copy(resultOutput.textContent??'',t('تم نسخ الناتج.')));
  $('#te-encrypt').addEventListener('click',()=>void withBusy($('#te-encrypt'),t('يجري التشفير…'),async()=>{
    const text=plain.value.trim(),password=encryptKey.value.trim();
    if(!text||!password){shell.setStatus(t('أدخل النص والمفتاح السري أولاً.'),'error');return;}
    shell.setStatus(t('يجري اشتقاق المفتاح وتشفير النص محلياً…'));
    try{const payload=await encrypt(text,password);showResult(t('النص المشفّر — احتفظ به بأمان'),payload,'encrypt');shell.setStatus(t('تم تشفير النص محلياً.'),'success');}
    catch(error){shell.setStatus(error instanceof Error?error.message:t('تعذر تشفير النص.'),'error');}
  }));
  $('#te-decrypt').addEventListener('click',()=>void withBusy($('#te-decrypt'),t('يجري الفتح…'),async()=>{
    const payload=cipher.value.trim(),password=decryptKey.value.trim();
    if(!payload||!password){shell.setStatus(t('ألصق النص المشفّر وأدخل مفتاحه السري.'),'error');return;}
    shell.setStatus(t('يجري اشتقاق المفتاح وفك التشفير محلياً…'));
    try{const text=await decrypt(payload,password);showResult(t('النص المفتوح بنجاح'),text,'decrypt');shell.setStatus(t('تم فك تشفير النص بنجاح.'),'success');}
    catch{shell.setStatus(t('تعذر فك التشفير. تحقق من المفتاح وصيغة النص.'),'error');}
  }));
});

function generatePassword():string{return Array.from(crypto.getRandomValues(new Uint8Array(32)),(byte)=>byte.toString(16).padStart(2,'0')).join('');}

async function deriveKey(password:string,salt:Uint8Array):Promise<CryptoKey>{
  const module=await getArgon2();
  const passwordBytes=encoder.encode(password);
  const passwordPointer=module._malloc(passwordBytes.length);
  const saltPointer=module._malloc(salt.length);
  const hashPointer=module._malloc(32);
  try{
    module.HEAPU8.set(passwordBytes,passwordPointer);
    module.HEAPU8.set(salt,saltPointer);
    const status=module._argon2_hash(3,65536,2,passwordPointer,passwordBytes.length,saltPointer,salt.length,hashPointer,32,0,0,2);
    if(status!==0)throw new Error(`تعذر اشتقاق المفتاح الآمن (رمز Argon2: ${status}).`);
    const hash=new Uint8Array(module.HEAPU8.buffer,hashPointer,32).slice();
    return crypto.subtle.importKey('raw',toArrayBuffer(hash),{name:'AES-GCM'},false,['encrypt','decrypt']);
  }finally{module._free(passwordPointer);module._free(saltPointer);module._free(hashPointer);}
}

async function encrypt(text:string,password:string):Promise<string>{
  const salt=crypto.getRandomValues(new Uint8Array(32));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await deriveKey(password,salt);
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv:toArrayBuffer(iv)},key,encoder.encode(text));
  const payload=new Uint8Array(salt.length+iv.length+encrypted.byteLength);
  payload.set(salt,0);payload.set(iv,salt.length);payload.set(new Uint8Array(encrypted),salt.length+iv.length);
  return bufferToBase64(payload);
}

async function decrypt(payload:string,password:string):Promise<string>{
  const bytes=base64ToBytes(payload);
  if(bytes.length<45)throw new Error('صيغة النص المشفّر غير صالحة.');
  const salt=bytes.slice(0,32),iv=bytes.slice(32,44),encrypted=bytes.slice(44);
  const key=await deriveKey(password,salt);
  const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:toArrayBuffer(iv)},key,toArrayBuffer(encrypted));
  return decoder.decode(decoded);
}

function bufferToBase64(bytes:Uint8Array):string{let binary='';for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192));return btoa(binary);}
function base64ToBytes(value:string):Uint8Array{const binary=atob(value.replace(/\s/g,''));return Uint8Array.from(binary,(character)=>character.charCodeAt(0));}
function toArrayBuffer(bytes:Uint8Array):ArrayBuffer{return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;}
function required<T extends Element>(root:ParentNode,selector:string):T{const element=root.querySelector<T>(selector);if(!element)throw new Error(`العنصر المطلوب غير موجود: ${selector}`);return element;}
