'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goalSchema, type GoalInput } from '@/lib/validations/goal';
import { Plus, Trash2, Target, DollarSign, MinusCircle, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency, getPercentage } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { createGoalAction, contributeToGoalAction, deductFromGoalAction, deleteGoalAction } from '@/actions/goal.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Loader from '@/components/ui/Loader';
import { useSession } from 'next-auth/react';

interface GoalProgress {
  id: string;
  amount: unknown;
  type: 'CONTRIBUTION' | 'DEDUCTION';
  description: string | null;
  createdAt: string;
}

interface Goal {
  id: string; name: string; targetAmount: unknown; currentAmount: unknown;
  deadline: string; color: string; isCompleted: boolean;
  progress: GoalProgress[];
}

export default function GoalPageClient({ goals }: { goals: Goal[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [deductGoalId, setDeductGoalId] = useState<string | null>(null);
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session } = useSession();
  const userCurrency = (session?.user as any)?.currency || 'USD';

  const { register, handleSubmit, reset, formState: { errors } } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema) as any,
    defaultValues: { targetAmount: 0 },
  });

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.set(k, String(v)));
    startTransition(async () => {
      await createGoalAction(formData);
      setIsModalOpen(false);
      reset();
      router.refresh();
    });
  };

  const handleContribute = () => {
    if (!contributeGoalId || !amount) return;
    const formData = new FormData();
    formData.set('amount', amount);
    formData.set('description', description);
    startTransition(async () => {
      await contributeToGoalAction(contributeGoalId, formData);
      setContributeGoalId(null);
      setAmount('');
      setDescription('');
      router.refresh();
    });
  };

  const handleDeduct = () => {
    if (!deductGoalId || !amount) return;
    const formData = new FormData();
    formData.set('amount', amount);
    formData.set('description', description);
    startTransition(async () => {
      await deductFromGoalAction(deductGoalId, formData);
      setDeductGoalId(null);
      setAmount('');
      setDescription('');
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this goal?')) return;
    startTransition(async () => {
      await deleteGoalAction(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Loader show={isPending} message="Processing..." />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Savings Goals</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{goals.length} active goals</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> New Goal</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title="No savings goals"
          description="Set goals to track your savings progress"
          icon={<Target className="h-12 w-12 text-slate-400 dark:text-slate-500" />}
          action={<Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> New Goal</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const current = Number(goal.currentAmount);
            const target = Number(goal.targetAmount);
            const pct = getPercentage(current, target);
            const daysLeft = formatDistanceToNow(new Date(goal.deadline), { addSuffix: false });

            return (
              <div key={goal.id} className="group rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-6 hover:border-slate-300 dark:hover:border-slate-600/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: goal.color + '20' }}>
                    <Target className="h-6 w-6" style={{ color: goal.color }} />
                  </div>
                  <button onClick={() => handleDelete(goal.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{goal.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{daysLeft} left</p>

                {/* Progress circle */}
                <div className="flex items-center justify-center my-6">
                  <div className="relative w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-slate-200 dark:stroke-slate-700" />
                      <circle
                        cx="60" cy="60" r="52" fill="none" stroke={goal.color} strokeWidth="8"
                        strokeDasharray={`${pct * 3.27} 327`}
                        strokeLinecap="round" className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{pct}%</span>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm text-slate-900 dark:text-white font-medium">{formatCurrency(current, userCurrency)} <span className="text-slate-500 dark:text-slate-400">of</span> {formatCurrency(target, userCurrency)}</p>
                  
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {!goal.isCompleted && (
                      <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setContributeGoalId(goal.id)}>
                        <DollarSign className="h-3 w-3 mr-1" /> Add
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 px-2 text-red-500 hover:text-red-600 dark:text-red-400" onClick={() => setDeductGoalId(goal.id)}>
                      <MinusCircle className="h-3 w-3 mr-1" /> Take
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setHistoryGoalId(goal.id)}>
                      <History className="h-3 w-3 mr-1" /> History
                    </Button>
                  </div>
                  
                  {goal.isCompleted && (
                    <p className="text-xs text-emerald-400 font-medium pt-2">🎉 Goal reached!</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Savings Goal">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input id="name" label="Goal Name" placeholder="Emergency Fund" error={errors.name?.message} {...register('name')} />
          <Input id="targetAmount" label="Target Amount" type="number" step="0.01" error={errors.targetAmount?.message} {...register('targetAmount')} />
          <Input id="deadline" label="Deadline" type="date" error={errors.deadline?.message} {...register('deadline')} />
          <Input id="color" label="Color" type="color" defaultValue="#10b981" {...register('color')} />
          <Button type="submit" className="w-full" isLoading={isPending}>Create Goal</Button>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal isOpen={!!contributeGoalId} onClose={() => { setContributeGoalId(null); setAmount(''); setDescription(''); }} title="Add Contribution">
        <div className="space-y-4">
          <Input
            id="contributeAmount"
            label="Amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          <Input
            id="contributeDescription"
            label="Reason / Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Monthly saving"
          />
          <Button onClick={handleContribute} className="w-full" isLoading={isPending}>Add Contribution</Button>
        </div>
      </Modal>

      {/* Deduct Modal */}
      <Modal isOpen={!!deductGoalId} onClose={() => { setDeductGoalId(null); setAmount(''); setDescription(''); }} title="Withdraw Funds">
        <div className="space-y-4">
          <Input
            id="deductAmount"
            label="Amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          <Input
            id="deductDescription"
            label="Reason for withdrawal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Unexpected expense"
          />
          <Button onClick={handleDeduct} variant="outline" className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" isLoading={isPending}>Confirm Withdrawal</Button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={!!historyGoalId} onClose={() => setHistoryGoalId(null)} title="Goal History">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {historyGoalId && (goals.find(g => g.id === historyGoalId)?.progress.length || 0) === 0 ? (
            <p className="text-center text-slate-500 py-8">No history yet</p>
          ) : (
            <div className="space-y-3">
              {historyGoalId && goals.find(g => g.id === historyGoalId)?.progress.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.type === 'CONTRIBUTION' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                      {p.type === 'CONTRIBUTION' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{p.type.toLowerCase()}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.description || format(new Date(p.createdAt), 'MMM dd, yyyy')}</p>
                      {p.description && <p className="text-[10px] text-slate-400 dark:text-slate-500">{format(new Date(p.createdAt), 'MMM dd, yyyy')}</p>}
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${p.type === 'CONTRIBUTION' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {p.type === 'CONTRIBUTION' ? '+' : '-'}{formatCurrency(Number(p.amount), userCurrency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
