// src/app/lib/fingerprint.ts
// Calcula fingerprint estilo AcoustID (Chromaprint) en el navegador con WASM.
// Usa named import: @unimusic/chromaprint no exporta "default".

export type FingerprintResult = {
  fingerprint: string; // cadena comprimida (compatible AcoustID)
  duration: number; // segundos (entero)
};

export async function fileToAcoustIdFingerprint(
  file: File
): Promise<FingerprintResult> {
  // Named import (ESM). Si tu toolchain se queja por la ruta /dist,
  // cambia a:  const { processAudioFile } = await import("@unimusic/chromaprint");
  const { processAudioFile } = await import(
    "@unimusic/chromaprint/dist/index.js"
  );

  // 1) Para la duración del audio, decodificamos con Web Audio API
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  // copia defensiva del ArrayBuffer para evitar "detached buffer"
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  const duration = Math.round(audioBuffer.duration);

  // 2) Generar fingerprint (el paquete devuelve un AsyncGenerator<string>)
  //    Valores por defecto:
  //    - maxDuration: ~120s
  //    - chunkDuration: 0 (fingerprint único del archivo completo)
  //    Si quieres tunearlos, pasa un objeto de opciones { maxDuration, chunkDuration }.
  const gen = processAudioFile(
    arrayBuffer /*, { maxDuration: 120, chunkDuration: 0 } */
  );
  const first = await gen.next();
  const fingerprint = first.value as string | undefined;
  if (!fingerprint) throw new Error("No se generó el fingerprint");

  return { fingerprint, duration };
}
