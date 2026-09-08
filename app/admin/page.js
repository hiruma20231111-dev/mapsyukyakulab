"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import "../globals.css";

export default function Admin() {
  const [gkey, setGkey] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lastQR, setLastQR] = useState(null); // 直近発行のQR/リンク
  const [usage, setUsage] = useState(null);
  const [uloading, setUloading] = useState(false);
  const [uerr, setUerr] = useState("");
  const [open, setOpen] = useState({}); // 展開中の店舗id
  const [modal, setModal] = useState(null); // {label, url, qr}
  const [copied, setCopied] = useState("");

  const urlFromToken = (token) => `${typeof window !== "undefined" ? window.location.origin : ""}/?k=${encodeURIComponent(token)}`;
  const showQR = async (label, token) => {
    if (!token) return;
    const url = urlFromToken(token);
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 260 });
    setModal({ label, url, qr });
  };
  const copyLink = (token, id) => {
    if (!token) return;
    navigator.clipboard?.writeText(urlFromToken(token));
    setCopied(id); setTimeout(() => setCopied(""), 1500);
  };
  const delStore = async (id, label) => {
    if (!window.confirm(`「${label}」を履歴から削除しますか？（元に戻せません）`)) return;
    try {
      await fetch("/api/delete", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey: gkey.trim(), id }) });
      loadUsage();
    } catch {}
  };

  useEffect(() => {
    const k = localStorage.getItem("ml_admin_gkey") || "";
    setGkey(k);
    if (k) loadUsage(k);
  }, []);

  const loadUsage = async (keyArg) => {
    const k = (keyArg || gkey).trim();
    if (!k || uloading) return;
    setUloading(true); setUerr("");
    try {
      const r = await fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey: k }) });
      const d = await r.json();
      if (d.error) setUerr(d.error); else setUsage(d);
    } catch { setUerr("通信エラー"); }
    setUloading(false);
  };

  const issue = async () => {
    if (!gkey.trim() || busy) return;
    setBusy(true); setErr("");
    localStorage.setItem("ml_admin_gkey", gkey.trim());
    try {
      const r = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiKey: gkey.trim(), label: label.trim(), days: Number(days) || 14 }) });
      const d = await r.json();
      if (d.error) setErr(d.error);
      if (d.token) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/?k=${encodeURIComponent(d.token)}`;
        const qr = await QRCode.toDataURL(url, { margin: 1, width: 240 });
        setLastQR({ label: d.label || label.trim() || "（無題）", url, exp: d.exp, qr });
        setLabel("");
        loadUsage(); // ダッシュボードに反映
      }
    } catch { setErr("通信エラー"); }
    setBusy(false);
  };
  const copy = (t) => navigator.clipboard?.writeText(t);

  const badge = (p) => {
    if (p.expired) return { txt: "期限切れ", bg: "#fdece9", col: "#d9403a", border: "#f0b8b3" };
    if (p.daysLeft != null && p.daysLeft <= 3) return { txt: `あと${p.daysLeft}日`, bg: "#fff5e6", col: "#c07a13", border: "#f0d9a8" };
    return { txt: p.daysLeft != null ? `あと${p.daysLeft}日` : "—", bg: "#e7f6f3", col: "#0b7d70", border: "#cfe7e0" };
  };

  return (
    <div className="app">
      <div className="hero" style={{ paddingBottom: 18 }}>
        <div className="row"><div className="brand">🔐 商談アドバイザー管理</div><Link href="/" style={{ color: "#fff", fontSize: 13 }}>← アプリへ</Link></div>
        <h1 style={{ fontSize: 20 }}>招待発行＆利用ダッシュボード</h1>
        <p style={{ fontSize: 12, opacity: .9 }}>相手ごとに招待リンク/QRを発行。あなたのキーは暗号化して埋め込み（相手は読めません）。</p>
      </div>

      <div className="sec">
        <h2 style={{ fontSize: 14 }}>🎟️ 招待を発行</h2>
        <div className="card">
          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "var(--mut)" }}>あなたのGemini APIキー（この端末に保存）</label>
            <input className="kv" type="password" value={gkey} onChange={(e) => setGkey(e.target.value)} placeholder="Geminiキーを貼り付け" />
            <div className="note" style={{ marginTop: 6 }}>まだ無い場合は <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> で無料発行。※発行ぶんの利用があなたのキーに課金されます。</div>
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: "var(--mut)" }}>相手・店舗名</label>
            <input className="kv" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例：ピンクドルフィン" />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "var(--mut)" }}>有効日数（既定14日・最大60）</label>
            <input className="kv" type="number" value={days} min={1} max={60} onChange={(e) => setDays(e.target.value)} style={{ width: 120 }} />
          </div>
          <button className="btn p" onClick={issue} disabled={busy}>{busy ? "発行中…" : "🎟️ 招待リンク＋QRを発行"}</button>
          {err && <div className="verdict bad" style={{ marginTop: 10 }}>⚠️ {err}</div>}
        </div>

        {lastQR && (
          <div className="card pop">
            <div className="row"><div style={{ fontWeight: 800, fontSize: 14 }}>✅ 発行しました：{lastQR.label}</div>
              <button onClick={() => setLastQR(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--mut)", lineHeight: 1 }}>×</button></div>
            <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 8 }}>有効期限：{new Date(lastQR.exp).toLocaleString("ja-JP")}</div>
            <img src={lastQR.qr} alt="QR" style={{ width: 200, height: 200, border: "1px solid var(--line)", borderRadius: 10, display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 11, wordBreak: "break-all", background: "#f0f3f6", padding: 8, borderRadius: 8 }}>{lastQR.url}</div>
            <button className="btn s" style={{ marginTop: 8 }} onClick={() => copy(lastQR.url)}>🔗 リンクをコピー</button>
          </div>
        )}

        <h2 style={{ fontSize: 14, marginTop: 22 }}>📊 利用ダッシュボード</h2>
        {uerr && <div className="verdict bad">⚠️ {uerr}</div>}
        {usage && (usage.alerts > 0 || usage.soon > 0) && (
          <div className="card" style={{ borderColor: usage.alerts ? "#f0b8b3" : "#f0d9a8", background: usage.alerts ? "#fdf0ef" : "#fff8ec" }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {usage.alerts > 0 && <span style={{ color: "#d9403a" }}>🔴 期限切れ {usage.alerts}件　</span>}
              {usage.soon > 0 && <span style={{ color: "#c07a13" }}>🟠 まもなく期限 {usage.soon}件</span>}
            </div>
          </div>
        )}
        <div className="row" style={{ margin: "0 0 8px" }}>
          <div style={{ fontSize: 12, color: "var(--mut)" }}>{usage?.prospects ? `${usage.prospects.length} 店舗` : ""}</div>
          <button className="btn s" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }} onClick={() => loadUsage()} disabled={uloading}>{uloading ? "更新中…" : "🔄 更新"}</button>
        </div>

        {usage && usage.prospects && usage.prospects.length === 0 && (
          <div className="note">まだ発行した店舗がありません。上の「招待を発行」から追加すると、ここに並びます。</div>
        )}
        {usage && usage.prospects && usage.prospects.map((p) => {
          const bd = badge(p);
          const isOpen = open[p.id];
          return (
            <div className="card" key={p.id} style={{ borderColor: p.expired ? "#f0b8b3" : "var(--line)", cursor: "pointer" }}
              onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}>
              <div className="row">
                <div style={{ fontWeight: 800, fontSize: 14, color: p.expired ? "#d9403a" : "var(--ink)" }}>
                  {p.expired ? "🔴 " : ""}{p.label}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: bd.col, background: bd.bg, border: `1px solid ${bd.border}`, borderRadius: 8, padding: "3px 9px", whiteSpace: "nowrap" }}>{bd.txt}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {p.used ? Object.entries(p.counts).map(([t, n]) => (
                  <span key={t} className="lv" style={{ background: "#eef2f6", color: "#33414f", fontSize: 11 }}>{usage.typeLabels[t] || t}: {n}</span>
                )) : <span style={{ fontSize: 11.5, color: "var(--mut)" }}>まだ未利用（発行のみ）</span>}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--mut)", marginTop: 6 }}>
                {p.last ? `最終利用: ${new Date(p.last).toLocaleString("ja-JP")}` : (p.created ? `発行: ${new Date(p.created).toLocaleDateString("ja-JP")}` : "")}
                　{p.exp ? `／ 期限: ${new Date(p.exp).toLocaleDateString("ja-JP")}` : ""}　{isOpen ? "▲" : "▼"}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                {p.token && <button className="btn s" style={{ width: "auto", padding: "7px 12px", fontSize: 12 }} onClick={() => showQR(p.label, p.token)}>📱 QRを表示</button>}
                {p.token && <button className="btn s" style={{ width: "auto", padding: "7px 12px", fontSize: 12 }} onClick={() => copyLink(p.token, p.id)}>{copied === p.id ? "✅ コピー済" : "🔗 リンクをコピー"}</button>}
                <button className="btn s" style={{ width: "auto", padding: "7px 12px", fontSize: 12, color: "#d9403a", borderColor: "#f0b8b3" }} onClick={() => delStore(p.id, p.label)}>🗑 削除</button>
              </div>
              {isOpen && p.recent && p.recent.length > 0 && (
                <div style={{ borderTop: "1px dashed var(--line)", marginTop: 8, paddingTop: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>最近のAI質問</div>
                  {p.recent.map((r, i) => <div key={i} style={{ fontSize: 12, padding: "2px 0" }}>・{r.t}</div>)}
                </div>
              )}
              {isOpen && (!p.recent || p.recent.length === 0) && (
                <div className="note" style={{ marginTop: 8 }}>AIへの質問はまだありません。</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ height: 30 }} />

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(10,20,16,.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 18, maxWidth: 340, width: "100%", position: "relative" }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🎟️ {modal.label}</div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "var(--mut)", lineHeight: 1 }}>×</button>
            </div>
            <img src={modal.qr} alt="QR" style={{ width: "100%", maxWidth: 260, border: "1px solid var(--line)", borderRadius: 10, display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 11, wordBreak: "break-all", background: "#f0f3f6", padding: 8, borderRadius: 8 }}>{modal.url}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn p" onClick={() => { navigator.clipboard?.writeText(modal.url); }}>🔗 リンクをコピー</button>
              <button className="btn s" style={{ width: "auto", padding: "0 18px" }} onClick={() => setModal(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
