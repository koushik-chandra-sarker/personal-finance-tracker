export type SupportTicketEventType = 'message' | 'status' | 'pin';

export type SupportTicketEventPayload = {
  ticketId: string;
  type: SupportTicketEventType;
  createdAt: string;
};

type Listener = (payload: SupportTicketEventPayload) => void;

type SupportEventStore = {
  listeners: Map<string, Set<Listener>>;
};

const globalForSupportEvents = globalThis as typeof globalThis & {
  __takapilotSupportEvents?: SupportEventStore;
};

function getStore() {
  if (!globalForSupportEvents.__takapilotSupportEvents) {
    globalForSupportEvents.__takapilotSupportEvents = { listeners: new Map() };
  }
  return globalForSupportEvents.__takapilotSupportEvents;
}

export function subscribeSupportTicketEvent(ticketId: string, listener: Listener) {
  const store = getStore();
  const listeners = store.listeners.get(ticketId) || new Set<Listener>();
  listeners.add(listener);
  store.listeners.set(ticketId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      store.listeners.delete(ticketId);
    }
  };
}

export function publishSupportTicketEvent(ticketId: string, type: SupportTicketEventType) {
  const listeners = getStore().listeners.get(ticketId);
  if (!listeners || listeners.size === 0) return;

  const payload = {
    ticketId,
    type,
    createdAt: new Date().toISOString(),
  };

  listeners.forEach((listener) => listener(payload));
}
