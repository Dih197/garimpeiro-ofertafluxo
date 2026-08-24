import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./styles.css";

export const metadata: Metadata = {
  title: "Garimpeiro · Shopee Affiliate AI",
  description: "Esteira inteligente de produtos + roteiros pra escalar como afiliado Shopee Vídeo",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Garimpeiro · Shopee Affiliate AI",
    description: "Dashboard completo de ROI para afiliados Shopee com Meta Ads",
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
