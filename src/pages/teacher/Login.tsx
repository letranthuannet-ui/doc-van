import { useState, type FormEvent } from 'react';
import { db } from '../../lib/supabase';

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const auth = db().auth;
    const { data, error } =
      mode === 'in'
        ? await auth.signInWithPassword({ email, password })
        : await auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}${location.pathname}` } });
    setBusy(false);
    if (error) return setMsg(error.message === 'Invalid login credentials' ? 'Sai email hoặc mật khẩu.' : error.message);
    if (mode === 'up' && !data.session) setMsg('Đã tạo tài khoản. Cô mở email và bấm link xác nhận, rồi quay lại đăng nhập.');
  };

  return (
    <div className="app">
      <header>
        <h1>
          <a href="#/">📖</a> Góc của cô
        </h1>
      </header>
      <form className="panel form" onSubmit={submit}>
        <h2>{mode === 'in' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          />
        </label>
        <button className="btn mic" disabled={busy}>
          {busy ? 'Đang xử lý…' : mode === 'in' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
        {msg && <p className="hint">{msg}</p>}
        <button type="button" className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Chưa có tài khoản? Tạo mới' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
