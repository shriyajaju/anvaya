"use server";

import { INVITE_ROLES, slugify, type InviteRole } from "@/lib/auth/account";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { inviteMember } from "@/server/auth";
import { redirect } from "next/navigation";
import { z } from "zod";

const siteSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(48),
  location: z.string().trim().min(2).max(120),
  siteType: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  year: z.coerce.number().int().min(-3000).max(2100),
});

export async function createSite(formData: FormData) {
  const session = await getSession();
  if (!session?.org) redirect("/login");
  if (session.role !== "owner" && session.role !== "admin" && session.role !== "creator") {
    redirect("/sites");
  }

  const parsed = siteSchema.safeParse({
    name: formData.get("name"),
    slug: slugify(String(formData.get("slug") || formData.get("name") || "")),
    location: formData.get("location"),
    siteType: formData.get("siteType"),
    description: String(formData.get("description") ?? ""),
    year: formData.get("year"),
  });
  if (!parsed.success) redirect("/sites/new?error=Check%20the%20site%20details");

  const supabase = await createClient();
  let slug = parsed.data.slug;
  let created = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? slug : `${parsed.data.slug}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("sites")
      .insert({
        org_id: session.org.orgId,
        slug: candidate,
        name: parsed.data.name,
        location: parsed.data.location,
        site_type: parsed.data.siteType,
        description: parsed.data.description || null,
        reconstruction_year: parsed.data.year,
        require_review: false,
        created_by: session.userId,
      })
      .select("slug")
      .single();
    if (!error && data) {
      slug = data.slug as string;
      created = true;
      break;
    }
    if (error?.code !== "23505") throw new Error(error?.message ?? "Could not create the site");
  }
  if (!created) redirect("/sites/new?error=That%20address%20is%20already%20used");

  const site = await supabase.from("sites").select("id").eq("slug", slug).eq("org_id", session.org.orgId).single();
  if (site.data) {
    await supabase.from("elements").insert({
      site_id: site.data.id,
      name: parsed.data.name,
      kind: "group",
      confidence: "low",
      visible: true,
    });
    await supabase.from("locations").insert({
      site_id: site.data.id,
      name: "Entrance",
      qr_code: `${slug}-L1`,
    });
  }

  if (session.role === "owner" || session.role === "admin") {
    const invites = z
      .array(z.object({ email: z.string().email(), role: z.enum(INVITE_ROLES) }))
      .safeParse(JSON.parse(String(formData.get("invites") || "[]")));
    if (invites.success) {
      for (const invite of invites.data) {
        const payload = new FormData();
        payload.set("email", invite.email);
        payload.set("role", invite.role satisfies InviteRole);
        await inviteMember(payload);
      }
    }
  }

  redirect(`/s/${slug}/overview`);
}
