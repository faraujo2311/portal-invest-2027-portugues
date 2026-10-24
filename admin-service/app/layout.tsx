import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal INVEST 2027 — Administração",
  description: "Editor privado do portal de estudos, com autorização do GitHub e publicação versionada.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
