import { useEffect, useRef, useState } from 'react';
import { GROUPS } from './data';
import { match, type MatchResult } from './match';
import { canRecognize, listen, loadVoice, speak } from './speech';

type Verdict = MatchResult['verdict'];
type Progress = Record<string, Verdict>;

const STORAGE_KEY = 'doc-van-progress';
const RANK: Record<Verdict, number> = { wrong: 0, near: 1, correct: 2 };
const TOTAL = GROUPS.reduce((n, g) => n + g.items.length, 0);

const MESSAGES: Record<Verdict, string> = {
  correct: 'Giỏi quá! Bé đọc đúng rồi 🎉',
  near: 'Gần đúng rồi! Bé chú ý dấu thanh nhé 👍',
  wrong: 'Chưa đúng. Bé nghe mẫu rồi đọc lại nhé 💪',
};

function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export default function App() {
  const [groupIdx, setGroupIdx] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [hasVoice, setHasVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');
  const stopRef = useRef<() => void>();

  const group = GROUPS[groupIdx];
  const item = group.items[itemIdx];
  const doneCount = Object.values(progress).filter((v) => v === 'correct').length;

  useEffect(() => loadVoice(setHasVoice), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* storage unavailable */
    }
  }, [progress]);

  const reset = () => {
    stopRef.current?.();
    setResult(null);
    setError('');
    setInterim('');
  };

  const goto = (g: number, i: number) => {
    reset();
    setGroupIdx(g);
    setItemIdx(i);
  };

  const next = (step: 1 | -1) => {
    const i = itemIdx + step;
    if (i >= 0 && i < group.items.length) return goto(groupIdx, i);
    const g = (groupIdx + step + GROUPS.length) % GROUPS.length;
    goto(g, step === 1 ? 0 : GROUPS[g].items.length - 1);
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
        setProgress((p) => (p[item.id] && RANK[p[item.id]] >= RANK[r.verdict] ? p : { ...p, [item.id]: r.verdict }));
      },
      onError: setError,
      onEnd: () => {
        setListening(false);
        setInterim('');
      },
    });
  };

  return (
    <div className="app">
      <header>
        <h1>📖 Bé Đọc Vần</h1>
        <div className="stars" title="Số vần đã đọc đúng">
          ⭐ {doneCount}/{TOTAL}
        </div>
      </header>

      {!canRecognize && (
        <div className="banner">
          Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy mở trang bằng <b>Chrome</b> hoặc <b>Edge</b>.
        </div>
      )}

      <nav className="tabs">
        {GROUPS.map((g, i) => (
          <button key={g.id} className={i === groupIdx ? 'active' : ''} onClick={() => goto(i, 0)}>
            {g.name}
          </button>
        ))}
      </nav>

      <div className="chips">
        {group.items.map((it, i) => (
          <button
            key={it.id}
            className={`chip ${progress[it.id] ?? ''} ${i === itemIdx ? 'current' : ''}`}
            onClick={() => goto(groupIdx, i)}
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
          <button className="btn listen" onClick={() => speak(item.word)} disabled={!hasVoice}
            title={hasVoice ? 'Nghe máy đọc mẫu' : 'Máy này chưa có giọng đọc tiếng Việt'}>
            🔊 Nghe mẫu
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
          <button className="btn ghost" onClick={() => next(-1)}>← Trước</button>
          <button className="btn ghost" onClick={() => next(1)}>Tiếp →</button>
        </div>
      </main>

      <footer>
        {!hasVoice && <p>Máy này chưa có giọng đọc tiếng Việt nên nút “Nghe mẫu” bị tắt.</p>}
        <p>Máy chấm dựa trên nhận giọng tự động nên đôi khi nhầm, nhất là với giọng trẻ nhỏ. Thầy cô và phụ huynh nên nghe cùng bé.</p>
        <p>
          Chú thích: <span className="syl ok">đúng</span> <span className="syl tone">sai dấu</span>{' '}
          <span className="syl miss">chưa đúng</span>
        </p>
      </footer>
    </div>
  );
}
