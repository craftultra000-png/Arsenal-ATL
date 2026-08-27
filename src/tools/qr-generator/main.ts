import QRCode from 'qrcode';
import { getHtml5Qrcode, type Html5QrScanner } from '@shared/runtime/html5-qrcode';
import { bootstrapStandaloneTool } from '@shared/ui/standalone-tool';
import { toolBySlug } from '@shared/tools';
import { iconSvg } from '@shared/ui/icons';
import { t } from '@shared/i18n';
import './qr-generator.css';

type ScanMode='file'|'camera';

void bootstrapStandaloneTool('qr-generator',(shell)=>{
  if(!toolBySlug('qr-generator'))throw new Error('تعذر العثور على تعريف مولد QR.');
  shell.content.innerHTML=`<section class="qr-generator">
    <header class="qg-header">${iconSvg('qr', 'qg-icon')}<div><h1>${t('رمز QR')}</h1><p>${t('أداة احترافية لتوليد وقراءة رموز QR بشكل آمن ومحلي.')}</p></div></header>
    <div class="qg-tabs"><button id="qg-tab-generate" class="active" type="button" aria-selected="true">${iconSvg('qr', 'qg-inline-icon')} ${t('توليد رمز')}</button><button id="qg-tab-scan" type="button" aria-selected="false">${iconSvg('camera', 'qg-inline-icon')} ${t('قارئ QR')}</button></div>
    <section id="qg-generate" class="qg-panel active"><p class="qg-label">${t('توليد رمز جديد')}</p><div class="qg-card"><p>${t('أدخل رابطاً أو نصاً أدناه لتوليد رمز QR.')}</p><input id="qg-input" class="qg-input" type="text" autocomplete="off" placeholder="${t('https://example.com أو أي نص')}"><div id="qg-preview" class="qg-preview" hidden><canvas id="qg-canvas" width="512" height="512" aria-label="${t('رمز QR الناتج')}"></canvas></div><div class="qg-actions"><button id="qg-generate-button" class="qg-button primary" type="button">${iconSvg('qr', 'qg-inline-icon')} ${t('توليد الرمز')}</button><button id="qg-download" class="qg-button mint" type="button" hidden>${iconSvg('file-down', 'qg-inline-icon')} ${t('تنزيل PNG')}</button></div></div></section>
    <section id="qg-scan" class="qg-panel"><p class="qg-label">${t('قارئ ومسح الرموز')}</p><div class="qg-card"><p>${t('ارفع صورة رمز مباشرة أو استخدم المسح عبر الكاميرا.')}</p><div class="qg-tabs small"><button id="qg-scan-file" class="active" type="button">${iconSvg('image', 'qg-inline-icon')} ${t('رفع صورة')}</button><button id="qg-scan-camera" type="button">${iconSvg('camera', 'qg-inline-icon')} ${t('كاميرا مباشرة')}</button></div><label id="qg-file-zone" class="qg-file-zone"><input id="qg-file" type="file" accept="image/*" hidden>${iconSvg('upload', 'qg-file-zone__icon')}<b>${t('اضغط هنا لاختيار صورة من المعرض')}</b><small>${t('خيار آمن وسريع من دون فتح الكاميرا')}</small></label><div id="qg-camera" class="qg-camera" hidden><div id="qg-camera-region"></div><div class="qg-camera-target"></div></div><div id="qg-file-reader" style="display:none"></div><button id="qg-rescan" class="qg-button primary" type="button" hidden>${iconSvg('camera', 'qg-inline-icon')} ${t('مسح رمز آخر')}</button></div><section id="qg-result" class="qg-result" hidden><b>${iconSvg('check', 'qg-inline-icon')} ${t('بيانات الرمز المستخرجة')}</b><pre id="qg-result-text">${t('لم يتم المسح بعد…')}</pre><div class="qg-actions"><button id="qg-copy" class="qg-button ghost" type="button">${iconSvg('copy', 'qg-inline-icon')} ${t('نسخ النص')}</button><a id="qg-open" class="qg-button mint" target="_blank" rel="noopener" hidden>${iconSvg('share', 'qg-inline-icon')} ${t('فتح الرابط')}</a></div></section></section>
  </section>`;

  const $=<T extends Element>(selector:string)=>required<T>(shell.content,selector);
  const generatePanel=$<HTMLElement>('#qg-generate'),scanPanel=$<HTMLElement>('#qg-scan');
  const generateTab=$<HTMLButtonElement>('#qg-tab-generate'),scanTab=$<HTMLButtonElement>('#qg-tab-scan');
  const input=$<HTMLInputElement>('#qg-input'),canvas=$<HTMLCanvasElement>('#qg-canvas');
  const preview=$<HTMLElement>('#qg-preview'),download=$<HTMLButtonElement>('#qg-download');
  const fileButton=$<HTMLButtonElement>('#qg-scan-file'),cameraButton=$<HTMLButtonElement>('#qg-scan-camera');
  const fileZone=$<HTMLElement>('#qg-file-zone'),fileInput=$<HTMLInputElement>('#qg-file'),camera=$<HTMLElement>('#qg-camera');
  const rescan=$<HTMLButtonElement>('#qg-rescan'),result=$<HTMLElement>('#qg-result'),resultText=$<HTMLElement>('#qg-result-text'),open=$<HTMLAnchorElement>('#qg-open');
  let scanMode:ScanMode='file',scanner:Html5QrScanner|undefined,scanning=false,cameraRequest=0;

  const stopCamera=()=>{cameraRequest+=1;scanning=false;const active=scanner;scanner=undefined;if(active)void active.stop().then(()=>active.clear()).catch(()=>undefined);shell.setStatus('');};
  const showResult=(text:string)=>{stopCamera();resultText.textContent=text;result.hidden=false;rescan.hidden=scanMode!=='camera';const url=normaliseUrl(text);open.hidden=!url;if(url)open.href=url;if(navigator.vibrate)navigator.vibrate(100);};
  const resetResult=()=>{result.hidden=true;open.hidden=true;rescan.hidden=true;};
  const setTab=(next:'generate'|'scan')=>{const generating=next==='generate';generatePanel.classList.toggle('active',generating);scanPanel.classList.toggle('active',!generating);generateTab.classList.toggle('active',generating);scanTab.classList.toggle('active',!generating);generateTab.setAttribute('aria-selected',String(generating));scanTab.setAttribute('aria-selected',String(!generating));if(generating)stopCamera();else setScanMode('file');};
  const setScanMode=(next:ScanMode)=>{scanMode=next;const cameraMode=next==='camera';fileButton.classList.toggle('active',!cameraMode);cameraButton.classList.toggle('active',cameraMode);fileZone.hidden=cameraMode;camera.hidden=!cameraMode;resetResult();if(cameraMode)void startCamera();else stopCamera();};
  const create=async()=>{const text=input.value.trim();if(!text){shell.setStatus(t('أدخل نصاً أو رابطاً أولاً.'),'error');input.focus();return;}await QRCode.toCanvas(canvas,text,{width:512,margin:2,color:{dark:'#000000',light:'#ffffff'},errorCorrectionLevel:'H'});preview.hidden=false;download.hidden=false;};
  const startCamera=async()=>{stopCamera();const request=++cameraRequest;try{shell.setStatus(t('يجري طلب الوصول إلى الكاميرا لمسح الرمز…'));const Scanner=await getHtml5Qrcode();if(request!==cameraRequest)return;const active=new Scanner('qg-camera-region');scanner=active;scanning=true;await active.start({facingMode:'environment'},{fps:10,qrbox:{width:220,height:220}},(decoded)=>{if(!scanning)return;showResult(decoded);},()=>undefined);}catch{if(request!==cameraRequest)return;stopCamera();setScanMode('file');shell.setStatus(t('تعذر فتح الكاميرا. يمكنك رفع صورة رمز QR بدلاً من ذلك.'),'error');}};
  const scanFile=async(file:File)=>{try{shell.setStatus(t('يجري قراءة رمز QR من الصورة محلياً…'));const Scanner=await getHtml5Qrcode();const reader=new Scanner('qg-file-reader');const text=await reader.scanFile(file,true);void reader.clear();showResult(text);}catch{result.hidden=false;resultText.textContent=t('لم يتم العثور على رمز QR صالح في الصورة.');open.hidden=true;shell.setStatus(t('لم يتم العثور على رمز QR صالح في الصورة.'),'error');}finally{fileInput.value='';}};

  generateTab.addEventListener('click',()=>setTab('generate'));scanTab.addEventListener('click',()=>setTab('scan'));
  fileButton.addEventListener('click',()=>setScanMode('file'));cameraButton.addEventListener('click',()=>setScanMode('camera'));
  $('#qg-generate-button').addEventListener('click',()=>void create().catch(()=>shell.setStatus(t('تعذر إنشاء رمز QR.'),'error')));
  input.addEventListener('keydown',(event)=>{if(event.key==='Enter')void create().catch(()=>shell.setStatus(t('تعذر إنشاء رمز QR.'),'error'));});
  download.addEventListener('click',()=>downloadPng(canvas));
  fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];if(file)void scanFile(file);});
  rescan.addEventListener('click',()=>void startCamera());
  $('#qg-copy').addEventListener('click',async()=>{const text=resultText.textContent?.trim()??'';if(!text||text===t('لم يتم المسح بعد…')){shell.setStatus(t('لا توجد بيانات رمز لنسخها.'),'error');return;}try{await navigator.clipboard.writeText(text);}catch{shell.setStatus(t('تعذر النسخ تلقائياً. انسخ النص يدوياً.'),'error');}});
  window.addEventListener('pagehide',stopCamera,{once:true});
});

function downloadPng(canvas:HTMLCanvasElement):void{const output=document.createElement('canvas'),padding=20;output.width=canvas.width+padding*2;output.height=canvas.height+padding*2;const context=output.getContext('2d');if(!context)return;context.fillStyle='#ffffff';context.fillRect(0,0,output.width,output.height);context.drawImage(canvas,padding,padding);output.toBlob((blob)=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Arsenal_QRCode.png';link.click();URL.revokeObjectURL(url);},'image/png');}
function normaliseUrl(value:string):string|undefined{const trimmed=value.trim();return /^https?:\/\//i.test(trimmed)?trimmed:/^www\./i.test(trimmed)?`https://${trimmed}`:undefined;}
function required<T extends Element>(root:ParentNode,selector:string):T{const element=root.querySelector<T>(selector);if(!element)throw new Error(`العنصر المطلوب غير موجود: ${selector}`);return element;}
