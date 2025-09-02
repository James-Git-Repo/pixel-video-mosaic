// src/hooks/useIsAdmin.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // adjust the import if your client path differs

export function useIsAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("is_admin");
        if (cancelled) return;
        if (error) throw error;
        setIsAdmin(!!data);
      } catch (e: any) {
        setError(e?.message ?? "Admin check failed");
        setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { isAdmin, loading, error };
}
