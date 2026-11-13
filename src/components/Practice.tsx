import { useEffect, useRef, useState } from 'react';
import { audioUrl } from '../lib/supabase';
import { match, type MatchResult } from '../match';
import { canRecognize, listen, loadVoice, speak } from '../speech';
import type { PracticeItem, Progress, Verdict } from '../types';

const MESSAGES: Record<Verdict, string> = {
  correct: 'Giỏi quá! Bé đọc đúng rồi 🎉',
  near: 'Gần đúng rồi! Bé chú ý dấu thanh nhé 👍',
  wrong: 'Chưa đúng. Bé nghe mẫu rồi đọc lại nhé 💪',
};

interface Props {
  items: PracticeItem[];
  progress: Progress;
  onResult: (item: PracticeItem, result: MatchResult) => void;
}

export default function Practice({ items, progress, onResult }: Props) {
  const [idx, setIdx] = useState(0);
  const [hasVoice, setHasVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');
  const stopRef = useRef<() => void>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const item = items[idx];
  const sample = audioUrl(item?.audio_path);

  useEffect(() => loadVoice(setHasVoice), []);
  useEffect(() => () => stopRef.current?.(), []);

  if (!item) return <div className="card empty">Bài này chưa có vần nào.</div>;

  const reset = () => {
    stopRef.current?.();
    audioRef.current?.pause();
    setResult(null);
    setError('');
    setInterim('');
  };

  const goto = (i: number) => {
    reset();
    setIdx(i);
  };

  const playSample = () => {
    if (sample) {
      audioRef.current?.pause();
      audioRef.current = new Audio(sample);
      audioRef.current.play().catch(() => setError('Không phát được giọng mẫu.'));
    } else {
      speak(item.word);
    }
  };

  const toggleListen = () => {
    if (listening) return stopRef.current?.();
    reset();
    setListening(true);
    stopRef.current = listen({
      onInterim: setInterim,
      onFinal: (alts) => {
        const r = match(item.word, alts);
        setResult(r);
        onResult(item, r);
      },
      onError: setError,
      onEnd: () => {
        setListening(false);
        setInterim('');
      },
    });
  };

  return (
    <>
      <div className="chips">
        {items.map((it, i) => (
          <button
            key={it.id}
            className={`chip ${progress[it.id] ?? ''} ${i === idx ? 'current' : ''}`}
            onClick={() => goto(i)}
          >
            {it.van}
          </button>
        ))}
      </div>

      <main className="card">
        <div className="van">{item.van}</div>
        {item.emoji && <div className="emoji">{item.emoji}</div>}
        <div className="word">
          {result
            ? result.syllables.map((s, i) => (
                <span key={i} className={`syl ${s.state}`}>
                  {s.text}
                </span>
              ))
            : item.word}
        </div>

        <div className="actions">
          <button
            className="btn listen"
            onClick={playSample}
            disabled={!sample && !hasVoice}
            title={sample ? 'Nghe cô đọc mẫu' : hasVoice ? 'Nghe máy đọc mẫu' : 'Chưa có giọng mẫu'}
          >
            🔊 {sample ? 'Nghe cô đọc' : 'Nghe mẫu'}
          </button>
          <button className={`btn mic ${listening ? 'on' : ''}`} onClick={toggleListen} disabled={!canRecognize}>
            {listening ? '⏹ Đang nghe…' : '🎤 Bé đọc'}
          </button>
        </div>

        <div className="feedback" aria-live="polite">
          {listening && <p className="hint">{interim || `Bé đọc to: “${item.word}”`}</p>}
          {error && <p className="error">{error}</p>}
          {result && (
            <>
              <p className={`verdict ${result.verdict}`}>{MESSAGES[result.verdict]}</p>
              <p className="heard">
                Máy nghe được: <b>{result.heard || '—'}</b>
              </p>
            </>
          )}
        </div>

        <div className="nav">
          <button className="btn ghost" onClick={() => goto(idx - 1)} disabled={idx === 0}>
            ← Trước
          </button>
          <button className="btn ghost" onClick={() => goto(idx + 1)} disabled={idx === items.length - 1}>
            Tiếp →
          </button>
        </div>
      </main>
    </>
  );
}

export function PracticeFooter() {
  return (
    <footer>
      {!canRecognize && (
        <p className="error">Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy mở trang bằng Chrome hoặc Edge.</p>
      )}
      <p>
        Máy chấm dựa trên nhận giọng tự động nên đôi khi nhầm, nhất là với giọng trẻ nhỏ. Thầy cô và phụ huynh nên nghe cùng bé.
      </p>
      <p>
        Chú thích: <span className="syl ok">đúng</span> <span className="syl tone">sai dấu</span>{' '}
        <span className="syl miss">chưa đúng</span>
      </p>
    </footer>
  );
}
