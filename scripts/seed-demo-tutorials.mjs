import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_TUTORIALS = [
  {
    title: 'বাজেটিং বেসিকস',
    description: 'নতুনদের জন্য সহজ বাজেটিং গাইড। ফ্রি টিউটোরিয়াল ধাপ এবং বাজেটিং ক্যাটাগরি পরীক্ষা করতে ব্যবহার করুন।',
    youtubeUrl: 'https://www.youtube.com/watch?v=sVKQn2I4HDM',
    category: 'বাজেটিং',
    isActive: true,
    isPremium: false,
    sortOrder: 10,
  },
  {
    title: 'ইমার্জেন্সি ফান্ড কীভাবে সঞ্চয় করবেন',
    description: 'সঞ্চয় এবং লক্ষ্যভিত্তিক টিউটোরিয়াল কনটেন্ট পরীক্ষা করার জন্য একটি বাস্তবমুখী ইমার্জেন্সি ফান্ড লেসন।',
    youtubeUrl: 'https://www.youtube.com/watch?v=L3EwcjzHiqY',
    category: 'লক্ষ্য',
    isActive: true,
    isPremium: false,
    sortOrder: 20,
  },
  {
    title: 'আপনার ফোন দিয়ে খারাপ মানি হ্যাবিট ঠিক করুন',
    description: 'অ্যাপের কাজের ধাপ এবং দৈনন্দিন ট্র্যাকিং টিউটোরিয়াল কার্ড পরীক্ষা করার জন্য দরকারি অভ্যাসভিত্তিক ভিডিও।',
    youtubeUrl: 'https://www.youtube.com/watch?v=7xPM1fIhpdA',
    category: 'ট্র্যাকিং',
    isActive: true,
    isPremium: false,
    sortOrder: 30,
  },
  {
    title: 'ঋণ Snowball বনাম ঋণ Avalanche',
    description: 'ঋণ পরিশোধের দুটি পদ্ধতির তুলনা। ফ্রি ব্যবহারকারীর লকড টিউটোরিয়াল আচরণ পরীক্ষা করতে PRO হিসেবে রাখা হয়েছে।',
    youtubeUrl: 'https://www.youtube.com/watch?v=TWHV-nRuuoQ',
    category: 'ঋণ',
    isActive: true,
    isPremium: true,
    sortOrder: 40,
  },
  {
    title: 'দ্রুত ঋণ পরিশোধ করবেন কীভাবে',
    description: 'প্রিমিয়াম টিউটোরিয়াল লেবেল এবং লকড প্রিভিউ মডাল পরীক্ষা করার জন্য উন্নত ঋণ পরিশোধ ভিডিও।',
    youtubeUrl: 'https://www.youtube.com/watch?v=40JHUBRrpRQ',
    category: 'ঋণ',
    isActive: true,
    isPremium: true,
    sortOrder: 50,
  },
  {
    title: '২০-এর দশকে টাকা বিনিয়োগ করবেন কীভাবে',
    description: 'বিনিয়োগ শুরু করার গাইড। বিনিয়োগ ক্যাটাগরি এবং PRO অ্যাক্সেস অবস্থা পরীক্ষা করতে ব্যবহার করুন।',
    youtubeUrl: 'https://www.youtube.com/watch?v=vVcxJg_d4JA',
    category: 'বিনিয়োগ',
    isActive: true,
    isPremium: true,
    sortOrder: 60,
  },
  {
    title: 'ড্রাফট: সবার দরকারি ৪টি সেভিংস অ্যাকাউন্ট',
    description: 'পাবলিক একাডেমি পেজে না দেখিয়ে শুধু অ্যাডমিন টিউটোরিয়াল ম্যানেজমেন্ট পরীক্ষা করার জন্য নিষ্ক্রিয় ড্রাফট ডেটা।',
    youtubeUrl: 'https://www.youtube.com/watch?v=tnqzo1xe-Wc',
    category: 'অ্যাকাউন্ট',
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
