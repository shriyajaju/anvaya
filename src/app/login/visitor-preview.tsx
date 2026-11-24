/** Left-stage visitor phone from Figma 7:230 / 7:236 — splash mockup. */
export function LoginVisitorPreview() {
  return (
    <div className="relative hidden h-full min-h-screen w-full flex-1 items-center justify-center overflow-hidden bg-[#f6f6f4] lg:flex">
      {/* Soft glow blobs — Figma 7:232–7:235 (absolute so they never clip the form) */}
      <div className="pointer-events-none absolute left-[-138px] top-[-118px] size-[440px]">
        <div className="absolute inset-[-18%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/login/violet.svg" alt="" width={656} height={656} className="block max-w-none" />
        </div>
      </div>
      <div className="pointer-events-none absolute right-[-92px] top-[248px] size-[382px]">
        <div className="absolute inset-[-21%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/login/peach.svg" alt="" width={656} height={656} className="block max-w-none" />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-[-188px] left-[92px] size-[474px]">
        <div className="absolute inset-[-17%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/login/cobalt.svg" alt="" width={656} height={656} className="block max-w-none" />
        </div>
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[596px] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-[-5%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login/soft-circle.svg"
            alt=""
            width={656}
            height={656}
            className="block max-w-none"
          />
        </div>
      </div>

      {/* Phone — Figma 7:236 splash */}
      <div className="relative z-10 flex h-[464px] w-[215px] flex-col overflow-hidden rounded-[23px] border border-white/40 bg-[#171715] shadow-[0px_28px_60px_-8px_rgba(17,17,17,0.14)]">
        <div className="relative z-10 flex h-6 shrink-0 items-center justify-between px-3.5">
          <p className="text-[6.5px] font-semibold text-[#f3f0e9]">9:41</p>
          <div className="flex items-center gap-[3px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/login/signal.svg" alt="" width={8} height={8} className="max-w-none" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/login/wifi.svg" alt="" width={8} height={8} className="max-w-none" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/login/battery.svg" alt="" width={12} height={8} className="max-w-none" />
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4">
          {/* Wordmark PNG is white on black — lighten blends black into the phone bg */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login/splash.png"
            alt="ANVAYA"
            width={168}
            height={56}
            className="h-auto w-[168px] max-w-none object-contain mix-blend-lighten"
          />
          <div className="mt-3 h-px w-10 bg-white/35" aria-hidden />
          <p className="mt-3 text-center text-[9px] leading-[1.3] tracking-[0.01em] text-[#f3f0e9]/80">
            The Past, Reimagined for Today
          </p>
        </div>

        <div className="flex h-3.5 shrink-0 items-center justify-center">
          <div className="h-0.5 w-[52px] rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  );
}
