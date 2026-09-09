"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import "./globals.css";
import { GUIDE, LEVERS, SUCCESS_MODEL, DIAG_ITEMS, diagnose, GLOSSARY, consultQuestionFor, guideForItem, snsScore } from "./data";
import { BIZ, BIZ_JP, bizFromCategory, simulate } from "./sim";

// 用語解説（?ボタン → タップで表示、×で閉じる）
function Info({ k, children }) {
  const [open, setOpen] = useState(false);
  const g = GLOSSARY[k];
  return (
    <span className="term" onClick={(e) => e.stopPropagation()}>
      {children || k}
      <button className="qbtn" onClick={() => setOpen(!open)} aria-label="用語の説明">?</button>
      {open && <span className="tpop"><button className="popx" onClick={() => setOpen(false)}>×</button>{g}</span>}
    </span>
  );
}

// 実スクショ＋赤枠オーバーレイ（画像がある項目で使用）
function Shot({ src, box, cap }) {
  return (
    <div className="howto">
      <div className="cap">📱 {cap || "操作画面（赤い枠が「触るところ」）"}</div>
      <div style={{ position: "relative" }}>
        <img src={src} alt="操作画面" style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)", display: "block" }} />
        {box && (
          <span style={{ position: "absolute", left: box.x + "%", top: box.y + "%", width: box.w + "%", height: box.h + "%",
            border: "3px solid #e0574a", borderRadius: 8, boxShadow: "0 0 0 3px rgba(224,87,75,.25)" }} />
        )}
      </div>
    </div>
  );
}

// 操作イメージ図（実スクショが無いときのフォールバック）
function HowTo({ hilite, title }) {
  if (!hilite) return null;
  return (
    <div className="howto">
      <div className="cap">📱 操作イメージ（赤い枠が「触るところ」）</div>
      <svg viewBox="0 0 320 190" role="img">
        <rect x="8" y="6" width="304" height="178" rx="16" fill="#f4f7fa" stroke="#d7dee6" />
        <rect x="8" y="6" width="304" height="34" rx="16" fill="#12324f" />
        <text x="22" y="28" fill="#fff" fontSize="13" fontWeight="700">📍 {title || "お店のページ"}</text>
        <rect x="20" y="52" width="280" height="26" rx="7" fill="#eef2f6" />
        <text x="32" y="69" fill="#8fa1b3" fontSize="12">メニュー項目</text>
        <rect x="20" y="86" width="280" height="34" rx="8" fill="#fff" stroke="#e0574a" strokeWidth="2.5" />
        <text x="34" y="107" fill="#16202b" fontSize="13" fontWeight="800">{hilite}</text>
        <circle cx="286" cy="103" r="11" fill="#e0574a" />
        <text x="286" y="107" fill="#fff" fontSize="12" fontWeight="800" textAnchor="middle">①</text>
        <rect x="20" y="128" width="280" height="26" rx="7" fill="#eef2f6" />
        <text x="32" y="145" fill="#8fa1b3" fontSize="12">メニュー項目</text>
      </svg>
    </div>
  );
}

const LEV_COLOR = { display: "#0e9f8e", contact: "#e0a13a", visit: "#1f3a5f", aio: "#e0574a" };
const DIALECTS = [["std", "標準語"], ["kansai", "関西弁"], ["hakata", "博多弁"], ["tohoku", "東北弁"], ["nagoya", "名古屋弁"], ["kyoto", "京言葉"]];
const TONES = [["polite", "丁寧"], ["frank", "フランク"], ["comedian", "芸人"], ["hot", "熱血"], ["calm", "クール"]];
const LOADING_MSG = {
  std: "AIがあなたのお店を分析しています…", kansai: "AIがめっちゃ分析中やで〜！ちょい待ってな", hakata: "AIが分析しよるけん、ちょっと待っとって〜",
  tohoku: "AIが分析してるだ〜、ちょっこら待ってけろ", nagoya: "AIが分析しとるがや〜、ちょお待っとりゃあ", kyoto: "AIが分析してますえ〜、少々お待ちやす",
};
const AIL_STEPS = ["お店の情報を読み込み", "強み・弱みを整理", "改善の優先順位を計算", "AI検索対策をチェック", "総評を仕上げ"];
function AILoading({ dialect }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, AIL_STEPS.length - 1)), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="ailoading">
      <div className="ail-orb"><span className="ail-emoji">🔎</span></div>
      <div className="ail-msg">{LOADING_MSG[dialect] || LOADING_MSG.std}</div>
      <div className="ail-steps">
        {AIL_STEPS.map((s, k) => (
          <div key={k} className={"ail-step" + (k < i ? " done" : k === i ? " now" : "")}>
            <span className="ail-ck">{k < i ? "✓" : "●"}</span>{s}
          </div>
        ))}
      </div>
      <div className="ail-bar"><i /></div>
    </div>
  );
}

// 診断に渡す背景（＝検索で実際に取れる収集情報）を1行に整形
function fmtBg(info, fallbackName) {
  return `店名:${info.name || fallbackName || "—"} / 業種(カテゴリ):${info.category || "不明"} / クチコミ点数:${info.rating ?? "不明"} / クチコミ数:${info.reviewCount ?? "不明"}${info.area ? ` / エリア:${info.area}` : ""}`;
}

// 招待リンク初回のオンボーディング（方言・ニュアンス・お店の情報）
function Onboarding({ cfg, onDone }) {
  const [dialect, setDialect] = useState(cfg.dialect || "std");
  const [tone, setTone] = useState(cfg.tone || "polite");
  const [store, setStore] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="app">
      <div className="hero fadein">
        <div className="brand">📍 マップ集客ラボ</div>
        <h1>ようこそ！<br />はじめに設定しましょう</h1>
        <p style={{ fontSize: 12.5, opacity: .92 }}>30秒で終わります。あとから変更もできます。</p>
      </div>
      <div className="sec">
        <h2>① AIの話し方（方言）</h2>
        <div className="pchips">{DIALECTS.map(([k, n]) => <span key={k} className={"pchip" + (dialect === k ? " on" : "")} onClick={() => setDialect(k)}>{n}</span>)}</div>
        <h2>② ニュアンス</h2>
        <div className="pchips">{TONES.map(([k, n]) => <span key={k} className={"pchip" + (tone === k ? " on" : "")} onClick={() => setTone(k)}>{n}</span>)}</div>
        <h2>③ あなたのお店（任意・貼るほど診断が具体的に）</h2>
        <div className="card">
          <input className="kv" value={store} onChange={(e) => setStore(e.target.value)} placeholder="GoogleビジネスプロフィールのURL or お店の名前" />
          <div className="note" style={{ marginTop: 6 }}>入れておくと、AIが検索であなたのお店の公開情報を調べ、診断・アドバイスに反映します（概算・後で確認可）。空でもOK。</div>
        </div>
        <button className="btn p glow" style={{ marginTop: 4 }} disabled={busy}
          onClick={async () => { setBusy(true); await onDone({ dialect, tone, store: store.trim() }); }}>
          {busy ? "準備中…" : "🚀 はじめる"}
        </button>
      </div>
      <div style={{ height: 30 }} />
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = useState("diag");
  const [answers, setAnswers] = useState({});
  const [gsel, setGsel] = useState(null);
  const [cfg, setCfg] = useState({ key: "", model: "gemini-2.5-flash", dialect: "std", tone: "polite" });
  const [background, setBackground] = useState("");
  const [bgInfo, setBgInfo] = useState(null);
  const [aiDiag, setAiDiag] = useState({ loading: false, text: "", err: "" });
  const [invite, setInvite] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [expired, setExpired] = useState(false);
  const [daysLeft, setDaysLeft] = useState(null);
  const [fs, setFs] = useState(1); // 文字サイズ倍率
  const [pendingAsk, setPendingAsk] = useState(null); // 診断→AI相談へ渡す“自動で聞く”質問
  const [interest, setInterest] = useState({}); // 設問ごとの「興味ある/一旦後回し」（タブ切替でも保持）

  useEffect(() => { const v = parseFloat(localStorage.getItem("ml_fs") || "1") || 1; setFs(v); }, []);
  useEffect(() => { document.documentElement.style.setProperty("--fs", String(fs)); }, [fs]);
  const setFont = (v) => { setFs(v); try { localStorage.setItem("ml_fs", String(v)); } catch {} };

  useEffect(() => {
    setCfg({
      key: localStorage.getItem("ml_key") || "",
      model: localStorage.getItem("ml_model") || "gemini-2.5-flash",
      dialect: localStorage.getItem("ml_dialect") || "std",
      tone: localStorage.getItem("ml_tone") || "polite",
    });
    // 旧バージョンで保存された背景から、設問と重複/検索で取れない項目（サイト/予約/説明文/投稿）を除去
    const rawBg = localStorage.getItem("ml_bg") || "";
    const cleanBg = rawBg
      .replace(/\s*\/\s*サイト:[^/]*/g, "").replace(/\s*\/\s*予約:[^/]*/g, "")
      .replace(/\s*\/\s*ビジネス説明文:[^/]*/g, "").replace(/\s*\/\s*投稿\(最新情報\):[^/]*/g, "").trim();
    if (cleanBg !== rawBg) { try { cleanBg ? localStorage.setItem("ml_bg", cleanBg) : localStorage.removeItem("ml_bg"); } catch {} }
    setBackground(cleanBg);
    try { const bi = localStorage.getItem("ml_bg_info"); if (bi) setBgInfo(JSON.parse(bi)); } catch {}
    // 直前の診断（回答＋AI総評）を復元：再ログインしても再診断するまで残す
    try { const a = localStorage.getItem("ml_answers"); if (a) { const p = JSON.parse(a); if (p && typeof p === "object") setAnswers(p); } } catch {}
    try { const t = localStorage.getItem("ml_aidiag"); if (t) setAiDiag({ loading: false, text: t, err: "" }); } catch {}
    // 招待リンク（?k=TOKEN）＝商談アドバイザーモード。localStorageにも保持し期限まで持ち帰り利用可
    try {
      const url = new URL(window.location.href);
      const k = url.searchParams.get("k");
      let inv = "";
      if (k) { inv = k; setInvite(k); localStorage.setItem("ml_invite", k); }
      else { const saved = localStorage.getItem("ml_invite"); if (saved) { inv = saved; setInvite(saved); } }
      // 招待モードの初回だけオンボーディング
      if (inv && !localStorage.getItem("ml_advisor_setup")) setNeedsSetup(true);
      // 招待トークンの有効期限チェック（期限切れならその店舗は停止）
      if (inv) {
        fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: inv }) })
          .then((r) => r.json()).then((d) => { if (d.expired || d.invalid) setExpired(true); else setDaysLeft(d.daysLeft); })
          .catch(() => {});
      }
    } catch {}
  }, []);

  const finishSetup = async ({ dialect, tone, store }) => {
    localStorage.setItem("ml_dialect", dialect);
    localStorage.setItem("ml_tone", tone);
    setCfg((c) => ({ ...c, dialect, tone }));
    let bg = "";
    if (store) {
      try {
        const r = await fetch("/api/lookup", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invite: invite || undefined, key: cfg.key || undefined, input: store }) });
        const d = await r.json();
        if (d.found) {
          bg = fmtBg(d.info, store);
          const info = { ...d.info, query: d.query || store };
          localStorage.setItem("ml_bg_info", JSON.stringify(info)); setBgInfo(info);
        } else { bg = `お店:${store}`; const info = { name: store }; localStorage.setItem("ml_bg_info", JSON.stringify(info)); setBgInfo(info); }
      } catch { bg = `お店:${store}`; }
    }
    localStorage.setItem("ml_bg", bg);
    setBackground(bg);
    localStorage.setItem("ml_advisor_setup", "1");
    setNeedsSetup(false);
  };
  const aiMode = !!cfg.key || !!invite;
  const aiCreds = { key: cfg.key || undefined, invite: invite || undefined, model: cfg.model, dialect: cfg.dialect, tone: cfg.tone };

  // 回答は変わるたびに保存（空のときは復元を上書きしないようスキップ）
  useEffect(() => {
    try { if (Object.keys(answers).length) localStorage.setItem("ml_answers", JSON.stringify(answers)); } catch {}
  }, [answers]);

  const result = useMemo(() => diagnose(answers), [answers]);
  const answered = Object.keys(answers).length;

  const track = (type, detail) => {
    if (!invite) return;
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite, type, detail }) }).catch(() => {});
  };
  // 診断の各項目から「AIに相談」→ そのまま相談タブで自動質問（回答が始まる）
  const askAI = (question) => { if (!question) return; setPendingAsk(question); setTab("ai"); };
  const trackedOpen = useRef(false);
  const trackedDiag = useRef(false);
  useEffect(() => { if (invite && !trackedOpen.current) { trackedOpen.current = true; track("open"); } }, [invite]);
  useEffect(() => { if (invite && !trackedDiag.current && answered >= DIAG_ITEMS.length) { trackedDiag.current = true; track("diagnose_done"); } }, [invite, answered]);

  const runAIDiagnose = async () => {
    if ((!cfg.key && !invite) || aiDiag.loading) return;
    setAiDiag({ loading: true, text: "", err: "" });
    const answersList = DIAG_ITEMS.filter((it) => answers[it.k] != null).map((it) => {
      if (it.multi) {
        const sel = answers[it.k] || [];
        const label = sel.includes("none") || sel.length === 0
          ? "運用していない"
          : sel.map((id) => (it.opts.find(([, v]) => v === id) || [])[0]).filter(Boolean).join("・");
        return { q: it.q, label };
      }
      return { q: it.q, label: (it.opts.find(([, v]) => v === answers[it.k]) || ["—"])[0] };
    });
    const weakItems = DIAG_ITEMS
      .map((it) => ({ it, v: it.multi ? snsScore(answers[it.k]) : answers[it.k] }))
      .filter((x) => typeof x.v === "number" && x.v < 72)
      .sort((a, b) => a.v - b.v)
      .map(({ it }) => ({ k: it.k, q: it.q }));
    try {
      const r = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aiCreds, mode: "diagnose", background,
          diagnosis: { total: result.total, grade: result.grade, levers: result.levers, answers: answersList }, weakItems }),
      });
      const d = await r.json();
      if (!d.error && d.text) { try { localStorage.setItem("ml_aidiag", d.text); } catch {} }
      setAiDiag({ loading: false, text: d.error ? "" : d.text, err: d.error || "" });
    } catch { setAiDiag({ loading: false, text: "", err: "通信エラー" }); }
  };

  if (expired) return (
    <div className="app">
      <div className="hero" style={{ paddingBottom: 40 }}>
        <div className="brand">📍 マップ集客ラボ</div>
        <h1 style={{ fontSize: 22 }}>この招待リンクは<br />有効期限が終了しました</h1>
      </div>
      <div className="sec">
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, margin: "6px 0" }}>⏳</div>
          <p style={{ fontSize: 14, margin: "0 0 6px", fontWeight: 700 }}>お試し期間（設定日数）が終了しました。</p>
          <p style={{ fontSize: 13, color: "var(--mut)", margin: 0 }}>引き続き使いたい場合は、担当者に新しい招待リンクをご依頼ください。</p>
          <a className="btn p" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 14 }}
            href="https://maru-nage.jp/meo-ai-agent/?utm_source=meta&utm_medium=display&utm_campaign=260803_FB_AT_FUSION_260803_AT_FUSION&utm_term=lp001&utm_content=N014_static_1080-1080" target="_blank" rel="noreferrer">📩 相談・お問い合わせ</a>
        </div>
      </div>
    </div>
  );

  if (needsSetup) return <Onboarding cfg={cfg} onDone={finishSetup} />;

  return (
    <div className="app">
      {invite && daysLeft != null && (
        <div style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, padding: "5px 8px",
          background: daysLeft <= 3 ? "#fff6e6" : "#e7f6f3", color: daysLeft <= 3 ? "#c07a13" : "#0b7d70" }}>
          🎫 お試し期間：残り{daysLeft}日
        </div>
      )}
      <div className="fsbar">
        <span className="fsbar-l">🔠 文字サイズ</span>
        <div className="fsseg">
          {[["小", 0.9], ["中", 1], ["大", 1.18]].map(([lab, v]) => (
            <button key={lab} className={Math.abs(fs - v) < 0.01 ? "on" : ""} onClick={() => setFont(v)}>{lab}</button>
          ))}
        </div>
      </div>
      {tab === "diag" &&<Diag answers={answers} setAnswers={setAnswers} result={result} answered={answered} setTab={setTab} setGsel={setGsel} cfg={cfg} aiCreds={aiCreds} aiOn={aiMode} background={background} setBackground={setBackground} bgInfo={bgInfo} setBgInfo={setBgInfo} aiDiag={aiDiag} runAIDiagnose={runAIDiagnose} onAsk={askAI} track={track} interest={interest} setInterest={setInterest} />}
      {tab === "ai" && <Consult aiCreds={aiCreds} aiOn={aiMode} result={result} answered={answered} background={background} setTab={setTab} pendingAsk={pendingAsk} onConsumeAsk={() => setPendingAsk(null)} />}
      {tab === "guide" && <GuideScreen gsel={gsel} setGsel={setGsel} />}

      <nav className="tabbar">
        {[["diag", "🔍", "診断"], ["ai", "💬", "AIに相談"], ["guide", "📚", "MAPガイド"]]
          .map(([k, i, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              <span className="ic">{i}</span>{l}
            </button>
          ))}
      </nav>
    </div>
  );
}

function Gear() {
  return <Link href="/settings" className="gear">⚙️</Link>;
}

function Diag({ answers, setAnswers, result, answered, setTab, setGsel, cfg, aiCreds, aiOn, background, setBackground, bgInfo, setBgInfo, aiDiag, runAIDiagnose, onAsk, track, interest, setInterest }) {
  const total = DIAG_ITEMS.length;
  const done = answered >= 6;
  const allDone = answered >= total;
  const hasKey = aiOn;
  const [link, setLink] = useState("");
  const [fetching, setFetching] = useState(false);
  const [perr, setPerr] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [biz, setBiz] = useState(null); // FB②シミュレーションの業種

  useEffect(() => {
    try { const saved = localStorage.getItem("ml_biz"); if (saved) { setBiz(saved); return; } } catch {}
    const auto = bizFromCategory(bgInfo && bgInfo.category);
    if (auto) setBiz(auto);
  }, [bgInfo]);
  const chooseBiz = (b) => { setBiz(b); try { localStorage.setItem("ml_biz", b); } catch {} };

  // 収集情報カードの手入力（クチコミ点数・件数）を保存し、診断の背景も更新
  const setBgField = (field, val) => {
    const next = { ...(bgInfo || {}), [field]: val };
    setBgInfo(next);
    const bg = fmtBg(next, next.name || next.query);
    setBackground(bg);
    try { localStorage.setItem("ml_bg_info", JSON.stringify(next)); localStorage.setItem("ml_bg", bg); } catch {}
  };

  const toggleMulti = (it, val) => {
    const cur = answers[it.k] || [];
    let next;
    if (val === "none") next = cur.includes("none") ? [] : ["none"];
    else {
      const base = cur.filter((x) => x !== "none");
      next = base.includes(val) ? base.filter((x) => x !== val) : [...base, val];
    }
    const na = { ...answers };
    if (next.length === 0) delete na[it.k]; else na[it.k] = next;
    setAnswers(na);
  };

  const lookup = async () => {
    if (!link.trim() || fetching) return;
    setFetching(true); setPerr("");
    try {
      const r = await fetch("/api/lookup", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aiCreds, input: link.trim() }) });
      const d = await r.json();
      if (d.error) setPerr(d.error);
      else if (d.found) {
        const info = { ...d.info, query: d.query };
        setBgInfo(info); try { localStorage.setItem("ml_bg_info", JSON.stringify(info)); } catch {}
        // ★設問は自動更新しない。AIの“予備知識”としてだけ保存する。
        const bg = fmtBg(d.info, link.trim());
        setBackground(bg); try { localStorage.setItem("ml_bg", bg); } catch {}
        setShowInput(false); setLink("");
      }
    } catch { setPerr("通信エラー"); }
    setFetching(false);
  };

  return (
    <>
      <div className="hero fadein" style={{ paddingBottom: 18 }}>
        <Gear />
        <div className="brand">🔍 セルフ診断</div>
        <h1 style={{ fontSize: 20 }}>{total}問で現在地をチェック</h1>
        <p>お店のGoogleページを見ながら、当てはまるものを選んでください。<b>{answered}/{total} 問</b></p>
        <div className="hbar"><i style={{ width: (answered / total * 100) + "%" }} /></div>
      </div>

      {hasKey && (
        <div className="sec">
          {bgInfo && !showInput ? (
            <div className="storebox fadein">
              <div className="sb-t">🔎 AIがGBPから取得した情報（診断の材料）</div>
              <div className="sb-n">{bgInfo.name || bgInfo.query || "—"}{bgInfo.area ? <span className="sb-area"> ／ {bgInfo.area}</span> : null}</div>
              <div className="sb-grid">
                <div className="sb-row"><span>カテゴリ<i className="sb-src">検索</i></span><b>{bgInfo.category || "不明"}</b></div>
                <div className="sb-row"><span>クチコミ点数<i className="sb-src man">手入力</i></span>
                  <input className="sb-in" type="number" step="0.1" min="0" max="5" inputMode="decimal" placeholder="例 4.2"
                    value={bgInfo.rating ?? ""} onChange={(e) => setBgField("rating", e.target.value === "" ? null : parseFloat(e.target.value))} /></div>
                <div className="sb-row"><span>クチコミ数<i className="sb-src man">手入力</i></span>
                  <input className="sb-in" type="number" min="0" inputMode="numeric" placeholder="例 128"
                    value={bgInfo.reviewCount ?? ""} onChange={(e) => setBgField("reviewCount", e.target.value === "" ? null : parseInt(e.target.value, 10))} /></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mut)" }}>お店が違う？</span>
                <button className="btn s" style={{ width: "auto", padding: "6px 12px", fontSize: 12, color: "#d9403a", borderColor: "#f0b8b3" }} onClick={() => { setShowInput(true); setBgInfo(null); setBackground(""); try { localStorage.removeItem("ml_bg_info"); localStorage.removeItem("ml_bg"); } catch {} }}>❌ 別のお店（再検索）</button>
              </div>
              <div className="note" style={{ marginTop: 6 }}>クチコミ点数・件数は、Googleマップのお店ページを見て入力してください（検索では正確に取れないため手入力）。写真枚数・投稿・説明文などは下の{total}問でお答えください。この情報＋回答でAIが診断します。</div>
            </div>
          ) : (
            <div className="card fadein">
              <div className="qlabel">🔗 GBP/Googleマップのリンク or 店名（任意）</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="kv" value={link} onChange={(e) => setLink(e.target.value)}
                  placeholder="貼るとAIが背景情報を集めます" onKeyDown={(e) => e.key === "Enter" && lookup()} />
                <button className="btn p" style={{ width: "auto", padding: "0 14px" }} onClick={lookup} disabled={fetching}>
                  {fetching ? "検索中" : "🤖 調べる"}
                </button>
              </div>
              {perr && <div className="note" style={{ background: "#fff5f0", color: "#b4460f" }}>⚠️ {perr}</div>}
              <div className="note" style={{ marginTop: 6 }}>設問は自動では埋めません（ご自身で回答）。これはAI総評の背景に使います。</div>
            </div>
          )}
        </div>
      )}

      <div className="sec">
        {DIAG_ITEMS.map((it, i) => (
          <div className="card fadein" key={it.k} style={{ animationDelay: (i * 0.03) + "s" }}>
            <div className="qlabel">{it.q}</div>
            <div className={"seg" + (it.multi ? " multi" : "")}>
              {it.opts.map(([label, optval]) => {
                const on = it.multi ? (answers[it.k] || []).includes(optval) : answers[it.k] === optval;
                return (
                  <button key={label} className={on ? "on" : ""}
                    onClick={() => (it.multi ? toggleMulti(it, optval) : setAnswers({ ...answers, [it.k]: optval }))}>
                    {it.multi && on ? "✓ " : ""}{label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {done && (
        <div className="sec">
          <SimCard biz={biz} setBiz={chooseBiz} levers={result.levers}
            rating={bgInfo && bgInfo.rating} reviews={bgInfo && bgInfo.reviewCount} />

          {/* AIコンサルの総評（主役・セクションごとにカード表示） */}
          {hasKey ? (
            <>
              <h2 style={{ marginTop: 20 }}>🩺 AIの診断・評価</h2>
              {!aiDiag.text && !aiDiag.loading && (
                <p style={{ fontSize: 13, margin: "0 2px 10px", color: "var(--mut)" }}>あなたの回答{background ? "とお店の情報" : ""}をGBPガイドに照らして、<b>今できていること・足りないこと・直すとどうなるか</b>を評価します（具体的な“今日の一手”は次の「AIに相談」で）。</p>
              )}
              {!aiDiag.text && (
                <button className="btn p glow" onClick={runAIDiagnose} disabled={!allDone || aiDiag.loading}>
                  {aiDiag.loading ? "🔎 分析中…" : allDone ? "🩺 AIに診断・評価してもらう" : `あと${total - answered}問 答えると受けられます`}
                </button>
              )}
              {aiDiag.loading && <AILoading dialect={cfg.dialect} />}
              {aiDiag.err && <div className="verdict bad">⚠️ {aiDiag.err}</div>}
              {aiDiag.text && <AISections text={aiDiag.text} renderGate={(key) => {
                const it = DIAG_ITEMS.find((d) => d.k === key);
                if (!it) return null;
                return <InterestGate it={it} interest={interest} setInterest={setInterest} hasKey={hasKey} onAsk={onAsk} track={track} setGsel={setGsel} setTab={setTab} />;
              }} />}
              {aiDiag.text && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn p" style={{ flex: 1, minWidth: 0 }} onClick={() => setTab("ai")}>💬 AIに相談する ›</button>
                  <button className="btn s" style={{ width: "auto", flexShrink: 0, padding: "0 16px", whiteSpace: "nowrap" }} onClick={runAIDiagnose} disabled={aiDiag.loading}>🔄 再診断</button>
                </div>
              )}
            </>
          ) : (
            <div className="note">💡 設定でGeminiキーを入れると、<b>AIが「今できていること・足りないこと・直すとどうなるか」を診断・評価</b>します。</div>
          )}

          <div className="note">効果は一般的傾向であり、成果を保証するものではありません。</div>
        </div>
      )}
    </>
  );
}

function GuideScreen({ gsel, setGsel }) {
  const g = GUIDE.find((x) => x.key === gsel);
  const [read, setRead] = useState({});
  const [justRead, setJustRead] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    try { const r = localStorage.getItem("ml_read_guides"); if (r) setRead(JSON.parse(r) || {}); } catch {}
  }, []);
  useEffect(() => { setJustRead(false); }, [gsel]);

  // 詳細の最後までスクロールしたら（＝画面に収まる短いガイドは開いた時点で）「完読！」
  useEffect(() => {
    if (!g) return;
    let done = false;
    const mark = () => {
      if (done) return; done = true;
      setRead((prev) => { const n = { ...prev, [g.key]: true }; try { localStorage.setItem("ml_read_guides", JSON.stringify(n)); } catch {} return n; });
      setJustRead(true);
    };
    const check = () => {
      const doc = document.documentElement;
      const end = endRef.current;
      const byWin = window.innerHeight + window.scrollY >= doc.scrollHeight - 90;
      const byEl = end ? end.getBoundingClientRect().top <= window.innerHeight - 60 : false;
      if (byWin || byEl) mark();
    };
    const t = setTimeout(check, 350);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, [g]);

  const readCount = GUIDE.filter((x) => read[x.key]).length;

  return (
    <>
      <div className="hero" style={{ paddingBottom: 18 }}>
        <Gear />
        <div className="brand">📚 GBP最適化ガイド</div>
        <h1 style={{ fontSize: 20 }}>{g ? g.title : "何を直すと集客に効く？"}</h1>
        {!g && <p style={{ fontSize: 12, opacity: .92, marginTop: 6 }}>📖 完読 {readCount}/{GUIDE.length}{readCount >= GUIDE.length ? "　🏆 全ガイド制覇！" : ""}</p>}
      </div>
      <div className="sec">
        {!g && (
          <div className="card glist">
            {[...GUIDE].sort((a, b) => (a.priority || 9) - (b.priority || 9)).map((x) => (
              <button key={x.key} className="g" onClick={() => setGsel(x.key)}>
                <span className="em">{x.emo}</span>
                <div><div className="nm">{x.title} {read[x.key] && <span className="readmark">✓ 完読</span>}</div><div className="ds">{x.what.slice(0, 24)}…</div></div>
                {x.priority <= 2 ? <span className="prio">{x.priority === 1 ? "最優先" : "優先"}</span>
                  : <span className="lv">{x.levers.map((l) => LEVERS.find((y) => y.k === l).nm).join("/")}</span>}
              </button>
            ))}
          </div>
        )}
        {g && (
          <>
            <button className="btn s" style={{ marginBottom: 12 }} onClick={() => setGsel(null)}>← 一覧へ</button>
            <div className="card gdetail">
              <div style={{ fontSize: 22 }}>{g.emo}</div>
              {g.shot && <Shot src={g.shot.src} box={g.shot.box} cap={g.shot.cap} />}
              <dt style={{ fontWeight: 800, fontSize: 13, marginTop: 6 }}>やり方（手順）</dt>
              <ol className="steps">{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              <dl>
                <dt>何をする？</dt><dd>{g.what}</dd>
                <dt>なぜ効く？</dt><dd>{g.why}</dd>
                <dt>効果</dt><dd style={{ color: "var(--teal2)" }}>{g.effect}</dd>
                <dt>そのままにすると</dt><dd>{g.risk}</dd>
                <dt>コツ</dt>
              </dl>
              {g.tips.map((t, i) => <div className="tip" key={i}>・{t}</div>)}
              {g.deep && g.deep.length > 0 && (
                <div className="deep">
                  <div className="deeph">📖 もっと詳しく（しくみ・効き方）</div>
                  {g.deep.map((d, i) => (
                    <div className="deepitem fadein" key={i} style={{ animationDelay: (i * 0.05) + "s" }}>
                      <div className="dh">{d.h}</div>
                      <div className="dt">{d.t}</div>
                    </div>
                  ))}
                </div>
              )}
              {g.terms && g.terms.length > 0 && (
                <div className="termrow">
                  {g.terms.map((k) => <span className="termchip" key={k}><Info k={k} /></span>)}
                </div>
              )}
              {(read[g.key] || justRead) && (
                <div className="readdone">🎉 完読！ このガイドを最後まで読みました</div>
              )}
              <div ref={endRef} style={{ height: 1 }} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Consult({ aiCreds, aiOn, result, answered, background, setTab, pendingAsk, onConsumeAsk }) {
  const hasKey = aiOn;
  const done = answered >= 6;
  const [cmsgs, setCmsgs] = useState([]);
  const [cin, setCin] = useState("");
  const [cbusy, setCbusy] = useState(false);
  const [openIdx, setOpenIdx] = useState(null); // 過去の質問で開いているもの

  const cask = async (q) => {
    if (!q.trim() || cbusy || !hasKey) return;
    setCmsgs((m) => [...m, { role: "user", text: q }]); setCin(""); setCbusy(true);
    const diag = done ? { total: result.total, grade: result.grade, weak: result.weak.map((it) => it.q) } : null;
    try {
      const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aiCreds, question: q, diagnosis: diag, background, history: cmsgs.slice(-6) }) });
      const d = await r.json();
      setCmsgs((m) => [...m, { role: "assistant", text: d.error ? "⚠️ " + d.error : d.text }]);
    } catch { setCmsgs((m) => [...m, { role: "assistant", text: "⚠️ 通信エラー" }]); }
    setCbusy(false);
  };

  // 診断から渡ってきた質問を、相談タブに来た時点で一度だけ自動送信（そのまま回答が始まる）
  useEffect(() => {
    if (!pendingAsk || !hasKey || cbusy) return;
    const q = pendingAsk;
    onConsumeAsk && onConsumeAsk();
    cask(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAsk, hasKey]);

  const chips = done
    ? ["最優先の3手は？", "今日やることを教えて", "弱点の直し方を具体的に", "オーナー登録のやり方は？", "パフォーマンス（インサイト）とは？", "説明文の書き方の例は？", "クチコミ返信の例文は？"]
    : ["カテゴリの選び方は？", "写真は何を何枚？", "オーナー登録のやり方は？", "パフォーマンス（インサイト）とは？", "Ask Mapsって何？", "属性はどう設定する？"];

  // 質問と回答をペアに整理（最新は上に固定表示、過去はリストから開く）
  const exchanges = [];
  for (let i = 0; i < cmsgs.length; i++) {
    if (cmsgs[i].role === "user") {
      const a = cmsgs[i + 1] && cmsgs[i + 1].role === "assistant" ? cmsgs[i + 1].text : null;
      exchanges.push({ q: cmsgs[i].text, a, idx: exchanges.length });
    }
  }
  const completed = exchanges.filter((e) => e.a != null);
  const latest = completed[completed.length - 1] || null;
  const past = completed.slice(0, -1).reverse();
  const pendingQ = cbusy && exchanges.length && exchanges[exchanges.length - 1].a == null ? exchanges[exchanges.length - 1].q : null;

  const qCount = cmsgs.filter((m) => m.role === "user").length;
  const face = qCount >= 8 ? "🤩" : qCount >= 5 ? "😁" : qCount >= 3 ? "😄" : qCount >= 1 ? "😊" : "🙂";
  const mood = qCount >= 8 ? "最高にゴキゲン！たくさん相談ありがとう" : qCount >= 5 ? "ノッてきました！どんどん聞いてね" : qCount >= 3 ? "いい調子！一緒に良くしていきましょう" : qCount >= 1 ? "よろしくお願いします！" : "質問するほど元気になります";

  return (
    <>
      <div className="aihero fadein">
        <Gear />
        <div className="b">💬 AIに相談 {hasKey && <span className="badge" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>🤖 連携中</span>}</div>
        <h1>次の一手を、一緒に決めよう</h1>
        <p style={{ fontSize: 12, opacity: .9, marginTop: 4 }}>{done ? "あなたの診断結果をふまえて答えます" : "用語・やり方から、お店の改善相談まで何でも"}</p>
        {hasKey && (
          <div className="aibuddy">
            <span className="face" key={face}>{face}</span>
            <div className="aibuddy-t">
              <div className="mood">{mood}</div>
              <div className="hearts">{qCount > 0 ? "❤".repeat(Math.min(qCount, 6)) + (qCount > 6 ? "…" : "") : "🤍🤍🤍"}</div>
            </div>
          </div>
        )}
      </div>

      {!hasKey ? (
        <div className="sec"><div className="card">
          <p style={{ fontSize: 13.5, margin: "0 0 12px" }}>AI改善コンサルは、設定でGeminiキーを入れると使えます（無料キーOK）。</p>
          <button className="btn p" onClick={() => (window.location.href = "/settings")}>⚙️ 設定を開く</button>
        </div></div>
      ) : (
        <>
          {!done && <div className="sec"><div className="note" style={{ marginTop: 0 }}>💡 先に「🔍 診断」を受けると、あなたのお店に合わせた相談ができます。
            <button className="go" style={{ background: "none", border: "none", padding: "6px 0 0", display: "block" }} onClick={() => setTab("diag")}>🔍 診断する ›</button></div></div>}

          {/* 最新のやりとり（常に上に固定表示） */}
          <div className="sec">
            {cbusy ? (
              <>
                {pendingQ && <div className="qbubble">{pendingQ}</div>}
                <div className="abubble"><div className="typing">分析中<span>.</span><span>.</span><span>.</span></div></div>
              </>
            ) : latest ? (
              <>
                <div className="qbubble">{latest.q}</div>
                <div className="abubble">{renderMd(latest.a)}</div>
              </>
            ) : (
              <div className="abubble">こんにちは！{done ? "診断結果をふまえて、" : ""}Googleマップ集客の「次の一手」を一緒に考えます。下のボタンか入力からどうぞ。</div>
            )}
          </div>

          {/* 質問候補＋自由入力 */}
          <div className="chips">{chips.map((c) => <div key={c} className="chip" onClick={() => cask(c)}>{c}</div>)}</div>
          <div className="sec" style={{ paddingTop: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="kv" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="質問を入力…"
                onKeyDown={(e) => e.key === "Enter" && cask(cin)} />
              <button className="btn p" style={{ width: "auto", padding: "0 16px" }} onClick={() => cask(cin)} disabled={cbusy}>➤</button>
            </div>
          </div>

          {/* 過去の質問（タップで回答を開く／閉じる） */}
          {past.length > 0 && (
            <div className="sec">
              <h2>🕘 過去の質問（{past.length}）</h2>
              <div className="pastlist">
                {past.map((ex) => (
                  <div className="pastitem" key={ex.idx}>
                    <button className="pastq" onClick={() => setOpenIdx(openIdx === ex.idx ? null : ex.idx)}>
                      <span className="pastq-t">{ex.q}</span>
                      <span className="pastq-x">{openIdx === ex.idx ? "×" : "＋"}</span>
                    </button>
                    {openIdx === ex.idx && (
                      <div className="pasta">
                        {renderMd(ex.a)}
                        <button className="pasta-close" onClick={() => setOpenIdx(null)}>閉じる</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="sec">
        <div className="card" style={{ background: "linear-gradient(160deg,#f0f6f4,#fff)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>👤 続ける時間がないときは</div>
          <p style={{ fontSize: 12.5, color: "var(--mut)", margin: "0 0 10px" }}>更新の代行や来店体験づくりのサポートを頼む選択肢もあります（押し売りはしません）。</p>
          <a className="btn s" style={{ display: "block", textAlign: "center", textDecoration: "none" }}
            href="https://maru-nage.jp/meo-ai-agent/?utm_source=meta&utm_medium=display&utm_campaign=260803_FB_AT_FUSION_260803_AT_FUSION&utm_term=lp001&utm_content=N014_static_1080-1080" target="_blank" rel="noreferrer">📩 専門家に相談してみる</a>
        </div>
      </div>
    </>
  );
}

// FB② 1000人シミュレーション（「いまの状態」pill を置換）
function SimCard({ biz, setBiz, levers, rating, reviews }) {
  const sim = biz ? simulate(biz, levers, { rating, reviews }) : null;
  const pct = sim ? Math.max(1, Math.min(100, sim.sel / 10)) : 0;
  return (
    <div className="simcard fadein">
      <div className="sim-head">
        <span className="sim-title">🎯 1000人シミュレーション</span>
        <span className="sim-pred">AIの予測</span>
      </div>
      <div className="sim-biz">
        <span className="sim-biz-l">業種</span>
        <select value={biz || ""} onChange={(e) => setBiz(e.target.value)}>
          <option value="" disabled>選んでください</option>
          {BIZ.map(([s, j]) => <option key={s} value={s}>{j}</option>)}
        </select>
      </div>
      {sim ? (
        <>
          <div className="sim-lead">1000人が「近くの{BIZ_JP[biz]}」で探したら…</div>
          <div className="sim-num"><b>{sim.sel}</b><span> 人 / 1000人 が選択</span></div>
          <div className="sim-bar"><i style={{ width: pct + "%" }} /></div>
          <div className="sim-pct">{(sim.sel / 10).toFixed(1)}%{sim.adjusted && <span className="sim-adj">（あなたの★・件数で補正）</span>}</div>
          {sim.strength && <div className="sim-why"><b>選ばれてる他店：</b>{sim.strength}</div>}
          {sim.gain > 0 && (
            <div className="sim-lift">🔧「{sim.bestLeverJP}」を強くすると <b>{sim.sel} → {sim.improved}人</b>（+{sim.gain}）／全部整えば最大 約{sim.ceiling}人</div>
          )}
          <div className="sim-foot">※{sim.label}</div>
        </>
      ) : (
        <div className="sim-pickhint">👆 業種を選ぶと、あなたの診断をもとに予測が出ます</div>
      )}
    </div>
  );
}

function gradeColor(t) { return t >= 80 ? "#0e9f8e" : t >= 65 ? "#e0a13a" : "#e0574a"; }
function verdictText(t) { return t >= 80 ? "土台◎、しっかり運用できています" : t >= 65 ? "土台は◎、運用に伸びしろ" : t >= 50 ? "土台◎、運用が止まっています→再稼働を" : "まず土台の整備から始めましょう"; }

// AI総評を「## 見出し」や絵文字見出しでセクション分割（別枠ドキュメントでなく、見出しごとのカードに）
function splitSections(text) {
  const s = String(text ?? "");
  const isH = (t) => /^#{1,6}\s/.test(t) || (/^\s*(?:\d+[.)]\s*)?(🩺|🎯|🛠️|🛠|📈|⚠️|⚠|✅|💡|📌|🔎|🏆)/.test(t) && t.replace(/^#{1,6}\s/, "").replace(/^\s*\d+[.)]\s*/, "").length <= 26);
  const secs = []; let cur = null;
  for (const ln of s.split("\n")) {
    const t = ln.trimEnd();
    if (isH(t)) { cur = { h: t.replace(/^#{1,6}\s*/, "").replace(/^\s*\d+[.)]\s*/, ""), body: [] }; secs.push(cur); }
    else { if (!cur) { cur = { h: "", body: [] }; secs.push(cur); } cur.body.push(ln); }
  }
  return secs.filter((x) => x.h || x.body.join("").trim());
}
// AI出力の @@FIX:key@@ を検出して、その位置に興味ゲートを差し込みつつ本文をレンダリング
const FIX_RE = /@@FIX:([a-zA-Z]+)@@/;
function renderBodyWithGates(text, renderGate) {
  const lines = String(text ?? "").split("\n");
  const out = [];
  let buf = [];
  const flush = () => { if (buf.length) { out.push(<div key={"b" + out.length}>{renderMd(buf.join("\n"))}</div>); buf = []; } };
  for (const ln of lines) {
    const m = ln.match(FIX_RE);
    if (m && renderGate) {
      const clean = ln.replace(new RegExp(FIX_RE.source, "g"), "").trimEnd();
      if (clean) buf.push(clean);
      flush();
      const gate = renderGate(m[1]);
      if (gate) out.push(<div key={"g" + out.length}>{gate}</div>);
    } else {
      buf.push(ln.replace(new RegExp(FIX_RE.source, "g"), "")); // 万一マッチ漏れした印は表示から除去
    }
  }
  flush();
  return out;
}

function AISections({ text, renderGate }) {
  return splitSections(text).map((sec, i) => (
    <div className="aisec" key={i} style={{ animationDelay: (i * 0.11) + "s" }}>
      {sec.h && <div className="aisec-h">{sec.h}</div>}
      <div className="aisec-b">{renderGate ? renderBodyWithGates(sec.body.join("\n"), renderGate) : renderMd(sec.body.join("\n"))}</div>
    </div>
  ));
}

// AI診断の各項目「直すとどう良くなるか」の直後に差し込む“興味ある？→AIに相談”
function InterestGate({ it, interest, setInterest, hasKey, onAsk, track, setGsel, setTab }) {
  const st = interest[it.k];
  const g = guideForItem(it);
  return (
    <div className="qintent ai">
      {!st && (
        <>
          <div className="qi-q">👉 これ、興味ある？</div>
          <div className="qi-btns">
            <button className="ib yes" onClick={() => { setInterest((s) => ({ ...s, [it.k]: "yes" })); track && track("interest", it.k); }}>🔥 興味ある</button>
            <button className="ib no" onClick={() => setInterest((s) => ({ ...s, [it.k]: "no" }))}>😌 一旦保留</button>
          </div>
        </>
      )}
      {st === "yes" && (
        <div className="qi-open">
          {hasKey ? (
            <button className="fx-consult" onClick={() => { track && track("consult_jump", it.k); onAsk(consultQuestionFor(it)); }}>💬 これについて、うちのお店に合わせてAIに相談 ›</button>
          ) : (
            <div className="fx-note">💡 設定でGeminiキーを入れると、この場でAIに相談できます。</div>
          )}
          <button className="fx-guide" onClick={() => { setGsel(g.key); setTab("guide"); }}>📚 ガイドで直し方を見る</button>
        </div>
      )}
      {st === "no" && (
        <div className="qi-skip">😌 一旦保留にしますね。<button className="qi-reopen" onClick={() => setInterest((s) => { const n = { ...s }; delete n[it.k]; return n; })}>やっぱり気になる</button></div>
      )}
    </div>
  );
}


// Geminiのmarkdown回答を簡易レンダリング（**太字** / 見出し / 箇条書き）
function renderMd(text) {
  const s = String(text ?? "");
  const bold = (str) => str.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>);
  const SEC = /^\s*(#{1,6}\s*)?(\d+[.)]\s*)?(🩺|🎯|🛠️|🛠|📈|⚠️|⚠|✅|💡|📌|🔎|🏆)\s*/;
  return s.split("\n").map((ln, i) => {
    const t = ln.trimEnd();
    if (SEC.test(t) && t.replace(SEC, "").length <= 24) return <div key={i} className="mdh">{bold(t.replace(/^#{1,6}\s/, "").replace(/^\s*\d+[.)]\s*/, ""))}</div>;
    if (/^#{1,6}\s/.test(t)) return <div key={i} className="mdh">{bold(t.replace(/^#{1,6}\s/, ""))}</div>;
    if (/^\s*[-*・]\s/.test(t)) return <div key={i} className="mdli">{bold(t.replace(/^\s*[-*・]\s/, ""))}</div>;
    if (/^\s*\d+[.)]\s/.test(t)) return <div key={i} className="mdli">{bold(t.replace(/^\s*\d+[.)]\s/, ""))}</div>;
    if (!t) return <div key={i} style={{ height: 4 }} />;
    return <p key={i} className="mdp">{bold(t)}</p>;
  });
}
