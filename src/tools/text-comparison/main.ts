import { bootstrapStandaloneTool } from '@shared/ui/standalone-tool';
import { toolBySlug } from '@shared/tools';
import { iconSvg } from '@shared/ui/icons';
import { t } from '@shared/i18n';
import './text-comparison.css';

type Mode='text'|'code';
type BasicOp<T>={type:'eq';value:T}|{type:'add';value:T}|{type:'del';value:T};
type PairedOp<T>=BasicOp<T>|{type:'pair';deleted:T;added:T};

void bootstrapStandaloneTool('text-comparison',(shell)=>{
  if(!toolBySlug('text-comparison'))throw new Error('تعذر العثور على تعريف مقارنة النصوص.');
  shell.content.innerHTML=`<section class="text-comparison">
    <header class="tc-header">${iconSvg('compare', 'tc-icon')}<div><h1>${t('مقارنة النصوص والكود')}</h1><p>${t('اكشف الفروقات كلمةً بكلمة — تعمل الأداة محلياً بالكامل.')}</p></div></header>
    <section class="tc-mode-row"><span>${t('وضع المقارنة')}</span><div class="tc-mode-toggle"><button id="tc-text-mode" class="active" type="button" aria-pressed="true">${iconSvg('text', 'tc-inline-icon')} ${t('نصوص')} <small>${t('كلمة + حرف')}</small></button><button id="tc-code-mode" type="button" aria-pressed="false">${iconSvg('compare', 'tc-inline-icon')} ${t('كود برمجي')}</button></div></section>
    <label class="tc-label" for="tc-a">${t('النص الأصلي')} <span>${t('المرجع')}</span></label><div id="tc-wrap-a" class="tc-textarea-wrap"><textarea id="tc-a" class="tc-textarea" placeholder="${t('أدخل النص الأساسي القديم هنا…')}"></textarea><b id="tc-lines-a">${t('{count} سطر', { count: 0 })}</b></div>
    <label class="tc-label" for="tc-b">${t('النص الجديد')} <span>${t('بعد التعديل')}</span></label><div id="tc-wrap-b" class="tc-textarea-wrap"><textarea id="tc-b" class="tc-textarea" placeholder="${t('أدخل النص الجديد بعد التعديل…')}"></textarea><b id="tc-lines-b">${t('{count} سطر', { count: 0 })}</b></div>
    <button id="tc-compare" class="tc-compare" type="button">${iconSvg('compare', 'tc-inline-icon')} <strong>${t('ابدأ المقارنة وإظهار الفروقات')}</strong></button>
    <section class="tc-toolbar"><div class="tc-legend"><span class="deleted"><i></i>${t('محذوف')}</span><span class="added"><i></i>${t('مضاف')}</span><span class="equal"><i></i>${t('من دون تغيير')}</span></div><div id="tc-stats" hidden></div></section>
    <section id="tc-result" class="tc-result" aria-live="polite"><p class="tc-empty">${t('أدخل نصين للمقارنة')}</p></section>
    <button id="tc-copy" class="tc-copy" type="button">${iconSvg('copy', 'tc-inline-icon')} <span>${t('نسخ نتيجة المقارنة')}</span></button>
  </section>`;

  const $=<T extends Element>(selector:string)=>required<T>(shell.content,selector);
  const textA=$<HTMLTextAreaElement>('#tc-a');
  const textB=$<HTMLTextAreaElement>('#tc-b');
  const wrapA=$<HTMLElement>('#tc-wrap-a');
  const wrapB=$<HTMLElement>('#tc-wrap-b');
  const result=$<HTMLElement>('#tc-result');
  const stats=$<HTMLElement>('#tc-stats');
  const textMode=$<HTMLButtonElement>('#tc-text-mode');
  const codeMode=$<HTMLButtonElement>('#tc-code-mode');
  let mode:Mode='text';

  const resetResult=()=>{result.classList.toggle('code',mode==='code');result.innerHTML=`<p class="tc-empty">${t('أدخل نصين للمقارنة')}</p>`;stats.hidden=true;};
  const setMode=(next:Mode)=>{
    mode=next;
    const code=mode==='code';
    textMode.classList.toggle('active',!code);codeMode.classList.toggle('active',code);
    textMode.setAttribute('aria-pressed',String(!code));codeMode.setAttribute('aria-pressed',String(code));
    textA.classList.toggle('code',code);textB.classList.toggle('code',code);wrapA.classList.toggle('code',code);wrapB.classList.toggle('code',code);
    resetResult();
  };
  const lineCounter=(value:string)=>t('{count} سطر', { count: value==='' ? 0 : value.split('\n').length });
  const updateCounters=()=>{$<HTMLElement>('#tc-lines-a').textContent=lineCounter(textA.value);$<HTMLElement>('#tc-lines-b').textContent=lineCounter(textB.value);};
  const runComparison=()=>{
    const first=textA.value,second=textB.value;
    result.classList.toggle('code',mode==='code');
    if(!first.trim()&&!second.trim()){resetResult();shell.setStatus(t('أدخل نصاً واحداً على الأقل لبدء المقارنة.'),'error');return;}
    const operations=pairOperations(lcs(first.split('\n'),second.split('\n')));
    let additions=0,deletions=0,lineNumber=0,html='';
    for(const op of operations){
      lineNumber+=1;
      const number=`<b class="tc-line-number">${lineNumber}</b>`;
      if(op.type==='eq')html+=`<div class="tc-line equal">${number}<span>${escapeHtml(op.value)}</span></div>`;
      else if(op.type==='del'){deletions+=1;html+=`<div class="tc-line deleted">${number}<mark>${escapeHtml(op.value)}</mark></div>`;}
      else if(op.type==='add'){additions+=1;html+=`<div class="tc-line added">${number}<mark>${escapeHtml(op.value)}</mark></div>`;}
      else {
        const words=lcs(tokenize(op.deleted,mode==='code'),tokenize(op.added,mode==='code'));
        let deleted='',added='';
        for(const word of words){const safe=escapeHtml(word.value);if(word.type==='eq'){deleted+=`<span>${safe}</span>`;added+=`<span>${safe}</span>`;}else if(word.type==='del'){deleted+=`<mark>${safe}</mark>`;if(word.value.trim())deletions+=1;}else{added+=`<mark>${safe}</mark>`;if(word.value.trim())additions+=1;}}
        html+=`<div class="tc-line deleted">${number}${deleted}</div><div class="tc-line added">${number}${added}</div>`;
      }
    }
    if(!additions&&!deletions&&first.trim()){result.innerHTML=`<p class="tc-identical">${iconSvg('check', 'tc-inline-icon')} ${t('النصان متطابقان تماماً')}</p>`;stats.hidden=true;}
    else{result.innerHTML=html||`<p class="tc-empty">${t('أدخل نصين للمقارنة')}</p>`;stats.innerHTML=`<span class="add">+${additions} ${t('مضاف')}</span><i>·</i><span class="del">-${deletions} ${t('محذوف')}</span>`;stats.hidden=false;}
  };
  textA.addEventListener('input',updateCounters);textB.addEventListener('input',updateCounters);
  textMode.addEventListener('click',()=>setMode('text'));codeMode.addEventListener('click',()=>setMode('code'));
  $('#tc-compare').addEventListener('click',runComparison);
  $('#tc-copy').addEventListener('click',async()=>{const text=result.innerText.trim();if(!text||text===t('أدخل نصين للمقارنة')){shell.setStatus(t('لا توجد نتيجة مقارنة لنسخها.'),'error');return;}try{await navigator.clipboard.writeText(text);}catch{shell.setStatus(t('تعذر النسخ تلقائياً. انسخ النتيجة يدوياً.'),'error');}});
});

function lcs<T>(first:T[],second:T[]):BasicOp<T>[] {
  const rows=first.length,columns=second.length;
  const matrix=Array.from({length:rows+1},()=>new Uint32Array(columns+1));
  for(let row=1;row<=rows;row+=1)for(let column=1;column<=columns;column+=1)matrix[row][column]=first[row-1]===second[column-1]?matrix[row-1][column-1]+1:Math.max(matrix[row-1][column],matrix[row][column-1]);
  const operations:BasicOp<T>[]=[];let row=rows,column=columns;
  while(row>0||column>0){if(row>0&&column>0&&first[row-1]===second[column-1]){operations.push({type:'eq',value:first[row-1]});row-=1;column-=1;}else if(column>0&&(row===0||matrix[row][column-1]>=matrix[row-1][column])){operations.push({type:'add',value:second[column-1]});column-=1;}else{operations.push({type:'del',value:first[row-1]});row-=1;}}
  return operations.reverse();
}
function pairOperations<T>(operations:BasicOp<T>[]):PairedOp<T>[] {const result:PairedOp<T>[]=[];let index=0;while(index<operations.length){if(operations[index].type==='eq'){result.push(operations[index]);index+=1;continue;}const deletions:T[]=[],additions:T[]=[];while(index<operations.length&&operations[index].type==='del')deletions.push(operations[index++].value);while(index<operations.length&&operations[index].type==='add')additions.push(operations[index++].value);const pairs=Math.min(deletions.length,additions.length);for(let pair=0;pair<pairs;pair+=1)result.push({type:'pair',deleted:deletions[pair],added:additions[pair]});for(let rest=pairs;rest<deletions.length;rest+=1)result.push({type:'del',value:deletions[rest]});for(let rest=pairs;rest<additions.length;rest+=1)result.push({type:'add',value:additions[rest]});}return result;}
function tokenize(value:string,code:boolean):string[]{return (code?value.match(/[A-Za-z_$][A-Za-z0-9_$]*|[0-9]+|[^\w\s]|\s+/g):value.match(/\S+|\s+/g))??[''];}
function escapeHtml(value:string):string{return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function required<T extends Element>(root:ParentNode,selector:string):T{const element=root.querySelector<T>(selector);if(!element)throw new Error(`العنصر المطلوب غير موجود: ${selector}`);return element;}
