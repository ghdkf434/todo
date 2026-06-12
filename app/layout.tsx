import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "미루미",
  description: "왜 미루는지 기록하는 To-Do 앱",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
