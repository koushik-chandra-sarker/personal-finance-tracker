'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Video, ExternalLink, PlayCircle, LayoutGrid, List as ListIcon } from 'lucide-react';
import Image from 'next/image';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { createTutorialAction, updateTutorialAction, deleteTutorialAction } from '@/actions/tutorial.actions';
import { useI18n } from '@/i18n/client';

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  category: string | null;
  isActive: boolean;
  isPremium: boolean;
  sortOrder: number;
}

interface Props {
  tutorials: Tutorial[];
}

export default function TutorialManagementClient({ tutorials: initialTutorials }: Props) {
  const { messages } = useI18n();
  const copy = messages.pages.adminTutorials;
  const tutorialCopy = messages.pages.tutorials;
  const categoryLabels = tutorialCopy.categoryLabels as Record<string, string>;
  const demoContent = tutorialCopy.demoContent as Record<string, { title: string; description: string }>;
  const [tutorials, setTutorials] = useState(initialTutorials);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleAdd = () => {
    setEditingTutorial(null);
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleEdit = (tutorial: Tutorial) => {
    setEditingTutorial(tutorial);
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;
    
    setIsDeleting(id);
    const res = await deleteTutorialAction(id);
    setIsDeleting(null);
    
    if (res.success) {
      setTutorials(tutorials.filter(t => t.id !== id));
      setMessage({ type: 'success', text: res.message });
    } else {
      setMessage({ type: 'error', text: res.message });
    }
  };

  const displayCategory = (category: string | null) => {
    const value = category || 'General';
    return categoryLabels[value] || value;
  };

  const getLocalizedTutorial = (tutorial: Tutorial) => {
    const localized = demoContent[tutorial.title];
    return {
      title: localized?.title || tutorial.title,
      description: localized?.description || tutorial.description,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);
    
    let res;
    if (editingTutorial) {
      res = await updateTutorialAction(editingTutorial.id, formData);
    } else {
      res = await createTutorialAction(formData);
    }

    setIsSubmitting(false);

    if (res.success) {
      setMessage({ type: 'success', text: res.message });
      setIsModalOpen(false);
      window.location.reload();
    } else {
      setMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-200 tracking-tight">{copy.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              aria-label={copy.gridView}
              title={copy.gridView}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              aria-label={copy.listView}
              title={copy.listView}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
            >
              <ListIcon size={18} />
            </button>
          </div>
          <Button onClick={handleAdd} className="h-12 px-6 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2">
            <Plus size={20} />
            {copy.createTutorial}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
          <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {tutorials.length === 0 ? (
        <div className="py-20 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem]">
          <Video size={64} className="mx-auto mb-6 text-slate-200 dark:text-slate-700" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">{copy.noContent}</h3>
          <p className="text-slate-500 mt-2 max-w-xs mx-auto">{copy.noContentHelp}</p>
          <Button variant="outline" onClick={handleAdd} className="mt-8 rounded-xl">
            {copy.getStarted}
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tutorials.map((tutorial) => (
            <Card key={tutorial.id} className="group overflow-hidden flex flex-col p-0 border-slate-200 dark:border-slate-800 rounded-[2rem] hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300">
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                {tutorial.thumbnailUrl ? (
                  <Image 
                    src={tutorial.thumbnailUrl} 
                    alt={getLocalizedTutorial(tutorial).title} 
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                    className="object-cover transition-transform group-hover:scale-105 duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Video size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                  <PlayCircle size={48} className="text-white drop-shadow-2xl" />
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <Badge variant={tutorial.isActive ? 'success' : 'default'} className="backdrop-blur-md font-bold">
                    {tutorial.isActive ? copy.live : copy.draft}
                  </Badge>
                  {tutorial.isPremium && (
                    <Badge variant="warning" className="backdrop-blur-md font-bold">
                      {tutorialCopy.pro}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h3 className="font-bold text-slate-900 dark:text-slate-200 line-clamp-1 text-lg leading-tight">{getLocalizedTutorial(tutorial).title}</h3>
                  <Badge variant="outline" className="shrink-0 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">{displayCategory(tutorial.category)}</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed">
                  {getLocalizedTutorial(tutorial).description || copy.fallbackDescription}
                </p>
                <div className="mt-auto flex justify-between items-center pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(tutorial)}
                      className="h-10 w-10 p-0 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(tutorial.id)}
                      className="h-10 w-10 p-0 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      disabled={isDeleting === tutorial.id}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <a 
                    href={tutorial.youtubeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title={copy.viewOnYoutube}
                    aria-label={copy.viewOnYoutube}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-0 overflow-hidden border-slate-200 dark:border-slate-800 rounded-[2rem]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">{copy.tutorial}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">{copy.category}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">{copy.status}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">{copy.order}</th>
                  <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">{copy.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tutorials.map((tutorial) => (
                  <tr key={tutorial.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 aspect-video rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          {tutorial.thumbnailUrl && (
                            <Image
                              src={tutorial.thumbnailUrl}
                              alt={getLocalizedTutorial(tutorial).title}
                              fill
                              sizes="4rem"
                              unoptimized
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{getLocalizedTutorial(tutorial).title}</p>
                          <p className="text-xs text-slate-400 truncate">{tutorial.youtubeUrl}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-bold">{displayCategory(tutorial.category)}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-col">
                        <Badge variant={tutorial.isActive ? 'success' : 'default'} className="font-bold w-fit">
                          {tutorial.isActive ? copy.active : copy.draft}
                        </Badge>
                        {tutorial.isPremium && (
                          <Badge variant="warning" className="font-bold w-fit">{tutorialCopy.premium}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">
                      {tutorial.sortOrder}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(tutorial)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(tutorial.id)}
                          className="h-8 w-8 p-0 text-rose-500"
                          disabled={isDeleting === tutorial.id}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingTutorial ? copy.editTutorial : copy.newTutorialContent}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label={copy.titleLabel} 
            id="title"
            name="title" 
            defaultValue={editingTutorial ? getLocalizedTutorial(editingTutorial).title : undefined} 
            required 
            placeholder={copy.titlePlaceholder}
            className="h-12 rounded-xl"
          />
          <div className="space-y-2">
            <label htmlFor="description" className="text-xs font-black text-slate-400 uppercase tracking-widest">{copy.descriptionLabel}</label>
            <textarea 
              id="description"
              name="description" 
              defaultValue={editingTutorial ? getLocalizedTutorial(editingTutorial).description || '' : ''}
              className="w-full min-h-[120px] p-4 text-sm bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder={copy.descriptionPlaceholder}
            />
          </div>
          <Input 
            label={copy.youtubeLink} 
            id="youtubeUrl"
            name="youtubeUrl" 
            defaultValue={editingTutorial?.youtubeUrl} 
            required 
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-12 rounded-xl"
          />
          <div className="grid gap-6 sm:grid-cols-2">
            <Input 
              label={copy.category} 
              id="category"
              name="category" 
              defaultValue={editingTutorial ? displayCategory(editingTutorial.category) : displayCategory('General')} 
              placeholder={copy.categoryPlaceholder}
              className="h-12 rounded-xl"
            />
            <Input 
              label={copy.sortOrder} 
              id="sortOrder"
              name="sortOrder" 
              type="number"
              defaultValue={editingTutorial?.sortOrder?.toString() || '0'} 
              className="h-12 rounded-xl"
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <input 
                type="checkbox" 
                name="isActive" 
                id="isActive"
                defaultChecked={editingTutorial ? editingTutorial.isActive : true}
                className="h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {copy.published}
              </label>
            </div>
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20">
              <input 
                type="checkbox" 
                name="isPremium" 
                id="isPremium"
                defaultChecked={editingTutorial?.isPremium || false}
                className="h-5 w-5 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="isPremium" className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {copy.premiumOnly}
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="rounded-xl">
              {copy.discard}
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="px-8 rounded-xl">
              {editingTutorial ? copy.saveChanges : copy.createContent}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
