declare module 'gif.js' {
  export interface GifFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  export interface GifOptions {
    workers?: number;
    quality?: number;
    workerScript?: string;
    width?: number;
    height?: number;
    repeat?: number;
    dither?: string | boolean;
  }

  export default class GIF {
    constructor(options?: GifOptions);
    addFrame(source: CanvasImageSource | CanvasRenderingContext2D, options?: GifFrameOptions): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    render(): void;
    abort(): void;
  }
}

declare module 'gif.js/dist/gif.worker.js?url' {
  const workerUrl: string;
  export default workerUrl;
}
