export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="rounded-2xl bg-indigo-600 h-32 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
        <div className="rounded-2xl border bg-white h-64 animate-pulse" />
      </div>
    </div>
  );
}
