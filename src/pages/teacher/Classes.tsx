import { useEffect, useState, type FormEvent } from 'react';
import ConfirmButton from '../../components/ConfirmButton';
import { classLink, db } from '../../lib/supabase';
import type { ClassRow, StudentRow } from '../../types';

export default function Classes() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [c, s] = await Promise.all([
      db().from('classes').select('id, name, code, created_at').order('created_at'),
      db().from('students').select('id, class_id, name').order('created_at'),
    ]);
    if (c.error || s.error) return setError((c.error ?? s.error)!.message);
    setClasses(c.data);
    setStudents(s.data);
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p;
    if (error) setError(error.message);
    else {
      setError('');
      await load();
    }
  };

  const createClass = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    run(db().from('classes').insert({ name: name.trim() }));
    setName('');
  };

  return (
    <>
      {error && <p className="error">{error}</p>}
      <form className="panel row" onSubmit={createClass}>
        <input placeholder="Tên lớp, ví dụ: Lớp 1A" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn small primary">+ Tạo lớp</button>
      </form>

      {classes.length === 0 && <p className="hint">Cô tạo lớp đầu tiên ở ô bên trên nhé.</p>}

      {classes.map((c) => (
        <ClassCard
          key={c.id}
          cls={c}
          students={students.filter((s) => s.class_id === c.id)}
          onAddStudents={(names) => run(db().from('students').insert(names.map((n) => ({ class_id: c.id, name: n }))))}
          onDeleteStudent={(id) => run(db().from('students').delete().eq('id', id))}
          onRenameStudent={(id, n) => run(db().from('students').update({ name: n }).eq('id', id))}
          onDeleteClass={() => run(db().from('classes').delete().eq('id', c.id))}
        />
      ))}
    </>
  );
}

interface CardProps {
  cls: ClassRow;
  students: StudentRow[];
  onAddStudents: (names: string[]) => void;
  onDeleteStudent: (id: string) => void;
  onRenameStudent: (id: string, name: string) => void;
  onDeleteClass: () => void;
}

function ClassCard({ cls, students, onAddStudents, onDeleteStudent, onRenameStudent, onDeleteClass }: CardProps) {
  const [names, setNames] = useState('');
  const [copied, setCopied] = useState(false);
  const link = classLink(cls.code);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: link is still visible to copy by hand */
    }
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const list = names.split('\n').map((n) => n.trim()).filter(Boolean);
    if (list.length) onAddStudents(list);
    setNames('');
  };

  return (
    <section className="panel">
      <div className="row between">
        <h2>{cls.name}</h2>
        <ConfirmButton onConfirm={onDeleteClass} title="Xóa lớp và toàn bộ kết quả">
          Xóa lớp
        </ConfirmButton>
      </div>

      <p className="muted">Link cho học sinh (gửi phụ huynh hoặc mở trên máy của lớp):</p>
      <div className="row">
        <code className="link-box">{link}</code>
        <button className="btn small" onClick={copy}>
          {copied ? '✓ Đã chép' : 'Chép link'}
        </button>
      </div>

      <h3>Học sinh ({students.length})</h3>
      <ul className="student-list">
        {students.map((s) => (
          <li key={s.id}>
            <input
              defaultValue={s.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== s.name) onRenameStudent(s.id, v);
              }}
            />
            <ConfirmButton onConfirm={() => onDeleteStudent(s.id)} title="Xóa học sinh và kết quả của bé">
              ✕
            </ConfirmButton>
          </li>
        ))}
      </ul>

      <form className="add-students" onSubmit={add}>
        <textarea
          rows={3}
          placeholder={'Thêm học sinh, mỗi dòng một tên:\nAn\nBình\nChi'}
          value={names}
          onChange={(e) => setNames(e.target.value)}
        />
        <button className="btn small primary">+ Thêm học sinh</button>
      </form>
    </section>
  );
}
