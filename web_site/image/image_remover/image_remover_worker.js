const SIZE        = 1024;
const MODEL_URL   = 'https://huggingface.co/datasets/Silvr0098/arsenal-cdn/resolve/main/isnet-general-use-q8.onnx';
const MODEL_CACHE = 'arsenal-image-remover-model-v1';

let session = null;
let _ort    = null;

// ── تحميل النموذج مع كاش ─────────────────────────────────────
async function loadModelBytes() {
    // ① تحقق من الكاش أولاً
    try {
        const cache  = await caches.open(MODEL_CACHE);
        const cached = await cache.match(MODEL_URL);
        if (cached) {
            self.postMessage({ type: 'progress', text: 'النموذج محفوظ محلياً ✓' });
            return await cached.arrayBuffer();
        }
    } catch (_) {}

    // ② تحميل من الشبكة
    self.postMessage({ type: 'progress', text: 'جاري تحميل النموذج...' });
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();

    // ③ حفظ في الكاش
    try {
        const cache = await caches.open(MODEL_CACHE);
        await cache.put(MODEL_URL, new Response(buffer.slice(0), {
            headers: { 'Content-Type': 'application/octet-stream' }
        }));
    } catch (_) {}

    return buffer;
}

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'init') {
        try {
            self.postMessage({ type: 'progress', text: 'جاري تحميل المحرك...' });

            importScripts(payload.ortUrl);
            _ort = globalThis.ort;

            _ort.env.wasm.wasmPaths  = payload.wasmBasePath;
            _ort.env.wasm.numThreads = 1;

            const modelBuffer = await loadModelBytes();
            session = await _ort.InferenceSession.create(modelBuffer, {
                executionProviders: ['wasm'],
                enableMemPattern: false,
                enableCpuMemArena: false,
            });

            self.postMessage({ type: 'ready' });

        } catch (err) {
            self.postMessage({ type: 'error', message: err?.message || String(err) });
        }
    }

    if (type === 'run') {
        if (!session) {
            self.postMessage({ type: 'error', message: 'النموذج غير محمّل' });
            return;
        }

        try {
            self.postMessage({ type: 'progress', text: 'جاري تجهيز الصورة...' });

            const { data, width, height } = payload;
            const inputData   = preprocessImage(new Uint8ClampedArray(data), width, height);
            const inputTensor = new _ort.Tensor('float32', inputData, [1, 3, SIZE, SIZE]);

            self.postMessage({ type: 'progress', text: 'جاري المعالجة بالذكاء الاصطناعي...' });

            const results = await session.run({ input: inputTensor });
            const rawOutput = results['output'].data;

            // post-processing: threshold + morphological
            const maskData = new Float32Array(rawOutput.length);
            for (let i = 0; i < rawOutput.length; i++) {
                maskData[i] = rawOutput[i] > 0.3 ? rawOutput[i] : 0;
            }
            
            const maskBuffer = maskData.buffer.slice(0);
            self.postMessage({ type: 'done', maskBuffer }, [maskBuffer]);

        } catch (err) {
            self.postMessage({ type: 'error', message: err?.message || String(err) });
        }
    }
};

// normalize: (pixel - 128) / 256  حسب README
function preprocessImage(rgba, srcW, srcH) {
    const out = new Float32Array(3 * SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const sx = Math.min(srcW - 1, Math.floor(x * srcW / SIZE));
            const sy = Math.min(srcH - 1, Math.floor(y * srcH / SIZE));
            const si = (sy * srcW + sx) * 4;
            const pi = y * SIZE + x;
            out[0 * SIZE * SIZE + pi] = (rgba[si]     - 128) / 256;
            out[1 * SIZE * SIZE + pi] = (rgba[si + 1] - 128) / 256;
            out[2 * SIZE * SIZE + pi] = (rgba[si + 2] - 128) / 256;
        }
    }
    return out;
}
