import { isSupabaseConfigured, supabase } from './supabase';
import { normalizeClass } from '../utils/classNormalizer';

export const REALTIME_CHANNEL_NAME = 'quizforge_teacher_tests_realtime';
export const STORAGE_PING_KEY = 'quizforge_test_published_timestamp';

/**
 * Storage abstraction with fallback for Node / SSR / browser
 */
const memoryStorage = new Map<string, string>();
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch { }
    return memoryStorage.get(key) || null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
        return;
      }
    } catch { }
    memoryStorage.set(key, val);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch { }
    memoryStorage.delete(key);
  }
};

/**
 * Broadcasts an event when a teacher publishes or updates a test or quiz
 */
export function notifyTestPublished(test: { id: string; class: number | string }) {
  try {
    const classNum = normalizeClass(test.class);
    if (typeof window !== 'undefined') {
      // 1. Same-window CustomEvent
      window.dispatchEvent(
        new CustomEvent('quizforge:teacher_test_published', {
          detail: { testId: test.id, class: classNum }
        })
      );

      // 2. Cross-tab BroadcastChannel
      if ('BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel(REALTIME_CHANNEL_NAME);
          bc.postMessage({
            type: 'teacher_test_published',
            testId: test.id,
            class: classNum,
            timestamp: Date.now()
          });
          bc.close();
        } catch { }
      }

      // 3. Storage timestamp ping (triggers across windows/tabs)
      safeStorage.setItem(STORAGE_PING_KEY, String(Date.now()));
    }
  } catch (err) {
    console.warn('Realtime notify warning:', err);
  }
}

/**
 * Realtime listener for students to receive tests as soon as teacher publishes them
 */
export function subscribeToTeacherTestUpdates(
  studentClass: number | string,
  onUpdate: () => void
): () => void {
  const cleanups: (() => void)[] = [];
  const normalizedClass = normalizeClass(studentClass);

  if (typeof window !== 'undefined') {
    // 1. Same-tab CustomEvent
    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || normalizeClass(detail.class) === normalizedClass) {
        onUpdate();
      }
    };
    window.addEventListener('quizforge:teacher_test_published', handleCustom);
    cleanups.push(() => window.removeEventListener('quizforge:teacher_test_published', handleCustom));

    // 2. Cross-tab BroadcastChannel
    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(REALTIME_CHANNEL_NAME);
        bc.onmessage = (event) => {
          if (event.data?.type === 'teacher_test_published') {
            if (!event.data.class || normalizeClass(event.data.class) === normalizedClass) {
              onUpdate();
            }
          }
        };
        cleanups.push(() => {
          bc.close();
        });
      } catch { }
    }

    // 3. Storage event for cross-tab updates
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_PING_KEY ||
        e.key === 'quizforge_teacher_tests' ||
        e.key === 'quizforge_mock_teacher_quizzes'
      ) {
        onUpdate();
      }
    };
    window.addEventListener('storage', handleStorage);
    cleanups.push(() => window.removeEventListener('storage', handleStorage));

    // 4. Supabase Realtime channel (if supabase is active)
    if (isSupabaseConfigured && supabase) {
      try {
        const channel = supabase
          .channel(`rt-tt-class-${normalizedClass}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'teacher_tests',
              filter: `class=eq.${normalizedClass}`
            },
            () => {
              onUpdate();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'quizzes',
              filter: `class=eq.${normalizedClass}`
            },
            () => {
              onUpdate();
            }
          )
          .subscribe();

        cleanups.push(() => {
          try { supabase.removeChannel(channel); } catch { }
        });
      } catch (err) {
        console.warn('Supabase realtime listener skipped:', err);
      }
    }
  }

  return () => {
    cleanups.forEach(fn => {
      try { fn(); } catch { }
    });
  };
}
