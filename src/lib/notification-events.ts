export type NotificationEventPayload = {
  userId: string;
  createdAt: string;
};

type Listener = (payload: NotificationEventPayload) => void;

type NotificationEventStore = {
  listeners: Map<string, Set<Listener>>;
};

const globalForNotificationEvents = globalThis as typeof globalThis & {
  __takapilotNotificationEvents?: NotificationEventStore;
};

function getStore() {
  if (!globalForNotificationEvents.__takapilotNotificationEvents) {
    globalForNotificationEvents.__takapilotNotificationEvents = { listeners: new Map() };
  }
  return globalForNotificationEvents.__takapilotNotificationEvents;
}

export function subscribeNotificationEvent(userId: string, listener: Listener) {
  const store = getStore();
  const listeners = store.listeners.get(userId) || new Set<Listener>();
  listeners.add(listener);
  store.listeners.set(userId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      store.listeners.delete(userId);
    }
  };
}

export function publishNotificationEvent(userId: string) {
  const listeners = getStore().listeners.get(userId);
  if (!listeners || listeners.size === 0) return;

  const payload = {
    userId,
    createdAt: new Date().toISOString(),
  };

  listeners.forEach((listener) => listener(payload));
}
