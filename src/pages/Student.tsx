import { useEffect, useState } from 'react';
import Practice, { PracticeFooter } from '../components/Practice';
import { db } from '../lib/supabase';
import { withBest, type PracticeItem, type Progress } from '../types';

interface ClassInfo {
  name: string;
  students: { id: string; name: string }[];
}
interface Lesson {
  id: string;
  title: string;
  items: PracticeItem[];
}

const studentKey = (code: string) => `doc-van-student-${code}`;

export default function Student({ code }: { code: string }) {
  const [cls, setCls] = useState<ClassInfo | null | undefined>(undefined);
  const [studentId, setStudentId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(studentKey(code));
    } catch {
      return null;
    }
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [error, setError] = useState('');

  useEffect(() => {
    db()
      .rpc('student_class', { p_code: code })
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setCls((data as ClassInfo | null) ?? null);
      });
  }, [code]);

  const student = cls?.students.find((s) => s.id === studentId);

  useEffect(() => {
    if (!student) return;
    Promise.all([
      db().rpc('student_lessons', { p_code: code }),
      db().rpc('student_progress', { p_code: code, p_student: student.id }),
    ]).then(([l, p]) => {
      if (l.error || p.error) return setError((l.error ?? p.error)!.message);
      setLessons((l.data as Lesson[]) ?? []);
      setProgress((p.data as Progress) ?? {});
    });
  }, [code, student]);

  const pickStudent = (id: string | null) => {
    setStudentId(id);
    setLessonId(null);
    try {
      if (id) localStorage.setItem(studentKey(code), id);
      else localStorage.removeItem(studentKey(code));
    } catch {
      /* storage unavailable */
    }
  };

  const onResult = (item: PracticeItem, verdict: Progress[string], heard: string) => {
    setProgress((p) => withBest(p, item.id, verdict));
    db()
      .rpc('record_attempt', { p_code: code, p_student: student!.id, p_item: item.id, p_verdict: verdict, p_heard: heard })
      .then(({ error }) => error && setError('Chưa gửi được kết quả cho cô: ' + error.message));
  };

  if (cls === undefined) return <div className="app"><p className="hint">Đang tải…</p></div>;
  if (cls === null)
    return (
      <div className="app">
        <div className="panel">
          <p>Không tìm thấy lớp có mã <b>{code}</b>. Hãy kiểm tra lại link cô gửi.</p>
          <a href="#/">← Về trang chủ</a>
        </div>
      </div>
    );

  const lesson = lessons.find((l) => l.id === lessonId);

  return (
    <div className="app">
      <header>
        <h1>📖 {cls.name}</h1>
        {student && (
          <button className="stars" onClick={() => pickStudent(null)} title="Đổi bạn khác">
            👧 {student.name} ⇄
          </button>
        )}
      </header>
      {error && <p className="error">{error}</p>}

      {!student && (
        <div className="panel">
          <h2>Bé tên là gì?</h2>
          {cls.students.length === 0 && <p className="hint">Cô chưa thêm học sinh vào lớp.</p>}
          <div className="name-grid">
            {cls.students.map((s) => (
              <button key={s.id} className="name-btn" onClick={() => pickStudent(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {student && !lesson && (
        <div className="panel">
          <h2>Bài cô giao</h2>
          {lessons.length === 0 && <p className="hint">Cô chưa giao bài nào.</p>}
          <div className="lesson-list">
            {lessons.map((l) => {
              const done = l.items.filter((i) => progress[i.id] === 'correct').length;
              return (
                <button key={l.id} className="lesson-btn" onClick={() => setLessonId(l.id)}>
                  <span>{l.title}</span>
                  <span className="muted">
                    ⭐ {done}/{l.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {student && lesson && (
        <>
          <div className="lesson-head">
            <button className="btn ghost" onClick={() => setLessonId(null)}>← Các bài</button>
            <b>{lesson.title}</b>
          </div>
          <Practice
            key={lesson.id}
            items={lesson.items}
            progress={progress}
            onResult={(item, r) => onResult(item, r.verdict, r.heard)}
          />
          <PracticeFooter />
        </>
      )}
    </div>
  );
}
