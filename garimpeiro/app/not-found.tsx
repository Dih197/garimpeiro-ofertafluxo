import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 text-center">
      <div><SearchX className="mx-auto h-12 w-12 text-zinc-700" /><div className="mt-4 text-5xl font-black text-zinc-800">404</div><h1 className="mt-2 text-xl font-black">Página não encontrada</h1><p className="mt-2 text-sm text-zinc-500">O endereço não existe ou a campanha foi pausada.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-shopee px-4 py-2.5 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4" /> Voltar ao painel</Link></div>
    </div>
  );
}
