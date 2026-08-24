"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const paginaPublica = path.startsWith("/entrar/");
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-36 top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-shopee/[0.055] blur-[120px]" />
        <div className="absolute -right-40 top-[18%] h-[30rem] w-[30rem] rounded-full bg-violet-600/[0.035] blur-[130px]" />
      </div>
      {!paginaPublica && <Sidebar />}
      <main className={paginaPublica ? "app-main min-h-screen" : "app-main min-h-screen pt-14 transition-all duration-300 lg:pl-64 lg:pt-0"}>
        {children}
      </main>
    </>
  );
}
