"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      style={{
        borderRadius: 10,
        border: "1px solid #cbd3c9",
        background: "#fff",
        padding: "8px 12px",
        fontSize: 13.5,
        color: "var(--ink-2)",
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
