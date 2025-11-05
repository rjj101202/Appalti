export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    const safe = { ...payload, html: payload.html.slice(0, 4000) };
    // eslint-disable-next-line no-console
    console.log('[Email:console] send', safe);
  }
}

class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  async send(payload: EmailPayload): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: payload.from || process.env.EMAIL_FROM || 'Appalti <no-reply@appalti.ai>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Resend send failed: ${res.status} ${t}`);
    }
  }
}

let providerSingleton: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (providerSingleton) return providerSingleton;
  const resendKey = process.env.RESEND_API_KEY || '';
  if (resendKey) {
    providerSingleton = new ResendEmailProvider(resendKey);
    return providerSingleton;
  }
  providerSingleton = new ConsoleEmailProvider();
  return providerSingleton;
}

