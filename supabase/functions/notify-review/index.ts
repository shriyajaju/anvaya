type Payload = { event: string; to: string[]; siteName: string; slug: string };

const subject: Record<string, string> = {
  submit: "A site is ready for review",
  request_changes: "Changes were requested",
  approve: "A review was approved",
};

Deno.serve(async (request) => {
  const payload = (await request.json()) as Payload;
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("REVIEW_FROM_EMAIL") ?? "reviews@anvaya.site";
  if (!key) {
    console.log(`[review-email] ${payload.event} ${payload.siteName} → ${payload.to.join(", ")}`);
    return Response.json({ ok: true, provider: "log" });
  }
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: subject[payload.event] ?? "ANVAYA review",
      text: `${payload.siteName} (${payload.slug}): ${subject[payload.event] ?? payload.event}.`,
    }),
  });
  if (!sent.ok) {
    console.log(`[review-email] resend failed ${sent.status}; logged ${payload.event}`);
    return Response.json({ ok: false, provider: "resend" }, { status: 502 });
  }
  return Response.json({ ok: true, provider: "resend" });
});
