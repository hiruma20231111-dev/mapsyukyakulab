// 招待トークン（AES-256-GCMで暗号化・DB不要）
// 比留間さんのGeminiキーを暗号化して埋め込む→サーバーだけが復号。相手は中身を読めない。2週間で失効。
import crypto from "crypto";

const SECRET = process.env.SERVER_SECRET || "dev-secret-change-me-please";
const KEY = crypto.createHash("sha256").update(SECRET).digest(); // 32 bytes

// { geminiKey, label, days, model } → 暗号化トークン
export function mintToken({ geminiKey, label = "", days = 14, model = "gemini-2.5-flash" }) {
  const exp = Date.now() + Math.min(Math.max(Number(days) || 14, 1), 60) * 86400000;
  const id = crypto.randomBytes(6).toString("hex"); // 相手ごとの識別ID（履歴集計用）
  const data = JSON.stringify({ gk: geminiKey, l: String(label).slice(0, 40), e: exp, m: model, c: Date.now(), id });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64url")).join(".");
}

// トークン復号 → { valid, expired, label, exp, gk, model } or null(不正)
export function verifyToken(token) {
  if (!token || typeof token !== "string" || token.split(".").length !== 3) return null;
  try {
    const [ivb, tagb, encb] = token.split(".");
    const iv = Buffer.from(ivb, "base64url");
    const tag = Buffer.from(tagb, "base64url");
    const enc = Buffer.from(encb, "base64url");
    const d = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    d.setAuthTag(tag);
    const dec = Buffer.concat([d.update(enc), d.final()]).toString("utf8");
    const p = JSON.parse(dec);
    const expired = Date.now() > p.e;
    return { valid: !expired, expired, label: p.l, exp: p.e, gk: p.gk, model: p.m, id: p.id, created: p.c };
  } catch {
    return null;
  }
}
