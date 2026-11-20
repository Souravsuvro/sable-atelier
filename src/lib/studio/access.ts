import { createServerFn } from "@tanstack/react-start";

const PRODUCT_ID = "prod_Dl18Nyx1ZDu2N";

export const confirmMembership = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid request");
    const email = (input as { email?: unknown }).email;
    if (typeof email !== "string") throw new Error("Use the email from checkout.");
    const clean = email.trim().toLowerCase();
    if (!clean.includes("@") || clean.length > 120) throw new Error("Use the email from checkout.");
    return { email: clean };
  })
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const key = process.env.WHOP_API_KEY?.trim();
    if (!key) return { ok: false, reason: "Membership check is not configured on the server." };
    const url = new URL("https://api.whop.com/api/v2/memberships");
    url.searchParams.set("product_id", PRODUCT_ID);
    url.searchParams.set("email", data.email);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { ok: false, reason: "Whop did not confirm that email." };
    const payload = (await res.json()) as { data?: { valid?: boolean; status?: string }[] };
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const live = rows.some((row) => {
      const status = (row.status ?? "").toLowerCase();
      return row.valid === true || status === "active" || status === "trialing" || status === "completed";
    });
    if (!live) return { ok: false, reason: "No active membership for that email." };
    return { ok: true };
  });
