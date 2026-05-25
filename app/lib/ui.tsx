"use client";

import React from "react";

/**
 * Reusable UI primitives untuk konsistensi design system.
 * Pakai di semua dashboard biar tidak inline-styling button setiap kali.
 */

// =====================================================================
// BUTTON — variants, sizes, with hover/focus/disabled states
// =====================================================================
type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary:   "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm hover:shadow-md shadow-red-600/20",
  secondary: "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700",
  danger:    "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm shadow-rose-600/20",
  success:   "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-600/20",
  ghost:     "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  outline:   "border-2 border-red-600 text-red-600 hover:bg-red-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs gap-1",
  md: "px-4 py-2 text-sm gap-1.5",
  lg: "px-6 py-3 text-base gap-2",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  fullWidth,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `.trim()}
    >
      {loading ? (
        <Spinner />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// =====================================================================
// CARD — consistent card styling
// =====================================================================
interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "highlight" | "danger" | "success";
}

const cardVariants = {
  default:   "bg-white border-slate-200",
  highlight: "bg-gradient-to-br from-red-50 to-pink-50 border-red-200",
  danger:    "bg-red-50 border-red-200",
  success:   "bg-emerald-50 border-emerald-200",
};

export function Card({ title, subtitle, icon, action, children, className = "", variant = "default" }: CardProps) {
  return (
    <section className={`${cardVariants[variant]} border rounded-xl shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {icon && <div className="text-red-600">{icon}</div>}
            <div>
              {title && <h2 className="font-bold text-slate-900 text-base">{title}</h2>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

// =====================================================================
// STATUS BADGE — colored pill with consistent palette
// =====================================================================
const badgePalette: Record<string, string> = {
  // Request statuses
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
  MATCHED_STOCK: "bg-emerald-100 text-emerald-700 border-emerald-200",
  MATCHED_DONOR: "bg-amber-100 text-amber-700 border-amber-200",
  IN_TRANSIT: "bg-purple-100 text-purple-700 border-purple-200",
  FULFILLED: "bg-green-100 text-green-800 border-green-300",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
  // Urgency
  NORMAL: "bg-slate-100 text-slate-600 border-slate-200",
  URGENT: "bg-orange-100 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  // Stock
  AVAILABLE: "bg-green-100 text-green-700 border-green-300",
  QUARANTINE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  EXPIRED: "bg-red-100 text-red-700 border-red-200",
  RESERVED: "bg-blue-100 text-blue-700 border-blue-200",
  USED: "bg-slate-100 text-slate-500 border-slate-200",
  // Hospital
  VERIFIED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  UNVERIFIED: "bg-yellow-100 text-yellow-700 border-yellow-200",
  SUSPENDED: "bg-red-100 text-red-700 border-red-200",
  // Schedule
  CONFIRMED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  RESCHEDULED: "bg-amber-100 text-amber-700 border-amber-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
};

export function Badge({ status, className = "" }: { status: string; className?: string }) {
  const color = badgePalette[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${color} ${className}`}>
      {status}
    </span>
  );
}

// =====================================================================
// EMPTY STATE — beautiful empty UI
// =====================================================================
export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-10">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// =====================================================================
// LOADING SKELETON
// =====================================================================
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

// =====================================================================
// ICONS — inline SVG common icons
// =====================================================================
export const Icons = {
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Drop: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 5 11 5 16a7 7 0 0014 0c0-5-7-14-7-14z" />
    </svg>
  ),
  Heart: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
};
