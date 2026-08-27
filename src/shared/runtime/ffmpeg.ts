import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import ffmpegClassWorkerURL from './ffmpeg-class-worker.ts?worker&url';

/**
 * تشغيل FFmpeg بوضوح بين مسارين متوافقين:
 * - متعدد الأنوية: غلاف ونواة وWorker المنصة المنشورة نفسها.
 * - أحادي النواة: غلاف ESM الحديث، للحالات المحلية التي لا تملك SharedArrayBuffer.
 */
const publishedCoreBase = '/assets/runtime/ffmpeg';
const compatibleSingleBase = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
const publishedMultiWasm = 'https://huggingface.co/datasets/Silvr0098/arsenal-cdn/resolve/main/ffmpeg-core.wasm';
const legacyWrapperURL = '/assets/runtime/ffmpeg/ffmpeg-wrapper-legacy.js';

type FFmpegLike = FFmpeg;
export type FFmpegRuntimeMode = 'multi-thread' | 'single-thread';

declare global {
  interface Window {
    FFmpegWASM?: { FFmpeg: new () => FFmpegLike };
  }
}

let instance: FFmpegLike | null = null;
let loading: Promise<FFmpegLike> | null = null;
let legacyWrapperLoading: Promise<FFmpegLike> | null = null;
let activeMode: FFmpegRuntimeMode | null = null;

export function getFFmpegRuntimeMode(): FFmpegRuntimeMode | null {
  return activeMode;
}

function getPublishedLegacyFFmpeg(): Promise<FFmpegLike> {
  if (window.FFmpegWASM?.FFmpeg) return Promise.resolve(new window.FFmpegWASM.FFmpeg());
  if (!legacyWrapperLoading) {
    legacyWrapperLoading = new Promise<FFmpegLike>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = legacyWrapperURL;
      script.async = true;
      script.onload = () => {
        const LegacyFFmpeg = window.FFmpegWASM?.FFmpeg;
        if (!LegacyFFmpeg) { reject(new Error('تعذر تحميل غلاف FFmpeg المنشور.')); return; }
        resolve(new LegacyFFmpeg());
      };
      script.onerror = () => reject(new Error('تعذر تنزيل غلاف FFmpeg المنشور.'));
      document.head.append(script);
    }).catch((error) => { legacyWrapperLoading = null; throw error; });
  }
  return legacyWrapperLoading;
}

export async function getFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpegLike> {
  if (instance) return instance;
  if (!loading) {
    loading = (async () => {
      const multiThread = globalThis.crossOriginIsolated === true;
      const ffmpeg = multiThread ? await getPublishedLegacyFFmpeg() : new FFmpeg();
      if (onProgress) ffmpeg.on('progress', ({ progress }) => onProgress(Math.round(progress * 100)));

      if (multiThread) {
        const coreURL = await toBlobURL(`${publishedCoreBase}/ffmpeg-core-mt.js`, 'text/javascript');
        const wasmURL = await toBlobURL(publishedMultiWasm, 'application/wasm');
        const workerURL = await toBlobURL(`${publishedCoreBase}/ffmpeg-core-mt.worker.js`, 'text/javascript');
        await ffmpeg.load({ coreURL, wasmURL, workerURL });
        activeMode = 'multi-thread';
      } else {
        const coreURL = await toBlobURL(`${compatibleSingleBase}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${compatibleSingleBase}/ffmpeg-core.wasm`, 'application/wasm');
        await ffmpeg.load({ classWorkerURL: ffmpegClassWorkerURL, coreURL, wasmURL });
        activeMode = 'single-thread';
      }

      instance = ffmpeg;
      return ffmpeg;
    })().catch((error) => {
      loading = null;
      activeMode = null;
      throw error;
    });
  }
  return loading;
}
