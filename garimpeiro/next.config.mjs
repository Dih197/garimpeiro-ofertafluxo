/** @type {import('next').NextConfig} */
const nextConfig = {
  // Baileys mantém uma conexão WebSocket persistente com o WhatsApp. Esses
  // módulos não podem ser empacotados pelo webpack do Next, senão o `ws`
  // perde o mecanismo de máscara dos frames e o QR não é gerado.
  serverExternalPackages: ["better-sqlite3", "@whiskeysockets/baileys", "ws", "pino", "qrcode"],
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; frame-src http://localhost:3001; object-src 'none'; base-uri 'self'; form-action 'self'" }
      ]
    }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.shopee.com.br" },
      { protocol: "https", hostname: "**.shopee.com" },
      { protocol: "https", hostname: "down-br.img.susercontent.com" },
      { protocol: "https", hostname: "cf.shopee.com.br" }
    ]
  }
};

export default nextConfig;
