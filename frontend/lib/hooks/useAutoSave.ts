import { useEffect, useRef } from "react";
import { api } from "@/lib/api/client";

/**
 * Debounced auto-save hook.
 * Calls PATCH `endpoint` with `data` 500ms after the last change.
 */
export function useAutoSave<T extends object>(
  endpoint: string,
  data: T,
  enabled = true
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.patch(endpoint, dataRef.current).catch(() => {
        // Silent fail — user can retry manually
      });
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), endpoint, enabled]);
}
