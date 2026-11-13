import { useEffect, useState } from 'react';
import Practice, { PracticeFooter } from '../components/Practice';
import { GROUPS } from '../data';
import { withBest, type Progress } from '../types';

const STORAGE_KEY = 'doc-van-progress';

function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export default function FreePractice() {
  const [groupIdx, setGroupIdx] = useState(0);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const group = GROUPS[groupIdx];
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);
  const done = Object.values(progress).filter((v) => v === 'correct').length;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* storage unavailable */
    }
  }, [progress]);

  return (
    <div className="app">
      <header>
        <h1>
          <a href="#/">📖</a> Luyện tự do
        </h1>
        <div className="stars" title="Số vần đã đọc đúng">
          ⭐ {done}/{total}
        </div>
      </header>

      <nav className="tabs">
        {GROUPS.map((g, i) => (
          <button key={g.id} className={i === groupIdx ? 'active' : ''} onClick={() => setGroupIdx(i)}>
            {g.name}
          </button>
        ))}
      </nav>

      <Practice
        key={group.id}
        items={group.items}
        progress={progress}
        onResult={(item, r) => setProgress((p) => withBest(p, item.id, r.verdict))}
      />
      <PracticeFooter />
    </div>
  );
}
