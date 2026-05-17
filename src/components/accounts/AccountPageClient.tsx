'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { accountSchema, type AccountInput } from '@/lib/validations/account';
import { createAccountAction, deleteAccountAction, updateAccountAction } from '@/actions/account.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Loader from '@/components/ui/Loader';
import { Plus, Trash2, Wallet, CreditCard, Landmark, Smartphone, TrendingUp, Edit2 } from 'lucide-react';
import { formatCurrency, ACCOUNT_TYPE_LABELS, getAccountTypeLabel } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

interface Account {
  id: string; name: string; type: string; balance: unknown;
  color: string; icon: string;
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
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { data: session } = useSession();
  const userCurrency = (session?.user as any)?.currency || 'USD';
  const { locale: userLocale, messages } = useI18n();
  const copy = messages.pages.accounts;
  const common = messages.pages.common;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: { type: 'BANK', balance: 0, color: '#6366f1' },
  });

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.set(k, String(v)));
    startTransition(async () => {
      if (editingAccount) {
        await updateAccountAction(editingAccount.id, formData);
      } else {
        await createAccountAction(formData);
      }
      handleCloseModal();
      router.refresh();
    });
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    reset({
      name: account.name,
      type: account.type as any,
      balance: Number(account.balance),
      color: account.color,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    reset({ type: 'BANK', balance: 0, color: '#6366f1' });
  };

  const handleDelete = (id: string) => {
    if (!confirm(copy.deactivateConfirm)) return;
    startTransition(async () => {
      await deleteAccountAction(id);
      router.refresh();
    });
  };

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return (
    <div className="space-y-6">
      <Loader show={isPending} message={editingAccount ? copy.updating : copy.creating} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.totalBalance}: {formatCurrency(totalBalance, userCurrency, userLocale)}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" /> {copy.addAccount}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title={copy.noAccounts}
          description={copy.noAccountsHelp}
          icon={<Wallet className="h-12 w-12 text-slate-400 dark:text-slate-500" />}
          action={<Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> {copy.addAccount}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const Icon = iconMap[account.type] || Wallet;
            return (
              <div key={account.id} className="relative group rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 backdrop-blur-xl hover:border-slate-300 dark:hover:border-slate-600/50 transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: account.color + '20' }}>
                    <Icon className="h-6 w-6" style={{ color: account.color }} />
                  </div>
                  <div className="flex gap-1 transition-all">
                    <button
                      onClick={() => handleEdit(account)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{getAccountTypeLabel(account.type, userLocale)}</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">{account.name}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {formatCurrency(Number(account.balance), userCurrency, userLocale)}
                  </p>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 blur-2xl" style={{ backgroundColor: account.color }} />
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAccount ? copy.editAccount : copy.addAccount}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input id="name" label={copy.accountName} placeholder={copy.accountPlaceholder} error={errors.name?.message} {...register('name')} />
          <Select id="type" label={copy.accountType} options={Object.keys(ACCOUNT_TYPE_LABELS).map((value) => ({ value, label: getAccountTypeLabel(value, userLocale) }))} error={errors.type?.message} {...register('type')} />
          <Input id="balance" label={copy.initialBalance} type="number" step="0.01" error={errors.balance?.message} {...register('balance')} disabled={!!editingAccount} />
          <Input id="color" label={common.color} type="color" {...register('color')} />
          <Button type="submit" className="w-full" isLoading={isPending}>
            {editingAccount ? copy.updateAccount : copy.createAccount}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
