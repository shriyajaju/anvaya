"use client";

import { UploadDropzone } from "@/components/studio/upload-dropzone";
import { deleteAsset, renameAsset } from "@/server/settings";
import { useState } from "react";

export type AssetCard = {
  id: string;
  siteId: string;
  filename: string;
  kind: string;
  bytes: number;
  referenced: boolean;
};

const kinds = ["all", "photo", "model", "usdz", "document", "audio", "drawing"] as const;

export function AssetsBoard({ assets, siteId, slug }: { assets: AssetCard[]; siteId: string; slug: string }) {
  const [kind, setKind] = useState<(typeof kinds)[number]>("all");
  const shown = assets.filter((asset) => kind === "all" || asset.kind === kind);
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-8 py-8">
      <h1 className="text-[32px] font-light leading-10">Assets</h1>
      <div className="flex flex-wrap gap-2">
        {kinds.map((item) => (
          <button key={item} type="button" onClick={() => setKind(item)} className={`rounded-pill px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${kind === item ? "bg-primary text-on-primary" : "bg-surface text-text-2"}`}>
            {item}
          </button>
        ))}
      </div>
      <UploadDropzone siteId={siteId} slug={slug} kind="photo" label="Drop a file for this site" />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {shown.map((asset) => (
          <AssetItem key={asset.id} asset={asset} />
        ))}
      </ul>
      {shown.length === 0 ? <p className="text-[13px] text-text-2">No files of this kind.</p> : null}
    </div>
  );
}

function AssetItem({ asset }: { asset: AssetCard }) {
  const [name, setName] = useState(asset.filename);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <li className="flex flex-col gap-2 rounded-card bg-surface p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-3">{asset.kind}</p>
      <input value={name} onChange={(event) => setName(event.target.value)} className="h-9 rounded-button border border-border bg-page px-2 text-[13px]" aria-label={`Rename ${asset.filename}`} />
      <p className="text-[13px] text-text-2">{Math.max(1, Math.round(asset.bytes / 1024))} KB</p>
      <div className="flex gap-3 text-[13px]">
        <button type="button" onClick={() => { void renameAsset({ id: asset.id, filename: name }).then((result) => setMessage(result.ok ? "Renamed." : result.error ?? "Not renamed.")); }}>Rename</button>
        <button type="button" className="text-conf-low" onClick={() => { void deleteAsset(asset.id).then((result) => setMessage(result.ok ? "Deleted." : result.error ?? "Not deleted.")); }}>Delete</button>
      </div>
      {message ? <p className="text-[13px] text-text-2">{message}</p> : null}
    </li>
  );
}
