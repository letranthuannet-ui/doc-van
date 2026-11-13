import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { db } from '../../lib/supabase';
import Classes from './Classes';
import Lessons from './Lessons';
import Login from './Login';
import Results from './Results';

const TABS = [
  { id: 'lop', label: '👩‍🏫 Lớp học' },
  { id: 'bai', label: '📚 Bài học' },
  { id: 'ket-qua', label: '📊 Kết quả' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function TeacherApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('lop');

  useEffect(() => {
    db().auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = db().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="app"><p className="hint">Đang tải…</p></div>;
  if (!session) return <Login />;

  return (
    <div className="app wide">
      <header>
        <h1>
          <a href="#/">📖</a> Góc của cô
        </h1>
        <div className="row">
          <span className="muted small-text">{session.user.email}</span>
          <button className="btn small ghost" onClick={() => db().auth.signOut()}>
            Đăng xuất
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'lop' && <Classes />}
      {tab === 'bai' && <Lessons userId={session.user.id} />}
      {tab === 'ket-qua' && <Results />}
    </div>
  );
}
