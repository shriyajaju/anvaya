/** Left-stage visitor phone from Figma 7:230 / 7:236 — splash mockup. */
export function LoginVisitorPreview() {
  return (
    <div className="relative hidden h-full min-h-screen w-full flex-1 items-center justify-center overflow-hidden bg-[#f6f6f4] lg:flex">
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

      <div className="relative z-10 h-[464px] w-[215px] overflow-hidden rounded-[23px] border border-white/40 bg-[#171715] shadow-[0px_28px_60px_-8px_rgba(17,17,17,0.14)]">
        <div className="absolute inset-x-0 top-0 z-10 flex h-6 items-center justify-between px-3.5">
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

        <div className="absolute inset-x-0 top-[103px] flex h-[194px] items-center justify-center overflow-hidden">
          <div className="flex w-full flex-col items-center">
            <div className="relative mb-[-10px] aspect-[215/100] w-full shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/login/splash-wordmark.png"
                alt="ANVAYA"
                className="absolute inset-0 size-full max-w-none object-cover object-top"
              />
            </div>
            <div className="relative flex w-[174px] flex-col gap-1 overflow-hidden">
              <div className="flex h-3.5 w-full items-center justify-center">
                <div className="h-0.5 w-[52px] rounded-full bg-white/40" />
              </div>
              <p className="w-full text-[12px] leading-[1.08] text-white">
                The Past, Reimagined for Today
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
