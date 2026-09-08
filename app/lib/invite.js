// 招待トークン（HMAC署名・DB不要で2週間失効を実現）
import crypto from "crypto";

const SECRET = process.env.SERVER_SECRET || "dev-secret-change-me";

// label(店舗/相手名), days(有効日数) → 署名付きトークン
export function mintToken(label, days = 14) {
  const exp = Date.now() + Math.min(Math.max(days, 1), 60) * 86400000;
  const body = { l: String(label || "").slice(0, 40), e: exp, c: Date.now() };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

// トークン検証 → { valid, expired, label, exp } or null(改ざん)
export function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expect = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig !== expect) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    const expired = Date.now() > p.e;
    return { valid: !expired, expired, label: p.l, exp: p.e };
  } catch {
    return null;
  }
}
