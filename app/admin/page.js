"use client";
import { useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import "../globals.css";

export default function Admin() {
  const [pw, setPw] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]); // {label, url, exp, qr}

  const issue = async () => {
    if (!pw.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw.trim(), label: label.trim(), days: Number(days) || 14 }) });
      const d = await r.json();
      if (d.error) { setErr(d.error); }
      if (d.token) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/?k=${encodeURIComponent(d.token)}`;
        const qr = await QRCode.toDataURL(url, { margin: 1, width: 240 });
        setItems((x) => [{ label: d.label || label.trim() || "（無題）", url, exp: d.exp, qr }, ...x]);
        setLabel("");
      }
    } catch { setErr("通信エラー"); }
    setBusy(false);
  };
  const copy = (t) => navigator.clipboard?.writeText(t);

  return (
    <div className="app">
      <div className="hero" style={{ paddingBottom: 18 }}>
        <div className="row"><div className="brand">🔐 商談アドバイザー発行</div><Link href="/" style={{ color: "#fff", fontSize: 13 }}>← アプリへ</Link></div>
        <h1 style={{ fontSize: 20 }}>招待リンク・QRを作る</h1>
        <p style={{ fontSize: 12, opacity: .9 }}>商談相手に渡すと、キー不要で2週間AIが使えます（比留間さんのサーバーキーで動作）。</p>
      </div>

      <div className="sec">
        <div className="card">
          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "var(--mut)" }}>管理パスワード</label>
            <input className="kv" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="ADMIN_PASSWORD" />
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "var(--mut)" }}>相手・店舗名（履歴の目印）</label>
            <input className="kv" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例：◯◯美容室 田中様" />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "var(--mut)" }}>有効日数（既定14日・最大60）</label>
            <input className="kv" type="number" value={days} min={1} max={60} onChange={(e) => setDays(e.target.value)} style={{ width: 120 }} />
          </div>
          <button className="btn p" onClick={issue} disabled={busy}>{busy ? "発行中…" : "🎟️ 招待リンク＋QRを発行"}</button>
          {err && <div className="verdict bad" style={{ marginTop: 10 }}>⚠️ {err}</div>}
        </div>

        {items.map((it, i) => (
          <div className="card pop" key={i}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>🎟️ {it.label}</div>
            <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 8 }}>有効期限：{new Date(it.exp).toLocaleString("ja-JP")}</div>
            <img src={it.qr} alt="QR" style={{ width: 200, height: 200, border: "1px solid var(--line)", borderRadius: 10, display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 11, wordBreak: "break-all", background: "#f0f3f6", padding: 8, borderRadius: 8 }}>{it.url}</div>
            <button className="btn s" style={{ marginTop: 8 }} onClick={() => copy(it.url)}>🔗 リンクをコピー</button>
          </div>
        ))}
        <div className="note">※QRを商談相手のスマホで読み取ってもらうと、その場で診断＆AIアドバイザーが使えます（期限まで持ち帰り利用も可）。<br />※利用履歴のダッシュボードは次のアップデートで追加予定です。</div>
      </div>
      <div style={{ height: 30 }} />
    </div>
  );
}
