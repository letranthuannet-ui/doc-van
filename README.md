# Bé Đọc Vần

Trang luyện đọc âm/vần tiếng Việt lớp 1.

- **Luyện tự do** (`#/tu-do`): hơn 100 vần có sẵn, không cần tài khoản.
- **Góc của cô** (`#/co`): tạo lớp, thêm học sinh, soạn bài theo sách, ghi âm giọng mẫu, giao bài, xem kết quả cả lớp.
- **Học sinh** (`#/lop/<MÃ>`): mở link cô gửi → chọn tên → luyện bài được giao; kết quả tự gửi về cho cô.

Chấm phát âm bằng Web Speech API (`vi-VN`, miễn phí, chạy trên Chrome/Edge). Chỉ lưu kết quả đúng/sai và chữ máy nghe được — **không lưu giọng học sinh**.

## Cài Supabase (1 lần, miễn phí)

1. Tạo tài khoản tại https://supabase.com → **New project** (Region: Singapore). Ghi lại mật khẩu database.
2. **SQL Editor** → New query → dán toàn bộ `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**: tắt **Confirm email** (dùng trong nhà, không cần xác nhận email).
4. **Project Settings → API**: chép **Project URL** và **anon public key**.
5. Sau khi cô đã tạo tài khoản trên trang: **Authentication → Sign In / Providers** → tắt **Allow new users to sign up** để người lạ không tạo được tài khoản.

> Gói miễn phí tự tạm dừng nếu 7 ngày không ai dùng — vào dashboard bấm **Restore** là chạy lại, dữ liệu vẫn còn.

## Chạy trên máy

```bash
cp .env.example .env.local   # điền URL + anon key
npm install
npm run dev
```

Không có `.env.local` thì trang vẫn chạy, chỉ có chế độ Luyện tự do.

## Deploy Vercel

Vercel → Project → **Settings → Environment Variables** → thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` → **Deployments → Redeploy**.

Anon key được thiết kế để công khai; dữ liệu được bảo vệ bằng Row Level Security trong `schema.sql` (cô chỉ thấy lớp của mình; học sinh chỉ đọc bài được giao qua mã lớp).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `supabase/schema.sql` | Bảng, quyền (RLS), hàm cho học sinh, kho ghi âm |
| `src/components/Practice.tsx` | Màn luyện đọc dùng chung |
| `src/match.ts` | Chấm theo từng tiếng, nhận biết sai dấu thanh |
| `src/pages/teacher/` | Góc của cô: lớp, bài, soạn bài + ghi âm, kết quả |
| `src/pages/Student.tsx` | Học sinh vào lớp bằng mã |
| `src/data.ts` | Bộ vần cho Luyện tự do |

## Giới hạn

- Máy chỉ so chữ nghe được với đáp án, không chấm từng âm vị; giọng trẻ nhỏ, giọng vùng miền có thể bị nhận sai.
- Ai có link lớp đều vào được lớp đó — chỉ gửi link cho phụ huynh trong lớp.
