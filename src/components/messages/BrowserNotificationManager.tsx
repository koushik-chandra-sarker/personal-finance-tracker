'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  getBrowserPushAdminMessagesAction,
  markAdminMessageBrowserPushedAction,
  type BrowserPushAdminMessage,
} from '@/actions/admin-message.actions';
import {
  getBrowserPushPublicKeyAction,
  saveBrowserPushSubscriptionAction,
} from '@/actions/browser-push.actions';
import Button from '@/components/ui/Button';
import { useI18n } from '@/i18n/client';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const HIDDEN_PROMPT_KEY = 'takapilot:browser-notification-prompt-hidden';
const PROMPT_SNOOZE_MS = 24 * 60 * 60 * 1000;

function isBrowserNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function isServiceWorkerPushSupported() {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function BrowserNotificationManager() {
  const { messages } = useI18n();
  const copy = messages.pages.adminMessages;
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [dueMessages, setDueMessages] = useState<BrowserPushAdminMessage[]>([]);
  const [promptHidden, setPromptHidden] = useState(true);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  const deliveringRef = useRef(false);
  const subscriptionSyncedRef = useRef(false);
  const publicKeyRef = useRef<string | null>(null);

  const markDelivered = useCallback(async (messageId: string) => {
    await markAdminMessageBrowserPushedAction(messageId);
  }, []);

  const deliverMessages = useCallback(async (nextMessages: BrowserPushAdminMessage[]) => {
    if (!isBrowserNotificationSupported() || Notification.permission !== 'granted' || deliveringRef.current) return;
    deliveringRef.current = true;

    try {
      for (const message of nextMessages) {
        const notification = new Notification(message.title, {
          body: message.message,
          icon: '/icon',
          tag: `admin-message-${message.id}`,
        });

        notification.onclick = () => {
          window.focus();
          if (message.actionUrl) window.location.href = message.actionUrl;
          notification.close();
        };

        await markDelivered(message.id);
      }
      setDueMessages([]);
    } finally {
      deliveringRef.current = false;
    }
  }, [markDelivered]);

  const syncServiceWorkerSubscription = useCallback(async () => {
    if (!isServiceWorkerPushSupported() || Notification.permission !== 'granted' || subscriptionSyncedRef.current) return false;
    const activePublicKey = publicKeyRef.current || publicKey || await getBrowserPushPublicKeyAction();
    if (!activePublicKey) return false;
    publicKeyRef.current = activePublicKey;
    setPublicKey(activePublicKey);

    try {
      const registration = await navigator.serviceWorker.register('/takapilot-sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(activePublicKey),
      });

      const response = await saveBrowserPushSubscriptionAction(subscription.toJSON(), navigator.userAgent);
      if (response.success) {
        subscriptionSyncedRef.current = true;
        setSubscriptionReady(true);
        return true;
      }
    } catch (error) {
      console.error('Failed to register browser push subscription:', error);
    }
    setSubscriptionReady(false);
    return false;
  }, [publicKey]);

  const refreshDueMessages = useCallback(async () => {
    if (!isBrowserNotificationSupported()) return;
    if (Notification.permission === 'granted') {
      void syncServiceWorkerSubscription();
    }

    const nextMessages = await getBrowserPushAdminMessagesAction();
    setPermission(Notification.permission);
    setDueMessages(nextMessages);

    if (nextMessages.length > 0 && Notification.permission === 'granted') {
      await deliverMessages(nextMessages);
    }

    if (Notification.permission === 'default') {
      const hiddenAt = Number(window.localStorage.getItem(HIDDEN_PROMPT_KEY) || 0);
      setPromptHidden(hiddenAt > 0 && Date.now() - hiddenAt < PROMPT_SNOOZE_MS);
    }
  }, [deliverMessages, syncServiceWorkerSubscription]);

  useEffect(() => {
    if (!isBrowserNotificationSupported()) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);
    void getBrowserPushPublicKeyAction().then((nextPublicKey) => {
      publicKeyRef.current = nextPublicKey;
      setPublicKey(nextPublicKey);
    });
    void refreshDueMessages();

    const refreshOnServerEvent = () => void refreshDueMessages();
    const refreshWhenBrowserReturns = () => void refreshDueMessages();
    const intervalId = window.setInterval(() => void refreshDueMessages(), CHECK_INTERVAL_MS);

    window.addEventListener('takapilot:server-event', refreshOnServerEvent);
    window.addEventListener('focus', refreshWhenBrowserReturns);
    document.addEventListener('visibilitychange', refreshWhenBrowserReturns);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('takapilot:server-event', refreshOnServerEvent);
      window.removeEventListener('focus', refreshWhenBrowserReturns);
      document.removeEventListener('visibilitychange', refreshWhenBrowserReturns);
    };
  }, [refreshDueMessages]);

  useEffect(() => {
    if (!publicKey || permission !== 'granted') return;
    void syncServiceWorkerSubscription();
  }, [permission, publicKey, syncServiceWorkerSubscription]);

  const requestPermission = async () => {
    if (!isBrowserNotificationSupported()) return;
    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission === 'granted') {
      await syncServiceWorkerSubscription();
      await deliverMessages(dueMessages);
    }
  };

  const hidePrompt = () => {
    window.localStorage.setItem(HIDDEN_PROMPT_KEY, String(Date.now()));
    setPromptHidden(true);
  };

  if (!publicKey || promptHidden || permission === 'denied' || permission === 'unsupported' || subscriptionReady) return null;
  if (permission === 'granted') return null;

  const hasDueReminder = dueMessages.length > 0;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl shadow-slate-900/15 dark:border-indigo-500/30 dark:bg-slate-900 sm:left-auto sm:w-[24rem]">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <Bell className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-950 dark:text-slate-100">
            {hasDueReminder ? copy.browserPushPermissionTitle : copy.browserPushSetupTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {hasDueReminder ? copy.browserPushPermissionHelp : copy.browserPushSetupHelp}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={requestPermission}>{copy.enableBrowserPush}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={hidePrompt}>{copy.notNow}</Button>
          </div>
        </div>
        <button
          type="button"
          onClick={hidePrompt}
          className="h-8 w-8 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={copy.close}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
