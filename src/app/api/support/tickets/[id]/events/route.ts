import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subscribeSupportTicketEvent } from '@/lib/support-events';

export const dynamic = 'force-dynamic';

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await context.params;
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id,
      ...(session.user.role === 'ADMIN' ? {} : { userId: session.user.id }),
    },
    select: { id: true },
  });

  if (!ticket) {
    return new Response('Not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      send({ type: 'connected', ticketId: id, createdAt: new Date().toISOString() });

      const unsubscribe = subscribeSupportTicketEvent(id, send);
      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', ticketId: id, createdAt: new Date().toISOString() });
      }, 25_000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
