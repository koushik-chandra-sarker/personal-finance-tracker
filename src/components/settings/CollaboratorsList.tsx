'use client';

import { useState, useTransition, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Users, X, Shield, Plus } from 'lucide-react';
import { 
  getCollaboratorsAction, 
  inviteCollaboratorAction, 
  removeCollaboratorAction, 
  updateFeatureAccessAction 
} from '@/actions/share.actions';
import type { AccessLevel, Feature } from '@prisma/client';

const FEATURES = ['TRANSACTIONS', 'ACCOUNTS', 'BUDGETS', 'GOALS', 'SUBSCRIPTIONS', 'SALARY_PLANNER', 'NOTES', 'REPORTS', 'SETTINGS'] as const;
type Collaborator = Awaited<ReturnType<typeof getCollaboratorsAction>>[number];

export default function CollaboratorsList() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    getCollaboratorsAction().then((data) => {
      if (isMounted) {
        setCollaborators(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchCollaborators = async () => {
    const data = await getCollaboratorsAction();
    setCollaborators(data);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setMessage(null);
    const formData = new FormData();
    formData.set('email', email);

    startTransition(async () => {
      const result = await inviteCollaboratorAction(formData);
      if (result.success) {
        setEmail('');
        setMessage({ type: 'success', text: result.message });
        await fetchCollaborators();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const handleRemove = (sharedAccessId: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;
    startTransition(async () => {
      await removeCollaboratorAction(sharedAccessId);
      await fetchCollaborators();
    });
  };

  const handleLevelChange = (sharedAccessId: string, feature: Feature, accessLevel: AccessLevel) => {
    startTransition(async () => {
      // Optimistic update of local state not implemented for brevity
      await updateFeatureAccessAction(sharedAccessId, feature, accessLevel);
      await fetchCollaborators();
    });
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Sharing & Collaboration</h2>
      </div>

      <form onSubmit={handleInvite} className="flex items-end gap-3 mb-8">
        <div className="flex-1">
          <Input 
            id="inviteEmail" 
            label="Invite by Email" 
            type="email" 
            placeholder="collaborator@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending || !email}>
          <Plus className="h-4 w-4 mr-2" /> Invite
        </Button>
      </form>

      {message && (
        <div className={`mb-6 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      {collaborators.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          You haven&apos;t shared your tracker with anyone yet.
        </p>
      ) : (
        <div className="space-y-6">
          {collaborators.map(collab => (
            <div key={collab.id} className="border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800">
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-slate-200">{collab.collaborator.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{collab.collaborator.email}</p>
                </div>
                <button 
                  onClick={() => handleRemove(collab.id)}
                  disabled={isPending}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Remove Collaborator"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Access Levels</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {FEATURES.map(feature => {
                    const permission = collab.permissions.find((p) => p.feature === feature);
                    const level = permission ? permission.accessLevel : 'NONE';
                    
                    return (
                      <div key={feature} className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {feature}
                        </label>
                        <select
                          value={level}
                          onChange={(e) => handleLevelChange(collab.id, feature, e.target.value as AccessLevel)}
                          disabled={isPending}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                          <option value="NONE">None</option>
                          <option value="VIEW">View Only</option>
                          <option value="EDIT">View & Edit</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
