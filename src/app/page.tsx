import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true },
    });
    if (user?.mustChangePassword) redirect('/change-password');
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
