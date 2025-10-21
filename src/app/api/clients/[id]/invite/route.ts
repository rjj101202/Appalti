import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';
import { getMembershipRepository } from '@/lib/db/repositories/membershipRepository';
import { writeAudit } from '@/lib/audit';
import { sendEmailViaGraph, buildInviteEmailHtml } from '@/lib/email';

const bodySchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(CompanyRole).default(CompanyRole.MEMBER)
});

// POST /api/clients/[id]/invite - stuur invite voor client-tenant
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => { throw new Error('Forbidden'); });

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });

    const clientRepo = await getClientCompanyRepository();
    const companyRepo = await getCompanyRepository();
    const membershipRepo = await getMembershipRepository();

    const client = await clientRepo.findById(params.id, auth.tenantId);
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    // Provisioneren indien nodig
    let linkedCompanyId = client.linkedCompanyId?.toString();
    if (!linkedCompanyId) {
      const company = await companyRepo.create({ name: client.name, kvkNumber: client.kvkNumber, createdBy: auth.userId });
      linkedCompanyId = company._id!.toString();
      await clientRepo.update(params.id, auth.tenantId, { linkedCompanyId: company._id as any }, auth.userId);
    }

    const company = await companyRepo.findById(linkedCompanyId!);
    if (!company) return NextResponse.json({ error: 'Linked company not found' }, { status: 500 });

    // Domain whitelist (optioneel)
    const allowedDomains = company.settings?.allowedEmailDomains as string[] | undefined;
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = parsed.data.email.toLowerCase().split('@')[1];
      const allowed = allowedDomains.some(d => d.toLowerCase() === domain);
      if (!allowed) return NextResponse.json({ error: 'Email domain not allowed for this company' }, { status: 403 });
    }

    const invite = await membershipRepo.createInvite(
      parsed.data.email.toLowerCase(),
      linkedCompanyId!,
      company.tenantId,
      parsed.data.role,
      auth.userId
    );

    await writeAudit({
      action: 'client.membership.invite',
      actorUserId: auth.userId,
      tenantId: company.tenantId,
      companyId: linkedCompanyId!,
      resourceType: 'membershipInvite',
      resourceId: invite._id?.toString(),
      metadata: { email: parsed.data.email, role: parsed.data.role }
    });

    // Send invitation email to client user
    try {
      const inviteUrl = new URL('/invite', request.nextUrl.origin);
      inviteUrl.searchParams.set('token', invite.inviteToken);
      const html = buildInviteEmailHtml(inviteUrl.toString(), { companyName: company.name, inviteeEmail: parsed.data.email.toLowerCase() });
      await sendEmailViaGraph({ to: parsed.data.email.toLowerCase(), subject: `Uitnodiging voor ${company.name}`, html });
    } catch (e) {
      console.warn('Client invite email failed:', e);
    }

    return NextResponse.json({ success: true, inviteToken: invite.inviteToken });
  } catch (e: any) {
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Client invite error:', e);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

