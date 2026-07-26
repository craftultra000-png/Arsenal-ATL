// ============================================================
//  Noise Remover Worker — DeepFilterNet dpdfnet8_48khz_hr
//  نمط Arsenal: يستقبل ortUrl من main thread
// ============================================================

let onnxSession = null;
const SR         = 48000;
const N_FFT      = 960;
const HOP        = 480;
const FREQ_BINS  = 481;
const STATE_SIZE = 90228;

const VORBIS_WIN = new Float32Array(N_FFT);
for (let i = 0; i < N_FFT; i++) {
    VORBIS_WIN[i] = Math.sin(Math.PI / 2 * (Math.sin(Math.PI * i / N_FFT) ** 2));
}

const SIN_TABLE = new Float32Array(N_FFT * (N_FFT / 2 + 1));
const COS_TABLE = new Float32Array(N_FFT * (N_FFT / 2 + 1));
for (let k = 0; k <= N_FFT / 2; k++) {
    const base = (2 * Math.PI * k) / N_FFT;
    for (let t = 0; t < N_FFT; t++) {
        COS_TABLE[k * N_FFT + t] = Math.cos(base * t);
        SIN_TABLE[k * N_FFT + t] = Math.sin(base * t);
    }
}

self.onmessage = async (e) => {
    const { type, data } = e.data;

    // ── init: يستقبل ortUrl من main thread مثل image_remover ──
    if (type === 'init') {
        try {
            const { onnxBytes, ortUrl } = data;

            // تحميل ORT من نفس مسار المنصة
            if (ortUrl) {
                importScripts(ortUrl);
            } else {
                // fallback — نبحث في المسارات الشائعة
                try {
                    importScripts('../core/core_app/ort.min.js');
                } catch {
                    importScripts('ort.min.js');
                }
            }

            // تحديد مسار الـ wasm files
            const wasmBasePath = ortUrl
                ? ortUrl.substring(0, ortUrl.lastIndexOf('/') + 1)
                : '../core/core_app/';
            ort.env.wasm.wasmPaths  = wasmBasePath;
            ort.env.wasm.numThreads = 1;
            onnxSession = await ort.InferenceSession.create(onnxBytes, {
                executionProviders: ['wasm'],
            });
            self.postMessage({ type: 'init-ok' });
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }

    // ── process ──────────────────────────────────────────────
    if (type === 'process') {
        try {
            const audio = data;
            let state   = new Float32Array(STATE_SIZE);

            const padded = new Float32Array(audio.length + N_FFT);
            padded.set(audio, N_FFT / 2);
            const totalFrames = Math.floor((padded.length - N_FFT) / HOP) + 1;

            const enhancedAudio = new Float32Array((totalFrames - 1) * HOP + N_FFT);
            const weightWindow  = new Float32Array(enhancedAudio.length);

            for (let f = 0; f < totalFrames; f++) {
                const offset = f * HOP;
                const frame  = new Float32Array(N_FFT);
                for (let i = 0; i < N_FFT; i++) {
                    frame[i] = padded[offset + i] * VORBIS_WIN[i];
                }

                const [re, im] = rfft(frame);

                const feat = new Float32Array(FREQ_BINS * 2);
                for (let i = 0; i < FREQ_BINS; i++) {
                    feat[i * 2]     = re[i];
                    feat[i * 2 + 1] = im[i];
                }

                const feeds = {
                    'spec':     new ort.Tensor('float32', feat,  [1, 1, FREQ_BINS, 2]),
                    'state_in': new ort.Tensor('float32', state, [STATE_SIZE])
                };

                const output = await onnxSession.run(feeds);
                state = new Float32Array(output['state_out'].data);

                const outSpec = output['spec_e'].data;
                const enhRe   = new Float32Array(FREQ_BINS);
                const enhIm   = new Float32Array(FREQ_BINS);
                for (let i = 0; i < FREQ_BINS; i++) {
                    enhRe[i] = outSpec[i * 2];
                    enhIm[i] = outSpec[i * 2 + 1];
                }

                const enhFrame = irfft(enhRe, enhIm, N_FFT);
                for (let i = 0; i < N_FFT; i++) {
                    enhancedAudio[offset + i] += enhFrame[i] * VORBIS_WIN[i];
                    weightWindow[offset + i]  += VORBIS_WIN[i] * VORBIS_WIN[i];
                }

                if (f % 50 === 0) {
                    self.postMessage({
                        type: 'progress',
                        data: {
                            pct:   Math.floor((f / totalFrames) * 100),
                            label: `جاري معالجة الإطار ${f} من ${totalFrames}…`
                        }
                    });
                }
            }

            for (let i = 0; i < enhancedAudio.length; i++) {
                if (weightWindow[i] > 1e-10) enhancedAudio[i] /= weightWindow[i];
            }

            const result = enhancedAudio.slice(N_FFT / 2, N_FFT / 2 + audio.length);
            self.postMessage({ type: 'done', data: result }, [result.buffer]);

        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    }
};

function rfft(signal) {
    const n = signal.length;
    const re = new Float32Array(n / 2 + 1);
    const im = new Float32Array(n / 2 + 1);
    for (let k = 0; k <= n / 2; k++) {
        let r = 0, i = 0;
        const base = k * n;
        for (let t = 0; t < n; t++) {
            r += signal[t] * COS_TABLE[base + t];
            i -= signal[t] * SIN_TABLE[base + t];
        }
        re[k] = r; im[k] = i;
    }
    return [re, im];
}

function irfft(re, im, n) {
    const out = new Float32Array(n);
    const nyq = n / 2;
    for (let t = 0; t < n; t++) {
        let val = re[0];
        for (let k = 1; k < nyq; k++) {
            val += 2 * (re[k] * COS_TABLE[k * n + t] - im[k] * SIN_TABLE[k * n + t]);
        }
        val += re[nyq] * COS_TABLE[nyq * n + t];
        out[t] = val / n;
    }
    return out;
}
