import { useSyncExternalStore } from 'react';
import { getState, getStorageError, subscribe } from './store';
export const useStore = () => useSyncExternalStore(subscribe, getState);
export const useStorageError = () => useSyncExternalStore(subscribe, getStorageError);
