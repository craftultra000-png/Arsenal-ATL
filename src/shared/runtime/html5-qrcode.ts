export type Html5QrScanner={
  start(camera:{facingMode:string},config:{fps:number;qrbox:{width:number;height:number}},onSuccess:(decodedText:string)=>void,onError?:(message:string)=>void):Promise<void>;
  stop():Promise<void>;
  clear():Promise<void>;
  scanFile(file:File,showImage?:boolean):Promise<string>;
};

type Html5QrConstructor=new(elementId:string)=>Html5QrScanner;
declare global { interface Window { Html5Qrcode?:Html5QrConstructor } }
let pending:Promise<Html5QrConstructor>|undefined;

export function getHtml5Qrcode():Promise<Html5QrConstructor>{
  if(window.Html5Qrcode)return Promise.resolve(window.Html5Qrcode);
  if(pending)return pending;
  pending=new Promise<Html5QrConstructor>((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='/libraries/html5-qrcode.min.js';script.async=true;
    script.onload=()=>window.Html5Qrcode?resolve(window.Html5Qrcode):reject(new Error('تعذر تهيئة قارئ QR.'));
    script.onerror=()=>reject(new Error('تعذر تحميل مكتبة قارئ QR.'));
    document.head.append(script);
  }).catch((error)=>{pending=undefined;throw error;});
  return pending;
}
