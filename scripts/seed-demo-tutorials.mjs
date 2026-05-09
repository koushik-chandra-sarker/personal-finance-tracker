import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_TUTORIALS = [
  {
    title: 'Budgeting Basics',
    description: 'A beginner-friendly budgeting primer. Use it to test the free tutorial flow and the Budgeting category.',
    youtubeUrl: 'https://www.youtube.com/watch?v=sVKQn2I4HDM',
    category: 'Budgeting',
    isActive: true,
    isPremium: false,
    sortOrder: 10,
  },
  {
    title: 'How to Save an Emergency Fund',
    description: 'A practical emergency-fund lesson for testing savings and goal-focused tutorial content.',
    youtubeUrl: 'https://www.youtube.com/watch?v=L3EwcjzHiqY',
    category: 'Goals',
    isActive: true,
    isPremium: false,
    sortOrder: 20,
  },
  {
    title: 'Bad Money Habits Your Phone Can Fix',
    description: 'A useful habits video for testing app workflow and daily tracking tutorial cards.',
    youtubeUrl: 'https://www.youtube.com/watch?v=7xPM1fIhpdA',
    category: 'Tracking',
    isActive: true,
    isPremium: false,
    sortOrder: 30,
  },
  {
    title: 'Debt Snowball vs Debt Avalanche',
    description: 'A debt payoff comparison video. Marked as PRO to test locked tutorial behavior for free users.',
    youtubeUrl: 'https://www.youtube.com/watch?v=TWHV-nRuuoQ',
    category: 'Debt',
    isActive: true,
    isPremium: true,
    sortOrder: 40,
  },
  {
    title: 'How to Pay Off Debt Fast',
    description: 'An advanced debt payoff video for testing premium tutorial badges and locked preview modal.',
    youtubeUrl: 'https://www.youtube.com/watch?v=40JHUBRrpRQ',
    category: 'Debt',
    isActive: true,
    isPremium: true,
    sortOrder: 50,
  },
  {
    title: 'How to Invest Money in Your 20s',
    description: 'An investing starter video. Use this to test the Investments category and PRO access state.',
    youtubeUrl: 'https://www.youtube.com/watch?v=vVcxJg_d4JA',
    category: 'Investments',
    isActive: true,
    isPremium: true,
    sortOrder: 60,
  },
  {
    title: 'Draft: The 4 Savings Accounts Everyone Needs',
    description: 'Inactive draft fixture for testing admin-only tutorial management without showing it on the public Academy page.',
    youtubeUrl: 'https://www.youtube.com/watch?v=tnqzo1xe-Wc',
    category: 'Accounts',
    isActive: false,
    isPremium: false,
    sortOrder: 70,
  },
];

function extractYoutubeThumbnail(url) {
  const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
}

async function seedDemoTutorials() {
  const results = [];

  for (const tutorial of DEMO_TUTORIALS) {
    const data = {
      ...tutorial,
      thumbnailUrl: extractYoutubeThumbnail(tutorial.youtubeUrl),
    };
    const existing = await prisma.tutorial.findFirst({
      where: { youtubeUrl: tutorial.youtubeUrl },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.tutorial.update({
        where: { id: existing.id },
        data,
      });
      results.push({ status: 'updated', title: updated.title });
      continue;
    }

    const created = await prisma.tutorial.create({ data });
    results.push({ status: 'created', title: created.title });
  }

  return results;
}

seedDemoTutorials()
  .then((results) => {
    console.table(results);
  })
  .catch((error) => {
    console.error('Failed to seed demo tutorials:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
