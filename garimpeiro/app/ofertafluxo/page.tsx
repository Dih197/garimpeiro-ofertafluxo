export const dynamic = "force-dynamic";

export default function OfertaFluxoNativoPage() {
  return (
    <main className="h-screen w-full overflow-hidden bg-[#07101f]">
      <iframe
        title="OfertaFluxo nativo"
        src="http://localhost:3001"
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
    </main>
  );
}
