'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { goalSchema, type GoalInput } from '@/lib/validations/goal';
import { createGoalAction, contributeToGoalAction, deleteGoalAction } from '@/actions/goal.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { Plus, Trash2, Target, DollarSign } from 'lucide-react';
import { formatCurrency, getPercentage } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Goal {
  id: string; name: string; targetAmount: unknown; currentAmount: unknown;
  deadline: string; color: string; isCompleted: boolean;
}

export default function GoalPageClient({ goals }: { goals: Goal[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
    if (!contributeGoalId || !contributeAmount) return;
    const formData = new FormData();
    formData.set('amount', contributeAmount);
    startTransition(async () => {
      await contributeToGoalAction(contributeGoalId, formData);
      setContributeGoalId(null);
      setContributeAmount('');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Savings Goals</h1>
          <p className="text-sm text-slate-400">{goals.length} active goals</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> New Goal</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title="No savings goals"
          description="Set goals to track your savings progress"
          icon={<Target className="h-12 w-12 text-slate-500" />}
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
              <div key={goal.id} className="group rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 hover:border-slate-600/50 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: goal.color + '20' }}>
                    <Target className="h-6 w-6" style={{ color: goal.color }} />
                  </div>
                  <button onClick={() => handleDelete(goal.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-white">{goal.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{daysLeft} left</p>

                {/* Progress circle */}
                <div className="flex items-center justify-center my-6">
                  <div className="relative w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#334155" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="52" fill="none" stroke={goal.color} strokeWidth="8"
                        strokeDasharray={`${pct * 3.27} 327`}
                        strokeLinecap="round" className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{pct}%</span>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm text-white font-medium">{formatCurrency(current)} <span className="text-slate-400">of</span> {formatCurrency(target)}</p>
                  {goal.isCompleted ? (
                    <p className="text-xs text-emerald-400 font-medium">🎉 Goal reached!</p>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setContributeGoalId(goal.id)}>
                      <DollarSign className="h-3 w-3" /> Contribute
                    </Button>
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
      <Modal isOpen={!!contributeGoalId} onClose={() => setContributeGoalId(null)} title="Add Contribution">
        <div className="space-y-4">
          <Input
            id="contributeAmount"
            label="Amount"
            type="number"
            step="0.01"
            value={contributeAmount}
            onChange={(e) => setContributeAmount(e.target.value)}
          />
          <Button onClick={handleContribute} className="w-full" isLoading={isPending}>Add Contribution</Button>
        </div>
      </Modal>
    </div>
  );
}
