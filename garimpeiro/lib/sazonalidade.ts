export type EventoSazonal = {
  id: string;
  nome: string;
  data: string; // ISO (mm-dd) recorrente OU yyyy-mm-dd específica
  diasAntes: number; // quantos dias antes começar a postar
  produtosFoco: string[]; // palavras-chave
  emoji: string;
  prioridade: "alta" | "media" | "baixa";
};

export const CALENDARIO: EventoSazonal[] = [
  { id: "namorados", nome: "Dia dos Namorados", data: "06-12", diasAntes: 21, produtosFoco: ["presente namorado", "perfume", "kit cuidado", "aliança", "buque"], emoji: "💝", prioridade: "alta" },
  { id: "maes", nome: "Dia das Mães", data: "05-08", diasAntes: 30, produtosFoco: ["presente mae", "perfume feminino", "kit beleza", "joia", "porta retrato"], emoji: "🌷", prioridade: "alta" },
  { id: "pais", nome: "Dia dos Pais", data: "08-10", diasAntes: 21, produtosFoco: ["presente pai", "carteira", "perfume masculino", "kit barba", "ferramenta"], emoji: "👔", prioridade: "alta" },
  { id: "criancas", nome: "Dia das Crianças", data: "10-12", diasAntes: 21, produtosFoco: ["brinquedo", "lego", "boneca", "fantasia", "jogo educativo"], emoji: "🧸", prioridade: "alta" },
  { id: "professor", nome: "Dia do Professor", data: "10-15", diasAntes: 14, produtosFoco: ["caneta", "caneca", "agenda", "presente professor"], emoji: "📚", prioridade: "media" },
  { id: "halloween", nome: "Halloween", data: "10-31", diasAntes: 21, produtosFoco: ["fantasia halloween", "maquiagem terror", "decoracao halloween", "abobora"], emoji: "🎃", prioridade: "media" },
  { id: "blackfriday", nome: "Black Friday", data: "11-25", diasAntes: 30, produtosFoco: ["eletronicos", "celular", "fone bluetooth", "smart tv", "notebook"], emoji: "🛒", prioridade: "alta" },
  { id: "natal", nome: "Natal", data: "12-15", diasAntes: 30, produtosFoco: ["presente natal", "decoracao natal", "arvore natal", "amigo secreto", "panetone"], emoji: "🎄", prioridade: "alta" },
  { id: "anonovo", nome: "Ano Novo", data: "12-28", diasAntes: 14, produtosFoco: ["roupa branca", "espumante", "decoracao reveillon"], emoji: "🎆", prioridade: "media" },
  { id: "verao", nome: "Verão / Praia", data: "12-21", diasAntes: 30, produtosFoco: ["biquini", "protetor solar", "oculos sol", "sandalia", "chapeu praia", "boia"], emoji: "🏖️", prioridade: "media" },
  { id: "voltaaulas", nome: "Volta às Aulas", data: "02-01", diasAntes: 30, produtosFoco: ["mochila", "estojo", "caderno", "lancheira", "tênis escolar"], emoji: "🎒", prioridade: "alta" },
  { id: "carnaval", nome: "Carnaval", data: "02-13", diasAntes: 21, produtosFoco: ["fantasia carnaval", "purpurina", "adereco", "macunaima"], emoji: "🎭", prioridade: "media" },
  { id: "outono", nome: "Frio / Outono", data: "04-15", diasAntes: 21, produtosFoco: ["jaqueta", "manta", "termico", "moletom", "edredom"], emoji: "🍂", prioridade: "media" },
  { id: "festajunina", nome: "Festas Juninas", data: "06-15", diasAntes: 21, produtosFoco: ["bandeirinha junina", "fantasia junina", "balão", "chapeu palha"], emoji: "🌽", prioridade: "media" },
  { id: "datadupla", nome: "Data Dupla 9.9", data: "09-09", diasAntes: 14, produtosFoco: ["eletronicos", "moda", "casa"], emoji: "9️⃣", prioridade: "alta" },
  { id: "datadupla1010", nome: "Data Dupla 10.10", data: "10-10", diasAntes: 14, produtosFoco: ["eletronicos", "moda", "casa"], emoji: "🔟", prioridade: "alta" },
  { id: "datadupla1111", nome: "Data Dupla 11.11", data: "11-11", diasAntes: 14, produtosFoco: ["eletronicos", "moda", "casa"], emoji: "1️⃣", prioridade: "alta" },
  { id: "datadupla1212", nome: "Data Dupla 12.12", data: "12-12", diasAntes: 14, produtosFoco: ["eletronicos", "moda", "casa"], emoji: "1️⃣", prioridade: "alta" }
];

export type EventoComStatus = EventoSazonal & {
  diasAteEvento: number;
  proximaData: string;
  status: "iniciar-agora" | "preparar" | "futuro";
};

export function eventosProximos(diasAFrente = 90): EventoComStatus[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ano = hoje.getFullYear();

  return CALENDARIO.map((e) => {
    const [mm, dd] = e.data.split("-").map(Number);
    let proxima = new Date(ano, mm - 1, dd);
    if (proxima < hoje) proxima = new Date(ano + 1, mm - 1, dd);
    const diff = Math.floor((proxima.getTime() - hoje.getTime()) / (24 * 3600 * 1000));

    let status: EventoComStatus["status"] = "futuro";
    if (diff <= e.diasAntes && diff >= 0) status = "iniciar-agora";
    else if (diff <= e.diasAntes + 14 && diff > e.diasAntes) status = "preparar";

    return {
      ...e,
      diasAteEvento: diff,
      proximaData: proxima.toISOString().slice(0, 10),
      status
    };
  })
    .filter((e) => e.diasAteEvento <= diasAFrente)
    .sort((a, b) => a.diasAteEvento - b.diasAteEvento);
}
