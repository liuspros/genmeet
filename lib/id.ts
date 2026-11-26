// Student IDs are stored upper-case with "/" turned into "-" (Firestore ids cannot contain "/").
export const normId = (s: unknown) => String(s ?? "").trim().toUpperCase().replace(/\//g, "-");
// ID + password sign-in uses a private, never-emailed address derived from the ID.
export const idEmail = (id: string) => `id-${normId(id).replace(/[^A-Z0-9]+/g, "-")}@genmeet.invalid`;
