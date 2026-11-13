import { useEffect, useState, type FormEvent } from 'react';
import ConfirmButton from '../../components/ConfirmButton';
import { db } from '../../lib/supabase';
import type { ClassRow, LessonRow } from '../../types';
import LessonEditor from './LessonEditor';

type LessonWithCount = LessonRow & { lesson_items: { count: number }[] };

export default function Lessons({ userId }: { userId: string }) {
  const [lessons, setLessons] = useState<LessonWithCount[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    const [l, c, a] = await Promise.all([
      db().from('lessons').select('id, title, position, created_at, lesson_items(count)').order('position').order('created_at'),
      db().from('classes').select('id, name, code, created_at').order('created_at'),
      db().from('assignments').select('class_id, lesson_id'),
    ]);
    const err = l.error ?? c.error ?? a.error;
    if (err) return setError(err.message);
    setLessons((l.data ?? []) as LessonWithCount[]);
    setClasses(c.data ?? []);
    setAssigned(new Set((a.data ?? []).map((x) => `${x.class_id}:${x.lesson_id}`)));
  };

  useEffect(() => {
    if (!editing) load();
  }, [editing]);

  const createLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const position = lessons.reduce((m, l) => Math.max(m, l.position), 0) + 1;
    const { data, error } = await db().from('lessons').insert({ title: title.trim(), position }).select('id').single();
    if (error) return setError(error.message);
    setTitle('');
    setEditing(data.id);
  };

  const toggleAssign = async (classId: string, lessonId: string) => {
    const key = `${classId}:${lessonId}`;
    const { error } = assigned.has(key)
      ? await db().from('assignments').delete().eq('class_id', classId).eq('lesson_id', lessonId)
      : await db().from('assignments').insert({ class_id: classId, lesson_id: lessonId });
    if (error) return setError(error.message);
    setAssigned((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const deleteLesson = async (id: string) => {
    const { error } = await db().from('lessons').delete().eq('id', id);
    if (error) setError(error.message);
    else load();
  };

  if (editing) return <LessonEditor lessonId={editing} userId={userId} onBack={() => setEditing(null)} />;

  return (
    <>
      {error && <p className="error">{error}</p>}
      <form className="panel row" onSubmit={createLesson}>
        <input placeholder="Tên bài, ví dụ: Bài 45: an ăn ân" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn small primary">+ Tạo bài</button>
      </form>

      {lessons.length === 0 && <p className="hint">Cô tạo bài theo sách, rồi thêm vần và ghi âm giọng đọc mẫu.</p>}
      {lessons.length > 0 && classes.length === 0 && (
        <p className="hint">Cô tạo lớp ở tab “Lớp học” để giao bài cho học sinh.</p>
      )}

      {lessons.map((l) => (
        <section key={l.id} className="panel lesson-row">
          <div className="row between">
            <div>
              <b>{l.title}</b> <span className="muted">· {l.lesson_items[0]?.count ?? 0} vần</span>
            </div>
            <div className="row">
              <button className="btn small" onClick={() => setEditing(l.id)}>
                ✏️ Soạn
              </button>
              <ConfirmButton onConfirm={() => deleteLesson(l.id)} title="Xóa bài và kết quả của bài">
                Xóa
              </ConfirmButton>
            </div>
          </div>
          {classes.length > 0 && (
            <div className="row assign">
              <span className="muted">Giao cho:</span>
              {classes.map((c) => (
                <label key={c.id} className={`toggle ${assigned.has(`${c.id}:${l.id}`) ? 'on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={assigned.has(`${c.id}:${l.id}`)}
                    onChange={() => toggleAssign(c.id, l.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
