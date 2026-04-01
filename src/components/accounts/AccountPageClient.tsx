'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { accountSchema, type AccountInput } from '@/lib/validations/account';
import { createAccountAction, deleteAccountAction } from '@/actions/account.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { Plus, Trash2, Wallet, CreditCard, Landmark, Smartphone, TrendingUp } from 'lucide-react';
import { formatCurrency, ACCOUNT_TYPE_LABELS } from '@/lib/utils';

interface Account {
  id: string; name: string; type: string; balance: unknown;
  currency: string; color: string; icon: string;
}

const iconMap: Record<string, React.ElementType> = {
  CASH: Wallet,
  BANK: Landmark,
  MOBILE_WALLET: Smartphone,
  CREDIT_CARD: CreditCard,
  INVESTMENT: TrendingUp,
};

export default function AccountPageClient({ accounts }: { accounts: Account[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: { type: 'BANK', balance: 0, currency: 'USD', color: '#6366f1' },
  });

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.set(k, String(v)));
    startTransition(async () => {
      await createAccountAction(formData);
      setIsModalOpen(false);
      reset();
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Deactivate this account?')) return;
    startTransition(async () => {
      await deleteAccountAction(id);
      router.refresh();
    });
  };

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-sm text-slate-400">Total Balance: {formatCurrency(totalBalance)}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add your first account to start tracking balances"
          icon={<Wallet className="h-12 w-12 text-slate-500" />}
          action={<Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> Add Account</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = iconMap[account.type] || Wallet;
            return (
              <div key={account.id} className="relative group rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-xl p-6 hover:border-slate-600/50 transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: account.color + '20' }}>
                    <Icon className="h-6 w-6" style={{ color: account.color }} />
                  </div>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-slate-400">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                  <p className="text-lg font-semibold text-white mt-1">{account.name}</p>
                  <p className="text-2xl font-bold text-white mt-2">
                    {formatCurrency(Number(account.balance), account.currency)}
                  </p>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 blur-2xl" style={{ backgroundColor: account.color }} />
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Account">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input id="name" label="Account Name" placeholder="My Bank" error={errors.name?.message} {...register('name')} />
          <Select id="type" label="Account Type" options={Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} error={errors.type?.message} {...register('type')} />
          <Input id="balance" label="Initial Balance" type="number" step="0.01" error={errors.balance?.message} {...register('balance')} />
          <Input id="color" label="Color" type="color" {...register('color')} />
          <Button type="submit" className="w-full" isLoading={isPending}>Create Account</Button>
        </form>
      </Modal>
    </div>
  );
}
