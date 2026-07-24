/**
 * autosaveRegistry — a tiny module-level registry of "flush my pending save"
 * callbacks.
 *
 * The onboarding sections autosave on a debounce, so at any moment there may be
 * edits that haven't been written yet. Section-to-section navigation is handled
 * inside useAutosave (it flushes on unmount), but two cases live outside any
 * component and need a way to reach in:
 *
 *   • Logout — the session is about to be torn down. The pending save has to go
 *     out (and finish) BEFORE the tokens are cleared, otherwise the request is
 *     sent unauthenticated and the seller loses the edit.
 *   • Tab close / reload / backgrounding — handled by page-lifecycle listeners.
 *
 * Anything that registers must unregister on unmount, or a flush would call
 * into a dead component's closure.
 */
const flushers = new Set();

/** Register a flush callback. Returns an unregister function. */
export function registerAutosave(flushFn) {
  flushers.add(flushFn);
  return () => flushers.delete(flushFn);
}

/** True when any registered autosave has unsaved edits waiting. */
export function hasPendingAutosaves() {
  for (const fn of flushers) {
    if (typeof fn.isDirty === 'function' && fn.isDirty()) return true;
  }
  return false;
}

/**
 * Run every pending save and wait for them all to settle.
 *
 * Uses allSettled so one failing section can't stop the others from saving —
 * on logout we want to persist as much as possible, not bail at the first error.
 */
export async function flushAllAutosaves() {
  const running = [];
  for (const fn of flushers) {
    try {
      const result = fn();
      if (result && typeof result.then === 'function') running.push(result);
    } catch {
      // A broken flusher must not block the rest.
    }
  }
  if (running.length) await Promise.allSettled(running);
}