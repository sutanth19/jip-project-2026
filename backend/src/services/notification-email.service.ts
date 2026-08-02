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
