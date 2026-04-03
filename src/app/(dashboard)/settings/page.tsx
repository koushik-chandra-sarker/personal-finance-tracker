'use client';

import { useSession } from 'next-auth/react';
import { User, Shield, Palette } from 'lucide-react';
import Card from '@/components/ui/Card';
import ThemeToggle from '@/components/layout/ThemeToggle';
import CollaboratorsList from '@/components/settings/CollaboratorsList';

import { useEffect, useState } from 'react';
import { getAccessibleWorkspacesAction } from '@/actions/ui.actions';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    getAccessibleWorkspacesAction().then(res => setActiveId(res.activeId));
  }, []);

  const isPersonalWorkspace = !activeId || activeId === session?.user?.id;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account preferences</p>
      </div>

      {/* Profile */}
      {isPersonalWorkspace ? (
        <>
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <User className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400">Name</label>
                <p className="text-slate-900 dark:text-white">{session?.user?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500 dark:text-slate-400">Email</label>
                <p className="text-slate-900 dark:text-white">{session?.user?.email || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Palette className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-900 dark:text-white">Theme</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Toggle dark/light mode</p>
              </div>
              <ThemeToggle />
            </div>
          </Card>

          {/* Sharing & Collaboration */}
          <CollaboratorsList />

          {/* Security */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Security</h2>
            </div>
            <div>
              <p className="text-sm text-slate-900 dark:text-white">Password</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Last changed: Never</p>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Collaborator View</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Personal settings and sharing options are disabled while you are viewing someone else's workspace.
          </p>
        </Card>
      )}
    </div>
  );
}
