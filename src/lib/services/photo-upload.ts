import { supabase } from "@/integrations/supabase/client";

const BUCKET = "issue-photos";

/**
 * Uploads a photo to Supabase Storage and returns a durable public URL.
 *
 * Never store `URL.createObjectURL()` blob: URLs — they only exist inside the
 * tab that created them, so the image vanishes on reload and is invisible on
 * every other device.
 */
export async function uploadIssuePhoto(file: File, folder = "reports"): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Blob URLs from older submissions can never load — treat them as no photo. */
export function isDisplayablePhoto(url?: string | null): boolean {
  return !!url && !url.startsWith("blob:") && !url.startsWith("data:");
}
