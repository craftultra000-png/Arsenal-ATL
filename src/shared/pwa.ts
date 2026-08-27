export type OfflineProgress = {
  completed: number;
  total: number;
  resource?: string;
};

type OfflineMessage =
  | { type: 'arsenal-offline-progress'; requestId: string; completed: number; total: number; resource?: string }
  | { type: 'arsenal-offline-complete'; requestId: string; total: number }
  | { type: 'arsenal-offline-error'; requestId: string; message?: string };

const workerUrl = '/service-worker.js';
let registrationPromise: Promise<ServiceWorkerRegistration | null> | undefined;

export function supportsOffline(): boolean {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'serviceWorker' in navigator
    && 'caches' in window;
}

/** يسجل العامل مرة واحدة من أي صفحة MPA؛ يفشل بأمان في المتصفحات غير المدعومة. */
export function registerOfflineWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!supportsOffline()) return Promise.resolve(null);
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register(workerUrl, { scope: '/' })
      .then(async (registration) => {
        await navigator.serviceWorker.ready;
        return registration;
      })
      .catch((error) => {
        console.warn('[pwa] Service Worker registration failed', error);
        registrationPromise = undefined;
        return null;
      });
  }
  return registrationPromise;
}

function workerFor(registration: ServiceWorkerRegistration): ServiceWorker | null {
  return registration.active ?? registration.waiting ?? registration.installing ?? navigator.serviceWorker.controller;
}

/** يطلب من العامل تخزين جميع صفحات المنصة وأصول البناء لهذا الإصدار. */
export async function cachePlatformOffline(onProgress?: (progress: OfflineProgress) => void): Promise<{ total: number }> {
  const registration = await registerOfflineWorker();
  const worker = registration ? workerFor(registration) : null;
  if (!worker) throw new Error('PWA_UNSUPPORTED');

  const requestId = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error('PWA_TIMEOUT')), 180_000);

    const finish = (error?: Error, total?: number) => {
      window.clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('message', receive);
      if (error) reject(error);
      else resolve({ total: total ?? 0 });
    };

    const receive = (event: MessageEvent<OfflineMessage>) => {
      const message = event.data;
      if (!message || message.requestId !== requestId) return;
      if (message.type === 'arsenal-offline-progress') {
        onProgress?.({ completed: message.completed, total: message.total, resource: message.resource });
      } else if (message.type === 'arsenal-offline-complete') {
        finish(undefined, message.total);
      } else if (message.type === 'arsenal-offline-error') {
        finish(new Error(message.message || 'PWA_CACHE_ERROR'));
      }
    };

    navigator.serviceWorker.addEventListener('message', receive);
    worker.postMessage({ type: 'arsenal-cache-offline', requestId });
  });
}
