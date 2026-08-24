"use client";

import { ShoppingBag, Wand2, Target, Trophy } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { timeAgo } from "@/lib/utils";

type Props = {
  stats: { produtos: number; roteiros: number };
  nichosAtivos: number;
  nichosTotal: number;
  topScore: number | string;
  totalOportunidades: number;
  ultimaExecucaoEm: string | null;
};

export function HomeStats({ stats, nichosAtivos, nichosTotal, topScore, totalOportunidades, ultimaExecucaoEm }: Props) {
  return (
    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Produtos Hoje"
        value={stats.produtos}
        icon={ShoppingBag}
        accent="shopee"
        hint={ultimaExecucaoEm ? `Atualizado ${timeAgo(ultimaExecucaoEm)}` : "Aguardando garimpo"}
      />
      <StatCard label="Roteiros IA" value={stats.roteiros} icon={Wand2} accent="indigo" hint="prontos pra copiar" />
      <StatCard label="Nichos Ativos" value={`${nichosAtivos}/${nichosTotal}`} icon={Target} accent="emerald" hint="rastreados" />
      <StatCard
        label="Top Score"
        value={topScore}
        icon={Trophy}
        accent="amber"
        hint={totalOportunidades > 0 ? `${totalOportunidades} oportunidades` : "Sem dados"}
      />
    </section>
  );
}
