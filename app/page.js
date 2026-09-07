"use client";
import { useEffect, useMemo, useState } from "react";
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

// 操作イメージ図（赤枠で操作箇所を強調）
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

export default function Page() {
  const [tab, setTab] = useState("home");
  const [answers, setAnswers] = useState({});
  const [gsel, setGsel] = useState(null);
  const [cfg, setCfg] = useState({ key: "", model: "gemini-2.5-flash", dialect: "std", tone: "polite" });
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCfg({
      key: localStorage.getItem("ml_key") || "",
      model: localStorage.getItem("ml_model") || "gemini-2.5-flash",
      dialect: localStorage.getItem("ml_dialect") || "std",
      tone: localStorage.getItem("ml_tone") || "polite",
    });
  }, []);
  const aiMode = !!cfg.key;

  const result = useMemo(() => diagnose(answers), [answers]);
  const answered = Object.keys(answers).length;

  const ask = async (q, withDiag) => {
    if (!q.trim() || busy) return;
    const userMsg = { role: "user", text: q };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    const diagnosis = withDiag && answered
      ? { total: result.total, grade: result.grade, levers: result.levers,
          weak: result.weak.map((w) => w.q) }
      : null;
    try {
      const r = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: cfg.key, model: cfg.model, dialect: cfg.dialect, tone: cfg.tone,
          question: q, diagnosis, history: msgs.slice(-6) }),
      });
      const d = await r.json();
      setMsgs((m) => [...m, { role: "assistant", text: d.error ? "⚠️ " + d.error : d.text }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "⚠️ 通信エラー" }]);
    }
    setBusy(false);
  };

  return (
    <div className="app">
      {tab === "home" && (aiMode ? <HomeAI msgs={msgs} busy={busy} ask={ask} answered={answered} /> : <HomeN setTab={setTab} />)}
      {tab === "diag" && <Diag answers={answers} setAnswers={setAnswers} result={result} answered={answered} setTab={setTab} setGsel={setGsel} />}
      {tab === "guide" && <GuideScreen gsel={gsel} setGsel={setGsel} />}
      {tab === "consult" && <Consult />}

      {aiMode && tab === "home" ? (
        <div className="inbar">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)} placeholder={busy ? "考え中…" : "質問を入力…"} />
          <button onClick={() => ask(input)} disabled={busy}>➤</button>
        </div>
      ) : null}

      <nav className="tabbar">
        {[["home", aiMode ? "🤖" : "🏠", aiMode ? "AI" : "ホーム"], ["diag", "🔍", "診断"], ["guide", "📚", "ガイド"], ["consult", "💬", "相談"]]
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

function HomeN({ setTab }) {
  return (
    <>
      <div className="hero">
        <Gear />
        <div className="brand">📍 マップ集客ラボ</div>
        <h1>Googleマップ集客、<br />できてますか？</h1>
        <p>お店のプロフィールを30秒でセルフ診断。弱点と“効くポイント”がわかる。</p>
        <button className="cta" onClick={() => setTab("diag")}>🔍 30秒でセルフ診断する</button>
      </div>
      <div className="sec">
        <h2>選ばれる仕組み</h2>
        <div className="card">
          <div className="flow">
            <div className="step"><div className="em">🔎</div><div className="t">表示</div><div className="s">見つかる</div></div>
            <div className="ar">→</div>
            <div className="step"><div className="em">👀</div><div className="t">接触</div><div className="s">選ばれる</div></div>
            <div className="ar">→</div>
            <div className="step"><div className="em">🚶</div><div className="t">来店</div><div className="s">行動</div></div>
          </div>
          <div className="note">{SUCCESS_MODEL}</div>
        </div>
      </div>
      <div className="sec">
        <h2>学ぶ（GBP最適化ガイド）</h2>
        <div className="card glist">
          {GUIDE.slice(0, 5).map((g) => (
            <button key={g.key} className="g" onClick={() => setTab("guide")}>
              <span className="em">{g.emo}</span>
              <div><div className="nm">{g.title}</div><div className="ds">{g.what.slice(0, 22)}…</div></div>
              <span className="arrow">›</span>
            </button>
          ))}
        </div>
        <div className="note">💡 設定でGeminiキーを入れると、AIアシスタント（方言・口調も選べる）が使えます。</div>
      </div>
    </>
  );
}

function HomeAI({ msgs, busy, ask, answered }) {
  const chips = ["カテゴリの選び方は?", "写真は何を何枚?", "投稿は何を書けばいい?", "クチコミ返信のコツ", "オーナー登録のやり方"];
  return (
    <>
      <div className="aihero">
        <Gear />
        <div className="b">📍 マップ集客ラボ ・ AIアシスタント</div>
        <h1>GBPのこと、なんでも聞いて</h1>
        <span className="badge" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>🤖 Gemini連携中</span>
      </div>
      <div className="chat">
        {msgs.length === 0 && (
          <div className="msg a">こんにちは！Googleビジネスプロフィール（GBP）やマップ集客のこと、なんでも聞いてください。下のボタンからでもどうぞ。</div>
        )}
        {msgs.map((m, i) => <div key={i} className={"msg " + (m.role === "user" ? "u" : "a")}>{m.text}</div>)}
        {busy && <div className="msg a">…</div>}
      </div>
      <div className="chips">
        {answered >= 5 && <div className="chip" onClick={() => ask("私の診断結果（弱点TOP3）を解説して、直し方を教えて", true)}>📊 私の弱点TOP3を解説して</div>}
        {chips.map((c) => <div key={c} className="chip" onClick={() => ask(c)}>{c}</div>)}
      </div>
    </>
  );
}

function Diag({ answers, setAnswers, result, answered, setTab, setGsel }) {
  const done = answered >= 6;
  return (
    <>
      <div className="hero" style={{ paddingBottom: 18 }}>
        <Gear />
        <div className="brand">🔍 セルフ診断</div>
        <h1 style={{ fontSize: 20 }}>10問タップで現在地チェック</h1>
        <p>お店のGoogleページの状態を選ぶだけ。{answered}/10 問</p>
      </div>
      <div className="sec"><div className="note" style={{ marginTop: 0 }}>
        🔗 GBPリンクを貼るだけの自動入力は準備中です。今は下の10問をタップで選んでください。
      </div></div>
      <div className="sec">
        {DIAG_ITEMS.map((it) => (
          <div className="card" key={it.k}>
            <div className="qlabel">{it.q}</div>
            <div className="seg">
              {it.opts.map(([label, val]) => (
                <button key={label} className={answers[it.k] === val ? "on" : ""}
                  onClick={() => setAnswers({ ...answers, [it.k]: val })}>{label}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {done && (
        <div className="sec">
          <h2>診断結果</h2>
          <div className="card">
            <div className="scorewrap">
              <div className="score" style={{ background: `conic-gradient(${gradeColor(result.total)} 0 ${result.total}%,#eef2f6 ${result.total}%)` }}>
                <b style={{ color: gradeColor(result.total) }}>{result.grade}</b>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{verdictText(result.total)}</div>
                <div style={{ fontSize: 11, color: "var(--mut)" }}>{result.total}点／簡易セルフ診断</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {LEVERS.map((L) => (
                <div className="lever" key={L.k}>
                  <div className="top"><span>{L.nm}（{L.ds}）</span><span>{result.levers[L.k] ?? "—"}</span></div>
                  <div className="bar"><i style={{ width: (result.levers[L.k] ?? 0) + "%", background: LEV_COLOR[L.k] }} /></div>
                </div>
              ))}
            </div>
            <div className="note">※これは簡易セルフ診断です。カンリーの公式AI診断（13万店舗DB基準）とは別物です。</div>
          </div>
          <h2>弱点TOP3 → 直すと効くポイント</h2>
          {result.weak.map((it) => {
            const g = GUIDE.find((x) => x.levers.some((l) => it.lev.includes(l))) || GUIDE[0];
            return (
              <div className="weak" key={it.k}>
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
            {GUIDE.map((x) => (
              <button key={x.key} className="g" onClick={() => setGsel(x.key)}>
                <span className="em">{x.emo}</span>
                <div><div className="nm">{x.title}</div><div className="ds">{x.what.slice(0, 26)}…</div></div>
                <span className="lv">{x.levers.map((l) => LEVERS.find((y) => y.k === l).nm).join("/")}</span>
              </button>
            ))}
          </div>
        )}
        {g && (
          <>
            <button className="btn s" style={{ marginBottom: 12 }} onClick={() => setGsel(null)}>← 一覧へ</button>
            <div className="card gdetail">
              <div style={{ fontSize: 22 }}>{g.emo}</div>
              <HowTo hilite={g.hilite} title="お店のページ" />
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

function Consult() {
  return (
    <>
      <div className="hero" style={{ paddingBottom: 18 }}>
        <Gear />
        <div className="brand">💬 相談</div>
        <h1 style={{ fontSize: 20 }}>もっと本格的にやるなら</h1>
      </div>
      <div className="sec">
        <p style={{ fontSize: 13, color: "var(--mut)", margin: "0 0 12px" }}>
          「やることは分かったけど、続ける時間がない…」というときは、こんな頼り方があります。
        </p>
        <div className="role ext"><span className="tag">まかせる</span>
          <h3>🤖 更新を自動でおまかせ</h3>
          <p>止まりがちな「お知らせ（投稿）・クチコミ返信・写真の更新」を代わりに続けてもらう方法。お店は最終チェックだけ。</p></div>
        <div className="role hum"><span className="tag">高める</span>
          <h3>🙂 来店体験を良くして“書きたくなる”状態に</h3>
          <p>来店から帰るまでの満足度を高めることで、自然とクチコミが生まれ、次のお客さんにもつながる、という考え方。</p></div>
        <div className="note">
          お店の時間は“お客さんの満足”に集中し、集客の作業は必要に応じて外に頼る——という役割分担です。
          こうしたサポートを提供している会社もあります（例：カンリー）。押し売りはしません。まずは現在地の確認から。
        </div>
      </div>
    </>
  );
}

function gradeColor(t) { return t >= 80 ? "#0e9f8e" : t >= 65 ? "#e0a13a" : "#e0574a"; }
function verdictText(t) { return t >= 80 ? "土台◎、しっかり運用できています" : t >= 65 ? "土台は◎、運用に伸びしろ" : t >= 50 ? "土台◎、運用が止まっています→再稼働を" : "まず土台の整備から始めましょう"; }
