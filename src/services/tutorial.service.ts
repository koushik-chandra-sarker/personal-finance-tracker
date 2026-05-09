import { prisma } from '@/lib/prisma';

export async function getTutorials(isAdmin: boolean = false) {
  return prisma.tutorial.findMany({
    where: isAdmin ? {} : { isActive: true },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'desc' }
    ],
  });
}

export async function getTutorialById(id: string) {
  return prisma.tutorial.findUnique({
    where: { id },
  });
}

export async function createTutorial(data: {
  title: string;
  description?: string | null;
  youtubeUrl: string;
  category?: string | null;
  isActive?: boolean;
  isPremium?: boolean;
  sortOrder?: number;
}) {
  const thumbnailUrl = extractYoutubeThumbnail(data.youtubeUrl);
  return prisma.tutorial.create({
    data: {
      title: data.title,
      description: data.description,
      youtubeUrl: data.youtubeUrl,
      category: data.category || 'General',
      isActive: data.isActive ?? true,
      isPremium: data.isPremium ?? false,
      sortOrder: data.sortOrder ?? 0,
      thumbnailUrl,
    },
  });
}

export async function updateTutorial(id: string, data: {
  title?: string;
  description?: string | null;
  youtubeUrl?: string;
  category?: string | null;
  isActive?: boolean;
  isPremium?: boolean;
  sortOrder?: number;
}) {
  let thumbnailUrl = undefined;
  if (data.youtubeUrl) {
    thumbnailUrl = extractYoutubeThumbnail(data.youtubeUrl);
  }

  return prisma.tutorial.update({
    where: { id },
    data: {
      ...data,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    },
  });
}

export async function deleteTutorial(id: string) {
  return prisma.tutorial.delete({
    where: { id },
  });
}

function extractYoutubeThumbnail(url: string) {
  const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
}
