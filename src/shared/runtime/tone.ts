declare global {
  interface Window { Tone?: any; }
}

let pending: Promise<any> | null = null;

export async function getTone(): Promise<any> {
  if (window.Tone) return window.Tone;
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/libraries/Tone.js';
      script.async = true;
      script.onload = () => window.Tone ? resolve(window.Tone) : reject(new Error('تعذر تهيئة Tone.js.'));
      script.onerror = () => reject(new Error('تعذر تحميل Tone.js.'));
      document.head.append(script);
    }).catch((error) => { pending = null; throw error; });
  }
  return pending;
}
