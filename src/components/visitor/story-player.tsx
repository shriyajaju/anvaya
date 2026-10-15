"use client";

import { VButton } from "@/components/visitor/parts";
import Link from "next/link";

export function StoryPlayer({
  title,
  body,
  audioUrl,
  previous,
  next,
  location,
}: {
  title: string;
  body: string;
  audioUrl: string | null;
  previous: string | null;
  next: string | null;
  location: string | null;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-visitor text-[28px] leading-[34px]">{title}</h1>
      {location ? <p className="text-[13px] uppercase tracking-[0.08em] text-text-3">{location}</p> : null}
      {audioUrl ? <audio controls src={audioUrl} className="w-full" /> : null}
      <p className="text-[15px] leading-6">{body}</p>
      <div className="grid grid-cols-2 gap-2">
        {previous ? <VButton href={previous}>Previous</VButton> : <span />}
        {next ? <VButton href={next}>Next</VButton> : <span />}
      </div>
      <Link href="../" className="text-center text-[13px] text-text-3">
        All stories
      </Link>
    </section>
  );
}
