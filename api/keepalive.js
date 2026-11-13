// Vercel Cron calls this daily so the free Supabase project never counts as inactive (paused after 7 idle days).
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: 'missing Supabase env vars' });

  try {
    const r = await fetch(`${url}/rest/v1/rpc/student_class`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: 'KEEPALIVE' }),
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, supabase: r.status, at: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e) });
  }
}
