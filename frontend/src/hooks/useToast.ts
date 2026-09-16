import { useCallback, useState } from "react";

export type ToastItem = { id: number; message: string; kind?: "info" | "error" | "success" };

let counter = 0;
const listeners = new Set<(t: ToastItem[]) => void>();
let store: ToastItem[] = [];

export function pushToast(message: string, kind: ToastItem["kind"] = "info") {
  const t = { id: ++counter, message, kind };
  store = [...store, t];
  listeners.forEach((l) => l(store));
  setTimeout(() => {
    store = store.filter((x) => x.id !== t.id);
    listeners.forEach((l) => l(store));
  }, 3000);
}

export function useToast() {
  const [items, setItems] = useState<ToastItem[]>(store);
  const subscribe = useCallback((fn: (t: ToastItem[]) => void) => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  // simple mount subscription
  if (typeof window !== "undefined" && !(subscribe as any)._bound) {
    (subscribe as any)._bound = true;
    listeners.add(setItems);
  }
  return { items, push: pushToast };
}
