"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import "./globals.css";
import { GUIDE, LEVERS, SUCCESS_MODEL, DIAG_ITEMS, diagnose, GLOSSARY } from "./data";

// 用語解説（?ボタン → タップで表示、×で閉じる）
function Info({ k, children }) {
  const [open, setOpen] = useState(false);
  const g = GLOSSARY[k];
  return (
    <span className="term" onClick={(e) => e.stopPropagation()}>
      {children || k}
      <button className="qbtn" onClick={() => setOpen(!open)} aria-label="用語の説明">?</button>
      {open && <span className="pop"><button className="popx" onClick={() => setOpen(false)}>×</button>{g}</span>}
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
function AILoading({ dialect }) {
  return (
    <div className="ailoading">
      <div className="ail-emoji">🔎</div>
      <div className="ail-msg">{LOADING_MSG[dialect] || LOADING_MSG.std}</div>
      <div className="ail-sub">お店の情報＋回答をプロ視点でチェック中<span className="typing"><span>.</span><span>.</span><span>.</span></span></div>
      <div className="ail-bar"><i /></div>
    </div>
  );
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

  useEffect(() => {
    setCfg({
      key: localStorage.getItem("ml_key") || "",
      model: localStorage.getItem("ml_model") || "gemini-2.5-flash",
      dialect: localStorage.getItem("ml_dialect") || "std",
      tone: localStorage.getItem("ml_tone") || "polite",
    });
    setBackground(localStorage.getItem("ml_bg") || "");
    try { const bi = localStorage.getItem("ml_bg_info"); if (bi) setBgInfo(JSON.parse(bi)); } catch {}
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
          bg = `店名:${d.info.name || store} / 業種:${d.info.category || "—"} / ★評価:${d.info.rating ?? "不明"} / クチコミ件数:${d.info.reviewCount ?? "不明"} / サイト:${d.info.hasWebsite ? "あり" : "不明"}`;
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

  const result = useMemo(() => diagnose(answers), [answers]);
  const answered = Object.keys(answers).length;

  const track = (type, detail) => {
    if (!invite) return;
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite, type, detail }) }).catch(() => {});
  };
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
    try {
      const r = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aiCreds, mode: "diagnose", background,
          diagnosis: { total: result.total, grade: result.grade, levers: result.levers, answers: answersList } }),
      });
      const d = await r.json();
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
      {tab === "diag" && <Diag answers={answers} setAnswers={setAnswers} result={result} answered={answered} setTab={setTab} setGsel={setGsel} cfg={cfg} aiCreds={aiCreds} aiOn={aiMode} background={background} setBackground={setBackground} bgInfo={bgInfo} setBgInfo={setBgInfo} aiDiag={aiDiag} runAIDiagnose={runAIDiagnose} />}
      {tab === "ai" && <Consult aiCreds={aiCreds} aiOn={aiMode} result={result} answered={answered} background={background} setTab={setTab} />}
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

function Diag({ answers, setAnswers, result, answered, setTab, setGsel, cfg, aiCreds, aiOn, background, setBackground, bgInfo, setBgInfo, aiDiag, runAIDiagnose }) {
  const total = DIAG_ITEMS.length;
  const done = answered >= 6;
  const allDone = answered >= total;
  const hasKey = aiOn;
  const [link, setLink] = useState("");
  const [fetching, setFetching] = useState(false);
  const [perr, setPerr] = useState("");
  const [showInput, setShowInput] = useState(false);

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
        const bg = `店名:${d.info.name || link.trim()} / 業種:${d.info.category || "—"} / ★評価:${d.info.rating ?? "不明"} / クチコミ件数:${d.info.reviewCount ?? "不明"} / サイト:${d.info.hasWebsite ? "あり" : "不明"} / 予約:${d.info.hasReservation ? "あり" : "不明"}${d.info.area ? ` / エリア:${d.info.area}` : ""}`;
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
              <div className="sb-t">🏪 あなたのお店（AI取得・診断に反映済み）</div>
              <div className="sb-n">{bgInfo.name || bgInfo.query || "—"}</div>
              <div className="sb-m">{bgInfo.category ? `業種: ${bgInfo.category}　` : ""}★{bgInfo.rating ?? "—"}　クチコミ{bgInfo.reviewCount ?? "—"}件{bgInfo.hasWebsite ? "　サイトあり" : ""}{bgInfo.area ? `　${bgInfo.area}` : ""}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mut)" }}>この内容で合ってる？</span>
                <button className="btn s" style={{ width: "auto", padding: "6px 12px", fontSize: 12, color: "#d9403a", borderColor: "#f0b8b3" }} onClick={() => { setShowInput(true); setBgInfo(null); setBackground(""); try { localStorage.removeItem("ml_bg_info"); localStorage.removeItem("ml_bg"); } catch {} }}>❌ 別のお店（再検索）</button>
              </div>
              <div className="note" style={{ marginTop: 6 }}>この情報を背景に、下の{total}問の回答と合わせてAIが総評します。</div>
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
            <div className="seg" style={it.multi ? { flexWrap: "wrap" } : undefined}>
              {it.opts.map(([label, val]) => {
                const on = it.multi ? (answers[it.k] || []).includes(val) : answers[it.k] === val;
                return (
                  <button key={label} className={on ? "on" : ""}
                    onClick={() => (it.multi ? toggleMulti(it, val) : setAnswers({ ...answers, [it.k]: val }))}>
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
          <h2>いまの状態（強み・弱み）</h2>
          <div style={{ fontWeight: 800, fontSize: 15, margin: "0 2px 8px" }}>{verdictText(result.total)}</div>
          <div className="levpills">
            {LEVERS.map((L) => {
              const v = result.levers[L.k] ?? 0;
              const q = v >= 72 ? { m: "◎", t: "強い", c: "var(--good)", bg: "#e7f6f3" } : v >= 48 ? { m: "○", t: "ふつう", c: "var(--warn)", bg: "#fff6e6" } : { m: "△", t: "伸びしろ", c: "var(--bad)", bg: "#fdece9" };
              return (
                <div className="levpill" key={L.k} style={{ background: q.bg, borderColor: q.c + "44" }}>
                  <div className="lp-nm">{L.nm}</div>
                  <div className="lp-q" style={{ color: q.c }}>{q.m} {q.t}</div>
                </div>
              );
            })}
          </div>
          <div className="note" style={{ marginBottom: 4 }}>※簡易セルフ診断。傾向で見てください（カンリー公式AI診断とは別）。</div>

          {/* AIコンサルの総評（主役・セクションごとにカード表示） */}
          {hasKey ? (
            <>
              <h2 style={{ marginTop: 20 }}>🩺 AIコンサルの総評</h2>
              {!aiDiag.text && !aiDiag.loading && (
                <p style={{ fontSize: 13, margin: "0 2px 10px", color: "var(--mut)" }}>あなたの回答{background ? "とお店の情報" : ""}をもとに「何が良くて・何が課題か → なぜか」を解説します。</p>
              )}
              {!aiDiag.text && (
                <button className="btn p glow" onClick={runAIDiagnose} disabled={!allDone || aiDiag.loading}>
                  {aiDiag.loading ? "🔎 分析中…" : allDone ? "🩺 AIに総評してもらう" : `あと${total - answered}問 答えると受けられます`}
                </button>
              )}
              {aiDiag.loading && <AILoading dialect={cfg.dialect} />}
              {aiDiag.err && <div className="verdict bad">⚠️ {aiDiag.err}</div>}
              {aiDiag.text && <AISections text={aiDiag.text} />}
              {aiDiag.text && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn p" onClick={() => setTab("ai")}>💬 このままAIに相談する ›</button>
                  <button className="btn s" style={{ width: "auto", padding: "0 14px" }} onClick={runAIDiagnose} disabled={aiDiag.loading}>🔄</button>
                </div>
              )}
            </>
          ) : (
            <div className="note">💡 設定でGeminiキーを入れると、<b>AIコンサルが「総評→なぜ→次の一手」まで</b>解説します。</div>
          )}

          <h2>弱点TOP3 → 直すと効くポイント</h2>
          {result.weak.map((it) => {
            const g = GUIDE.find((x) => x.levers.some((l) => it.lev.includes(l))) || GUIDE[0];
            return (
              <div className="weak fadein" key={it.k}>
                <div className="h">⚠️ {it.q}</div>
                {it.lev.map((l) => <span className="lvtag" key={l}>{LEVERS.find((x) => x.k === l).nm}</span>)}
                <div className="gen">この項目は{it.lev.map((l) => LEVERS.find((x) => x.k === l).nm).join("・")}のレバーを弱めています（一般的傾向）。</div>
                <button className="go" onClick={() => { setGsel(g.key); setTab("guide"); }}>📚 直し方をガイドで見る ›</button>
              </div>
            );
          })}
          <div className="note">効果は一般的傾向であり、成果を保証するものではありません。</div>
        </div>
      )}
    </>
  );
}

function GuideScreen({ gsel, setGsel }) {
  const g = GUIDE.find((x) => x.key === gsel);
  return (
    <>
      <div className="hero" style={{ paddingBottom: 18 }}>
        <Gear />
        <div className="brand">📚 GBP最適化ガイド</div>
        <h1 style={{ fontSize: 20 }}>{g ? g.title : "何を直すと集客に効く？"}</h1>
      </div>
      <div className="sec">
        {!g && (
          <div className="card glist">
            {[...GUIDE].sort((a, b) => (a.priority || 9) - (b.priority || 9)).map((x) => (
              <button key={x.key} className="g" onClick={() => setGsel(x.key)}>
                <span className="em">{x.emo}</span>
                <div><div className="nm">{x.title}</div><div className="ds">{x.what.slice(0, 24)}…</div></div>
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
              {g.key === "review" && <div className="note">※クチコミの“集め方・増やすコツ”は、このアプリでは扱っていません。本格的にやりたいときは「相談」を見てください。</div>}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Consult({ aiCreds, aiOn, result, answered, background, setTab }) {
  const hasKey = aiOn;
  const done = answered >= 6;
  const [cmsgs, setCmsgs] = useState([]);
  const [cin, setCin] = useState("");
  const [cbusy, setCbusy] = useState(false);

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

  const chips = done
    ? ["最優先の3手は？", "今日やることを教えて", "弱点の直し方を具体的に", "オーナー登録のやり方は？", "パフォーマンス（インサイト）とは？", "説明文の書き方の例は？", "クチコミ返信の例文は？"]
    : ["カテゴリの選び方は？", "写真は何を何枚？", "オーナー登録のやり方は？", "パフォーマンス（インサイト）とは？", "Ask Mapsって何？", "属性はどう設定する？"];

  return (
    <>
      <div className="aihero fadein">
        <Gear />
        <div className="b">💬 AIに相談 {hasKey && <span className="badge" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>🤖 連携中</span>}</div>
        <h1>次の一手を、一緒に決めよう</h1>
        <p style={{ fontSize: 12, opacity: .9, marginTop: 4 }}>{done ? `あなたの診断（${result.total}点）をふまえて答えます` : "用語・やり方から、お店の改善相談まで何でも"}</p>
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
          <div className="chat">
            {cmsgs.length === 0 && <div className="msg a">こんにちは！{done ? "診断結果をふまえて、" : ""}Googleマップ集客の「次の一手」を一緒に考えます。下のボタンからどうぞ。</div>}
            {cmsgs.map((m, i) => <div key={i} className={"msg " + (m.role === "user" ? "u" : "a")}>{m.role === "assistant" ? <div>{renderMd(m.text)}</div> : m.text}</div>)}
            {cbusy && <div className="msg a"><div className="typing">分析中<span>.</span><span>.</span><span>.</span></div></div>}
          </div>
          <div className="chips">{chips.map((c) => <div key={c} className="chip" onClick={() => cask(c)}>{c}</div>)}</div>
          <div className="sec" style={{ paddingTop: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="kv" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="質問を入力…"
                onKeyDown={(e) => e.key === "Enter" && cask(cin)} />
              <button className="btn p" style={{ width: "auto", padding: "0 16px" }} onClick={() => cask(cin)} disabled={cbusy}>➤</button>
            </div>
          </div>
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
function AISections({ text }) {
  return splitSections(text).map((sec, i) => (
    <div className="aisec fadein" key={i} style={{ animationDelay: (i * 0.05) + "s" }}>
      {sec.h && <div className="aisec-h">{sec.h}</div>}
      <div className="aisec-b">{renderMd(sec.body.join("\n"))}</div>
    </div>
  ));
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
