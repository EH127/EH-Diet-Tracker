import { useSyncExternalStore } from 'react';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let deferred: InstallPrompt | undefined;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(f => f());
const listen = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as InstallPrompt; notify(); });
  window.addEventListener('appinstalled', () => { deferred = undefined; notify(); });
}
export const canPromptInstall = () => !!deferred;
export const useCanInstall = () => useSyncExternalStore(listen, canPromptInstall);
export async function promptInstall(): Promise<void> {
  const event = deferred; if (!event) return;
  deferred = undefined; notify();
  await event.prompt();
  await event.userChoice;
}
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
// iPadOS reports a Mac user agent, so touch support gives it away.
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
