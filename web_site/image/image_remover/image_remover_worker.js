const SIZE = 1024;

let session = null;
let _ort    = null;

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'init') {
        try {
            self.postMessage({ type: 'progress', text: 'جاري تحميل المحرك...' });

            importScripts(payload.ortUrl);
            _ort = globalThis.ort;

            _ort.env.wasm.wasmPaths  = payload.wasmBasePath;
            _ort.env.wasm.numThreads = 1;

            self.postMessage({ type: 'progress', text: 'جاري تحميل النموذج...' });

            const modelUrl = payload.modelBasePath + 'isnet_general/isnet-general-use-q8.onnx';

            session = await _ort.InferenceSession.create(modelUrl, {
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
