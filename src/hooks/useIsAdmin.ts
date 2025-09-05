import { useEffect, useState } from "react";
// ⬇️ Adjust this import to match your project.
// Try this first:
import { supabase } from "../integrations/supabase/client";
// If your client is at src/supabaseClient.ts, use:
// import { supabase } from "../supabaseClient";

export function useIsAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("is_admin");
        if (!cancel) setIsAdmin(Boolean(data));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  return { isAdmin, loading };
}
