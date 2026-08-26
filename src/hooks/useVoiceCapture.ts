import { useCallback, useEffect, useRef, useState } from "react";

/* Tipos mínimos para la Web Speech API (no cubiertos por lib.dom estándar) */
interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition as SpeechRecognitionCtor) ?? (w.webkitSpeechRecognition as SpeechRecognitionCtor) ?? null;
}

export interface VoiceCapture {
  isSupported: boolean;
  isListening: boolean;
  isPaused: boolean;
  /** Texto final acumulado */
  transcript: string;
  /** Texto parcial (aún no confirmado) */
  interimText: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  /** Detiene y limpia transcript/errores para una nueva captura */
  reset: () => void;
  /** Agrega texto manual al transcript acumulado */
  appendText: (text: string) => void;
}

/** Encapsula Web Speech API con reconexión automática y permiso de micrófono. */
export function useVoiceCapture(): VoiceCapture {
  const [isSupported] = useState(() => typeof window !== "undefined" && !!getCtor());
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const manualStopRef = useRef(false);
  const pausedRef = useRef(false);
  const silentRestartsRef = useRef(0);
  const MAX_SILENT_RESTARTS = 5;

  const buildRecognition = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "es-CL";

    rec.onresult = (e) => {
      let interim = "";
      let finals = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      if (finals || interim) silentRestartsRef.current = 0;
      if (finals) setTranscript((prev) => (prev ? prev.trimEnd() + " " : "") + finals.trim() + "\n");
      setInterimText(interim);
    };

    rec.onend = () => {
      setInterimText("");
      // Reconexión automática: el navegador corta por silencio; reiniciar si no fue stop/pausa manual
      if (!manualStopRef.current && !pausedRef.current) {
        silentRestartsRef.current += 1;
        if (silentRestartsRef.current >= MAX_SILENT_RESTARTS) {
          setError("No se detecta audio. Verifica que el micrófono esté activo.");
          setIsListening(false);
          return;
        }
        try {
          rec.start();
          return;
        } catch {
          /* cae al estado detenido */
        }
      }
      setIsListening(false);
    };


    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Permiso de micrófono denegado. Habilítalo en la configuración del navegador o usa la entrada manual.");
        manualStopRef.current = true;
        setIsListening(false);
      } else if (e.error === "no-speech" || e.error === "network" || e.error === "aborted") {
        // Errores transitorios: onend se encarga de reconectar
      } else if (e.error) {
        setError(`Error de reconocimiento: ${e.error}`);
      }
    };

    return rec;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    // Permiso explícito de micrófono antes de iniciar SpeechRecognition
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError("Permiso de micrófono denegado. Habilítalo en la configuración del navegador o usa la entrada manual.");
      return;
    }
    manualStopRef.current = false;
    pausedRef.current = false;
    silentRestartsRef.current = 0;
    setIsPaused(false);
    const rec = buildRecognition();
    if (!rec) return;
    recogRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setError("No se pudo iniciar el reconocimiento de voz.");
    }
  }, [buildRecognition]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    recogRef.current?.stop();
    setIsListening(false);
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setIsPaused(true);
    recogRef.current?.stop();
    setIsListening(false);
  }, []);

  const resume = useCallback(() => {
    if (!recogRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    try {
      recogRef.current.start();
      setIsListening(true);
    } catch {
      /* ya estaba activo */
    }
  }, []);

  const reset = useCallback(() => {
    manualStopRef.current = true;
    pausedRef.current = false;
    recogRef.current?.abort();
    setIsListening(false);
    setIsPaused(false);
    setTranscript("");
    setInterimText("");
    setError(null);
  }, []);

  const appendText = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setTranscript((prev) => (prev ? prev.trimEnd() + "\n" : "") + t + "\n");
  }, []);

  useEffect(
    () => () => {
      manualStopRef.current = true;
      recogRef.current?.abort();
    },
    [],
  );

  return { isSupported, isListening, isPaused, transcript, interimText, error, start, stop, pause, resume, reset, appendText };
}
