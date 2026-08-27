declare function importScripts(...urls: string[]): void;
const workerScope = self as unknown as { ort?: unknown; postMessage: (message: unknown, transfer?: Transferable[]) => void };
const MODEL_URL = 'https://huggingface.co/datasets/Silvr0098/arsenal-cdn/resolve/main/isnet-general-use-q8.onnx';
const MODEL_CACHE = 'arsenal-image-remover-model-v1';
// مرآة محلية مطابقة لمحرك وWASM المنصة المنشورة؛ لا تعتمد Worker على CORS خارجي.
const ORT_URL = '/assets/runtime/onnx/ort.min.js';
const ORT_WASM_BASE = '/assets/runtime/onnx/';
const SIZE = 1024;
let session: any;
let ortRuntime: any;

self.onmessage = async (event: MessageEvent<{ type: 'init' | 'run'; payload?: { data: ArrayBuffer; width: number; height: number } }>) => {
  try {
    if (event.data.type === 'init') {
      post('progress', { text: 'يجري تحميل محرك الذكاء الاصطناعي…' });
      importScripts(ORT_URL);
      ortRuntime = workerScope.ort;
      ortRuntime.env.wasm.wasmPaths = ORT_WASM_BASE;
      ortRuntime.env.wasm.numThreads = 1;
      post('progress', { text: 'يجري تحميل نموذج إزالة الخلفية…' });
      session = await ortRuntime.InferenceSession.create(await modelBytes(), { executionProviders: ['wasm'], enableMemPattern: false, enableCpuMemArena: false });
      post('ready'); return;
    }
    if (!session || !event.data.payload) throw new Error('النموذج غير محمّل.');
    post('progress', { text: 'يجري تحليل الصورة محلياً…' });
    const { data, width, height } = event.data.payload;
    const tensor = new ortRuntime.Tensor('float32', preprocess(new Uint8ClampedArray(data), width, height), [1, 3, SIZE, SIZE]);
    const inputName = session.inputNames?.[0] || 'input';
    const result = await session.run({ [inputName]: tensor });
    const outputName = session.outputNames?.[0] || Object.keys(result)[0];
    const output = outputName ? result[outputName] : undefined;
    if (!output?.data) throw new Error('تعذر قراءة مخرجات نموذج إزالة الخلفية.');
    const raw = output.data as Float32Array;
    const mask = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) mask[i] = raw[i] > .3 ? raw[i] : 0;
    post('done', { mask: mask.buffer }, [mask.buffer]);
  } catch (error) { post('error', { message: error instanceof Error ? error.message : String(error) }); }
};
async function modelBytes(): Promise<ArrayBuffer> {
  const cacheStorage = typeof globalThis.caches === 'undefined' ? null : globalThis.caches;
  if (cacheStorage) {
    try {
      const cache = await cacheStorage.open(MODEL_CACHE);
      const cached = await cache.match(MODEL_URL);
      if (cached) return cached.arrayBuffer();
    } catch {
      // التخزين المؤقت تحسين اختياري؛ غيابه لا يجب أن يمنع تشغيل الأداة.
    }
  }
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`تعذر تنزيل النموذج (${response.status}).`);
  const buffer = await response.arrayBuffer();
  if (cacheStorage) {
    try {
      const cache = await cacheStorage.open(MODEL_CACHE);
      await cache.put(MODEL_URL, new Response(buffer.slice(0), { headers: { 'Content-Type': 'application/octet-stream' } }));
    } catch {
      // نكمل بلا cache عند HTTP محلي أو متصفح لا يتيح Cache API داخل Worker.
    }
  }
  return buffer;
}
function preprocess(rgba: Uint8ClampedArray, width: number, height: number): Float32Array { const result = new Float32Array(3 * SIZE * SIZE); for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) { const sx = Math.min(width - 1, Math.floor(x * width / SIZE)); const sy = Math.min(height - 1, Math.floor(y * height / SIZE)); const source = (sy * width + sx) * 4; const destination = y * SIZE + x; result[destination] = (rgba[source] - 128) / 256; result[SIZE * SIZE + destination] = (rgba[source + 1] - 128) / 256; result[2 * SIZE * SIZE + destination] = (rgba[source + 2] - 128) / 256; } return result; }
function post(type: string, payload: Record<string, unknown> = {}, transfer: Transferable[] = []): void { workerScope.postMessage({ type, ...payload }, transfer); }
