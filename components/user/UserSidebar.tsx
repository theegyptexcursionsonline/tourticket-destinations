// components/user/UserSidebar.tsx
"use client";

import React from 'react';
import { Link } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { LayoutDashboard, Calendar, User, Heart, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';

const UserSidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const t = useTranslations();

  const navItems = [
    { href: '/user/dashboard', label: t('user.dashboard'), icon: LayoutDashboard },
    { href: '/user/bookings', label: t('user.myBookings'), icon: Calendar },
    { href: '/user/profile', label: t('user.profile'), icon: User },
    { href: '/user/favorites', label: t('user.myWishlist'), icon: Heart },
  ];

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      {/* Mobile view: Horizontal scroll */}
      <div className="lg:hidden mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {navItems.map(({ href, label }) => (
            <Link href={href} key={href}>
              <span className={`block whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  pathname === href 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
              }`}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop view: Vertical list */}
      <nav className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-100 p-2">
        <ul>
          {navItems.map(({ href, label, icon: Icon }) => (
            <li key={href} className="mb-1">
              <Link href={href}>
                <span className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                    pathname === href 
                    ? 'font-semibold bg-red-50 text-red-600 shadow-sm border border-red-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                  <Icon size={20} />
                  <span>{label}</span>
                </span>
              </Link>
            </li>
          ))}
           <li className="mt-4 pt-2 border-t border-slate-100">
              <button 
                onClick={() => logout()}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              >
                <LogOut size={20} />
                <span>{t('auth.logout')}</span>
              </button>
            </li>
        </ul>
      </nav>
    </aside>
  );
};

export default UserSidebar;