import { Fragment, useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/supabase';
import type { ClassRow, StudentRow } from '../../types';

interface Stat {
  student_id: string;
  item_id: string;
  total: number;
  correct: number;
  near: number;
  wrong: number;
  last_at: string;
}
interface Item {
  id: string;
  van: string;
  word: string;
  lesson: string;
}
interface AssignedLesson {
  lesson: { title: string; position: number; lesson_items: { id: string; van: string; word: string; position: number }[] } | null;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default function Results() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    db()
      .from('classes')
      .select('id, name, code, created_at')
      .order('created_at')
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setClasses(data);
        if (data[0]) setClassId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!classId) return;
    Promise.all([
      db().from('students').select('id, class_id, name').eq('class_id', classId).order('created_at'),
      db()
        .from('assignments')
        .select('lesson:lessons(title, position, lesson_items(id, van, word, position))')
        .eq('class_id', classId),
      db().rpc('class_stats', { p_class: classId }),
    ]).then(([s, a, st]) => {
      const err = s.error ?? a.error ?? st.error;
      if (err) return setError(err.message);
      setStudents(s.data ?? []);
      const lessons = ((a.data ?? []) as unknown as AssignedLesson[])
        .map((x) => x.lesson)
        .filter((l): l is NonNullable<AssignedLesson['lesson']> => !!l)
        .sort((x, y) => x.position - y.position);
      setItems(
        lessons.flatMap((l) =>
          [...l.lesson_items].sort((x, y) => x.position - y.position).map((i) => ({ ...i, lesson: l.title })),
        ),
      );
      setStats(st.data as Stat[]);
    });
  }, [classId]);

  const view = useMemo(() => {
    const itemIds = new Set(items.map((i) => i.id));
    const live = stats.filter((s) => itemIds.has(s.item_id));
    const key = (s: string, i: string) => `${s}:${i}`;
    const cell = new Map(live.map((s) => [key(s.student_id, s.item_id), s]));
    const nameOf = new Map(students.map((s) => [s.id, s.name]));

    const hard = items
      .map((it) => {
        const rows = live.filter((s) => s.item_id === it.id);
        const total = rows.reduce((n, r) => n + r.total, 0);
        const correct = rows.reduce((n, r) => n + r.correct, 0);
        const struggling = rows.filter((r) => r.correct === 0).map((r) => nameOf.get(r.student_id) ?? '?');
        return { it, total, rate: pct(correct, total), struggling };
      })
      .filter((x) => x.total > 0 && x.rate < 100)
      .sort((a, b) => a.rate - b.rate || b.struggling.length - a.struggling.length)
      .slice(0, 10);

    const perStudent = students.map((st) => {
      const rows = live.filter((s) => s.student_id === st.id);
      const total = rows.reduce((n, r) => n + r.total, 0);
      const correct = rows.reduce((n, r) => n + r.correct, 0);
      const mastered = rows.filter((r) => r.correct > 0).length;
      const weak = rows
        .filter((r) => r.correct === 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
        .map((r) => items.find((i) => i.id === r.item_id)?.van ?? '');
      const last = rows.reduce((m, r) => (r.last_at > m ? r.last_at : m), '');
      return { st, total, rate: pct(correct, total), mastered, weak, last };
    });

    return { cell, key, hard, perStudent };
  }, [items, stats, students]);

  if (!classes.length) return <p className="hint">{error || 'Cô chưa có lớp nào.'}</p>;

  return (
    <>
      {error && <p className="error">{error}</p>}
      {classes.length > 1 && (
        <div className="row">
          <span className="muted">Lớp:</span>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {items.length === 0 && <p className="hint">Lớp này chưa được giao bài nào.</p>}

      {view.hard.length > 0 && (
        <section className="panel">
          <h3>Vần lớp hay đọc sai</h3>
          <div className="table-wrap">
            <table className="stats">
              <thead>
                <tr><th>Vần</th><th>Từ</th><th>Lượt đọc</th><th>Đúng</th><th>Bé chưa đọc đúng</th></tr>
              </thead>
              <tbody>
                {view.hard.map(({ it, total, rate, struggling }) => (
                  <tr key={it.id}>
                    <td><b>{it.van}</b></td>
                    <td>{it.word}</td>
                    <td>{total}</td>
                    <td><span className={`rate ${rate < 50 ? 'low' : 'mid'}`}>{rate}%</span></td>
                    <td>{struggling.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {students.length > 0 && items.length > 0 && (
        <section className="panel">
          <h3>Từng bạn</h3>
          <div className="table-wrap">
            <table className="stats">
              <thead>
                <tr><th>Học sinh</th><th>Vần đã đúng</th><th>Lượt đọc</th><th>Tỉ lệ đúng</th><th>Vần cần kèm</th><th>Lần cuối</th></tr>
              </thead>
              <tbody>
                {view.perStudent.map(({ st, total, rate, mastered, weak, last }) => (
                  <Fragment key={st.id}>
                    <tr className="clickable" onClick={() => setOpen(open === st.id ? null : st.id)}>
                      <td><b>{open === st.id ? '▾' : '▸'} {st.name}</b></td>
                      <td>{mastered}/{items.length}</td>
                      <td>{total}</td>
                      <td>{total ? <span className={`rate ${rate < 50 ? 'low' : rate < 80 ? 'mid' : 'high'}`}>{rate}%</span> : '—'}</td>
                      <td>{weak.join(', ') || '—'}</td>
                      <td className="muted">{last ? new Date(last).toLocaleDateString('vi-VN') : 'chưa đọc'}</td>
                    </tr>
                    {open === st.id && (
                      <tr>
                        <td colSpan={6}>
                          <div className="chips">
                            {items.map((it) => {
                              const c = view.cell.get(view.key(st.id, it.id));
                              const cls = !c ? '' : c.correct ? 'correct' : c.near ? 'near' : 'wrong';
                              return (
                                <span key={it.id} className={`chip ${cls}`} title={`${it.lesson} · ${it.word}${c ? ` · ${c.correct}/${c.total} lượt đúng` : ' · chưa đọc'}`}>
                                  {it.van}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small-text">Bấm vào tên để xem từng vần. Xanh: đã đọc đúng · Vàng: sai dấu · Đỏ: chưa đúng · Trắng: chưa đọc.</p>
        </section>
      )}
    </>
  );
}
