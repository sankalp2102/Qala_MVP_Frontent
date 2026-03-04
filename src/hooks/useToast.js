import { useState, useCallback } from 'react';
let id = 0;
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'info') => {
    const tid = ++id;
    setToasts(t => [...t, { id: tid, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== tid)), 3500);
  }, []);
  const success = msg => add(msg, 'success');
  const error   = msg => add(msg, 'error');
  const info    = msg => add(msg, 'info');
  return { toasts, success, error, info };
}
