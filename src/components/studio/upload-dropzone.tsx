"use client";

import { createClient } from "@/lib/supabase/browser";
import { registerAsset } from "@/server/content";
import { Upload } from "lucide-react";
import { useState } from "react";

export function UploadDropzone({
  siteId,
  slug,
  kind,
  label = "Drop photos, videos or 3D captures here",
  hint = "JPEG, PNG, GLB, USDZ · up to 50 MB",
}: {
  siteId: string;
  slug: string;
  kind: "photo" | "model" | "drawing" | "document";
  label?: string;
  hint?: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    setError(null);
    const resolved =
      kind === "photo" && (file.name.endsWith(".glb") || file.type.includes("gltf"))
        ? "model"
        : kind === "model" && file.type.startsWith("image/")
          ? "photo"
          : kind;
    const safe = file.name.replace(/[^\w.-]+/g, "-");
    const path = `${siteId}/${crypto.randomUUID()}-${safe}`;
    setProgress(8);
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setProgress(null);
      setError("Sign in again before uploading.");
      return;
    }
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/assets/${path}`;
    const uploaded = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", process.env.SUPABASE_ANON_KEY ?? "");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 90));
      };
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.send(file);
    });
    if (!uploaded) {
      setProgress(null);
      setError("The upload did not finish.");
      return;
    }
    const saved = await registerAsset({
      siteId,
      slug,
      kind: resolved,
      storagePath: path,
      filename: file.name,
      bytes: file.size,
      mime: file.type || "application/octet-stream",
    });
    setProgress(saved.ok ? 100 : null);
    if (!saved.ok) setError(saved.error);
    else setTimeout(() => setProgress(null), 600);
  }

  return (
    <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface px-6 py-8 text-center">
      <Upload aria-hidden className="size-5 text-text-2" />
      <span className="text-[15px] leading-6 text-text-1">{label}</span>
      <span className="text-[13px] leading-5 text-text-2">{hint}</span>
      {progress !== null ? (
        <span className="mt-2 h-1 w-40 overflow-hidden rounded-bar bg-surface-2">
          <span className="block h-full bg-primary" style={{ width: `${progress}%` }} />
        </span>
      ) : null}
      {error ? <span className="text-[13px] leading-5 text-conf-low">{error}</span> : null}
      <input
        type="file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}
