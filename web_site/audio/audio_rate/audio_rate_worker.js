// ============================================================
//  Slowed Studio Worker — معالجة التصدير على thread منفصل
//  يأخذ: channels + rate + reverb settings
//  يرجع: AudioBuffer جاهز للتصدير
// ============================================================

self.onmessage = async (e) => {
    const { type, payload } = e.data;
    if (type !== 'render') return;

    const {
        channels,
        sampleRate,
        rate,
        reverbOn,
        reverbDecay,
        reverbMix,
    } = payload;

    try {
        self.postMessage({ type: 'progress', pct: 5, label: 'جاري تجهيز الصوت...' });

        const numCh     = channels.length;
        const srcLength = channels[0].length;

        // ── 1. تطبيق السرعة عبر OfflineAudioContext ──────────
        const outDuration = srcLength / sampleRate / rate;
        const outLength   = Math.ceil(outDuration * sampleRate);
        const offCtx      = new OfflineAudioContext(numCh, outLength, sampleRate);

        // بناء AudioBuffer من الـ channels
        const srcBuf = offCtx.createBuffer(numCh, srcLength, sampleRate);
        for (let c = 0; c < numCh; c++) {
            srcBuf.copyToChannel(new Float32Array(channels[c]), c);
        }

        self.postMessage({ type: 'progress', pct: 15, label: 'جاري تطبيق السرعة...' });

        // Reverb عبر ConvolverNode يدوي (بدون Tone.js)
        let destination = offCtx.destination;
        let dryGain, wetGain, convolver;

        if (reverbOn && reverbMix > 0) {
            // نولّد impulse response يدوياً
            const revSR     = sampleRate;
            const revLen    = Math.floor(reverbDecay * revSR);
            const irBuf     = offCtx.createBuffer(2, revLen, revSR);
            for (let c = 0; c < 2; c++) {
                const ch = irBuf.getChannelData(c);
                for (let i = 0; i < revLen; i++) {
                    ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 2);
                }
            }

            convolver           = offCtx.createConvolver();
            convolver.buffer    = irBuf;
            dryGain             = offCtx.createGain();
            wetGain             = offCtx.createGain();
            dryGain.gain.value  = 1 - reverbMix;
            wetGain.gain.value  = reverbMix;

            convolver.connect(wetGain);
            wetGain.connect(offCtx.destination);
            dryGain.connect(offCtx.destination);
            destination = dryGain;

            // convolver يحتاج input منفصل
            const wetSrc = offCtx.createBufferSource();
            wetSrc.buffer       = srcBuf;
            wetSrc.playbackRate.value = rate;
            wetSrc.connect(convolver);
            wetSrc.start(0);

            self.postMessage({ type: 'progress', pct: 30, label: 'جاري تطبيق الصدى...' });
        }

        const src = offCtx.createBufferSource();
        src.buffer             = srcBuf;
        src.playbackRate.value = rate;
        src.connect(destination);
        src.start(0);

        self.postMessage({ type: 'progress', pct: 40, label: 'جاري التصيير...' });

        const rendered = await offCtx.startRendering();

        self.postMessage({ type: 'progress', pct: 90, label: 'جاري التجهيز النهائي...' });

        // ── 2. نرجع البيانات للـ main thread ──────────────────
        const numChOut  = rendered.numberOfChannels;
        const outChs    = [];
        const transfers = [];

        for (let c = 0; c < numChOut; c++) {
            const ch = rendered.getChannelData(c).slice();
            outChs.push(ch);
            transfers.push(ch.buffer);
        }

        self.postMessage({
            type: 'done',
            buffer: {
                channels:    outChs,
                sampleRate:  rendered.sampleRate,
                length:      rendered.length,
                duration:    rendered.duration,
                numberOfChannels: numChOut,
                // نحاكي AudioBuffer API لأن audioBufferToWav يحتاجه
                getChannelData: null, // سيُعاد بناؤه في main thread
            }
        }, transfers);

    } catch (err) {
        self.postMessage({ type: 'error', error: err.message });
    }
};
