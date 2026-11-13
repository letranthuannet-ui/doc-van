import { useEffect, useRef, useState, type FormEvent } from 'react';
import ConfirmButton from '../../components/ConfirmButton';
import { audioUrl, db } from '../../lib/supabase';
import { canRecord, extOf, startRecording } from '../../recorder';
import type { ItemRow } from '../../types';

const MAX_RECORD_MS = 5000;
const LINE = /^\s*([^,\-:|\t]+?)\s*[,\-:|\t]\s*(.+?)\s*$/;

interface Props {
  lessonId: string;
  userId: string;
  onBack: () => void;
}

export default function LessonEditor({ lessonId, userId, onBack }: Props) {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [draft, setDraft] = useState({ van: '', word: '', emoji: '' });
  const [bulk, setBulk] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [l, i] = await Promise.all([
      db().from('lessons').select('title').eq('id', lessonId).single(),
      db()
        .from('lesson_items')
        .select('id, lesson_id, van, word, emoji, audio_path, position')
        .eq('lesson_id', lessonId)
        .order('position')
        .order('created_at'),
    ]);
    if (l.error || i.error) return setError((l.error ?? i.error)!.message);
    setTitle(l.data.title);
    setItems(i.data);
  };

  useEffect(() => {
    load();
  }, [lessonId]);

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p;
    if (error) setError(error.message);
    else {
      setError('');
      await load();
    }
  };

  const nextPos = () => items.reduce((m, i) => Math.max(m, i.position), 0) + 1;

  const addOne = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.van.trim() || !draft.word.trim()) return;
    run(
      db().from('lesson_items').insert({
        lesson_id: lessonId,
        van: draft.van.trim(),
        word: draft.word.trim(),
        emoji: draft.emoji.trim() || null,
        position: nextPos(),
      }),
    );
    setDraft({ van: '', word: '', emoji: '' });
  };

  const addBulk = () => {
    const start = nextPos();
    const rows = bulk
      .split('\n')
      .map((line) => LINE.exec(line))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m, k) => ({ lesson_id: lessonId, van: m[1], word: m[2], position: start + k }));
    if (!rows.length) return setError('Không đọc được dòng nào. Mỗi dòng dạng: vần, từ — ví dụ “an, cái bàn”.');
    run(db().from('lesson_items').insert(rows));
    setBulk('');
  };

  const update = (id: string, patch: Partial<ItemRow>) => run(db().from('lesson_items').update(patch).eq('id', id));

  const move = (k: number, dir: -1 | 1) => {
    if (!items[k + dir]) return;
    const order = [...items];
    [order[k], order[k + dir]] = [order[k + dir], order[k]];
    run(db().from('lesson_items').upsert(order.map((it, i) => ({ ...it, position: i + 1 }))));
  };

  const remove = async (item: ItemRow) => {
    if (item.audio_path) await db().storage.from('audio').remove([item.audio_path]);
    run(db().from('lesson_items').delete().eq('id', item.id));
  };

  return (
    <>
      <div className="lesson-head">
        <button className="btn ghost" onClick={onBack}>
          ← Danh sách bài
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <label className="field">
          Tên bài
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && run(db().from('lessons').update({ title: title.trim() }).eq('id', lessonId))}
          />
        </label>
      </section>

      <section className="panel">
        <h3>Vần trong bài ({items.length})</h3>
        {!canRecord && <p className="error">Trình duyệt này không ghi âm được. Cô dùng Chrome hoặc Edge nhé.</p>}
        <div className="table-wrap">
          <table className="items">
            <thead>
              <tr>
                <th></th>
                <th>Vần</th>
                <th>Từ để bé đọc</th>
                <th>Hình</th>
                <th>Giọng mẫu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, k) => (
                <tr key={it.id}>
                  <td className="order">
                    <button className="icon" onClick={() => move(k, -1)} disabled={k === 0} title="Lên">▲</button>
                    <button className="icon" onClick={() => move(k, 1)} disabled={k === items.length - 1} title="Xuống">▼</button>
                  </td>
                  <td>
                    <input className="w-van" defaultValue={it.van} onBlur={(e) => e.target.value.trim() && e.target.value !== it.van && update(it.id, { van: e.target.value.trim() })} />
                  </td>
                  <td>
                    <input defaultValue={it.word} onBlur={(e) => e.target.value.trim() && e.target.value !== it.word && update(it.id, { word: e.target.value.trim() })} />
                  </td>
                  <td>
                    <input className="w-emoji" defaultValue={it.emoji ?? ''} onBlur={(e) => e.target.value !== (it.emoji ?? '') && update(it.id, { emoji: e.target.value.trim() || null })} />
                  </td>
                  <td>
                    <AudioCell item={it} userId={userId} onSaved={load} onError={setError} />
                  </td>
                  <td>
                    <ConfirmButton onConfirm={() => remove(it)} title="Xóa vần này">✕</ConfirmButton>
                  </td>
                </tr>
              ))}
              <tr className="draft">
                <td></td>
                <td>
                  <input className="w-van" placeholder="an" value={draft.van} onChange={(e) => setDraft({ ...draft, van: e.target.value })} form="add-item" />
                </td>
                <td>
                  <input placeholder="cái bàn" value={draft.word} onChange={(e) => setDraft({ ...draft, word: e.target.value })} form="add-item" />
                </td>
                <td>
                  <input className="w-emoji" placeholder="🪑" value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} form="add-item" />
                </td>
                <td colSpan={2}>
                  <button className="btn small primary" form="add-item">+ Thêm</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <form id="add-item" onSubmit={addOne} />
        <p className="muted small-text">Nên dùng từ 2 tiếng quen thuộc (“cái bàn” thay vì chỉ “an”) — máy nhận giọng chính xác hơn.</p>
      </section>

      <section className="panel">
        <h3>Thêm nhiều vần một lúc</h3>
        <textarea rows={4} placeholder={'Mỗi dòng: vần, từ\nan, cái bàn\năn, khăn mặt\nân, cái cân'} value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <button className="btn small primary" onClick={addBulk}>+ Thêm tất cả</button>
      </section>
    </>
  );
}

interface AudioProps {
  item: ItemRow;
  userId: string;
  onSaved: () => void;
  onError: (msg: string) => void;
}

function AudioCell({ item, userId, onSaved, onError }: AudioProps) {
  const [state, setState] = useState<'idle' | 'rec' | 'saving'>('idle');
  const stopRef = useRef<(() => Promise<Blob>) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const url = audioUrl(item.audio_path);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const stop = async () => {
    clearTimeout(timerRef.current);
    const fn = stopRef.current;
    stopRef.current = null;
    if (!fn) return;
    setState('saving');
    const blob = await fn();
    const path = `${userId}/${item.id}-${Date.now()}.${extOf(blob.type)}`;
    const up = await db().storage.from('audio').upload(path, blob, { contentType: blob.type });
    if (up.error) {
      setState('idle');
      return onError('Không tải được ghi âm: ' + up.error.message);
    }
    const { error } = await db().from('lesson_items').update({ audio_path: path }).eq('id', item.id);
    if (error) onError(error.message);
    else if (item.audio_path) await db().storage.from('audio').remove([item.audio_path]);
    setState('idle');
    onSaved();
  };

  const start = async () => {
    try {
      stopRef.current = await startRecording();
      setState('rec');
      timerRef.current = setTimeout(stop, MAX_RECORD_MS);
    } catch {
      onError('Không mở được micro. Cô cho phép trình duyệt dùng micro nhé.');
    }
  };

  return (
    <div className="row nowrap">
      {state === 'rec' ? (
        <button className="btn small rec" onClick={stop}>⏹ Dừng</button>
      ) : (
        <button className="btn small" onClick={start} disabled={!canRecord || state === 'saving'}>
          {state === 'saving' ? 'Đang lưu…' : url ? '🎙 Ghi lại' : '🎙 Ghi âm'}
        </button>
      )}
      {url && state === 'idle' && (
        <button className="btn small" onClick={() => new Audio(url).play()} title="Nghe lại">▶</button>
      )}
    </div>
  );
}
