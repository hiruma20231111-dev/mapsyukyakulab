export const metadata = {
  title: "マップ集客ラボ｜Googleマップ集客セルフ診断＆ガイド",
  description: "お店のGoogleビジネスプロフィールを30秒でセルフ診断。弱点と“効くポイント”がわかる、中立の集客ガイド。",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#12324f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
