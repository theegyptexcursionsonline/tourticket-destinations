"use client";

import React, { useState, useEffect } from "react";
import { Link } from '@/i18n/navigation';
import Image from "next/image";
import { usePathname } from '@/i18n/navigation';
import {
  LayoutDashboard,
  Map,
  Compass,
  Tag,
  Menu,
  ChevronLeft,
  ChevronRight,
  FileText,
  ListPlus,
  Percent,
  MessageSquare,
  Users,
  TrendingUp,
  PenSquare,
  Sparkles,
  X,
  Layout,
  ImageIcon,
  Shield,
  Globe,
  CalendarDays,
} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminTenant } from "@/contexts/AdminTenantContext";
import { APP_VERSION } from "@/lib/constants/version";

// ✅ Updated navItems with Hero Settings and Tenants
const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permissions: ["manageDashboard"] },
  { href: "/admin/tenants", label: "Brands", icon: Globe, permissions: ["manageTenants"] },
  { href: "/admin/hero-settings", label: "Hero Settings", icon: ImageIcon, permissions: ["manageContent"] },
  { href: "/admin/bookings", label: "Bookings", icon: FileText, permissions: ["manageBookings"] },
  { href: "/admin/manifests", label: "Manifest", icon: ListPlus, permissions: ["manageBookings"] },
  { href: "/admin/availability", label: "Availability", icon: CalendarDays, permissions: ["manageTours"] },
  { href: "/admin/discounts", label: "Discounts", icon: Percent, permissions: ["manageDiscounts"] },
  { href: "/admin/special-offers", label: "Special Offers", icon: Sparkles, permissions: ["manageDiscounts"] },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare, permissions: ["manageContent"] },
  { href: "/admin/reports", label: "Reports", icon: TrendingUp, permissions: ["manageReports"] },
  { href: "/admin/tours", label: "Tours", icon: Compass, permissions: ["manageTours"] },
  { href: "/admin/destinations", label: "Destination", icon: Map, permissions: ["manageContent"] },
  { href: "/admin/attraction-pages", label: "Attraction", icon: Layout, permissions: ["manageContent"] },
  { href: "/admin/categories", label: "Category", icon: Tag, permissions: ["manageContent"] },
  { href: "/admin/blog", label: "Blog", icon: PenSquare, permissions: ["manageContent"] },
  { href: "/admin/users", label: "User", icon: Users, permissions: ["manageUsers"] },
  { href: "/admin/team", label: "Team Access", icon: Shield, permissions: ["manageUsers"] },
];

const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const showLabel = isOpen || (isMobile && isMobileOpen);
  const { hasAnyPermission } = useAdminAuth();
  const { getSelectedTenant, isAllTenantsSelected, isLoading: isTenantLoading } = useAdminTenant();
  const selectedTenant = getSelectedTenant();
  const brandName = isTenantLoading
    ? "Loading…"
    : isAllTenantsSelected()
      ? "All Brands"
      : selectedTenant?.name || "Brand";
  const brandDomain = selectedTenant?.domain;
  const logoWidthClass = showLabel ? "w-36" : "w-12";
  const headerPaddingClass = showLabel ? "px-6" : "px-4";

  // Handle mobile detection & keep sidebar responsive
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      if (mobile) {
        // drawer should stay closed by default on mobile
        setIsOpen(false);
      } else {
        // when returning to desktop make sure sidebar is visible and drawer closed
        setIsOpen(true);
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen, isMobile]);

  // Keyboard shortcuts (Ctrl+/ to toggle, Esc to close drawer)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key === "/";
      if (isShortcut) {
        event.preventDefault();
        if (isMobile) {
          setIsMobileOpen((prev: boolean) => !prev);
        } else {
          setIsOpen((prev: boolean) => !prev);
        }
        return;
      }

      if (event.key === "Escape" && isMobile && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isMobileOpen]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const sidebarWidth = isMobile ? "w-72" : isOpen ? "w-72" : "w-20";
  const mobileClass = isMobile
    ? `fixed inset-y-0 start-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`
    : "lg:sticky lg:top-0";

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 start-4 z-50 flex items-center justify-center h-12 w-12 rounded-xl bg-white shadow-lg border border-slate-200 text-slate-600 hover:text-slate-900 transition-all duration-200 lg:hidden"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`relative bg-white border-e border-slate-200/60 backdrop-blur-sm flex flex-col transition-all duration-300 ease-out shadow-lg overflow-hidden flex-shrink-0 h-full ${sidebarWidth} ${mobileClass}`}
        aria-label="Admin navigation"
        aria-expanded={isMobile ? isMobileOpen : isOpen}
      >
        {/* Header */}
        <div
          className={`flex ${showLabel ? "items-start justify-between" : "items-center justify-center"} ${headerPaddingClass} py-6 border-b border-slate-100 flex-shrink-0`}
        >
          <div className={`${showLabel ? "flex-1 min-w-0" : ""}`}>
            <div className={`flex flex-col ${showLabel ? "items-start" : "items-center"} gap-3 min-w-0`}>
              {/* Logo */}
              <div className={`relative h-10 flex-shrink-0 transition-all duration-300 ${logoWidthClass}`}>
                <Image
                  src="/EEO-logo.png"
                  alt="Egypt Excursions Online logo"
                  fill
                  sizes={showLabel ? "144px" : "48px"}
                  className="object-contain"
                  priority
                />
              </div>

              {/* Title (stacked under logo for better UX) */}
              {showLabel && (
                <div className="min-w-0 w-full">
                  <h1 className="text-lg font-bold text-slate-800 truncate leading-tight">
                    Admin Panel
                  </h1>
                  <p className="text-[11px] text-slate-400 truncate leading-snug mb-1">
                    Tour & Booking Management
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-xs text-slate-600 font-medium truncate leading-snug">
                      {brandName}
                    </p>
                  </div>
                  {!isAllTenantsSelected() && brandDomain && (
                    <p className="text-[11px] text-slate-400 truncate leading-snug mt-0.5">
                      {brandDomain}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Toggle button (Desktop only) */}
          {!isMobile && isOpen && (
            <button
              onClick={toggleSidebar}
              aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all duration-200 hover:scale-105 active:scale-95 border border-slate-200/50 flex-shrink-0"
            >
              {isOpen ? (
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          <ul className="space-y-2">
            {navItems
              .filter(({ permissions }) => !permissions || hasAnyPermission(permissions))
              .map(({ href, label, icon: Icon }, index) => {
              const active =
                pathname === href ||
                (href !== "/admin" && pathname.startsWith(href));

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`relative group flex items-center rounded-2xl transition-all duration-200 overflow-hidden ${
                      showLabel
                        ? "gap-4 px-4 py-3.5"
                        : "justify-center p-3.5 mx-auto w-14"
                    } ${
                      active
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm border border-blue-100/50"
                        : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                    } ${!showLabel ? "hover:scale-105" : "hover:translate-x-1"}`}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    )}

                    {/* Icon */}
                    <div
                      className={`p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${
                        active
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Label */}
                    {showLabel && (
                      <span
                        className={`font-medium transition-all duration-300 truncate min-w-0 ${
                          active
                            ? "text-slate-800"
                            : "text-slate-600 group-hover:text-slate-800"
                        }`}
                      >
                        {label}
                      </span>
                    )}

                    {/* Active glow */}
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl"></div>
                    )}

                    {/* Tooltip */}
                    {!showLabel && (
                      <div className="absolute start-full ms-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-sm px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none shadow-2xl transition-all duration-200 z-50 whitespace-nowrap">
                        {label}
                        <div className="absolute end-full top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Decorative element */}
          {showLabel && (
            <div className="mt-8 mx-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800 truncate">
                    Pro Tip
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Use keyboard shortcuts
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                Press{" "}
                <kbd className="px-2 py-1 bg-white rounded border text-slate-800 font-mono">
                  Ctrl + /
                </kbd>{" "}
                to toggle sidebar
              </div>
            </div>
          )}

        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          {showLabel ? (
            <div className="flex flex-col items-start gap-2">
              <div className="relative h-10 w-28 flex-shrink-0">
                <Image
                  src="/EEO-logo.png"
                  alt="Egypt Excursions Online logo"
                  fill
                  sizes="112px"
                  className="object-contain"
                />
              </div>
              <div className="min-w-0 w-full">
                <p className="text-xs font-medium text-slate-700 truncate">
                  {brandName}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 truncate">
                    © {new Date().getFullYear()} All rights reserved
                  </p>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    v{APP_VERSION.version}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="relative h-8 w-20">
                <Image
                  src="/EEO-logo.png"
                  alt="Egypt Excursions Online logo"
                  fill
                  sizes="80px"
                  className="object-contain"
                />
              </div>
              <span className="text-[9px] text-slate-400">v{APP_VERSION.version}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Floating expand toggle for collapsed desktop */}
      {!isMobile && !isOpen && (
        <button
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          className="hidden lg:flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-200 shadow-lg absolute top-6 start-16 z-30 hover:bg-slate-50 transition-all duration-200"
        >
          <ChevronRight className="h-4 w-4 text-slate-600" />
        </button>
      )}
    </>
  );
};

export default AdminSidebar;