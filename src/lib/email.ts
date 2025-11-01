import { getGraphMailAccessToken } from '@/lib/graph';

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string; // optional override
};

function getEnv(name: string, optional = false): string | undefined {
  const v = process.env[name];
  if (!v && !optional) throw new Error(`Missing env ${name}`);
  return v;
}

export async function sendEmailViaGraph(options: SendEmailOptions): Promise<boolean> {
  const token = await getGraphMailAccessToken();
  const fromAddress = options.from || getEnv('GRAPH_FROM_EMAIL') || getEnv('EMAIL_FROM');
  if (!fromAddress) throw new Error('GRAPH_FROM_EMAIL or EMAIL_FROM must be set');

  const recipients = (Array.isArray(options.to) ? options.to : [options.to]).map((addr) => ({
    emailAddress: { address: addr },
  }));

  const body: any = {
    message: {
      subject: options.subject,
      body: { contentType: 'HTML', content: options.html },
      toRecipients: recipients,
      from: { emailAddress: { address: fromAddress } },
    },
    saveToSentItems: false,
  };

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddress)}/sendMail`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 202) return true;
  const text = await res.text();
  throw new Error(`Graph sendMail failed: ${res.status} ${text}`);
}

export function buildInviteEmailHtml(inviteUrl: string, context: { companyName: string; inviteeEmail: string; }) {
  return `
  <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.5;">
    <h2 style="margin:0 0 12px 0;">Uitnodiging voor ${context.companyName}</h2>
    <p>Je bent uitgenodigd om lid te worden van <strong>${context.companyName}</strong> met e‑mail <strong>${context.inviteeEmail}</strong>.</p>
    <p>Klik op onderstaande knop om de uitnodiging te accepteren. Je moet inloggen met hetzelfde e‑mailadres.</p>
    <p style="margin:24px 0;"><a href="${inviteUrl}" style="background:#701c74;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">Uitnodiging accepteren</a></p>
    <p>Werkt de knop niet? Kopieer en plak deze link in je browser:<br/>
    <a href="${inviteUrl}">${inviteUrl}</a></p>
  </div>
  `;
}

export function buildOwnerApprovalNotificationHtml(details: { companyName: string; requesterEmail: string; teamUrl: string; }) {
  return `
  <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height:1.5;">
    <h2 style="margin:0 0 12px 0;">Nieuw aanmeldverzoek voor ${details.companyName}</h2>
    <p><strong>${details.requesterEmail}</strong> heeft zich aangemeld met een domein dat hoort bij <strong>${details.companyName}</strong>.</p>
    <p>Ga naar het teamoverzicht om deze gebruiker uit te nodigen of te weigeren.</p>
    <p style="margin:24px 0;"><a href="${details.teamUrl}" style="background:#701c74;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">Open teambeheer</a></p>
  </div>
  `;
}
