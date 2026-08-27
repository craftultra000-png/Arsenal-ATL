import { bootstrapStandaloneTool } from '@shared/ui/standalone-tool';
import { toolBySlug } from '@shared/tools';
import { ArsenalSelect, enhanceNativeSelect } from '@shared/ui/arsenal-select';
import { iconSvg } from '@shared/ui/icons';
import { t } from '@shared/i18n';
import './text-filter.css';

type CleanFilter='emojis'|'spaces'|'lines';
type Extraction='links'|'emails'|'tags'|'phones';
type Encoding='b64e'|'b64d'|'urle'|'urld';

void bootstrapStandaloneTool('text-filter',(shell)=>{
  if(!toolBySlug('text-filter'))throw new Error('تعذر العثور على تعريف مِصفاة النصوص.');
  shell.content.innerHTML=`<section class="text-filter">
    <header class="tf-header"><span class="tf-icon">${iconSvg('funnel','tf-icon-svg')}</span><div><h1>${t('مِصفاة النصوص الذكية')}</h1><p>${t('استخرج البيانات ونظّف النصوص تدريجياً ورمّز العبارات بسرعة.')}</p></div></header>
    <section class="tf-section"><div class="tf-label-row"><label for="tf-input">${t('المدخلات')}</label><button id="tf-expand-input" class="tf-expand" type="button">${iconSvg('expand','tf-inline-icon')} <span>${t('توسيع')}</span></button></div><div class="tf-card tf-workspace-card"><textarea id="tf-input" class="tf-textarea" placeholder="${t('ألصق مقالاً أو نصاً يحتوي روابط أو رسائل بريد أو مسافات زائدة أو رموزاً تعبيرية…')}"></textarea></div></section>
    <section class="tf-section"><label class="tf-label" for="tf-extract">${iconSvg('download','tf-inline-icon')} ${t('استخراج وعزل البيانات')}</label><div class="tf-card"><select id="tf-extract" class="tf-select"><option value="">${t('اختر نوع البيانات المراد استخراجها…')}</option><option value="links">${t('روابط URL')}</option><option value="emails">${t('عناوين البريد الإلكتروني')}</option><option value="tags">${t('الوسوم')}</option><option value="phones">${t('أرقام الهواتف')}</option></select><p class="tf-hint">${t('تظهر القيم الفريدة فقط في النتائج الصافية.')}</p></div></section>
    <section class="tf-section"><label class="tf-label">${iconSvg('refresh','tf-inline-icon')} ${t('تنظيف وتصفية العبارات')} <span>${t('تفعيل تراكمي')}</span></label><div class="tf-card"><div id="tf-clean-host"></div><button id="tf-clear" class="tf-clear" type="button">${iconSvg('trash','tf-inline-icon')} ${t('تفريغ الصناديق')}</button></div></section>
    <section class="tf-section"><label class="tf-label" for="tf-encode">${iconSvg('lock','tf-inline-icon')} ${t('الترميز وبايتات الخصوصية')}</label><div class="tf-card"><select id="tf-encode" class="tf-select"><option value="">${t('اختر عملية الترميز أو فكها…')}</option><option value="b64e">${t('ترميز Base64')}</option><option value="b64d">${t('فك ترميز Base64')}</option><option value="urle">${t('ترميز URL')}</option><option value="urld">${t('فك ترميز URL')}</option></select><p class="tf-hint">${t('إن كان الإدخال فارغاً، تستخدم العملية آخر نتيجة تلقائياً.')}</p></div></section>
    <section class="tf-section"><div class="tf-label-row output"><label for="tf-output">${t('المخرجات والنتائج الصافية')}</label><button id="tf-expand-output" class="tf-expand" type="button">${iconSvg('expand','tf-inline-icon')} <span>${t('توسيع')}</span></button></div><div class="tf-card tf-output-card tf-workspace-card"><textarea id="tf-output" class="tf-textarea mono" readonly placeholder="${t('ستظهر النتائج المصفّاة هنا تلقائياً…')}"></textarea><button id="tf-copy" class="tf-copy" type="button">${iconSvg('copy','tf-inline-icon')} ${t('نسخ النتيجة الصافية فوراً')}</button></div></section>
  </section>`;

  const $=<T extends Element>(selector:string)=>required<T>(shell.content,selector);
  const input=$<HTMLTextAreaElement>('#tf-input');
  const output=$<HTMLTextAreaElement>('#tf-output');
  const extract=$<HTMLSelectElement>('#tf-extract');
  const encode=$<HTMLSelectElement>('#tf-encode');
  const extractPicker=enhanceNativeSelect(extract,{accent:'var(--accent-2)'});
  const encodePicker=enhanceNativeSelect(encode,{accent:'var(--accent-2)'});
  const filters={emojis:false,spaces:false,lines:false};
  const setOutput=(text:string,message?:string,error=false)=>{output.value=text;output.dataset.error=String(error);if(message)shell.setStatus(message,error?'error':'success');};
  const cleanPicker=new ArsenalSelect({
    host:$<HTMLElement>('#tf-clean-host'),
    multi:true,
    emptyLabel:t('اختر فلاتر التنظيف…'),
    accent:'var(--accent)',
    options:[
      {value:'emojis',label:t('إزالة الرموز التعبيرية')},
      {value:'spaces',label:t('دمج المسافات')},
      {value:'lines',label:t('إزالة الأسطر الفارغة')},
    ],
    onValuesChange:(values)=>{
      (Object.keys(filters) as CleanFilter[]).forEach((key)=>{filters[key]=values.includes(key);});
      clean();
    },
  });
  const disableFilters=()=>{(Object.keys(filters) as CleanFilter[]).forEach((key)=>filters[key]=false);cleanPicker.setValues([]);};
  const hasActive=()=>Object.values(filters).some(Boolean);
  const clean=()=>{
    let text=input.value;
    if(!text.trim()){setOutput('');return;}
    if(filters.emojis)text=text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,'');
    if(filters.lines)text=text.split('\n').filter((line)=>line.trim()!=='').join('\n');
    if(filters.spaces)text=text.replace(/[ \t]+/g,' ');
    setOutput(text,t('تم تطبيق فلاتر التنظيف النشطة.'));
  };
  const extractData=(kind:Extraction)=>{
    const text=input.value;
    if(!text.trim()){shell.setStatus(t('أدخل نصاً أولاً لاستخراج البيانات.'),'error');return;}
    disableFilters();
    const patterns:Record<Extraction,RegExp>={links:/https?:\/\/[^\s]+/g,emails:/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,tags:/#[\u0600-\u06FFa-zA-Z0-9_]+/g,phones:/\+?[0-9]{7,15}/g};
    const values=[...new Set(text.match(patterns[kind])??[])];
    setOutput(values.length?values.join('\n'):t('لم يتم العثور على بيانات مطابقة في النص.'),values.length?t('تم استخراج البيانات الفريدة.'):t('لم يتم العثور على تطابقات.'),!values.length);
  };
  const processEncoding=(mode:Encoding)=>{
    let text=input.value;
    disableFilters();
    if(!text.trim()&&output.value.trim()){text=output.value;input.value=text;}
    if(!text.trim()){shell.setStatus(t('أدخل نصاً أو أنشئ نتيجة أولاً.'),'error');return;}
    try{
      const actions:Record<Encoding,(value:string)=>string>={b64e:toBase64,b64d:(value)=>fromBase64(value.replace(/\s/g,'')),urle:encodeURIComponent,urld:decodeURIComponent};
      setOutput(actions[mode](text),t('تمت عملية الترميز محلياً.'));
    }catch{setOutput(t('تعذر تنفيذ عملية الترميز. تحقق من صيغة النص المدخل.'),t('تعذر تنفيذ العملية. تحقق من النص أو الصيغة المدخلة.'),true);}
  };
  input.addEventListener('input',()=>{if(hasActive())clean();});
  extract.addEventListener('change',()=>{if(extract.value){extractData(extract.value as Extraction);extract.value='';extractPicker.setValue('');}});
  encode.addEventListener('change',()=>{if(encode.value){processEncoding(encode.value as Encoding);encode.value='';encodePicker.setValue('');}});
  $('#tf-clear').addEventListener('click',()=>{input.value='';output.value='';output.dataset.error='false';disableFilters();shell.setStatus(t('تم تفريغ حقلي الإدخال والإخراج.'),'success');});
  $('#tf-copy').addEventListener('click',async()=>{if(!output.value||output.dataset.error==='true'){shell.setStatus(t('لا توجد نتيجة صحيحة لنسخها.'),'error');return;}try{await navigator.clipboard.writeText(output.value);shell.setStatus(t('تم النسخ إلى الحافظة بنجاح.'),'success');}catch{shell.setStatus(t('تعذر النسخ تلقائياً. انسخ النتيجة يدوياً.'),'error');}});
  const expand=(id:string,area:HTMLTextAreaElement)=>$(id).addEventListener('click',(event)=>{const button=event.currentTarget as HTMLButtonElement;const isExpanded=!area.classList.toggle('expanded');button.classList.toggle('active',isExpanded);const label=button.querySelector('span');if(label)label.textContent=isExpanded?t('طي'):t('توسيع');});
  expand('#tf-expand-input',input);expand('#tf-expand-output',output);
});

function toBase64(value:string):string{const bytes=new TextEncoder().encode(value);let binary='';for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192));return btoa(binary);}
function fromBase64(value:string):string{const binary=atob(value);return new TextDecoder().decode(Uint8Array.from(binary,(character)=>character.charCodeAt(0)));}
function required<T extends Element>(root:ParentNode,selector:string):T{const element=root.querySelector<T>(selector);if(!element)throw new Error(`العنصر المطلوب غير موجود: ${selector}`);return element;}
