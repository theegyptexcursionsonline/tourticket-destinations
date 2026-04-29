import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-xl">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span>Loading admin page...</span>
      </div>
    </div>
  );
}
