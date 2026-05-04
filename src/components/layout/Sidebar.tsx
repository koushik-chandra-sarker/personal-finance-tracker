'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PieChart, Target, Tags,
  RefreshCw, FileBarChart, Settings, ChevronLeft, ChevronRight, DollarSign, FileText,
  Users, KeyRound,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/recurring', label: 'Recurring', icon: RefreshCw },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: KeyRound, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || session?.user?.role === 'ADMIN');

  return (
    <aside className={cn(
      'hidden lg:flex flex-col h-screen sticky top-0 border-r border-slate-200 dark:border-slate-700/50 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300',
      collapsed ? 'w-20' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-200 dark:border-slate-700/50">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">FinTrack</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Finance Manager</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 to-purple-500/10 dark:to-purple-500/20 text-indigo-700 dark:text-white border border-indigo-500/20 dark:border-indigo-500/30 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-indigo-600 dark:text-indigo-400' : '')} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}
