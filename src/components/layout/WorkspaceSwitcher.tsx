'use client';

import { useState, useTransition, useEffect } from 'react';
import { Users, Check } from 'lucide-react';
import { setActiveWorkspaceAction } from '@/actions/share.actions';
import { getAccessibleWorkspacesAction } from '@/actions/ui.actions';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

type WorkspaceRow = {
  id: string;
  ownerId: string;
  owner: {
    name: string | null;
    email: string | null;
  };
};

type WorkspaceSwitcherProps = {
  className?: string;
};

export default function WorkspaceSwitcher({ className }: WorkspaceSwitcherProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  // We need to fetch the accessible workspaces when the component mounts.
  useEffect(() => {
    // getAccessibleWorkspacesAction needs to be created to fetch spaces for UI.
    getAccessibleWorkspacesAction().then(data => {
      setWorkspaces(data.spaces);
      setActiveWorkspaceId(data.activeId);
    });
  }, []);

  const handleSwitch = (id: string | null) => {
    setIsOpen(false);
    startTransition(async () => {
      await setActiveWorkspaceAction(id);
      setActiveWorkspaceId(id);
      // Let the revalidatePath do its job
    });
  };

  if (!session?.user) return null;
  const isPersonal = !activeWorkspaceId || activeWorkspaceId === session.user.id;
  const activeWorkspace = workspaces.find((workspace) => workspace.ownerId === activeWorkspaceId);
  const currentSpaceName = isPersonal ? 'Personal Workspace' : `${activeWorkspace?.owner.name || 'Shared'}'s Tracker`;

  if (workspaces.length === 0) return null;

  return (
    <div className={cn('relative min-w-0', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        aria-label={isPending ? 'Switching workspace' : `Current workspace: ${currentSpaceName}`}
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all sm:w-auto sm:rounded-full sm:py-1.5",
          isPersonal 
            ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            : "border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
        )}
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{isPending ? 'Switching...' : currentSpaceName}</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 w-full min-w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:left-auto sm:w-56">
          <div className="p-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Switch Workspace
          </div>
          <button
            onClick={() => handleSwitch(null)}
            className="w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            <span className={cn(isPersonal ? "text-slate-900 dark:text-white font-medium" : "text-slate-600 dark:text-slate-400")}>
              Personal Workspace
            </span>
            {isPersonal && <Check className="h-4 w-4 text-indigo-500" />}
          </button>
          
          <div className="border-t border-slate-100 dark:border-slate-700/50 my-1"></div>
          
          <div className="max-h-48 overflow-y-auto">
            {workspaces.map((space) => {
              const isActive = activeWorkspaceId === space.ownerId;
              return (
                <button
                  key={space.id}
                  onClick={() => handleSwitch(space.ownerId)}
                  className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex flex-col">
                    <span className={cn("text-sm", isActive ? "text-slate-900 dark:text-white font-medium" : "text-slate-600 dark:text-slate-400")}>
                      {space.owner.name || 'Shared'}&apos;s Tracker
                    </span>
                    {space.owner.email && <span className="text-xs text-slate-500">{space.owner.email}</span>}
                  </div>
                  {isActive && <Check className="h-4 w-4 text-indigo-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
