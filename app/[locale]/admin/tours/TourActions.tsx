// app/admin/tours/TourActions.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Link } from '@/i18n/navigation';
import { Edit, Trash2, MoreVertical, X, Check } from "lucide-react";
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import toast from "react-hot-toast";

export const TourActions = ({ tourId }: { tourId: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setIsOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // focus trick: when menu opens, focus first item
  useEffect(() => {
    if (isOpen) {
      // small delay to allow rendering
      setTimeout(() => {
        const first = menuRef.current?.querySelector<HTMLElement>("a,button");
        first?.focus();
      }, 50);
    }
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(v => !v);

  const handleDelete = async () => {
    setShowConfirm(true);
    setIsOpen(false);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    const promise = (async () => {
      const res = await fetch(`/api/admin/tours/${tourId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to delete" }));
        throw new Error(err?.message || "Delete failed");
      }
      return res;
    })();

    toast.promise(promise, {
      loading: "Deleting tour...",
      success: "Tour deleted.",
      error: (err) => `Delete failed: ${err?.message ?? "Unknown error"}`,
    });

    try {
      await promise;
      // after success, refresh listing while preserving search params
      const currentPath = window.location.pathname;
      const params = searchParams.toString();
      const fullPath = params ? `${currentPath}?${params}` : currentPath;
      router.push(fullPath);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="relative inline-block text-start" ref={menuRef}>
      <button
        ref={btnRef}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={toggleMenu}
        className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
        title="Actions"
      >
        <MoreVertical className="h-5 w-5 text-slate-600" />
      </button>

      {isOpen && (
        <div
          className="origin-top-right absolute end-0 mt-2 w-44 rounded-lg bg-white border border-slate-100 shadow-lg ring-1 ring-black ring-opacity-5 z-20 overflow-hidden"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <div className="py-1">
            {/* Edit link with preserved state */}
            <Link
              href={`/admin/tours/edit/${tourId}${searchParams.toString() ? `?returnTo=${encodeURIComponent(`/admin/tours?${searchParams.toString()}`)}` : ''}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              role="menuitem"
              onClick={() => setIsOpen(false)} // Close menu when clicking edit
            >
              <Edit className="w-4 h-4 text-slate-500" />
              <span>Edit</span>
            </Link>

            <button
              type="button"
              onClick={handleDelete}
              className="w-full text-start flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 focus:bg-rose-50 focus:outline-none"
              role="menuitem"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal (small) */}
      {showConfirm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDeleting && setShowConfirm(false)} />

          <div className="relative max-w-sm w-full bg-white rounded-lg shadow-xl border border-slate-100 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900">Delete tour</h3>
                <p className="mt-1 text-xs text-slate-500">This action is permanent. Are you sure you want to delete this tour?</p>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-sm shadow-sm hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm shadow-sm hover:opacity-95 disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" fill="none" /></svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isDeleting && setShowConfirm(false)}
                className="ms-2 p-1 rounded-md text-slate-400 hover:bg-slate-50"
                aria-label="Close"
                disabled={isDeleting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};