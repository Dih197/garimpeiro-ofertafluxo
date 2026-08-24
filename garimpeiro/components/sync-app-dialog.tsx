"use client";

import { useState } from "react";
import { X, Smartphone, Heart, ExternalLink, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Produto } from "@/lib/types";

type Props = {
  produto: Produto | null;
  onClose: () => void;
};

export function SyncAppDialog({ produto, onClose }: Props) {
  const [copiado, setCopiado] = useState(false);
  if (!produto) return null;

  // Deep link e URL normal — Shopee app intercepta os 2
  const urlProduto = produto.linkProduto;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(urlProduto)}&color=ee4d2d&bgcolor=ffffff`;

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlProduto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass relative w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 ring-1 ring-rose-500/30">
              <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-rose-300">
                <Smartphone className="h-3 w-3" /> SINCRONIZAR COM APP
              </div>
              <h2 className="mt-0.5 text-base font-bold">Favoritar no Shopee mobile</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-zinc-400">
            Escaneie esse QR code com a câmera do seu celular. Abre direto no <strong className="text-rose-300">app Shopee</strong> onde você está logado — toca no coração lá pra favoritar na sua conta.
          </p>

          <div className="flex justify-center">
            <div className="rounded-2xl bg-white p-3 shadow-2xl shadow-rose-500/20">
              {/* QR externo gerado sob demanda; otimização do Next não traz benefício para esse PNG. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="QR code do produto"
                width={280}
                height={280}
                className="rounded-lg"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/30 p-3">
            <div className="line-clamp-2 text-xs font-semibold">{produto.nome}</div>
            <div className="mt-1 text-[10px] text-zinc-500">{produto.loja}</div>
          </div>

          <div className="space-y-2">
            <button
              onClick={copiarLink}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold transition-all",
                copiado
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
              )}
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Link copiado!" : "Copiar link do produto"}
            </button>
            <a
              href={urlProduto}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir no Shopee
            </a>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-200/80">
            💡 <strong>Por que QR code?</strong> A API Shopee Affiliate <strong>não expõe</strong> "favoritar" — confirmei via introspecção GraphQL. Só tem <code className="rounded bg-black/40 px-1">generateShortLink</code> e <code className="rounded bg-black/40 px-1">generateBatchShortLink</code>. Favoritar / Vitrine é gerenciado pelo app/painel oficial. Esse QR abre direto no app onde você favorita em 1 toque — funciona como deeplink universal.
          </div>
        </div>
      </div>
    </div>
  );
}
