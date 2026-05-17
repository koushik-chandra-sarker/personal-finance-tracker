'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, CheckCircle, Clock, Crown, Filter, Lock, Play, Search, Share2, ShieldCheck, Video } from 'lucide-react';
import Image from 'next/image';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/client';

interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  category: string | null;
  isPremium: boolean;
}

interface Props {
  tutorials: Tutorial[];
  isPro: boolean;
}

export default function TutorialList({ tutorials, isPro }: Props) {
  const { messages } = useI18n();
  const copy = messages.pages.tutorials;
  const categoryLabels = copy.categoryLabels as Record<string, string>;
  const demoContent = copy.demoContent as Record<string, { title: string; description: string }>;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [playingVideo, setPlayingVideo] = useState<Tutorial | null>(null);
  const [lockedVideo, setLockedVideo] = useState<Tutorial | null>(null);
  const tutorialsSectionRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(tutorials.map((tutorial) => tutorial.category || 'General')))],
    [tutorials]
  );
  const displayCategory = (category: string) => {
    if (category === 'All') return copy.all;
    return categoryLabels[category] || category;
  };

  const getLocalizedTutorial = (tutorial: Tutorial) => {
    const localized = demoContent[tutorial.title];
    return {
      title: localized?.title || tutorial.title,
      description: localized?.description || tutorial.description,
    };
  };

  const stats = useMemo(() => {
    const premiumCount = tutorials.filter((tutorial) => tutorial.isPremium).length;
    return {
      total: tutorials.length,
      free: tutorials.length - premiumCount,
      premium: premiumCount,
    };
  }, [tutorials]);

  const filteredTutorials = tutorials.filter(t => {
    const localized = getLocalizedTutorial(t);
    const query = search.toLowerCase();
    const matchesSearch = localized.title.toLowerCase().includes(query) ||
                         (localized.description?.toLowerCase().includes(query) || false) ||
                         displayCategory(t.category || 'General').toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'All' || (t.category || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1` : null;
  };

  const handleShare = (e: React.MouseEvent, tutorial: Tutorial) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: getLocalizedTutorial(tutorial).title,
        text: getLocalizedTutorial(tutorial).description || '',
        url: tutorial.youtubeUrl,
      });
    } else {
      navigator.clipboard.writeText(tutorial.youtubeUrl);
      alert(copy.linkCopied);
    }
  };

  const openTutorial = (tutorial: Tutorial) => {
    if (tutorial.isPremium && !isPro) {
      setLockedVideo(tutorial);
      return;
    }
    setPlayingVideo(tutorial);
  };

  const categoryLabel = (tutorial: Tutorial) => displayCategory(tutorial.category || 'General');
  const quickCategories = categories.filter((category) => category !== 'All').slice(0, 4);

  const selectCategory = (category: string, shouldClearSearch = false) => {
    setSelectedCategory(category);
    if (shouldClearSearch) setSearch('');
  };

  const scrollToTutorials = () => {
    selectCategory('All', true);
    requestAnimationFrame(() => {
      tutorialsSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-500">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="space-y-7 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="info" className="px-3 py-1 text-xs font-bold">
                  {copy.academy}
              </Badge>
              <Badge variant={isPro ? 'success' : 'warning'} className="px-3 py-1 text-xs font-bold">
                {isPro ? copy.proActive : copy.freeAccess}
              </Badge>
            </div>
            <div className="max-w-3xl space-y-4">
              <h1 className="max-w-2xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {copy.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={scrollToTutorials}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <Play fill="currentColor" className="ml-0.5 h-4 w-4" />
                {copy.startLearning}
              </button>
              <div className="flex flex-wrap gap-2">
                {quickCategories.length > 0 ? (
                  quickCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => selectCategory(category, true)}
                      className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                    >
                      {displayCategory(category)}
                    </button>
                  ))
                ) : (
                  <span className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                    {copy.comingSoon}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: copy.chooseTopic,
                  description: copy.chooseTopicHelp,
                  icon: BookOpen,
                  color: 'text-indigo-500',
                  background: 'bg-indigo-50 dark:bg-indigo-500/10',
                },
                {
                  title: copy.watchApply,
                  description: copy.watchApplyHelp,
                  icon: CheckCircle,
                  color: 'text-emerald-500',
                  background: 'bg-emerald-50 dark:bg-emerald-500/10',
                },
                {
                  title: copy.goDeeper,
                  description: isPro ? copy.goDeeperPro : copy.goDeeperFree,
                  icon: Crown,
                  color: 'text-amber-500',
                  background: 'bg-amber-50 dark:bg-amber-500/10',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg', item.background)}>
                    <item.icon className={cn('h-4 w-4', item.color)} />
                  </div>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
              ))}
            </div>

            {!isPro && stats.premium > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Crown className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{copy.proLocked}</p>
                    <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">{copy.proLockedHelp}</p>
                  </div>
                </div>
                <a
                  href="/subscription"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-700"
                >
                  {copy.viewPlans}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40 xl:border-l xl:border-t-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">{copy.learningPath}</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{copy.startSmall}</h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ...copy.pathSteps,
                ].map((step, index) => (
                  <div key={step} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                {[
                  { label: copy.guides, value: stats.total, icon: BookOpen, color: 'text-indigo-500' },
                  { label: copy.free, value: stats.free, icon: ShieldCheck, color: 'text-emerald-500' },
                  { label: copy.pro, value: stats.premium, icon: Crown, color: 'text-amber-500' },
                ].map((item) => (
                  <div key={item.label} className="border-r border-slate-200 bg-slate-50 p-3 last:border-r-0 dark:border-slate-800 dark:bg-slate-950/40">
                    <item.icon className={cn('mb-2 h-4 w-4', item.color)} />
                    <p className="text-xl font-black text-slate-950 dark:text-white">{item.value}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {copy.tip}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky -top-6 z-30 -mx-4 bg-slate-50/95 px-4 py-3 backdrop-blur dark:bg-slate-950/95 lg:-mx-6 lg:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-none lg:p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Input 
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 dark:border-slate-700 dark:bg-slate-950/50"
                icon={<Search size={20} className="text-slate-400" />}
              />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Filter className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
              <div className="flex w-full gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => selectCategory(cat)}
                    className={cn(
                      'h-10 whitespace-nowrap rounded-lg border px-4 text-sm font-semibold transition-colors',
                      selectedCategory === cat
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    )}
                  >
                    {displayCategory(cat)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={tutorialsSectionRef} className="grid scroll-mt-32 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredTutorials.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Video size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{copy.noGuides}</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">{copy.noGuidesHelp}</p>
          </div>
        ) : (
          filteredTutorials.map((tutorial, index) => (
            <div 
              key={tutorial.id} 
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30 dark:hover:shadow-none"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => openTutorial(tutorial)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openTutorial(tutorial);
                }
              }}
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
                {tutorial.thumbnailUrl ? (
                  <Image 
                    src={tutorial.thumbnailUrl} 
                    alt={getLocalizedTutorial(tutorial).title} 
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    unoptimized
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <Video size={48} />
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-indigo-600 shadow-xl">
                    {tutorial.isPremium && !isPro ? (
                      <Lock size={22} />
                    ) : (
                      <Play fill="currentColor" className="ml-1" size={22} />
                    )}
                  </div>
                </div>

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge variant="glass" className="bg-slate-950/45 px-3 py-1 text-[10px] font-bold uppercase">
                    {categoryLabel(tutorial)}
                  </Badge>
                  {tutorial.isPremium && (
                    <Badge variant="glass" className="border-amber-300/40 bg-amber-500/90 px-3 py-1 text-[10px] font-bold uppercase text-white">
                      {copy.pro}
                    </Badge>
                  )}
                </div>

                <button 
                  type="button"
                  onClick={(e) => handleShare(e, tutorial)}
                  aria-label={`${copy.share}: ${getLocalizedTutorial(tutorial).title}`}
                  className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-slate-950/40 text-white opacity-0 backdrop-blur transition-all hover:bg-slate-950/60 group-hover:opacity-100"
                >
                  <Share2 size={16} />
                </button>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                  <Clock size={14} className="text-indigo-500" />
                  {copy.stepByStep}
                </div>
                <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-950 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                  {getLocalizedTutorial(tutorial).title}
                </h3>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {getLocalizedTutorial(tutorial).description || copy.defaultDescription}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={14} />
                    {copy.verified}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {tutorial.isPremium && !isPro ? copy.preview : copy.watch}
                    <ArrowUpRight size={15} />
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Video Modal */}
      <Modal
        isOpen={!!playingVideo}
        onClose={() => setPlayingVideo(null)}
        title={playingVideo?.title || ''}
        size="2xl"
      >
        {playingVideo && (
          <div className="grid gap-6 pb-2 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-6">
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm dark:border-slate-700">
                <iframe
                  src={getEmbedUrl(playingVideo.youtubeUrl) || ''}
                  title={getLocalizedTutorial(playingVideo).title}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              
              <div className="space-y-5">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="info" className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase">{categoryLabel(playingVideo)}</Badge>
                      <Badge variant="success" className="rounded-lg px-3 py-1 text-[10px] font-bold uppercase">{copy.verified}</Badge>
                    </div>
                    <h2 className="text-2xl font-black leading-tight text-slate-950 dark:text-white">{getLocalizedTutorial(playingVideo).title}</h2>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <button 
                      type="button"
                      onClick={(e) => handleShare(e, playingVideo)}
                      aria-label={`${copy.share}: ${getLocalizedTutorial(playingVideo).title}`}
                      className="flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-900 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 sm:flex-none sm:px-3"
                    >
                      <Share2 size={20} />
                    </button>
                    <a 
                      href={playingVideo.youtubeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white transition-colors hover:bg-rose-700 sm:flex-none"
                    >
                      <Video size={18} />
                      {copy.openOnYoutube}
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <h4 className="mb-3 text-xs font-bold uppercase text-slate-400">{copy.description}</h4>
                  <p className="text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                    {getLocalizedTutorial(playingVideo).description || copy.videoDefaultDescription}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-slate-400">{copy.moreGuides}</h4>
                <Badge variant="outline" className="text-[10px] font-bold">{Math.max(tutorials.length - 1, 0)} {copy.total}</Badge>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0">
                {tutorials
                  .filter(t => t.id !== playingVideo.id)
                  .slice(0, 5)
                  .map((tutorial) => (
                    <button 
                      type="button"
                      key={tutorial.id}
                      onClick={() => openTutorial(tutorial)}
                      className="group flex w-64 shrink-0 gap-3 rounded-xl p-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-white/10 lg:w-full"
                    >
                      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        {tutorial.thumbnailUrl ? (
                          <Image
                            src={tutorial.thumbnailUrl}
                            alt={getLocalizedTutorial(tutorial).title}
                            fill
                            sizes="6rem"
                            unoptimized
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Video size={22} />
                          </div>
                        )}
                        {tutorial.isPremium && !isPro && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-white">
                            <Lock size={16} />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col justify-center">
                        <h5 className="line-clamp-2 text-sm font-bold leading-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                          {getLocalizedTutorial(tutorial).title}
                        </h5>
                        <p className="mt-1 text-[10px] font-medium text-slate-500">{categoryLabel(tutorial)}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!lockedVideo}
        onClose={() => setLockedVideo(null)}
        title={copy.proTutorial}
        size="sm"
      >
        {lockedVideo && (
          <div className="space-y-5 pb-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
              <div className="relative aspect-video">
                {lockedVideo.thumbnailUrl ? (
                  <Image
                    src={lockedVideo.thumbnailUrl}
                    alt={getLocalizedTutorial(lockedVideo).title}
                    fill
                    sizes="(max-width: 640px) 100vw, 28rem"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <Video size={40} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-white">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-600 shadow-lg">
                    <Lock size={22} />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Badge variant="warning" className="mb-3 px-3 py-1 text-xs font-bold">{copy.proRequired}</Badge>
              <h3 className="text-xl font-black text-slate-950 dark:text-white">{getLocalizedTutorial(lockedVideo).title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {copy.proRequiredHelp}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setLockedVideo(null)}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {copy.keepBrowsing}
              </button>
              <a
                href="/subscription"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
              >
                {copy.viewPlans}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
