import { EventEmitter } from 'node:events';

// Un EventEmitter global por proceso (en dev puede haber hot-reload, es aceptable)
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export function emitMakimaChunk(jobId: string, chunk: string) {
  emitter.emit(`job:${jobId}:chunk`, chunk);
}

export function emitMakimaDone(jobId: string) {
  emitter.emit(`job:${jobId}:done`);
}

export function emitMakimaError(jobId: string, message: string) {
  emitter.emit(`job:${jobId}:error`, message);
}

export function emitMakimaAkiVerification(jobId: string, content: string) {
  emitter.emit(`job:${jobId}:aki_verification`, content);
}

export function onMakimaChunk(jobId: string, handler: (chunk: string) => void) {
  emitter.on(`job:${jobId}:chunk`, handler);
  return () => emitter.off(`job:${jobId}:chunk`, handler);
}

export function onMakimaDone(jobId: string, handler: () => void) {
  emitter.once(`job:${jobId}:done`, handler);
  return () => emitter.off(`job:${jobId}:done`, handler);
}

export function onMakimaError(jobId: string, handler: (msg: string) => void) {
  emitter.once(`job:${jobId}:error`, handler);
  return () => emitter.off(`job:${jobId}:error`, handler);
}

export function onMakimaAkiVerification(jobId: string, handler: (content: string) => void) {
  emitter.once(`job:${jobId}:aki_verification`, handler);
  return () => emitter.off(`job:${jobId}:aki_verification`, handler);
}
