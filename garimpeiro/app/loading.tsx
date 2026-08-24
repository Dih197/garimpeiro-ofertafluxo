export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-4 w-28 rounded bg-white/10" />
      <div className="mt-3 h-9 w-72 max-w-full rounded bg-white/10" />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl border border-white/5 bg-white/[0.035]" />)}
      </div>
      <div className="mt-6 h-80 rounded-2xl border border-white/5 bg-white/[0.035]" />
    </div>
  );
}
