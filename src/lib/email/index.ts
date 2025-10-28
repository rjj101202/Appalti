import { getEmailProvider } from './provider';
import type { EmailPayload } from './provider';

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const from = payload.from || process.env.EMAIL_FROM || 'Appalti <no-reply@appalti.ai>';
  const provider = getEmailProvider();
  await provider.send({ ...payload, from });
}

