/**
 * Fonte única para as regras financeiras do ROI.
 *
 * A Shopee entrega pedidos em estágios diferentes. Um pedido cancelado ou em
 * estado desconhecido nunca pode entrar em vendas, GMV ou comissão do painel.
 */
export type EstadoPedidoRoi = "concluido" | "pendente" | "cancelado" | "desconhecido";

type ConversaoRoi = {
  status?: string;
  amount: number;
  totalCommission: number;
  quantidade?: number;
  orderId?: string;
};

export function classificarStatusPedido(status?: string): EstadoPedidoRoi {
  const valor = String(status || "").trim().toUpperCase();
  if (!valor) return "desconhecido";
  if (/(CANCEL|REFUND|RETURN|CHARGEBACK|VOID)/.test(valor)) return "cancelado";
  if (["2", "COMPLETED", "SETTLED", "PAID_OUT", "SUCCESS"].includes(valor)) return "concluido";
  if (/(PENDING|PROCESSING|UNPAID|AWAIT|TO_CONFIRM|IN_PROGRESS)/.test(valor) || valor === "1") return "pendente";
  return "desconhecido";
}

export function pedidoEhValido(conversao: Pick<ConversaoRoi, "status">): boolean {
  const estado = classificarStatusPedido(conversao.status);
  return estado === "concluido" || estado === "pendente";
}

export type ResumoPedidosRoi = {
  pedidosGerados: number;
  pedidosValidos: number;
  pedidosConcluidos: number;
  pedidosPendentes: number;
  pedidosCancelados: number;
  pedidosDesconhecidos: number;
  itensValidos: number;
  gmvGerado: number;
  gmvValido: number;
  comissaoEstimada: number;
  comissaoConfirmada: number;
  comissaoPendente: number;
  ticketMedioValido: number | null;
  taxaCancelamentoPct: number | null;
};

const arredondar = (valor: number) => Number(valor.toFixed(2));

export function resumirPedidosRoi(conversoes: ConversaoRoi[]): ResumoPedidosRoi {
  const resumo: ResumoPedidosRoi = {
    pedidosGerados: 0, pedidosValidos: 0, pedidosConcluidos: 0, pedidosPendentes: 0,
    pedidosCancelados: 0, pedidosDesconhecidos: 0, itensValidos: 0,
    gmvGerado: 0, gmvValido: 0, comissaoEstimada: 0,
    comissaoConfirmada: 0, comissaoPendente: 0,
    ticketMedioValido: null, taxaCancelamentoPct: null
  };

  for (const conversao of conversoes) {
    const amount = Number(conversao.amount) || 0;
    const comissao = Number(conversao.totalCommission) || 0;
    const estado = classificarStatusPedido(conversao.status);
    resumo.pedidosGerados += 1;
    resumo.gmvGerado += amount;

    if (estado === "cancelado") {
      resumo.pedidosCancelados += 1;
      continue;
    }
    if (estado === "desconhecido") {
      resumo.pedidosDesconhecidos += 1;
      continue;
    }

    resumo.pedidosValidos += 1;
    resumo.itensValidos += Math.max(1, Number(conversao.quantidade) || 1);
    resumo.gmvValido += amount;
    resumo.comissaoEstimada += comissao;
    if (estado === "concluido") {
      resumo.pedidosConcluidos += 1;
      resumo.comissaoConfirmada += comissao;
    } else {
      resumo.pedidosPendentes += 1;
      resumo.comissaoPendente += comissao;
    }
  }

  return {
    ...resumo,
    gmvGerado: arredondar(resumo.gmvGerado),
    gmvValido: arredondar(resumo.gmvValido),
    comissaoEstimada: arredondar(resumo.comissaoEstimada),
    comissaoConfirmada: arredondar(resumo.comissaoConfirmada),
    comissaoPendente: arredondar(resumo.comissaoPendente),
    ticketMedioValido: resumo.pedidosValidos > 0 ? arredondar(resumo.gmvValido / resumo.pedidosValidos) : null,
    taxaCancelamentoPct: resumo.pedidosGerados > 0 ? arredondar((resumo.pedidosCancelados / resumo.pedidosGerados) * 100) : null
  };
}
