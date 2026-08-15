"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMyAccount } from "@/lib/delete-account";

/**
 * In-app account deletion (Google Play User Data policy). At /account/delete — use
 * this URL for the Play Data-safety "account deletion" link. Anonymises the member's
 * personal details; the group's savings ledger (shared records) is retained.
 */
export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    await deleteMyAccount();
    router.replace("/sign-in?status=deleted");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bone)" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "grid",
          gap: 18,
          borderRadius: 18,
          border: "1px solid #d8ddd2",
          background: "#fff",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#b3261e", margin: 0 }}>Delete your account</h1>
        <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0, lineHeight: 1.5 }}>
          This removes your Stawi login and your personal details (name, phone, photo).
          Your group&apos;s savings records are shared and stay with the group. This
          cannot be undone.
        </p>
        <label style={{ fontSize: 13, color: "var(--ink-2)" }}>
          Type DELETE to confirm
          <input
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="DELETE"
            style={{
              marginTop: 6,
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 12,
              border: "1px solid #cbd3c9",
              padding: "12px 14px",
              fontSize: 16,
              outline: "none",
            }}
          />
        </label>
        <button
          type="button"
          disabled={loading || confirm !== "DELETE"}
          onClick={onDelete}
          style={{
            borderRadius: 12,
            border: 0,
            padding: "13px 16px",
            fontSize: 15,
            fontWeight: 600,
            color: "#fff",
            background: "#b3261e",
            cursor: "pointer",
            opacity: loading || confirm !== "DELETE" ? 0.5 : 1,
          }}
        >
          {loading ? "Deleting…" : "Permanently delete my account"}
        </button>
      </div>
    </main>
  );
}
