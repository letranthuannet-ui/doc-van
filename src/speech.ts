interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResultList {
  length: number;
  [i: number]: { isFinal: boolean; length: number; [j: number]: RecognitionAlternative };
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

const Ctor: RecognitionCtor | undefined =
  (window as unknown as { SpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;

export const canRecognize = !!Ctor;

const ERRORS: Record<string, string> = {
  'not-allowed': 'Trình duyệt chưa được cấp quyền dùng micro. Hãy bấm biểu tượng 🔒 trên thanh địa chỉ để cho phép.',
  'service-not-allowed': 'Trình duyệt chưa được cấp quyền dùng micro.',
  'no-speech': 'Không nghe thấy gì. Bé hãy đọc to hơn nhé!',
  'audio-capture': 'Không tìm thấy micro.',
  network: 'Mất kết nối mạng — nhận giọng cần có Internet.',
};

export interface ListenHandlers {
  onInterim: (text: string) => void;
  onFinal: (alternatives: string[]) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

export function listen(h: ListenHandlers): () => void {
  if (!Ctor) {
    h.onError('Trình duyệt này không hỗ trợ nhận giọng nói. Hãy dùng Chrome hoặc Edge.');
    h.onEnd();
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = 'vi-VN';
  rec.interimResults = true;
  rec.maxAlternatives = 5;
  rec.continuous = false;
  let done = false;

  rec.onresult = (e) => {
    const last = e.results[e.results.length - 1];
    if (!last) return;
    if (last.isFinal) {
      done = true;
      const alts: string[] = [];
      for (let j = 0; j < last.length; j++) alts.push(last[j].transcript);
      h.onFinal(alts);
    } else {
      h.onInterim(last[0].transcript);
    }
  };
  rec.onerror = (e) => {
    if (e.error === 'aborted') return;
    done = true;
    h.onError(ERRORS[e.error] ?? `Lỗi nhận giọng: ${e.error}`);
  };
  rec.onend = () => {
    if (!done) h.onError(ERRORS['no-speech']);
    h.onEnd();
  };
  rec.start();
  return () => rec.stop();
}

let viVoice: SpeechSynthesisVoice | null = null;

export function loadVoice(cb: (ok: boolean) => void): () => void {
  if (!('speechSynthesis' in window)) {
    cb(false);
    return () => {};
  }
  const pick = () => {
    viVoice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi')) ?? null;
    cb(!!viVoice);
  };
  pick();
  speechSynthesis.addEventListener('voiceschanged', pick);
  return () => speechSynthesis.removeEventListener('voiceschanged', pick);
}

export function speak(text: string) {
  if (!viVoice) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = viVoice;
  u.lang = viVoice.lang;
  u.rate = 0.75;
  speechSynthesis.speak(u);
}
