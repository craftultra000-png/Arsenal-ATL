// ==========================================
// محرك Arsenal Share Pro V3 (WebRTC + E2E Encryption)
// يتطلب: qrcode.min.js, html5-qrcode.min.js, jszip.min.js
// ==========================================

(() => {
    // ==========================================
    // 0. فحص دعم المتصفح (Feature Detection)
    // ==========================================
    const BrowserSupport = {
        webrtc: 'RTCPeerConnection' in window,
        barcodeDetector: 'BarcodeDetector' in window,
        webCrypto: !!(window.crypto && window.crypto.subtle),
        clipboard: !!(navigator.clipboard && navigator.clipboard.writeText),

        // فحص شامل قبل أي محاولة استخدام WebRTC
        checkWebRTCOrFail() {
            if (!this.webrtc) {
                toast.show(t('shr_err_no_webrtc'), 'error', 6000);
                uiManager.log(t('shr_err_no_webrtc'), 'error');
                return false;
            }
            if (!this.webCrypto) {
                toast.show(t('shr_err_no_crypto'), 'error', 6000);
                uiManager.log(t('shr_err_no_crypto'), 'error');
                return false;
            }
            return true;
        }
    };

    // ==========================================
    // 1. محرك التشفير (مبني على نفس منطق محرك الترسانة الأساسي)
    // AES-256-GCM + PBKDF2 — مُكيّف للعمل على ArrayBuffer كامل
    // ==========================================
    const CryptoEngine = {
        // توليد مفتاح عشوائي آمن تشفيرياً (32 بايت = 256-بت) — يتولّد تلقائياً لكل جلسة
        generateSessionKey() {
            const array = new Uint8Array(32);
            window.crypto.getRandomValues(array);
            return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        },

        hexToBytes(hex) {
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
            return bytes;
        },

        // استيراد مفتاح hex مباشرة كمفتاح AES-GCM (بدون PBKDF2، لأنه عشوائي أصلاً وليس كلمة مرور بشرية)
        async importSessionKey(hexKey) {
            const keyBytes = this.hexToBytes(hexKey);
            return window.crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
        },

        // تشفير ArrayBuffer كامل (الملف بأكمله قبل التقطيع لـchunks)
        // الصيغة الناتجة: iv(12 بايت) + ciphertext — IV واحد فريد لكل ملف
        async encryptBuffer(arrayBuffer, hexKey) {
            const key = await this.importSessionKey(hexKey);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, arrayBuffer);

            const cipherBytes = new Uint8Array(ciphertext);
            const payload = new Uint8Array(12 + cipherBytes.length);
            payload.set(iv, 0);
            payload.set(cipherBytes, 12);
            return payload.buffer;
        },

        // فك تشفير الـ payload الكامل بعد اكتمال استقبال كل الـchunks
        async decryptBuffer(payloadBuffer, hexKey) {
            const key = await this.importSessionKey(hexKey);
            const payload = new Uint8Array(payloadBuffer);
            const iv = payload.slice(0, 12);
            const ciphertext = payload.slice(12);
            const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
            return decrypted;
        }
    };

    // ==========================================
    // 2. نظام التنبيهات المنبثقة (Toast) + Notification API
    // ==========================================
    class ToastManager {
        constructor() {
            this.container = document.getElementById('toast-container');
            this.notifPermissionAsked = false;
        }

        show(message, type = 'info', duration = 3500) {
            const el = document.createElement('div');
            el.className = `toast-item toast-${type}`;
            el.innerText = message;
            this.container.appendChild(el);

            setTimeout(() => {
                el.classList.add('toast-out');
                setTimeout(() => el.remove(), 250);
            }, duration);

            // إشعار نظام حقيقي للأحداث المهمة فقط (لتجنب الإزعاج)، فقط عندما تكون الصفحة غير مرئية
            if ((type === 'success' || type === 'error') && document.hidden) {
                this.sendSystemNotification(message);
            }
        }

        async sendSystemNotification(message) {
            if (!('Notification' in window)) return;
            if (Notification.permission === 'granted') {
                new Notification('Arsenal Share', { body: message, silent: false });
            } else if (Notification.permission !== 'denied' && !this.notifPermissionAsked) {
                this.notifPermissionAsked = true;
                const perm = await Notification.requestPermission();
                if (perm === 'granted') new Notification('Arsenal Share', { body: message });
            }
        }
    }

    // ==========================================
    // 3. آلة الحالة (State Machine) — موسّعة مع completed
    // ==========================================
    class AppState extends EventTarget {
        constructor() {
            super();
            this.state = 'idle'; // idle, connecting, connected, transferring, completed, error
        }

        setState(newState, msg = "") {
            if (this.state === newState) return;
            const prevState = this.state;
            this.state = newState;
            uiManager.updateStateIndicator(newState, msg);
            this.dispatchEvent(new CustomEvent('statechange', { detail: { state: newState, prevState, msg } }));
        }

        // اسم بديل أوضح دلالياً — يُستخدم تحديداً عند تغييرات اتصال WebRTC
        setConnectionState(newState, msg = "") {
            this.setState(newState, msg);
        }

        switchTab(tabName) {
            document.querySelectorAll('.shr-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.shr-tab-content').forEach(c => c.classList.remove('active'));
            if (tabName === 'host') {
                document.querySelector('.shr-tab-btn:nth-child(1)').classList.add('active');
                document.getElementById('tab-host').classList.add('active');
            } else {
                document.querySelector('.shr-tab-btn:nth-child(2)').classList.add('active');
                document.getElementById('tab-guest').classList.add('active');
                qrManager.initScanner();
            }
        }
    }

    // ==========================================
    // 4. مدير واجهة المستخدم (UI & Logs)
    // ==========================================
    class UIManager {
        updateStateIndicator(state, msg) {
            const ind = document.getElementById('ui-state-indicator');
            const text = document.getElementById('state-text');
            // نحافظ على الكلاسات الثابتة (shr-card shr-state-card) ونستبدل فقط كلاس الحالة
            ind.className = `shr-card shr-state-card state-${state}`;

            const states = {
                'idle':         t('share_state_idle'),
                'connecting':   t('share_state_connecting'),
                'connected':    t('share_state_connected'),
                'transferring': t('share_state_transferring'),
                'completed':    t('shr_state_completed'),
                'error':        t('share_state_error')
            };
            text.innerText = msg || states[state] || state;
        }

        log(msg, type = 'info') {
            const logs = document.getElementById('system-logs');
            const time = new Date().toLocaleTimeString();
            logs.insertAdjacentHTML('afterbegin', `<div class="sys-log log-${type}">[${time}] ${msg}</div>`);
        }

        showCameraError(msg) {
            this.log(msg, "error");
            const container = document.getElementById('qr-reader-container');
            if (container) {
                container.innerHTML = `<div class="camera-error-box">${msg}</div>`;
            }
        }

        startIceProgress(totalMs, onTimeout) {
            this.stopIceProgress();
            const text = document.getElementById('state-text');
            const totalSec = Math.ceil(totalMs / 1000);
            let elapsedSec = 0;

            const render = () => {
                text.innerText = t('share_ice_searching', { current: elapsedSec, total: totalSec });
            };
            render();

            this._iceInterval = setInterval(() => {
                elapsedSec++;
                if (elapsedSec >= totalSec) {
                    clearInterval(this._iceInterval);
                    this._iceInterval = null;
                    return;
                }
                render();
            }, 1000);

            this._iceTimeout = setTimeout(() => {
                this.stopIceProgress();
                if (typeof onTimeout === 'function') onTimeout();
            }, totalMs);
        }

        stopIceProgress() {
            if (this._iceInterval) { clearInterval(this._iceInterval); this._iceInterval = null; }
            if (this._iceTimeout) { clearTimeout(this._iceTimeout); this._iceTimeout = null; }
        }

        async copyText(id) {
            const el = document.getElementById(id);
            if (!BrowserSupport.clipboard) {
                toast.show(t('share_log_copy_fail'), 'error');
                return;
            }
            try {
                await navigator.clipboard.writeText(el.value);
                toast.show(t('share_log_copied'), 'success');
                this.log(t('share_log_copied'), "success");
            } catch (err) {
                toast.show(t('share_log_copy_fail'), 'error');
                this.log(t('share_log_copy_fail'), "error");
            }
        }

        formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        showRetryIndicator(attempt, max) {
            this.hideRetryIndicator();
            const panel = document.getElementById('ui-state-indicator');
            const el = document.createElement('div');
            el.id = 'retry-indicator-el';
            el.className = 'retry-indicator';
            el.innerText = t('shr_retry_attempt', { current: attempt, max: max });
            panel.insertAdjacentElement('afterend', el);
        }

        hideRetryIndicator() {
            const el = document.getElementById('retry-indicator-el');
            if (el) el.remove();
        }
    }

    // ==========================================
    // 5. إدارة الـ QR Codes — مع دعم BarcodeDetector الأسرع عند توفره
    // ==========================================
    class QRManager {
        generateQR(elementId, text) {
            const el = document.getElementById(elementId);
            el.innerHTML = "";
            // حجم أكبر (280) + مستوى تصحيح أخطاء L (الأخف) لأن الـpayload كبير جداً (SDP كامل + مفتاح التشفير)
            // مستوى تصحيح أعلى مع payload كبير يزيد كثافة البكسلات لدرجة يصعب قراءتها بكاميرا هاتف عادية
            new QRCode(el, { text: text, width: 280, height: 280, colorDark: "#000", colorLight: "#fff", correctLevel: QRCode.CorrectLevel.L });
        }

        async initScanner() {
            if (this.isCameraScanning || this.nativeDetectorActive) return;

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                uiManager.showCameraError(t('share_log_no_camera'));
                return;
            }

            // ملاحظة هامة: لا نقوم بفحص صلاحية مسبق عبر getUserMedia منفصل هنا
            // لأن فتح وإغلاق الكاميرا مرتين متتاليتين (فحص ثم فتح فعلي) قد يسبب
            // فشلاً صامتاً على بعض هواتف Android — Html5Qrcode.start() ذاتها
            // تتولى طلب الصلاحية، ونتعامل مع الرفض عبر .catch() الخاص بها مباشرة

            // ملاحظة: BarcodeDetector مُعطّل مؤقتاً رغم وجوده بـwindow على بعض الأجهزة —
            // دعمه الفعلي غير مستقر (يعتمد على توفر face-detection بنظام التشغيل نفسه)
            // ونعتمد كلياً على Html5Qrcode المُثبتة عملها بشكل موثوق
            this.startLiveScan();
        }

        // المسح المباشر عبر Html5Qrcode.start() مباشرة على الـcontainer — نفس الآلية المُثبتة عمل في أداة qr_generator
        startLiveScan() {
            this.stopLiveScan();
            this.isCameraScanning = true;

            const container = document.getElementById('qr-reader-container');
            container.innerHTML = '<div id="webcam-preview-region"></div>';

            this.html5QrScanner = new Html5Qrcode("webcam-preview-region");
            const config = { fps: 10, qrbox: { width: 220, height: 220 } };

            this.html5QrScanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    if (!this.isCameraScanning) return; // منع تكرار التشغيل بعد التوقف
                    document.getElementById('guest-offer-input').value = decodedText;
                    uiManager.log(t('share_log_qr_captured'), "success");
                    toast.show(t('share_log_qr_captured'), 'success');
                    this.stopLiveScan();
                },
                () => { /* فشل قراءة فريم واحد أمر طبيعي جداً، يُتجاهل بصمت */ }
            ).catch((err) => {
                this.isCameraScanning = false;
                uiManager.showCameraError(t('share_log_camera_denied'));
            });
        }

        stopLiveScan() {
            this.isCameraScanning = false;
            if (this.html5QrScanner) {
                this.html5QrScanner.stop()
                    .then(() => this.html5QrScanner.clear())
                    .catch(() => {})
                    .finally(() => { this.html5QrScanner = null; });
            }
        }

        async initNativeDetector() {
            try {
                const container = document.getElementById('qr-reader-container');
                const video = document.createElement('video');
                video.setAttribute('playsinline', '');
                video.autoplay = true;
                video.style.width = '100%';
                video.style.borderRadius = '10px';
                container.innerHTML = '';
                container.appendChild(video);

                this._nativeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                video.srcObject = this._nativeStream;
                this.nativeDetectorActive = true;

                const detector = new BarcodeDetector({ formats: ['qr_code'] });
                const scanLoop = async () => {
                    if (!this.nativeDetectorActive) return;
                    try {
                        const barcodes = await detector.detect(video);
                        if (barcodes.length > 0) {
                            document.getElementById('guest-offer-input').value = barcodes[0].rawValue;
                            this.stopNativeDetector();
                            uiManager.log(t('share_log_qr_captured'), "success");
                            toast.show(t('share_log_qr_captured'), 'success');
                            return;
                        }
                    } catch (e) { /* فشل فريم واحد طبيعي */ }
                    requestAnimationFrame(scanLoop);
                };
                requestAnimationFrame(scanLoop);
            } catch (err) {
                // فشل المسح الأصلي — نسقط للآلية المضمونة Html5Qrcode
                this.nativeDetectorActive = false;
                this.startLiveScan();
            }
        }

        stopNativeDetector() {
            this.nativeDetectorActive = false;
            if (this._nativeStream) {
                this._nativeStream.getTracks().forEach(t => t.stop());
                this._nativeStream = null;
            }
        }

        stopAll() {
            this.stopLiveScan();
            this.stopNativeDetector();
        }
    }
    // ==========================================
    // 6. مرسل الملفات (Chunking مفصول + JSZip + RAF + تشفير)
    // ==========================================
    class FileSender {
        constructor(dc) {
            this.dc = dc;
            this.chunkSize = 64 * 1024; // 64KB
            this.isTransferring = false;
            this.abortController = null;
            this.pendingFile = null; // الملف بانتظار التأكيد/إعادة التسمية
        }

        // المرحلة 1: استقبال الملفات المُختارة — تجهيز + معاينة قبل الإرسال الفعلي
        async handleFileSelection(files) {
            if (!files || files.length === 0) return;
            if (this.isTransferring) { uiManager.log(t('share_log_transfer_active'), "warn"); toast.show(t('share_log_transfer_active'), 'warn'); return; }

            let finalFile;
            if (files.length === 1 && !files[0].webkitRelativePath) {
                finalFile = files[0];
            } else {
                uiManager.log(t('share_log_zipping'), "info");
                const zip = new JSZip();
                for (let f of files) {
                    const path = f.webkitRelativePath || f.name;
                    zip.file(path, f);
                }
                // ضغط خفيف (DEFLATE level 3) — توازن سريع مناسب للنقل اللحظي، أفضل من STORE بدون أي ضغط
                const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 3 } });
                finalFile = new File([blob], "Arsenal_Archive.zip", { type: "application/zip" });
            }

            if (finalFile.size === 0) { uiManager.log(t('share_log_empty_file'), "error"); toast.show(t('share_log_empty_file'), 'error'); return; }

            // نعرض صندوق المعاينة بدل الإرسال الفوري — يسمح بإعادة التسمية
            this.pendingFile = finalFile;
            this.showPreview(finalFile);
        }

        showPreview(file) {
            const box = document.getElementById('file-preview-box');
            const nameInput = document.getElementById('file-rename-input');
            const sizeEl = document.getElementById('file-preview-size');
            nameInput.value = file.name;
            sizeEl.innerText = uiManager.formatBytes(file.size);
            box.style.display = 'block';
        }

        cancelPreview() {
            this.pendingFile = null;
            document.getElementById('file-preview-box').style.display = 'none';
        }

        // المرحلة 2: المستخدم يضغط "إرسال الآن" — بعد إعادة التسمية الاختيارية
        confirmAndSend() {
            if (!this.pendingFile) return;
            const newName = document.getElementById('file-rename-input').value.trim();
            let fileToSend = this.pendingFile;

            if (newName && newName !== this.pendingFile.name) {
                fileToSend = new File([this.pendingFile], newName, { type: this.pendingFile.type });
            }

            document.getElementById('file-preview-box').style.display = 'none';
            this.pendingFile = null;
            this.sendFile(fileToSend);
        }

        // تقسيم ملف/بيانات إلى أجزاء — دالة مستقلة قابلة لإعادة الاستخدام
        async splitFileIntoChunks(arrayBuffer, chunkSize) {
            const chunks = [];
            let offset = 0;
            while (offset < arrayBuffer.byteLength) {
                chunks.push(arrayBuffer.slice(offset, offset + chunkSize));
                offset += chunkSize;
            }
            return chunks;
        }

        // إرسال جزء واحد عبر الـDataChannel مع احترام الـbackpressure
        async sendChunk(buffer) {
            if (this.dc.bufferedAmount > this.dc.bufferedAmountLowThreshold) {
                await new Promise(resolve => {
                    const listener = () => { this.dc.removeEventListener('bufferedamountlow', listener); resolve(); };
                    this.dc.addEventListener('bufferedamountlow', listener);
                });
            }
            this.dc.send(buffer);
        }

        async sendFile(file) {
            this.isTransferring = true;
            this.abortController = new AbortController();
            appState.setState('transferring');

            document.getElementById('transfer-stats').style.display = 'block';
            document.getElementById('current-file-name').innerText = file.name;

            try {
                // تشفير الملف بأكمله قبل التقطيع — IV واحد فريد لكل ملف
                uiManager.log(t('shr_log_encrypting'), 'info');
                const rawBuffer = await file.arrayBuffer();
                const encryptedBuffer = await CryptoEngine.encryptBuffer(rawBuffer, transferManager.sessionKey);

                // إرسال الـ Meta — الحجم هنا هو حجم البيانات المشفّرة (الفعلي عبر الشبكة)
                this.dc.send(JSON.stringify({ type: 'meta', name: file.name, size: encryptedBuffer.byteLength, mime: file.type, encrypted: true }));

                const startTime = performance.now();
                let offset = 0;
                const totalSize = encryptedBuffer.byteLength;

                const updateUI = () => {
                    if (!this.isTransferring) return;
                    const now = performance.now();
                    const elapsedSec = (now - startTime) / 1000;
                    const speedBps = offset / elapsedSec;
                    const pct = (offset / totalSize) * 100;
                    const etaSec = (totalSize - offset) / speedBps;

                    document.getElementById('main-progress-bar').style.width = `${pct}%`;
                    document.getElementById('transfer-pct').innerText = `${pct.toFixed(1)}%`;
                    document.getElementById('stat-speed').innerText = `${uiManager.formatBytes(speedBps)}/s`;
                    document.getElementById('stat-eta').innerText = isFinite(etaSec) ? `${Math.floor(etaSec)}s` : '--';
                    document.getElementById('stat-transferred').innerText = `${uiManager.formatBytes(offset)} / ${uiManager.formatBytes(totalSize)}`;

                    if (offset < totalSize) requestAnimationFrame(updateUI);
                };
                requestAnimationFrame(updateUI);

                const chunks = await this.splitFileIntoChunks(encryptedBuffer, this.chunkSize);
                for (const chunk of chunks) {
                    if (this.abortController.signal.aborted) throw new Error("Cancelled");
                    await this.sendChunk(chunk);
                    offset += chunk.byteLength;
                }

                this.dc.send(JSON.stringify({ type: 'eof' }));
                uiManager.log(t('share_log_sent', { name: file.name }), "success");
                toast.show(t('share_log_sent', { name: file.name }), 'success');
                appState.setState('completed');
            } catch (e) {
                uiManager.log(t('share_log_send_fail'), "error");
                toast.show(t('share_log_send_fail'), 'error');
                this.dc.send(JSON.stringify({ type: 'cancel' }));
            } finally {
                this.isTransferring = false;
                if (appState.state !== 'completed') appState.setState('connected');
                setTimeout(() => {
                    document.getElementById('transfer-stats').style.display = 'none';
                    if (appState.state === 'completed') appState.setState('connected');
                }, 3000);
            }
        }
    }

    // ==========================================
    // 7. مستقبل الملفات — مع فك تشفير بعد اكتمال كل الأجزاء
    // ==========================================
    class FileReceiver {
        constructor() {
            this.incomingMeta = null;
            this.incomingChunks = [];
            this.receivedBytes = 0;
            this.startTime = 0;
            this.isReceiving = false;
        }

        handleMessage(event) {
            if (typeof event.data === 'string') {
                const msg = JSON.parse(event.data);
                if (msg.type === 'meta') {
                    this.incomingMeta = msg;
                    this.incomingChunks = [];
                    this.receivedBytes = 0;
                    this.startTime = performance.now();
                    this.isReceiving = true;

                    appState.setState('transferring');
                    document.getElementById('transfer-stats').style.display = 'block';
                    document.getElementById('current-file-name').innerText = t('share_receiving', { name: msg.name });
                    this.updateUI();
                }
                else if (msg.type === 'eof') {
                    this.saveFile();
                }
                else if (msg.type === 'cancel') {
                    this.cleanup(t('share_log_remote_cancel'));
                    toast.show(t('share_log_remote_cancel'), 'warn');
                }
            } else if (event.data instanceof ArrayBuffer) {
                this.incomingChunks.push(new Uint8Array(event.data));
                this.receivedBytes += event.data.byteLength;
            }
        }

        updateUI() {
            if (!this.isReceiving || !this.incomingMeta) return;

            const now = performance.now();
            const elapsedSec = (now - this.startTime) / 1000;
            const speedBps = this.receivedBytes / elapsedSec;
            const pct = (this.receivedBytes / this.incomingMeta.size) * 100;
            const etaSec = (this.incomingMeta.size - this.receivedBytes) / speedBps;

            document.getElementById('main-progress-bar').style.width = `${pct}%`;
            document.getElementById('transfer-pct').innerText = `${pct.toFixed(1)}%`;
            document.getElementById('stat-speed').innerText = `${uiManager.formatBytes(speedBps)}/s`;
            document.getElementById('stat-eta').innerText = isFinite(etaSec) ? `${Math.floor(etaSec)}s` : '--';
            document.getElementById('stat-transferred').innerText = `${uiManager.formatBytes(this.receivedBytes)} / ${uiManager.formatBytes(this.incomingMeta.size)}`;

            requestAnimationFrame(() => this.updateUI());
        }

        async saveFile() {
            try {
                // دمج كل الأجزاء المشفّرة بـbuffer واحد ثم فك التشفير دفعة واحدة
                uiManager.log(t('shr_log_decrypting'), 'info');
                const totalLength = this.incomingChunks.reduce((acc, c) => acc + c.byteLength, 0);
                const combined = new Uint8Array(totalLength);
                let pos = 0;
                for (const chunk of this.incomingChunks) {
                    combined.set(chunk, pos);
                    pos += chunk.byteLength;
                }

                const decryptedBuffer = await CryptoEngine.decryptBuffer(combined.buffer, transferManager.sessionKey);

                const blob = new Blob([decryptedBuffer], { type: this.incomingMeta.mime || 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = this.incomingMeta.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                uiManager.log(t('share_log_received', { name: this.incomingMeta.name }), "success");
                toast.show(t('share_log_received', { name: this.incomingMeta.name }), 'success');
                appState.setState('completed');
                this.cleanup();
            } catch (e) {
                // فشل فك التشفير غالباً يعني مفتاح خاطئ أو بيانات تالفة (GCM tag mismatch)
                uiManager.log(t('shr_err_decrypt_fail'), "error");
                toast.show(t('shr_err_decrypt_fail'), 'error', 5000);
                this.cleanup();
            }
        }

        cleanup(errMsg = null) {
            this.isReceiving = false;
            this.incomingChunks = []; // تحرير الذاكرة فوراً
            this.incomingMeta = null;
            if (appState.state !== 'completed') appState.setState('connected');
            if (errMsg) uiManager.log(errMsg, "error");
            setTimeout(() => {
                document.getElementById('transfer-stats').style.display = 'none';
                if (appState.state === 'completed') appState.setState('connected');
            }, 3000);
        }
    }

    // ==========================================
    // 8. المدير المركزي للاتصال (Connection Manager)
    // ==========================================
    class TransferManager {
        constructor() {
            this.pc = null;
            this.dc = null;
            this.rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
            this.sessionKey = null;   // مفتاح التشفير العشوائي لهذه الجلسة — يتولّد عند البدء ويُحقن بالـQR
            this.isHost = false;      // هل هذا الجهاز هو المُضيف (المُرسل الأساسي للعرض)؟

            // إعدادات إعادة المحاولة (Exponential Backoff)
            this.retryCount = 0;
            this.maxRetries = 4;
            this.baseRetryDelayMs = 1000;
            this._retryTimeout = null;
            this._lastRole = null; // 'host' أو 'guest' — نحتاجها لإعادة بدء نفس الدور عند إعادة المحاولة
            this._lastOfferCode = null; // نحتفظ بكود العرض الأصلي لإعادة محاولة الضيف بدون طلب إعادة لصق
        }

        initPC() {
            if (this.pc) this.disconnectAndReset();
            this.pc = new RTCPeerConnection(this.rtcConfig);

            // الاستماع لكلتا الإشارتين معاً — iceconnectionstatechange (مسارات الشبكة)
            // و connectionstatechange (الحالة الشاملة شاملةً DTLS) لاكتشاف الانقطاع بأعلى دقة
            this.pc.oniceconnectionstatechange = () => this._handleConnStateUpdate(this.pc.iceConnectionState);
            if ('onconnectionstatechange' in this.pc) {
                this.pc.onconnectionstatechange = () => this._handleConnStateUpdate(this.pc.connectionState);
            }
        }

        // معالج موحّد لتغييرات حالة الاتصال من أي من المصدرين
        _handleConnStateUpdate(state) {
            if (state === 'connected' || state === 'completed') {
                this.retryCount = 0; // اتصال ناجح — نصفّر عداد المحاولات
                uiManager.hideRetryIndicator();
                appState.setConnectionState('connected');
                document.getElementById('setup-panel').style.display = 'none';
                document.getElementById('transfer-panel').style.display = 'block';
            } else if (state === 'disconnected' || state === 'failed') {
                this.handleConnectionLost();
            }
        }

        // معالجة فقدان الاتصال — يحاول إعادة الاتصال تلقائياً إن أمكن
        handleConnectionLost() {
            // لا نكرر المعالجة إذا كانت إعادة محاولة قيد التنفيذ أصلاً
            if (this._retryTimeout) return;

            uiManager.log(t('shr_log_connection_lost'), "error");

            // لا نعيد المحاولة إذا كان هناك نقل ملف نشط — الأولوية لعدم فقدان البيانات بصمت
            const transferActive = (window.fileSender && window.fileSender.isTransferring) || (window.fileReceiver && window.fileReceiver.isReceiving);

            if (this.retryCount < this.maxRetries && this._lastRole && !transferActive) {
                this.retryConnection();
            } else {
                appState.setConnectionState('error', t('share_state_disconnected'));
                toast.show(t('shr_log_connection_lost'), 'error', 5000);
                uiManager.hideRetryIndicator();
            }
        }

        // إعادة محاولة الاتصال بـExponential Backoff (محاولات محدودة، ليست لانهائية)
        retryConnection() {
            this.retryCount++;
            const delay = this.baseRetryDelayMs * Math.pow(2, this.retryCount - 1); // 1s, 2s, 4s, 8s...

            appState.setConnectionState('connecting', t('shr_retrying'));
            uiManager.showRetryIndicator(this.retryCount, this.maxRetries);
            uiManager.log(t('shr_retry_attempt', { current: this.retryCount, max: this.maxRetries }), 'warn');

            this._retryTimeout = setTimeout(() => {
                this._retryTimeout = null;
                if (this._lastRole === 'host') {
                    this.startHosting(true); // true = إعادة محاولة، نحافظ على نفس sessionKey
                } else if (this._lastRole === 'guest' && this._lastOfferCode) {
                    this.guestAcceptOffer(true, this._lastOfferCode);
                }
            }, delay);
        }

        setupDataChannel(channel) {
            this.dc = channel;
            this.dc.binaryType = 'arraybuffer';
            this.dc.bufferedAmountLowThreshold = 1024 * 512;

            window.fileSender = new FileSender(this.dc);
            window.fileReceiver = new FileReceiver();

            this.dc.onmessage = (e) => window.fileReceiver.handleMessage(e);
            this.dc.onclose = () => this.disconnectAndReset();
        }

        // إنشاء جلسة جديدة كمُضيف (مُرسل) — مع حقن مفتاح تشفير عشوائي ضمن نفس كود العرض/الـQR
        async startHosting(isRetry = false) {
            if (!BrowserSupport.checkWebRTCOrFail()) return;

            this._lastRole = 'host';
            appState.setConnectionState('connecting');
            this.initPC();

            // نولّد مفتاح تشفير جديد فقط إذا لم تكن هذه إعادة محاولة لنفس الجلسة
            if (!isRetry || !this.sessionKey) {
                this.sessionKey = CryptoEngine.generateSessionKey();
            }

            const channel = this.pc.createDataChannel('arsenal-secure-transfer');
            this.setupDataChannel(channel);

            let resolved = false;
            const finalizeOffer = () => {
                if (resolved) return;
                resolved = true;
                uiManager.stopIceProgress();

                // نحقن مفتاح التشفير ضمن نفس payload الـoffer — ينتقل تلقائياً عبر QR/الكود
                const offerPayload = { sdp: this.pc.localDescription, key: this.sessionKey };
                const offerCode = btoa(JSON.stringify(offerPayload));
                document.getElementById('host-offer-input').value = offerCode;
                qrManager.generateQR('host-qrcode-display', offerCode);
                document.getElementById('host-qr-step').style.display = 'block';
                document.getElementById('btn-start-host').style.display = 'none';
            };

            this.pc.onicecandidate = (e) => {
                if (e.candidate === null) finalizeOffer();
            };

            uiManager.startIceProgress(3000, finalizeOffer);

            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
        }

        async hostAcceptAnswer() {
            const answerCode = document.getElementById('host-answer-input').value.trim();
            if (!answerCode) return;
            try {
                const desc = new RTCSessionDescription(JSON.parse(await decompressFromBase64(answerCode)));
                await this.pc.setRemoteDescription(desc);
            } catch (e) {
                uiManager.log(t('share_log_invalid_answer'), "error");
                toast.show(t('share_log_invalid_answer'), 'error');
            }
        }

        // قبول عرض كضيف (مُستقبل) — يستخرج مفتاح التشفير المُحقن تلقائياً من نفس الكود
        async guestAcceptOffer(isRetry = false, forcedOfferCode = null) {
            if (!BrowserSupport.checkWebRTCOrFail()) return;

            this._lastRole = 'guest';
            appState.setConnectionState('connecting');
            const offerCode = forcedOfferCode || document.getElementById('guest-offer-input').value.trim();
            if (!offerCode) return;
            this._lastOfferCode = offerCode; // نحتفظ بها لإعادة المحاولة التلقائية لاحقاً

            this.initPC();
            this.pc.ondatachannel = (e) => this.setupDataChannel(e.channel);

            let resolved = false;
            const finalizeAnswer = async () => {
                if (resolved) return;
                resolved = true;
                uiManager.stopIceProgress();
                const answerCode = await compressToBase64(JSON.stringify(this.pc.localDescription));
                document.getElementById('guest-answer-output').value = answerCode;
                qrManager.generateQR('guest-qrcode-display', answerCode);
                document.getElementById('guest-answer-step').style.display = 'block';
            };

            this.pc.onicecandidate = (e) => {
                if (e.candidate === null) finalizeAnswer();
            };

            try {
                const offerPayload = JSON.parse(atob(offerCode));
                // استخراج مفتاح التشفير المُحقن تلقائياً ضمن نفس الـoffer
                this.sessionKey = offerPayload.key;
                const desc = new RTCSessionDescription(offerPayload.sdp);

                await this.pc.setRemoteDescription(desc);
                const answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);

                uiManager.startIceProgress(3000, finalizeAnswer);
            } catch (e) {
                uiManager.log(t('share_log_invalid_offer'), "error");
                toast.show(t('share_log_invalid_offer'), 'error');
            }
        }

        cancelTransfer() {
            if (window.fileSender && window.fileSender.isTransferring) {
                window.fileSender.abortController.abort();
            }
        }

        disconnectAndReset() {
            // إلغاء أي محاولة إعادة اتصال معلّقة
            if (this._retryTimeout) { clearTimeout(this._retryTimeout); this._retryTimeout = null; }
            this.retryCount = 0;
            this._lastRole = null;
            this._lastOfferCode = null;
            uiManager.hideRetryIndicator();

            if (this.dc) this.dc.close();
            if (this.pc) this.pc.close();
            qrManager.stopAll();

            this.dc = null; this.pc = null;
            appState.setState('idle');

            document.getElementById('setup-panel').style.display = 'block';
            document.getElementById('transfer-panel').style.display = 'none';
            document.getElementById('host-qr-step').style.display = 'none';
            document.getElementById('guest-answer-step').style.display = 'none';
            document.getElementById('btn-start-host').style.display = 'flex';
            document.getElementById('file-preview-box').style.display = 'none';
            document.getElementById('system-logs').innerHTML = '';

            uiManager.log(t('share_log_reset'), "info");
        }
    }

    // ==========================================
    // 9. تهيئة المحركات عالمياً لتعمل مع الـ HTML
    // ==========================================
    window.appState = new AppState();
    window.uiManager = new UIManager();
    window.qrManager = new QRManager();
    window.transferManager = new TransferManager();
    window.toast = new ToastManager();

    // حماية إغلاق الصفحة أثناء النقل — عبر 3 آليات معاً لأقصى موثوقية
    function isTransferActive() {
        return (window.fileSender && window.fileSender.isTransferring) || (window.fileReceiver && window.fileReceiver.isReceiving);
    }

    window.addEventListener('beforeunload', (e) => {
        if (isTransferActive()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // pagehide يلتقط أيضاً حالات الإغلاق على الموبايل التي لا يلتقطها beforeunload دائماً (bfcache، تبديل التطبيق)
    window.addEventListener('pagehide', () => {
        if (isTransferActive() && window.transferManager) {
            uiManager.log(t('shr_log_page_hidden_warning'), 'warn');
        }
    });

    // visibilitychange — تنبيه المستخدم إن غادر الصفحة أثناء نقل نشط (تبويب آخر مثلاً)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isTransferActive()) {
            uiManager.log(t('shr_log_page_hidden_warning'), 'warn');
        }
    });

    // دعم السحب والإفلات
    const dropZone = document.getElementById('file-drop-zone');
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-active'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files.length && window.fileSender) window.fileSender.handleFileSelection(e.dataTransfer.files);
    });

})();
