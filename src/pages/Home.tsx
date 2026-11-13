import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { go } from '../router';

export default function Home() {
  const [code, setCode] = useState('');

  const join = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) go(`/lop/${c}`);
  };

  return (
    <div className="app">
      <header>
        <h1>📖 Bé Đọc Vần</h1>
        <a className="stars guide-link" href="/huong-dan.html">📘 Hướng dẫn</a>
      </header>

      <div className="home">
        {supabase && (
          <form className="panel" onSubmit={join}>
            <h2>👧 Học sinh</h2>
            <p className="muted">Mở link cô gửi, hoặc nhập mã lớp:</p>
            <div className="row">
              <input placeholder="Mã lớp" value={code} onChange={(e) => setCode(e.target.value)} />
              <button className="btn small primary">Vào lớp</button>
            </div>
          </form>
        )}

        <a className="panel home-link" href="#/tu-do">
          <h2>🎈 Luyện tự do</h2>
          <p className="muted">Hơn 100 vần lớp 1 có sẵn, không cần tài khoản.</p>
        </a>

        {supabase ? (
          <a className="panel home-link" href="#/co">
            <h2>👩‍🏫 Góc của cô</h2>
            <p className="muted">Tạo lớp, soạn bài theo sách, ghi âm giọng mẫu, xem kết quả.</p>
          </a>
        ) : (
          <div className="panel">
            <h2>👩‍🏫 Góc của cô</h2>
            <p className="muted">Chưa bật — cần cấu hình Supabase (xem README).</p>
          </div>
        )}
      </div>
    </div>
  );
}
