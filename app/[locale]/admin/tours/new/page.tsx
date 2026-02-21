// app/admin/tours/new/page.tsx
import TourForm from '@/components/TourForm';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Plus } from 'lucide-react';

export default function NewTourPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/tours"
                            className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group shadow-sm"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                            <span className="sr-only">Back to Tours</span>
                        </Link>
                        
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                                    <Plus className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">
                                        Create New Tour
                                    </h1>
                                    <p className="text-sm text-slate-500">Fill out the form below to create your tour</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <TourForm fullPage />
            </div>
        </div>
    );
}