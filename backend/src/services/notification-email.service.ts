export interface NotificationEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailDeliveryError extends Error {
  readonly code: string;
  readonly providerStatus?: number;

  constructor(code: string, message: string, providerStatus?: number) {
    super(message);
    this.name = "EmailDeliveryError";
    this.code = code;
    this.providerStatus = providerStatus;
  }
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character); }
export function notificationEmailTemplate(input: { title: string; body: string; deepLink?: string | null }): string {
  const link = input.deepLink ? `<p><a href="${escapeHtml(input.deepLink)}">Lihat maklumat</a></p>` : "";
  return `<!doctype html><html><body><main style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h1>${escapeHtml(input.title)}</h1><p>${escapeHtml(input.body).replace(/\n/g, "<br>")}</p>${link}<hr><small>LITERASI DIGITAL</small></main></body></html>`;
}

function isDevelopmentEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "development";
}

export function buildSetupPasswordUrl(
  setupToken: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const baseUrl = env.FRONTEND_URL ?? env.APP_URL ?? (isDevelopmentEnvironment(env) ? "http://localhost:5173" : undefined);

  if (!baseUrl) {
    return null;
  }

  try {
    const url = new URL("/setup-password", baseUrl);
    url.searchParams.set("token", setupToken);
    return url.toString();
  } catch {
    return null;
  }
}

export function setupInvitationEmailTemplate(input: {
  fullName: string;
  accountLabel: string;
  setupUrl: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const expiry = input.expiresAt.toLocaleString("ms-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  });
  const safeName = escapeHtml(input.fullName);
  const safeAccountLabel = escapeHtml(input.accountLabel);
  const safeUrl = escapeHtml(input.setupUrl);
  const subject = "Lengkapkan Penyediaan Akaun Digital MoLIB";
  const text = [
    `Salam ${input.fullName},`,
    "",
    `Akaun ${input.accountLabel} Digital MoLIB telah dicipta untuk anda dan kini berada dalam status menunggu.`,
    "Sila cipta kata laluan anda untuk melengkapkan penyediaan akaun.",
    `Pautan ini akan tamat tempoh pada ${expiry}.`,
    "",
    `Lengkapkan Akaun: ${input.setupUrl}`,
    "",
    "Jika anda tidak menjangkakan e-mel ini, abaikan mesej ini.",
  ].join("\n");
  const html = `<!doctype html><html><body><main style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#1e293b"><h1>Lengkapkan Penyediaan Akaun Digital MoLIB</h1><p>Salam ${safeName},</p><p>Akaun ${safeAccountLabel} Digital MoLIB telah dicipta untuk anda dan kini berada dalam status menunggu.</p><p>Sila cipta kata laluan anda untuk melengkapkan penyediaan akaun.</p><p>Pautan ini akan tamat tempoh pada <strong>${escapeHtml(expiry)}</strong>.</p><p><a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Lengkapkan Akaun</a></p><p>Jika butang tidak berfungsi, buka pautan ini:</p><p><a href="${safeUrl}">${safeUrl}</a></p><p>Jika anda tidak menjangkakan e-mel ini, abaikan mesej ini.</p><hr><small>Digital MoLIB</small></main></body></html>`;

  return { subject, html, text };
}

function getSenderEmail(): string | undefined {
  return process.env.EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? process.env.FROM_EMAIL;
}

export async function sendResendEmail(email: NotificationEmail): Promise<{ provider: string; providerId: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getSenderEmail();
  if (!apiKey || !from) throw new EmailDeliveryError("RESEND_NOT_CONFIGURED", "Resend email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html, ...(email.text ? { text: email.text } : {}) }),
  });
  if (!response.ok) throw new EmailDeliveryError("RESEND_DELIVERY_FAILED", "Resend email delivery failed.", response.status);
  const data: unknown = await response.json();
  const providerId = typeof data === "object" && data !== null && "id" in data && typeof data.id === "string" ? data.id : null;
  return { provider: "RESEND", providerId };
}
