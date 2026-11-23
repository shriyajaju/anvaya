"use client";

import { focusRing } from "@/components/ui/motion";
import { createClient } from "@/lib/supabase/browser";
import { registerAsset } from "@/server/content";
import { deleteAsset } from "@/server/settings";
import { Box, Check, ChevronRight, FileText, LayoutGrid, List, Move3d, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ReactNode } from "react";

export type AssetCard = {
  id: string;
  siteId: string;
  siteName: string;
  siteSlug: string;
  filename: string;
  kind: string;
  bytes: number;
  createdAt: string;
  referenced: boolean;
  downloadUrl: string | null;
};

type Licence = "Own" | "ASI archive" | "Published source" | "Unknown";
type LibraryKind = "photo" | "model" | "drawing" | "document" | "audio" | "video";

type Tile = {
  id: string;
  filename: string;
  kind: LibraryKind;
  siteId: string | null;
  siteName: string;
  siteSlug: string | null;
  bytes: number;
  createdAt: string;
  captured: string;
  licence: Licence;
  image?: string;
  mediaHeight: number;
  column: number;
  real: boolean;
  referenced: boolean;
  downloadUrl: string | null;
};

const WAVE = [20, 36, 54, 28, 44, 62, 34, 50, 24, 40, 18];

const CATALOG: Tile[] = [
  tile("north", "cave3_north_facade.jpg", "photo", 172, 0, "/assets-library/north-facade.png"),
  tile("fergusson", "Fergusson_1880_pl12.pdf", "document", 128, 0),
  tile("inscription", "inscription_detail_07.jpg", "photo", 172, 0, "/assets-library/inscription.png"),
  tile("exterior", "cave3_exterior_scan_v2.glb", "model", 218, 1),
  tile("capital", "pillar_capital_west.jpg", "photo", 172, 1, "/assets-library/pillar-capital.png"),
  tile("ambient", "cave3_ambient_take02.wav", "audio", 116, 1),
  tile("guide", "guide_interview_marathi.wav", "audio", 124, 2),
  tile("chaitya", "chaitya_hall_reference.jpg", "photo", 172, 2, "/assets-library/chaitya.png"),
  tile("fragment", "pillar_fragment_scan.glb", "model", 196, 2),
  tile("fergusson-2", "Fergusson_1880_pl12.pdf", "document", 146, 3),
  tile("courtyard", "courtyard_survey_03.jpg", "photo", 172, 3, "/assets-library/courtyard.png"),
  tile("stupa", "stupa_reconstruction.glb", "model", 174, 3),
];

const TYPE_FILTERS: { kind: LibraryKind; label: string }[] = [
  { kind: "photo", label: "Photos" },
  { kind: "model", label: "3D models" },
  { kind: "drawing", label: "Drawings" },
  { kind: "document", label: "Documents" },
  { kind: "audio", label: "Audio" },
  { kind: "video", label: "Video" },
];

const LICENCES: Licence[] = ["Own", "ASI archive", "Published source", "Unknown"];

function tile(
  id: string,
  filename: string,
  kind: LibraryKind,
  mediaHeight: number,
  column: number,
  image?: string,
  bytes = kind === "model" ? 12_000_000 : kind === "photo" ? 2_400_000 : kind === "audio" ? 8_000_000 : 1_200_000,
): Tile {
  return {
    id,
    filename,
    kind,
    siteId: "ajanta-cave-1",
    siteName: "Ajanta Cave 1",
    siteSlug: "ajanta-cave-1",
    bytes,
    createdAt: "2026-09-12T00:00:00.000Z",
    captured: kind === "model" && id === "exterior" ? "14 Aug 2026" : "12 Sep 2026",
    licence: "Own",
    image,
    mediaHeight,
    column,
    real: false,
    referenced: id === "exterior",
    downloadUrl: image ?? null,
  };
}

export function AssetsBoard({
  assets,
  sites,
  siteId,
  slug,
}: {
  assets: AssetCard[];
  sites: { id: string; name: string; slug: string }[];
  siteId: string;
  slug: string;
}) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "recent" | "shared" | "unassigned">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [types, setTypes] = useState<LibraryKind[]>([]);
  const [siteFilters, setSiteFilters] = useState<string[]>([]);
  const [licences, setLicences] = useState<Licence[]>([]);
  const [selectedId, setSelectedId] = useState("exterior");
  const [hidden, setHidden] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const library = useMemo(() => {
    const primaryId = sites.find((site) => site.slug === "ajanta-cave-1")?.id ?? "ajanta-cave-1";
    const catalog = CATALOG.map((item) => ({ ...item, siteId: primaryId }));
    const extra = assets
      .filter((asset) => !CATALOG.some((item) => item.filename === asset.filename))
      .map((asset, index): Tile => ({
        id: asset.id,
        filename: asset.filename,
        kind: toKind(asset.kind),
        siteId: asset.siteId,
        siteName: shortSite(asset.siteName),
        siteSlug: asset.siteSlug,
        bytes: asset.bytes,
        createdAt: asset.createdAt,
        captured: formatWhen(asset.createdAt),
        licence: "Own",
        image: asset.kind === "photo" ? asset.downloadUrl ?? undefined : undefined,
        mediaHeight: asset.kind === "model" ? 196 : asset.kind === "audio" ? 116 : asset.kind === "document" ? 128 : 172,
        column: index % 4,
        real: true,
        referenced: asset.referenced,
        downloadUrl: asset.downloadUrl,
      }));
    return [...catalog, ...extra].filter((item) => !hidden.includes(item.id));
  }, [assets, hidden, sites]);

  const visible = library.filter((item) => {
    if (query && !item.filename.toLowerCase().includes(query.toLowerCase())) return false;
    if (types.length && !types.includes(item.kind)) return false;
    if (siteFilters.length && !siteFilters.includes(item.siteId ?? "unassigned")) return false;
    if (licences.length && !licences.includes(item.licence)) return false;
    if (tab === "unassigned") return !item.siteId;
    if (tab === "shared") return false;
    return true;
  });
  const ordered = tab === "recent" ? [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : visible;
  const selected = ordered.find((item) => item.id === selectedId) ?? null;
  const columns = [0, 1, 2, 3].map((column) => ordered.filter((item) => (tab === "recent" ? ordered.indexOf(item) % 4 === column : item.column === column)));

  async function send(file: File) {
    setError(null);
    setUploading(true);
    const kind = file.name.endsWith(".glb") || file.type.includes("gltf") ? "model" : file.type.startsWith("audio/") ? "audio" : file.type === "application/pdf" ? "document" : "photo";
    const safe = file.name.replace(/[^\w.-]+/g, "-");
    const path = `${siteId}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      setUploading(false);
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
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.send(file);
    });
    if (!uploaded) {
      setUploading(false);
      setError("The upload did not finish.");
      return;
    }
    const saved = await registerAsset({ siteId, slug, kind, storagePath: path, filename: file.name, bytes: file.size, mime: file.type || "application/octet-stream" });
    setUploading(false);
    if (!saved.ok) setError(saved.error);
    else router.refresh();
  }

  return (
    <div className={`px-6 py-8 min-[1100px]:px-8 ${selected ? "min-[1100px]:pr-[496px]" : ""}`}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[40px] font-light leading-[1.12] tracking-[-0.8px] text-text-1">Assets</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-10 w-[280px] max-w-full items-center gap-2.5 rounded-button border border-border bg-surface px-3.5">
            <Search aria-hidden className="size-4 text-text-3" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search assets"
              className="w-full bg-transparent text-[13px] text-text-1 outline-none placeholder:text-text-3"
            />
          </label>
          <button type="button" className={`${focusRing} inline-flex h-10 w-[112px] items-center justify-center rounded-button border border-border bg-surface text-[11px] font-semibold tracking-[1.1px] text-text-1 shadow-[0_8px_24px_rgba(17,17,17,0.04)]`}>
            NEW FOLDER
          </button>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className={`${focusRing} inline-flex h-10 w-[88px] items-center justify-center rounded-button border border-primary bg-primary text-[11px] font-semibold tracking-[1.1px] text-on-primary`}
          >
            {uploading ? "…" : "UPLOAD"}
          </button>
          <input ref={uploadRef} type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void send(file); event.target.value = ""; }} />
        </div>
      </header>

      <div className="mt-6 flex items-start gap-4">
        <aside className="hidden w-[240px] shrink-0 flex-col gap-3 min-[900px]:flex">
          <FilterCard title="TYPE">
            {TYPE_FILTERS.map((item) => (
              <CheckRow
                key={item.kind}
                label={item.label}
                count={library.filter((asset) => asset.kind === item.kind).length}
                checked={types.includes(item.kind)}
                onChange={() => setTypes((current) => toggle(current, item.kind))}
              />
            ))}
          </FilterCard>
          <FilterCard title="SITE">
            {sites.map((site) => (
              <CheckRow key={site.id} label={site.name} checked={siteFilters.includes(site.id)} onChange={() => setSiteFilters((current) => toggle(current, site.id))} />
            ))}
            <CheckRow label="Unassigned" count={library.filter((item) => !item.siteId).length} checked={siteFilters.includes("unassigned")} onChange={() => setSiteFilters((current) => toggle(current, "unassigned"))} />
          </FilterCard>
          <FilterCard title="LICENCE">
            {LICENCES.map((licence) => (
              <CheckRow
                key={licence}
                label={licence}
                count={library.filter((item) => item.licence === licence).length}
                warn={licence === "Unknown"}
                checked={licences.includes(licence)}
                onChange={() => setLicences((current) => toggle(current, licence))}
              />
            ))}
          </FilterCard>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex h-10 items-center justify-between border-b border-border">
            <div className="flex h-10 gap-7">
              {(
                [
                  ["all", "All"],
                  ["recent", "Recent"],
                  ["shared", "Shared with me"],
                  ["unassigned", "Unassigned"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={`flex h-10 flex-col items-center justify-between text-[13px] ${tab === id ? "font-semibold text-text-1" : "font-normal text-text-2"}`}>
                  <span>{label}</span>
                  <span className={`h-0.5 w-full rounded-pill ${tab === id ? "bg-text-1" : "bg-transparent"}`} />
                </button>
              ))}
            </div>
            <div className="flex h-[34px] w-[72px] gap-0.5 rounded-button border border-border bg-surface p-[3px]">
              <button type="button" aria-label="Grid" onClick={() => setView("grid")} className={`flex h-7 w-8 items-center justify-center rounded-[6px] ${view === "grid" ? "bg-primary text-on-primary" : "text-text-2"}`}>
                <LayoutGrid className="size-[15px]" />
              </button>
              <button type="button" aria-label="List" onClick={() => setView("list")} className={`flex h-7 w-8 items-center justify-center rounded-[6px] ${view === "list" ? "bg-primary text-on-primary" : "text-text-2"}`}>
                <List className="size-4" />
              </button>
            </div>
          </div>

          {error ? <p className="pt-3 text-[13px] text-conf-low">{error}</p> : null}
          {ordered.length === 0 ? <p className="pt-6 text-[13px] text-text-2">{tab === "shared" ? "Nothing has been shared with you." : "No assets match these filters."}</p> : null}

          {view === "grid" ? (
            <div className="mt-4 grid grid-cols-[repeat(2,172px)] justify-start gap-4 min-[1100px]:grid-cols-[repeat(4,172px)]">
              {columns.map((column, index) => (
                <div key={index} className="flex flex-col gap-4">
                  {column.map((item) => (
                    <AssetTile key={item.id} item={item} selected={selected?.id === item.id} onSelect={() => setSelectedId(item.id)} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {ordered.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => setSelectedId(item.id)} className={`flex w-full items-center gap-3 rounded-[10px] border bg-surface px-3 py-2 text-left ${selected?.id === item.id ? "border-text-1" : "border-border"}`}>
                    <span className="size-12 shrink-0 overflow-hidden rounded-[8px] bg-[#f1f1ee]">
                      {item.image ? <img src={item.image} alt="" className="size-full object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-1">{item.filename}</span>
                    <span className="text-[11px] text-text-3">{item.siteName} · {formatWhen(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selected ? (
        <aside className="fixed bottom-0 right-0 top-0 z-30 flex w-full max-w-[480px] flex-col bg-surface shadow-[-12px_0_14px_rgba(17,17,17,0.12)]">
          <div className="flex h-[76px] items-center justify-between border-b border-border px-6">
            <h2 className="text-[18px] font-medium text-text-1">{kindTitle(selected.kind)}</h2>
            <button type="button" aria-label="Close" onClick={() => setSelectedId("")} className={`${focusRing} flex size-9 items-center justify-center rounded-button`}>
              <X className="size-[18px]" />
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-5 pt-6">
            <div className="relative flex h-[286px] items-center justify-center overflow-hidden rounded-card bg-[#e9e5dc]">
              {selected.image ? <img src={selected.image} alt="" className="size-full object-cover" /> : <ModelMark label={pill(selected)} large />}
              {selected.image ? null : (
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-pill bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-text-2">{pill(selected)}</span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[1.2px] text-text-3">DETAILS</p>
              <dl className="mt-2 flex flex-col gap-3.5 rounded-card bg-[#f1f1ee] p-4">
                <Detail label="Name" value={selected.filename} />
                <Detail label="Type" value={kindDetail(selected.kind)} />
                <Detail label="Captured" value={selected.captured} />
                <Detail label="Size" value={selected.id === "exterior" ? "12.4 MB" : formatBytes(selected.bytes)} />
                <Detail label="Licence" value={selected.licence} />
              </dl>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[1.2px] text-text-3">USED IN</p>
              <div className="mt-2 flex flex-col gap-2">
                {selected.referenced && selected.siteSlug ? (
                  <>
                    <Usage href={`/s/${selected.siteSlug}/document`} title={selected.siteName} detail="Document · Photos" icon="box" />
                    <Usage href={`/s/${selected.siteSlug}/reconstruct`} title={selected.siteName} detail="Reconstruct · Image" icon="move" />
                  </>
                ) : (
                  <p className="text-[12px] text-text-3">This file is not linked yet.</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex h-[76px] items-center gap-2.5 border-t border-border px-6">
            <button type="button" onClick={() => selected.real && replaceRef.current?.click()} className={`${focusRing} inline-flex h-10 w-[100px] items-center justify-center rounded-button border border-border bg-surface text-[11px] font-semibold tracking-[1.1px] shadow-[0_8px_24px_rgba(17,17,17,0.04)] disabled:opacity-40`} disabled={!selected.real}>
              REPLACE
            </button>
            <input ref={replaceRef} type="file" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void send(file); event.target.value = ""; }} />
            {selected.downloadUrl ? (
              <a href={selected.downloadUrl} download={selected.filename} className={`${focusRing} inline-flex h-10 w-[112px] items-center justify-center rounded-button border border-border bg-surface text-[11px] font-semibold tracking-[1.1px] shadow-[0_8px_24px_rgba(17,17,17,0.04)]`}>
                DOWNLOAD
              </a>
            ) : (
              <span className="inline-flex h-10 w-[112px] items-center justify-center rounded-button border border-border text-[11px] font-semibold tracking-[1.1px] text-text-3">DOWNLOAD</span>
            )}
            <button
              type="button"
              className="text-[11px] font-semibold text-[#b42318]"
              onClick={() => {
                if (!selected.real) {
                  setHidden((current) => [...current, selected.id]);
                  setSelectedId("");
                  return;
                }
                void deleteAsset(selected.id).then((result) => {
                  if (!result.ok) setError(result.error);
                  else {
                    setSelectedId("");
                    router.refresh();
                  }
                });
              }}
            >
              Delete
            </button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function AssetTile({ item, selected, onSelect }: { item: Tile; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`flex w-full flex-col gap-[9px] rounded-[10px] text-left ${selected ? "border-2 border-[#111] p-0.5" : "border-2 border-transparent"}`}>
      <span className="relative block overflow-hidden rounded-[8px]" style={{ height: item.mediaHeight }}>
        {item.kind === "photo" && item.image ? <img src={item.image} alt="" className="size-full object-cover" /> : null}
        {item.kind === "model" ? <ModelMark label={pill(item)} /> : null}
        {item.kind === "document" || item.kind === "drawing" ? (
          <span className="flex size-full flex-col items-center justify-center gap-2.5 bg-[#f1f1ee] px-4">
            <FileText className="size-[34px] text-text-2" strokeWidth={1.25} />
            <span className="w-[130px] text-center text-[11px] text-text-2">{item.filename}</span>
          </span>
        ) : null}
        {item.kind === "audio" || item.kind === "video" ? (
          <span className="flex size-full items-center justify-center gap-1 bg-[#f1f1ee]">
            {WAVE.map((height, index) => (
              <span key={index} className="w-[3px] rounded-pill bg-[#6b6b6b]" style={{ height }} />
            ))}
          </span>
        ) : null}
      </span>
      <span className="block px-0.5 pb-1">
        <span className="block truncate text-[11px] font-medium text-text-1">{item.filename}</span>
        <span className="mt-[3px] block text-[11px] text-text-3">{item.siteName} · {formatWhen(item.createdAt)}</span>
      </span>
    </button>
  );
}

function ModelMark({ label, large = false }: { label: string; large?: boolean }) {
  return (
    <span className="flex size-full flex-col items-center justify-center gap-2.5 bg-[#e9e5dc] bg-[linear-gradient(to_right,rgba(17,17,17,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.06)_1px,transparent_1px)] bg-[length:33.33%_33.33%]">
      <Box className={large ? "size-[58px] text-[#8a857c]" : "size-8 text-[#8a857c]"} strokeWidth={1.25} />
      {large ? null : <span className="rounded-pill bg-white/85 px-[9px] py-[5px] text-[10px] font-semibold text-text-2">{label}</span>}
    </span>
  );
}

function FilterCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h2 className="text-[10px] font-semibold tracking-[1.2px] text-text-3">{title}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function CheckRow({
  label,
  count,
  checked,
  warn,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  warn?: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-[9px] text-[12px] text-text-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={`flex size-3.5 items-center justify-center rounded-[3px] border ${checked ? "border-primary bg-primary text-on-primary" : "border-border bg-surface"}`}>
        {checked ? <Check className="size-2.5" /> : null}
      </span>
      <span className="flex-1">{label}</span>
      {warn ? <span className="size-1.5 rounded-full bg-[#c47a2c]" /> : null}
      {count != null ? <span className="text-[11px] text-text-3">{count}</span> : null}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[11px] text-text-3">{label}</dt>
      <dd className="truncate text-[12px] font-medium text-text-1">{value}</dd>
    </div>
  );
}

function Usage({ href, title, detail, icon }: { href: string; title: string; detail: string; icon: "box" | "move" }) {
  const Icon = icon === "box" ? Box : Move3d;
  return (
    <Link href={href} className="flex h-[54px] items-center gap-2.5 rounded-[8px] bg-[#f1f1ee] px-3">
      <span className="flex size-7 items-center justify-center rounded-[6px] bg-surface">
        <Icon className="size-3.5 text-text-2" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium text-text-1">{title}</span>
        <span className="block text-[11px] text-text-3">{detail}</span>
      </span>
      <ChevronRight className="size-3.5 text-text-3" />
    </Link>
  );
}

function toKind(kind: string): LibraryKind {
  if (kind === "model" || kind === "usdz") return "model";
  if (kind === "drawing" || kind === "document" || kind === "audio" || kind === "photo") return kind;
  return "document";
}

function kindTitle(kind: LibraryKind) {
  if (kind === "model") return "3D model";
  if (kind === "photo") return "Photo";
  if (kind === "audio") return "Audio";
  if (kind === "drawing") return "Drawing";
  if (kind === "video") return "Video";
  return "Document";
}

function kindDetail(kind: LibraryKind) {
  if (kind === "model") return "3D capture";
  if (kind === "photo") return "Photograph";
  if (kind === "audio") return "Audio recording";
  if (kind === "drawing") return "Drawing";
  return "Document";
}

function pill(item: Tile) {
  const ext = item.filename.split(".").pop()?.toUpperCase() ?? "FILE";
  return `${ext} · ${formatBytes(item.bytes).replace(".0 ", " ")}`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(bytes >= 10_000_000 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function shortSite(name: string) {
  return name.replace(/ Caves$/, "").replace(/ Fort$/, "");
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
