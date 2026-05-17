'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categorySchema, type CategoryInput } from '@/lib/validations/category';
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from '@/actions/category.actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import {
  Plus, Trash2, Edit2, Tags, AlertCircle,
  Tag, Home, ShoppingCart, DollarSign, Briefcase, Coffee, Zap,
  Car, Heart, Smartphone, Smile, Star, Music, Gift, Award,
  Shield, Activity, Book, Monitor, Tv, Plane, Truck,
  Utensils, CreditCard, TrendingUp, TrendingDown, Coins, Banknote, Landmark,
  PiggyBank, Percent, Receipt, Wallet, Ticket, Scissors, Bus, Train, Ship,
  Globe, Wrench, PenTool, Droplet, Flame, Battery, Moon, Sun, Gamepad2,
  Dumbbell, Video, Camera, Mic, Headphones, Dog, Cat, Baby, GraduationCap,
  Pill, Stethoscope, Palmtree, Tent, Shirt, Glasses
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MonthYearPicker from '@/components/dashboard/MonthYearPicker';
import Loader from '@/components/ui/Loader';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatCurrency, getTransactionTypeLabel } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  budgetAmount: number | null;
  spent: number;
  isDefault: boolean;
  _count: { transactions: number; budgets: number };
}

const ICON_MAP: Record<string, React.ElementType> = {
  'tag': Tag, 'home': Home, 'shopping-cart': ShoppingCart, 'dollar-sign': DollarSign,
  'briefcase': Briefcase, 'coffee': Coffee, 'zap': Zap, 'car': Car, 'heart': Heart,
  'smartphone': Smartphone, 'smile': Smile, 'star': Star, 'music': Music, 'gift': Gift,
  'award': Award, 'shield': Shield, 'activity': Activity, 'book': Book, 'monitor': Monitor,
  'tv': Tv, 'plane': Plane, 'truck': Truck,
  'utensils': Utensils, 'credit-card': CreditCard, 'trending-up': TrendingUp,
  'trending-down': TrendingDown, 'coins': Coins, 'banknote': Banknote, 'landmark': Landmark,
  'piggy-bank': PiggyBank, 'percent': Percent, 'receipt': Receipt, 'wallet': Wallet,
  'ticket': Ticket, 'scissors': Scissors, 'bus': Bus, 'train': Train, 'ship': Ship,
  'globe': Globe, 'wrench': Wrench, 'tool': PenTool, 'droplet': Droplet, 'flame': Flame,
  'battery': Battery, 'moon': Moon, 'sun': Sun, 'gamepad': Gamepad2, 'dumbbell': Dumbbell,
  'video': Video, 'camera': Camera, 'mic': Mic, 'headphones': Headphones, 'dog': Dog,
  'cat': Cat, 'baby': Baby, 'graduation-cap': GraduationCap, 'pill': Pill,
  'stethoscope': Stethoscope, 'palmtree': Palmtree, 'tent': Tent, 'shirt': Shirt, 'glasses': Glasses
};

const ICONS = Object.keys(ICON_MAP);

export default function CategoryPageClient({ initialCategories, currentMonth, currentYear }: { initialCategories: Category[]; currentMonth: number; currentYear: number; }) {
  const [categories, setCategories] = useState(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session } = useSession();
  const userCurrency = (session?.user as any)?.currency || 'USD';
  const { locale, messages } = useI18n();
  const copy = messages.pages.categories;
  const common = messages.pages.common;

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: { type: 'EXPENSE', color: '#6366f1', icon: 'tag' },
  });

  const selectedType = watch('type');
  const selectedIcon = watch('icon');

  const openAddModal = () => {
    setEditingId(null);
    reset({ type: 'EXPENSE', color: '#6366f1', icon: 'tag' });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingId(cat.id);
    reset({ name: cat.name, type: cat.type as 'INCOME' | 'EXPENSE', color: cat.color, icon: cat.icon });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CategoryInput) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, val]) => formData.set(key, String(val)));

    startTransition(async () => {
      let res;
      if (editingId) res = await updateCategoryAction(editingId, formData);
      else res = await createCategoryAction(formData);

      if (res.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert(res.message);
      }
    });
  };

  const handleDelete = (cat: Category) => {
    const depCount = cat._count.transactions + cat._count.budgets;
    if (depCount > 0) {
      if (!confirm(`${copy.deleteWarning}\n\n${depCount}`)) {
        return;
      }
    } else {
      if (!confirm(`${copy.deleteConfirm} "${cat.name}"`)) return;
    }

    startTransition(async () => {
      const res = await deleteCategoryAction(cat.id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.message);
      }
    });
  };

  const expenses = categories.filter(c => c.type === 'EXPENSE');
  const incomes = categories.filter(c => c.type === 'INCOME');

  const renderCategoryList = (list: Category[], title: string) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 px-1">{title}</h3>
      {list.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1">{copy.noCategories}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map(c => {
            const IconCmp = ICON_MAP[c.icon] || Tags;
            return (
              <div key={c.id} className="flex flex-col p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                {/* Row 1: icon + badge + actions */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.color + '20' }}>
                      <IconCmp className="h-4 w-4" style={{ color: c.color }} />
                    </div>
                    {c.type === 'EXPENSE' && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${c.budgetAmount ? (c.spent > c.budgetAmount ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500') : 'bg-slate-500/10 text-slate-500'}`}>
                        {c.budgetAmount ? `${Math.round((c.spent / c.budgetAmount) * 100)}%` : copy.noBudget}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(c)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-700/50 hover:bg-red-50 dark:hover:bg-rose-500/20 rounded-lg">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Full-width title */}
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{c.name}</p>

                {/* Row 3: Full-width budget / spending info */}
                {c.type === 'EXPENSE' ? (
                  <div className="w-full space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>{formatCurrency(c.spent, userCurrency, locale)}</span>
                      {c.budgetAmount && <span>/ {formatCurrency(c.budgetAmount, userCurrency, locale)}</span>}
                    </div>
                    <ProgressBar 
                      value={c.spent} 
                      max={c.budgetAmount || Math.max(c.spent, 1)} 
                      color={c.color} 
                      size="sm" 
                      showLabel={false}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium">
                    +{formatCurrency(c.spent, userCurrency, locale)} {copy.thisMonth}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <Loader show={isPending} message={copy.updating} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{copy.title}</h1>
            <MonthYearPicker month={currentMonth} year={currentYear} route="/categories" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4" /> {copy.addCategory}
        </Button>
      </div>

      {renderCategoryList(expenses, copy.expenseCategories)}
      {renderCategoryList(incomes, copy.incomeCategories)}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? copy.editCategory : copy.createCategory}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="flex gap-2">
            <label className={`flex-1 flex items-center justify-center py-3 rounded-xl border cursor-pointer transition-colors ${selectedType === 'INCOME' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <input type="radio" value="INCOME" {...register('type')} className="hidden" />
              {getTransactionTypeLabel('INCOME', locale)}
            </label>
            <label className={`flex-1 flex items-center justify-center py-3 rounded-xl border cursor-pointer transition-colors ${selectedType === 'EXPENSE' ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <input type="radio" value="EXPENSE" {...register('type')} className="hidden" />
              {getTransactionTypeLabel('EXPENSE', locale)}
            </label>
          </div>

          <Input id="name" label={copy.categoryName} placeholder={copy.categoryPlaceholder} error={errors.name?.message} {...register('name')} />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{common.color}</label>
            <div className="flex items-center gap-3">
              <input type="color" {...register('color')} className="h-10 w-10 rounded cursor-pointer border-0 p-0 bg-transparent" />
              <Input id="color-hex" className="flex-1" error={errors.color?.message} {...register('color')} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{copy.icon}</label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-300 dark:border-slate-700 custom-scrollbar">
              {ICONS.map(icon => {
                const IconCmp = ICON_MAP[icon] || Tags;
                return (
                  <button
                    type="button"
                    key={icon}
                    onClick={() => setValue('icon', icon)}
                    className={`flex items-center justify-center p-2 rounded-lg transition-colors ${selectedIcon === icon ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <IconCmp className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
            {errors.icon && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.icon.message}</p>}
          </div>

          {editingId && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{copy.warningUpdate}</p>
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isPending}>
            {editingId ? copy.updateCategory : copy.createCategory}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
