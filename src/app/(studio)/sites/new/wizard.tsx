"use client";

import { Field } from "@/components/ui/field";
import { ModalBody } from "@/components/ui/modal";
import { slugify } from "@/lib/auth/account";
import { createSite } from "@/server/sites";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = ["Rock-cut caves", "Fort", "Stupa", "Temple", "Other"];
const ROLES = ["admin", "creator", "reviewer", "viewer"] as const;

export function NewSiteWizard({ canInvite, error }: { canInvite: boolean; error?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [location, setLocation] = useState("");
  const [siteType, setSiteType] = useState(TYPES[0]);
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("200");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("creator");
  const [invites, setInvites] = useState<{ email: string; role: (typeof ROLES)[number] }[]>([]);

  const titles = ["Name the site", "Describe the site", "Invite members"];
  const ready =
    step === 0
      ? name.trim().length > 1 && slug.trim().length > 1 && location.trim().length > 1
      : step === 1
        ? year.trim().length > 0 && siteType.length > 0
        : true;

  function continueStep() {
    if (!ready) return;
    if (step < 2) setStep(step + 1);
  }

  return (
    <form id="new-site" action={createSite} className="mx-auto w-full max-w-[640px] rounded-modal bg-surface p-8 shadow-float">
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="siteType" value={siteType} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="invites" value={JSON.stringify(invites)} />
      <ModalBody
        step={`Step ${step + 1} of 3`}
        title={titles[step]}
        progress
        percent={((step + 1) / 3) * 100}
        back={step > 0}
        disabled={!ready}
        continueLabel={step === 2 ? "Create site" : "Continue"}
        onCancel={() => router.push("/sites")}
        onBack={() => setStep((value) => Math.max(0, value - 1))}
        onContinue={() => {
          if (step < 2) {
            continueStep();
            return;
          }
          document.querySelector<HTMLFormElement>("#new-site")?.requestSubmit();
        }}
      >
        {error ? <p className="mb-4 text-[13px] leading-5 text-conf-low">{error}</p> : null}
        {step === 0 ? (
          <div className="flex flex-col gap-4">
            <Field
              label="Name"
              value={name}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                if (!slugEdited) setSlug(slugify(next));
              }}
            />
            <Field
              label="Address"
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugify(event.target.value));
              }}
            />
            <Field label="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </div>
        ) : null}
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <Field
              kind="Select"
              label="Type"
              value={siteType}
              options={TYPES.map((type) => ({ value: type, label: type }))}
              onChange={(event) => setSiteType(event.target.value)}
            />
            <Field
              kind="Textarea"
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Field label="Reconstruction year" value={year} onChange={(event) => setYear(event.target.value)} />
          </div>
        ) : null}
        {step === 2 ? (
          <div className="flex flex-col gap-4 text-text-1">
            {canInvite ? (
              <>
                <div className="grid grid-cols-[1fr_160px] gap-3">
                  <Field label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  <Field
                    kind="Select"
                    label="Role"
                    value={role}
                    options={ROLES.map((item) => ({ value: item, label: item }))}
                    onChange={(event) => setRole(event.target.value as (typeof ROLES)[number])}
                  />
                </div>
                <button
                  type="button"
                  className="self-start text-[13px] font-medium text-accent"
                  onClick={() => {
                    if (!email.includes("@")) return;
                    setInvites((current) => [...current, { email, role }]);
                    setEmail("");
                  }}
                >
                  Add member
                </button>
                <ul className="text-[13px] leading-5 text-text-2">
                  {invites.map((invite) => (
                    <li key={invite.email}>
                      {invite.email} · {invite.role}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>An owner or admin can invite people later from Settings.</p>
            )}
          </div>
        ) : null}
      </ModalBody>
    </form>
  );
}
