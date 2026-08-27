export interface LameEncoder {
  encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
  flush(): Int8Array;
}

export interface LameLibrary {
  Mp3Encoder: new (channels: number, sampleRate: number, bitrateKbps: number) => LameEncoder;
}

declare global {
  interface Window { lamejs?: LameLibrary; }
}

let libraryPromise: Promise<LameLibrary> | null = null;

export function getLame(): Promise<LameLibrary> {
  if (window.lamejs) return Promise.resolve(window.lamejs);
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise<LameLibrary>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/libraries/lame.min.js';
    script.async = true;
    script.onload = () => window.lamejs ? resolve(window.lamejs) : reject(new Error('تعذر تهيئة مكتبة ترميز MP3.'));
    script.onerror = () => reject(new Error('تعذر تحميل مكتبة ترميز MP3.'));
    document.head.append(script);
  }).catch((error) => { libraryPromise = null; throw error; });
  return libraryPromise;
}
