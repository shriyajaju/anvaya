export type PromptElement = {
  name: string;
  description: string;
  evidenceNotes: string[];
};

export type PromptInput = {
  periodAndStyle: string;
  elements: PromptElement[];
};

/** Prompt is built from DB fields only — never free text from the creator. */
export function buildReconstructionPrompt(input: PromptInput): string {
  const elements = input.elements
    .map((element) => {
      const notes = element.evidenceNotes.filter(Boolean).join("; ");
      const desc = element.description.trim() || "no description recorded";
      return `${element.name} (${desc}${notes ? `; evidence: ${notes}` : ""})`;
    })
    .join("; ");

  return [
    "Keep the existing stone structure in this photograph exactly as it is.",
    "Do not change the camera angle, lighting or background.",
    `Add only the missing parts as a clean white architectural wireframe line drawing, semi-transparent, aligned to the same perspective: ${elements}.`,
    `Period and style: ${input.periodAndStyle}.`,
    "No colour, no texture, no people, no new solid stonework, no text or labels in the image.",
  ].join(" ");
}
