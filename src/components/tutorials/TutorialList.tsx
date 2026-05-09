'use client';

import { useState, useTransition } from 'react';
import { Play, Video, Search, X, Share2, Clock, CheckCircle, Lock } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

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
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [playingVideo, setPlayingVideo] = useState<Tutorial | null>(null);

  const categories = ['All', ...Array.from(new Set(tutorials.map(t => t.category).filter(Boolean)))];

  const filteredTutorials = tutorials.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                         (t.description?.toLowerCase().includes(search.toLowerCase()) || false);
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
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
        title: tutorial.title,
        text: tutorial.description || '',
        url: tutorial.youtubeUrl,
      });
    } else {
      navigator.clipboard.writeText(tutorial.youtubeUrl);
      alert('YouTube link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[3rem] bg-indigo-600 px-8 py-20 text-center text-white shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800" />
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col items-center gap-4">
            <Badge variant="glass" className="px-6 py-2 text-xs font-black uppercase tracking-[0.3em] bg-white/10 backdrop-blur-xl border-white/20">
              Personal Finance Academy
            </Badge>
            <h1 className="text-5xl font-black sm:text-7xl tracking-tighter leading-[0.95]">
              Elite Knowledge <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200">For Your Wealth</span>
            </h1>
          </div>
          
          <p className="text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed font-medium">
            Unlock exclusive strategies, expert insights, and master-level guides designed to transform your financial future.
          </p>

          {!isPro && (
            <div className="pt-4">
              <button className="px-10 py-5 bg-white text-indigo-600 rounded-[2rem] text-sm font-black hover:bg-indigo-50 transition-all hover:scale-105 shadow-2xl shadow-white/20">
                UPGRADE TO PRO FOR FULL ACCESS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="sticky top-20 z-30 flex flex-col md:flex-row gap-6 items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-4 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="relative w-full md:w-96">
          <Input 
            placeholder="Search tutorials..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-14 rounded-3xl border-0 bg-slate-100 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            icon={<Search size={20} className="text-slate-400" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar scroll-smooth">
          {categories.map((cat) => (
            <button
              key={cat as string}
              onClick={() => setSelectedCategory(cat as string)}
              className={`px-6 py-3 rounded-[1.25rem] text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                selectedCategory === cat 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30 scale-105' 
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tutorial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredTutorials.length === 0 ? (
          <div className="col-span-full py-24 text-center border-4 border-dashed border-slate-100 dark:border-slate-800/50 rounded-[3rem]">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Video size={48} className="text-slate-200 dark:text-slate-700" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No guides found</h3>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">We couldn't find any tutorials matching your search. Try different keywords.</p>
          </div>
        ) : (
          filteredTutorials.map((tutorial, index) => (
            <div 
              key={tutorial.id} 
              className={`group cursor-pointer flex flex-col space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ${tutorial.isPremium && !isPro ? 'opacity-80' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => {
                if (tutorial.isPremium && !isPro) {
                  alert('This is a Premium tutorial. Please upgrade to PRO to watch.');
                  return;
                }
                setPlayingVideo(tutorial);
              }}
            >
              <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-lg group-hover:shadow-[0_20px_50px_rgba(79,70,229,0.2)] dark:group-hover:shadow-none group-hover:-translate-y-2 transition-all duration-500 border border-slate-200/50 dark:border-slate-800">
                {tutorial.thumbnailUrl ? (
                  <img 
                    src={tutorial.thumbnailUrl} 
                    alt={tutorial.title} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Video size={48} />
                  </div>
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-indigo-900/10 group-hover:bg-indigo-900/40 transition-colors flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-2xl flex items-center justify-center border border-white/30 scale-75 group-hover:scale-100 transition-all duration-500 shadow-2xl">
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
                      {tutorial.isPremium && !isPro ? (
                        <Lock className="text-amber-600" size={24} />
                      ) : (
                        <Play fill="currentColor" className="text-indigo-600 ml-1" size={24} />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Category Badge */}
                <div className="absolute top-5 left-5 flex gap-2">
                  <Badge variant="glass" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl bg-black/30 border-white/10">
                    {tutorial.category}
                  </Badge>
                  {tutorial.isPremium && (
                    <Badge variant="glass" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl bg-amber-500/80 border-amber-400/50 text-white">
                      PRO
                    </Badge>
                  )}
                </div>

                {/* Share Button */}
                <button 
                  onClick={(e) => handleShare(e, tutorial)}
                  className="absolute bottom-5 right-5 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                >
                  <Share2 size={16} />
                </button>
              </div>

              <div className="space-y-3 px-2">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                  <Clock size={12} />
                  Tutorial Guide
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                  {tutorial.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed text-sm">
                  {tutorial.description || 'Elevate your financial management with this comprehensive step-by-step guide.'}
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                   <CheckCircle size={14} />
                   Verified by Finance Team
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
          <div className="flex flex-col lg:flex-row gap-8 pb-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Left Column: Video & Info */}
            <div className="flex-1 space-y-8 min-w-0">
              <div className="aspect-video w-full rounded-[2rem] overflow-hidden bg-black shadow-2xl border-2 border-slate-100 dark:border-slate-800">
                <iframe
                  src={getEmbedUrl(playingVideo.youtubeUrl) || ''}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Badge variant="info" className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">{playingVideo.category}</Badge>
                      <Badge variant="success" className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Verified</Badge>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{playingVideo.title}</h2>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={(e) => handleShare(e, playingVideo)}
                      className="flex-1 sm:flex-none p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
                    >
                      <Share2 size={20} />
                    </button>
                    <a 
                      href={playingVideo.youtubeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-200 dark:shadow-none"
                    >
                      <Video size={18} />
                      YOUTUBE
                    </a>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Description</h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium">
                    {playingVideo.description || 'This tutorial provides an in-depth look at how to master your personal finances using our platform. Follow along with our experts as they guide you through the core features and best practices.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Suggested Tutorials */}
            <div className="w-full lg:w-80 shrink-0 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">More Guides</h4>
                <Badge variant="outline" className="text-[10px] font-bold">{tutorials.length - 1} Total</Badge>
              </div>
              <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 no-scrollbar">
                {tutorials
                  .filter(t => t.id !== playingVideo.id)
                  .slice(0, 5)
                  .map((tutorial) => (
                    <div 
                      key={tutorial.id}
                      onClick={() => setPlayingVideo(tutorial)}
                      className="group cursor-pointer flex gap-3 p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all shrink-0 w-64 lg:w-full"
                    >
                      <div className="w-24 aspect-video rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <img src={tutorial.thumbnailUrl || ''} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {tutorial.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">{tutorial.category}</p>
                      </div>
                    </div>
                  ))}
              </div>
              
              {/* Help Box */}
              <div className="relative overflow-hidden p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 dark:shadow-none hidden lg:block">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <h5 className="font-black text-lg mb-2">Need help?</h5>
                  <p className="text-xs text-indigo-100 mb-6 leading-relaxed font-medium">Our support team is available 24/7 to help you reach your goals.</p>
                  <button className="w-full py-3 bg-white text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-50 transition-all hover:scale-105 active:scale-95 shadow-lg">
                    CONTACT SUPPORT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
