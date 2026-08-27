/// <reference lib="webworker" />
export {};

/** عامل محلي مكافئ لعامل @ffmpeg/ffmpeg؛ يبنيه Vite كملف مستقل. */
const workerScope = self as unknown as {
  createFFmpegCore?: (options: { mainScriptUrlOrBlob: string }) => Promise<any>;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<Payload>) => void | Promise<void>) | null;
};

let ffmpeg: any;

type Payload = { id: number; type: string; data: any };

async function load({ coreURL, wasmURL, workerURL }: { coreURL?: string; wasmURL?: string; workerURL?: string }): Promise<boolean> {
  const first = !ffmpeg;
  if (!coreURL) throw new Error('رابط نواة FFmpeg غير متاح.');
  try {
    importScripts(coreURL);
  } catch {
    const module = await import(/* @vite-ignore */ coreURL);
    workerScope.createFFmpegCore = module.default;
  }
  if (!workerScope.createFFmpegCore) throw new Error('تعذر تهيئة نواة FFmpeg.');
  const resolvedWasm = wasmURL || coreURL.replace(/\.js$/g, '.wasm');
  const resolvedWorker = workerURL || coreURL.replace(/\.js$/g, '.worker.js');
  ffmpeg = await workerScope.createFFmpegCore({
    mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL: resolvedWasm, workerURL: resolvedWorker }))}`
  });
  ffmpeg.setLogger((data: unknown) => workerScope.postMessage({ type: 'LOG', data }));
  ffmpeg.setProgress((data: unknown) => workerScope.postMessage({ type: 'PROGRESS', data }));
  return first;
}

function exec({ args, timeout = -1 }: { args: string[]; timeout?: number }): number {
  ffmpeg.setTimeout(timeout);
  ffmpeg.exec(...args);
  const result = ffmpeg.ret;
  ffmpeg.reset();
  return result;
}

function ffprobe({ args, timeout = -1 }: { args: string[]; timeout?: number }): number {
  ffmpeg.setTimeout(timeout);
  ffmpeg.ffprobe(...args);
  const result = ffmpeg.ret;
  ffmpeg.reset();
  return result;
}

workerScope.onmessage = async ({ data: { id, type, data } }: MessageEvent<Payload>) => {
  const transfers: Transferable[] = [];
  try {
    if (type !== 'LOAD' && !ffmpeg) throw new Error('لم تُحمّل نواة FFmpeg بعد.');
    let result: unknown;
    switch (type) {
      case 'LOAD': result = await load(data); break;
      case 'EXEC': result = exec(data); break;
      case 'FFPROBE': result = ffprobe(data); break;
      case 'WRITE_FILE': ffmpeg.FS.writeFile(data.path, data.data); result = true; break;
      case 'READ_FILE': result = ffmpeg.FS.readFile(data.path, { encoding: data.encoding }); break;
      case 'DELETE_FILE': ffmpeg.FS.unlink(data.path); result = true; break;
      case 'RENAME': ffmpeg.FS.rename(data.oldPath, data.newPath); result = true; break;
      case 'CREATE_DIR': ffmpeg.FS.mkdir(data.path); result = true; break;
      case 'LIST_DIR': result = ffmpeg.FS.readdir(data.path).map((name: string) => ({ name, isDir: ffmpeg.FS.isDir(ffmpeg.FS.stat(`${data.path}/${name}`).mode) })); break;
      case 'DELETE_DIR': ffmpeg.FS.rmdir(data.path); result = true; break;
      case 'MOUNT': { const filesystem = ffmpeg.FS.filesystems[data.fsType]; if (!filesystem) throw new Error('نظام الملفات غير مدعوم.'); ffmpeg.FS.mount(filesystem, data.options, data.mountPoint); result = true; break; }
      case 'UNMOUNT': ffmpeg.FS.unmount(data.mountPoint); result = true; break;
      default: throw new Error(`نوع رسالة FFmpeg غير معروف: ${type}`);
    }
    if (result instanceof Uint8Array) transfers.push(result.buffer);
    workerScope.postMessage({ id, type, data: result }, transfers);
  } catch (error) {
    workerScope.postMessage({ id, type: 'ERROR', data: error instanceof Error ? error.message : String(error) });
  }
};
