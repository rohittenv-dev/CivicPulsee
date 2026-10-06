import { authority } from "@/config/authority";

/**
 * Generates a human-readable, upper-case tracking ID (e.g. CP-7K3QD2).
 * Uses characters excluding confusing ambiguous letters like O, 0, I, 1.
 */
export function generateTrackingId(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  return `${authority.trackingPrefix}-${code}`;
}

/**
 * Computes a simple cryptographic SHA-256 event hash for tamper-evident audit history.
 */
export async function computeEventHash(
  issueId: string,
  newStatus: string,
  prevHash: string | null,
  timestamp: string
): Promise<string> {
  const payload = `${issueId}:${newStatus}:${prevHash || "GENESIS"}:${timestamp}`;
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback simple hash for server environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}${Date.now().toString(36)}`;
}
