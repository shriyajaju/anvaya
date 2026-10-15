import Link from "next/link";

export default function VisitorNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page px-6 text-center text-text-1">
      <h1 className="font-visitor text-[28px] leading-[34px]">Site not found</h1>
      <p className="text-[15px] leading-6 text-text-2">This address does not match a published site.</p>
      <Link href="/" className="text-[13px] underline">Back</Link>
    </main>
  );
}
