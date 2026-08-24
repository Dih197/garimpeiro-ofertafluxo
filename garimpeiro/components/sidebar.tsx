"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  History,
  Target,
  Eye,
  Factory,
  Share2,
  Flame,
  Settings,
  Heart,
  Rocket,
  Menu,
  X,
  ChevronRight,
  Zap,
  UsersRound,
  PanelsTopLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  badgeColor?: string;
};

const NAV_SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Visão geral",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/roas", label: "Painel ROI", icon: Rocket, badge: "PRO", badgeColor: "shopee" }
    ]
  },
  {
    label: "Descoberta",
    items: [
      { href: "/favoritos", label: "Favoritos", icon: Heart },
      { href: "/historico", label: "Histórico", icon: History },
      { href: "/nichos", label: "Nichos", icon: Target },
      { href: "/intel", label: "Inteligência", icon: Eye }
    ]
  },
  {
    label: "Operação",
    items: [
      { href: "/esteira", label: "Esteira IA", icon: Factory },
      { href: "/distribuicao", label: "Distribuição", icon: Share2 },
      { href: "/ofertafluxo", label: "OfertaFluxo nativo", icon: PanelsTopLeft, badge: "COMPLETO", badgeColor: "shopee" },
      { href: "/campanhas-grupo", label: "Grupos WhatsApp", icon: UsersRound, badge: "NOVO" }
    ]
  },
  {
    label: "Sistema",
    items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }]
  }
];

const TIPS = [
  "Ative pelo menos 3 nichos pra maximizar achados diários.",
  "Roteiros IA usam contexto do produto pra gerar copy certeira.",
  "Configure Sub_IDs pra rastrear performance por criativo.",
  "Use o Painel ROI pra cruzar gastos Meta com vendas Shopee.",
  "Exporte relatórios em CSV pra controle financeiro."
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  // Rotate tips
  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // Close mobile on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.matches("input, textarea, select, [contenteditable='true']")) return;
      const tecla = e.key.toLowerCase();
      if (tecla === "g") {
        if (path === "/") (document.querySelector("[data-garimpar]") as HTMLButtonElement | null)?.click();
        else router.push("/");
      } else if (tecla === "r") router.push("/roas");
      else if (tecla === "s") router.push("/configuracoes");
      else if (e.key === "?") router.push("/campanhas-grupo");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [path, router]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navContent = (
    <>
      <div className="flex items-center gap-3 border-b border-white/[0.055] px-4 py-4">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl shopee-gradient shopee-glow">
          <Flame className="h-5 w-5 text-white" strokeWidth={2.5} />
          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#0b0b0e] bg-emerald-400 pulse-ring" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-black tracking-[-0.025em] text-zinc-50">Garimpeiro</div>
          <div className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">Shopee Affiliate AI</div>
        </div>
      </div>

      <nav className="scrollbar-thin flex flex-1 flex-col overflow-y-auto px-3 py-3">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.label} className={cn(sectionIndex > 0 && "mt-3")}>
            <div className="mb-1 px-3 text-[8px] font-black uppercase tracking-[0.19em] text-zinc-700">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = path === item.href || (item.href !== "/" && path.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-shopee/[0.16] to-orange-500/[0.055] text-orange-100 shadow-[inset_0_0_0_1px_rgba(243,91,54,.13)]"
                        : "text-zinc-500 hover:bg-white/[0.045] hover:text-zinc-200"
                    )}
                  >
                    <span className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all",
                      active
                        ? "border-shopee/20 bg-shopee/15 text-shopee shadow-[0_5px_18px_rgba(238,77,45,.12)]"
                        : "border-transparent bg-white/[0.025] text-zinc-600 group-hover:bg-white/[0.055] group-hover:text-zinc-300"
                    )}>
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.15} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide",
                        item.badgeColor === "shopee"
                          ? "border-shopee/15 bg-shopee/15 text-orange-300"
                          : "border-white/5 bg-white/[0.04] text-zinc-500"
                      )}>
                        {item.badge}
                      </span>
                    )}
                    {active && <ChevronRight className="h-3 w-3 text-shopee/55" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Keyboard shortcuts hint */}
      <div className="mx-3 mb-2 rounded-xl border border-white/[0.055] bg-white/[0.018] px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600">
          <Zap className="h-2.5 w-2.5" />
          Atalhos
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-[9px] text-zinc-600">
          <span><kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">G</kbd> Garimpar</span>
          <span><kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">R</kbd> ROI</span>
          <span><kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">S</kbd> Config</span>
          <span><kbd className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-400">?</kbd> Grupos</span>
        </div>
      </div>

      <div className="mx-3 mb-3 rounded-xl border border-shopee/10 bg-gradient-to-br from-shopee/[0.055] to-transparent p-3 transition-all hover:border-shopee/20">
        <div className="flex items-center gap-2 text-xs font-semibold text-shopee">
          <Sparkles className="h-3.5 w-3.5" />
          Pro tip
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 transition-all duration-500">
          {TIPS[tipIndex]}
        </p>
        <div className="mt-2 flex gap-1">
          {TIPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-0.5 flex-1 rounded-full transition-all duration-500",
                i === tipIndex ? "bg-shopee/60" : "bg-zinc-800"
              )}
            />
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* MOBILE HAMBURGER */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/90 backdrop-blur-md lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5 text-zinc-300" />
      </button>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* MOBILE SIDEBAR */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-white/[0.07] bg-[#0b0b0e]/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-zinc-100"
        >
          <X className="h-5 w-5" />
        </button>
        {navContent}
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/[0.065] bg-gradient-to-b from-[#0d0d11]/95 via-[#0a0a0e]/92 to-[#09090c]/95 shadow-[22px_0_70px_rgba(0,0,0,.16)] backdrop-blur-2xl lg:flex">
        {navContent}
      </aside>
    </>
  );
}
