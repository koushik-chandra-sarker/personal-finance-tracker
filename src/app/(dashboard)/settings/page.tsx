'use client';

import { useSession } from 'next-auth/react';
import { User, Shield, Palette } from 'lucide-react';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/layout/ThemeToggle';

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-400">Name</label>
            <p className="text-white">{session?.user?.name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm text-slate-400">Email</label>
            <p className="text-white">{session?.user?.email || 'N/A'}</p>
          </div>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Palette className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Appearance</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Theme</p>
            <p className="text-xs text-slate-400">Toggle dark/light mode</p>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      {/* Security */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Security</h2>
        </div>
        <div>
          <p className="text-sm text-white">Password</p>
          <p className="text-xs text-slate-400">Last changed: Never</p>
        </div>
      </Card>
    </div>
  );
}
