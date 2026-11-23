"use client";

import { useState } from "react";

export function Greeting({ name }: { name: string }) {
  const [part] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  });
  return (
    <h1 className="text-[clamp(28px,4vw,40px)] font-light leading-[1.2] text-text-1">
      Good {part}, {name}
    </h1>
  );
}
