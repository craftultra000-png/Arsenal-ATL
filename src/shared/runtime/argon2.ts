export type Argon2Module = {
  HEAPU8: Uint8Array;
  _malloc(size:number):number;
  _free(pointer:number):void;
  _argon2_hash(
    timeCost:number,
    memoryCost:number,
    parallelism:number,
    passwordPointer:number,
    passwordLength:number,
    saltPointer:number,
    saltLength:number,
    hashPointer:number,
    hashLength:number,
    encodedPointer:number,
    encodedLength:number,
    type:number,
  ):number;
};

type Argon2Bootstrap = Partial<Argon2Module> & {
  onRuntimeInitialized?:()=>void;
  locateFile?:(file:string,prefix:string)=>string;
};

declare global { interface Window { Module?:Argon2Bootstrap } }

let pending:Promise<Argon2Module>|undefined;

export function getArgon2():Promise<Argon2Module>{
  const ready=window.Module as Argon2Module|undefined;
  if(ready?._argon2_hash)return Promise.resolve(ready);
  if(pending)return pending;
  pending=new Promise<Argon2Module>((resolve,reject)=>{
    const timeout=window.setTimeout(()=>reject(new Error('انتهت مهلة تحميل Argon2.')),20000);
    const bootstrap:Argon2Bootstrap={
      locateFile:(file)=>`/libraries/${file}`,
      onRuntimeInitialized:()=>{
        const module=window.Module as Argon2Module|undefined;
        if(module?._argon2_hash){window.clearTimeout(timeout);resolve(module);}
        else {window.clearTimeout(timeout);reject(new Error('تعذر تهيئة Argon2.'));}
      },
    };
    window.Module=bootstrap;
    const script=document.createElement('script');
    script.src='/libraries/argon2.js';
    script.async=true;
    // ملف JavaScript يعرّف أغلفة الدوال قبل اكتمال تنزيل WASM؛ الجاهزية الصحيحة لا تأتي إلا من onRuntimeInitialized.
    script.onerror=()=>{window.clearTimeout(timeout);reject(new Error('تعذر تحميل مكتبة Argon2.'));};
    document.head.append(script);
  }).catch((error)=>{pending=undefined;throw error;});
  return pending;
}
