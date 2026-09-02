'use client';

// "Change page type safely" — offered from the Category and Attraction /
// Category 2 editors. Creates an unpublished draft of the other type carrying
// the shared content; the current page is left untouched.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AdminPageKind } from '@/app/api/admin/pages/convert/pageTypeConversion';

const LABELS: Record<AdminPageKind, string> = {
  category: 'Category',
  attraction: 'Attraction',
  'category-landing': 'Category 2',
};

export default function PageTypeConversionActions({
  pageId,
  currentKind,
}: {
  pageId?: string;
  currentKind: AdminPageKind;
}) {
  const router = useRouter();
  const [targetInProgress, setTargetInProgress] = useState<AdminPageKind | null>(null);

  if (!pageId) return null;

  const targets: AdminPageKind[] = currentKind === 'category'
    ? ['attraction', 'category-landing']
    : ['category'];

  const transfer = async (targetKind: AdminPageKind) => {
    const confirmed = window.confirm(
      `Create a ${LABELS[targetKind]} draft from this ${LABELS[currentKind]}? `
      + 'Shared content will be copied. The current page stays unchanged until you review and publish the new draft.',
    );
    if (!confirmed) return;

    setTargetInProgress(targetKind);
    try {
      const response = await fetch('/api/admin/pages/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pageId, sourceKind: currentKind, targetKind }),
      });
      const payload = await response.json().catch(() => null) as {
        success?: boolean;
        error?: string;
        message?: string;
        editHref?: string;
      } | null;
      if (!response.ok || !payload?.success || !payload.editHref) {
        throw new Error(payload?.error || 'Unable to transfer this page type');
      }
      toast.success(payload.message || `${LABELS[targetKind]} draft created`);
      router.push(payload.editHref);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to transfer this page type');
    } finally {
      setTargetInProgress(null);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
      <div className="flex items-start gap-3">
        <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Change page type safely</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Shared text, media, SEO, navigation, and translations transfer to a new draft. The current page and its live links remain untouched until the draft is reviewed.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {targets.map((targetKind) => (
              <button
                key={targetKind}
                type="button"
                disabled={targetInProgress !== null}
                onClick={() => void transfer(targetKind)}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-500 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {targetInProgress === targetKind ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                Create {LABELS[targetKind]} draft
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
