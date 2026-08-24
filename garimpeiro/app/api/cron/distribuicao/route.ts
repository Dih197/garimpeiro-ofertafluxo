import { NextResponse } from "next/server";
import { obterAutomacaoDistribuicao, obterSegurancaDistribuicao, limitesEnvioDistribuicao, listarDestinosDistribuicao, listarProdutosHistorico, listarProdutosHoje, reagendarAutomacaoDistribuicao } from "@/lib/db";
import { lerConfig } from "@/lib/configs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Executor nativo da agenda. Deve ser chamado pelo Agendador de Tarefas,
 * cron ou serviço de monitoramento com Authorization: Bearer CRON_SECRET.
 * Processa no máximo uma oferta/destino por ciclo para manter cadência segura.
 */
export async function POST(req: Request) {
  const segredo = lerConfig("CRON_SECRET");
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  const agenda = obterAutomacaoDistribuicao();
  const seguranca = obterSegurancaDistribuicao();
  if (!agenda.ativa) return NextResponse.json({ ok: true, executado: false, motivo: "Agenda pausada." });
  if (agenda.proximaExecucao && Date.parse(agenda.proximaExecucao) > Date.now()) return NextResponse.json({ ok: true, executado: false, motivo: "Ainda não chegou o próximo ciclo.", proximaExecucao: agenda.proximaExecucao });
  const destino = listarDestinosDistribuicao().find(d => d.ativo && d.confirmado && (() => {
    const limite = limitesEnvioDistribuicao(d.id);
    return limite.hora < seguranca.maxPorHora && limite.dia < seguranca.maxPorDia && (!limite.ultimoDestinoEm || Date.now() - Date.parse(limite.ultimoDestinoEm) >= seguranca.intervaloDestinoMinutos * 60_000);
  })());
  const produto = listarProdutosHoje(1)[0] || listarProdutosHistorico(1)[0];
  if (!destino || !produto) return NextResponse.json({ ok: true, executado: false, motivo: !produto ? "Sem produto garimpado." : "Nenhum destino disponível dentro das regras de segurança." });
  const url = new URL("/api/distribuicao/automacao", req.url);
  const resposta = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao: "enviar", produtoId: produto.id, destinoId: destino.id }) });
  const resultado = await resposta.json().catch(() => ({}));
  if (resultado.ok) reagendarAutomacaoDistribuicao();
  return NextResponse.json({ ok: Boolean(resultado.ok), executado: Boolean(resultado.ok), destino: destino.nome, produto: produto.nome, detalhe: resultado.erro || null }, { status: resposta.status });
}
