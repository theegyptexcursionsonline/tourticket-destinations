"use client";
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Home, ChevronRight, User, Shield, DollarSign, Euro } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { currencies } from '@/utils/localization';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import TenantSelector from '@/components/admin/TenantSelector';

const AdminHeader = () => {
    const pathname = usePathname();
    const router = useRouter();
    const pathSegments = pathname.split('/').filter(i => i);
    
    const { selectedCurrency, setSelectedCurrency } = useSettings();
    const { user, logout } = useAdminAuth();

    const handleLogout = () => {
        logout();
        router.push('/');
        router.refresh();
    };
    
    const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrencyCode = event.target.value;
        const currency = currencies.find(c => c.code === newCurrencyCode);
        if (currency) {
            setSelectedCurrency(currency);
        }
    };

    // Function to format segment names
    const formatSegmentName = (segment: string) => {
        // Handle special cases
        if (segment === 'admin') return 'Admin';
        if (segment === 'dashboard') return 'Dashboard';
        if (segment === 'new') return 'New';
        if (segment === 'edit') return 'Edit';
        
        // Handle UUIDs or similar
        if (/^[0-9a-fA-F]{24}$/.test(segment)) {
            return `${segment.slice(0, 8)}...`;
        }
        
        // Capitalize and replace dashes/underscores
        return segment
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const CurrencyIcon = selectedCurrency.code === 'USD' ? DollarSign : Euro;

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Enhanced Breadcrumbs */}
                    <div className="flex items-center space-x-1">
                        <nav className="flex items-center space-x-1 text-sm">
                            {/* Home/Admin Root */}
                            <Link 
                                href="/admin" 
                                className="group flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/80 transition-all duration-200 font-medium"
                            >
                                <Home className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                                <span>Admin</span>
                            </Link>

                            {pathSegments.length > 1 && pathSegments.map((segment, index) => {
                                const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
                                const isLast = index === pathSegments.length - 1;
                                const isLink = !isLast && segment !== 'edit' && !/^[0-9a-fA-F]{24}$/.test(segment);
                                
                                // Skip 'admin' as it's already shown as home
                                if (segment === 'admin') return null;
                                
                                return (
                                    <React.Fragment key={href}>
                                        {/* Separator */}
                                        <div className="flex items-center">
                                            <ChevronRight className="h-4 w-4 text-slate-400 mx-1" />
                                        </div>
                                        
                                        {/* Breadcrumb Item */}
                                        {isLink ? (
                                            <Link 
                                                href={href} 
                                                className="px-3 py-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/80 transition-all duration-200 font-medium"
                                            >
                                                {formatSegmentName(segment)}
                                            </Link>
                                        ) : (
                                            <span className={`px-3 py-2 rounded-xl font-semibold ${
                                                isLast 
                                                    ? 'text-indigo-700 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/60' 
                                                    : 'text-slate-500'
                                            }`}>
                                                {formatSegmentName(segment)}
                                            </span>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tenant Selector and User Menu */}
                    <div className="flex items-center gap-4">
                        {/* Tenant/Brand Selector */}
                        <TenantSelector variant="header" />
                        
                        {/* Divider */}
                        <div className="hidden lg:block h-8 w-px bg-gray-200" />
                        
                        {/* DYNAMIC CURRENCY SWITCHER */}
                        <div className="relative">
                           <CurrencyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                           <select
                                value={selectedCurrency.code}
                                onChange={handleCurrencyChange}
                                className="appearance-none w-full bg-white border border-gray-300 rounded-xl py-2 pl-9 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
                           >
                               {currencies.map((currency) => (
                                   <option key={currency.code} value={currency.code}>
                                       {currency.code}
                                   </option>
                               ))}
                           </select>
                           <ChevronRight className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 -rotate-90 pointer-events-none" />
                        </div>

                        {/* User Info */}
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-slate-200/60">
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm">
                                <Shield className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-700">
                                    {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Admin User'}
                                </div>
                                <div className="text-xs text-slate-500 capitalize">
                                    {user?.role?.replace('_', ' ') || 'Administrator'}
                                </div>
                            </div>
                        </div>

                        {/* Mobile User Indicator */}
                        <div className="md:hidden flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                            <User className="h-5 w-5 text-white" />
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="group flex items-center gap-3 px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50/80 rounded-xl transition-all duration-200 font-medium border border-transparent hover:border-red-200/60"
                            aria-label="Log out"
                        >
                            <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Optional: Subtle bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        </header>
    );
};

export default AdminHeader;