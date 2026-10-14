import { ORGANISATION_KINDS } from "@/lib/auth/account";
import { createOrganisation, signOut } from "@/server/auth";

const ROLES = ["Creator", "Reviewer", "Both"] as const;

export function OrganisationForm({ error }: { error?: string }) {
  return (
    <section className="w-full max-w-[440px] rounded-card border border-border bg-surface px-10 py-12 shadow-card">
      <p className="text-[20px] font-semibold tracking-[0.08em] text-text-1">ANVAYA</p>
      <form action={createOrganisation} className="pt-9">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">
          Step 2 of 3 · Your organisation
        </p>
        <div className="mt-3 h-0.5 w-full bg-border">
          <div className="h-0.5 w-2/3 bg-text-1" />
        </div>
        <h1 className="mt-3 text-[40px] font-light leading-[1.12] tracking-[-0.02em] text-text-1">
          Who is creating this?
        </h1>

        <label className="mt-7 flex h-[72px] flex-col gap-[7px] rounded-card border border-border bg-surface px-4 py-3 shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">
            Organisation name
          </span>
          <input
            name="name"
            required
            minLength={2}
            placeholder="Kanheri Conservation Trust"
            className="bg-transparent text-[16px] text-text-1 outline-none placeholder:text-text-3"
          />
        </label>

        <fieldset className="mt-5">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">
            Organisation type
          </legend>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {ORGANISATION_KINDS.map((kind) => (
              <label
                key={kind}
                className="flex h-[58px] items-center gap-2.5 rounded-[10px] border border-border bg-surface px-3.5 shadow-card has-[:checked]:border-[1.5px] has-[:checked]:border-text-1 has-[:checked]:bg-surface-2 has-[:checked]:shadow-none"
              >
                <input
                  type="radio"
                  name="kind"
                  value={kind}
                  defaultChecked={kind === "Museum / Trust"}
                  className="size-3.5 appearance-none rounded-full border border-text-3 checked:border-[4px] checked:border-text-1"
                />
                <span className="text-[13px] leading-tight text-text-1">{kind}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3">
            Your role
          </legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <label
                key={role}
                className="flex h-[38px] cursor-pointer items-center rounded-pill border border-border bg-surface px-[18px] text-[13px] text-text-2 has-[:checked]:border-text-1 has-[:checked]:bg-text-1 has-[:checked]:text-on-primary"
              >
                <input
                  type="radio"
                  name="workingRole"
                  value={role}
                  defaultChecked={role === "Creator"}
                  className="sr-only"
                />
                {role}
              </label>
            ))}
          </div>
          <p className="mt-2.5 text-[12px] leading-[1.5] text-text-2">
            Reviewers approve reconstructions before they are published. You can change this
            later. Creating the organisation makes you its owner.
          </p>
        </fieldset>

        {error ? (
          <p className="pt-4 text-[13px] text-conf-low" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between pt-7">
          <button type="submit" formAction={signOut} formNoValidate className="text-[13px] font-medium text-text-2">
            Back
          </button>
          <button
            type="submit"
            className="flex h-12 w-[166px] items-center justify-center rounded-button border border-primary bg-primary text-[13px] font-semibold tracking-[0.1em] text-on-primary"
          >
            CONTINUE
          </button>
        </div>
      </form>
    </section>
  );
}
