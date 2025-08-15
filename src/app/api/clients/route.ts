import { NextRequest, NextResponse } from 'next/server';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { kvkAPI } from '@/lib/kvk-api';
import { CompanyRole } from '@/lib/db/models/Membership';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';

const createClientSchema = z.object({
	name: z.string().min(1).optional(),
	kvkNumber: z.string().regex(/^[0-9]{8}$/).optional(),
	isOwnCompany: z.boolean().optional(),
	legalForm: z.string().optional(),
	address: z.object({
		street: z.string().optional(),
		postalCode: z.string().optional(),
		city: z.string().optional(),
		country: z.string().optional()
	}).optional(),
	addresses: z.array(z.object({
		type: z.string().optional(),
		street: z.string().optional(),
		houseNumber: z.string().optional(),
		postalCode: z.string().optional(),
		city: z.string().optional(),
		country: z.string().optional()
	})).optional(),
	website: z.string().url().optional(),
	websites: z.array(z.string().url()).optional(),
	sbiCode: z.string().optional(),
	sbiDescription: z.string().optional(),
	employees: z.string().optional(),
	handelsnamen: z.array(z.string()).optional(),
	kvkData: z.any().optional(),
	enrich: z.union([z.boolean(), z.string()]).optional()
}).refine(d => !!(d.name || d.kvkNumber), { message: 'Company name or kvkNumber is required' });

// GET /api/clients - Get all client companies (paginated)
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request);
		
		if (!auth.tenantId) {
			return NextResponse.json(
				{ error: 'No active tenant' },
				{ status: 400 }
			);
		}
		
		const { searchParams } = new URL(request.url);
		const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
		const cursor = searchParams.get('cursor') || undefined;
		const includeArchived = searchParams.get('includeArchived') === 'true';
		
		const repository = await getClientCompanyRepository();
		const { items, nextCursor } = await repository.findPaginated(auth.tenantId, { limit, cursor, includeArchived });
		
		return NextResponse.json({
			success: true,
			data: items,
			nextCursor
		});
	} catch (error) {
		console.error('Error fetching clients:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch client companies' },
			{ status: 500 }
		);
	}
}

// POST /api/clients - Create new client company
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parse = createClientSchema.safeParse(body);
		if (!parse.success) {
			return NextResponse.json({ error: 'Invalid request body', details: parse.error.issues }, { status: 400 });
		}
		const data = parse.data;
		
		const auth = await requireAuth(request);
		
		if (!auth.tenantId) {
			return NextResponse.json(
				{ error: 'No active tenant' },
				{ status: 400 }
			);
		}
		// Only admins/owners can create
		await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => {
			throw new Error('Forbidden');
		});
		
		// Prevent duplicates on kvk
		if (data.kvkNumber) {
			const repository = await getClientCompanyRepository();
			const existing = await repository.findByKvkNumber(data.kvkNumber, auth.tenantId);
			if (existing) {
				return NextResponse.json(
					{ error: 'A company with this KVK number already exists' },
					{ status: 409 }
				);
			}
		}
		
		const repository = await getClientCompanyRepository();
		// Default enrichment: true when kvkNumber is present, unless explicitly disabled
		const shouldEnrich = !!data.kvkNumber && !(data.enrich === false || data.enrich === 'false');
		let enriched: any = {};
		if (shouldEnrich) {
			try {
				const agg = await kvkAPI.getAggregatedCompany(data.kvkNumber!);
				if (agg) {
					enriched = {
						name: data.name || agg.name || agg.statutaireNaam,
						legalForm: data.legalForm || undefined,
						address: agg.adressen?.[0] ? {
							street: `${agg.adressen[0].straat || ''} ${agg.adressen[0].huisnummer || ''}`.trim(),
							postalCode: agg.adressen[0].postcode || '',
							city: agg.adressen[0].plaats || '',
							country: 'NL'
						} : data.address,
						addresses: agg.adressen?.map(a => ({
							type: a.type,
							street: a.straat,
							houseNumber: a.huisnummer,
							postalCode: a.postcode,
							city: a.plaats,
							country: 'NL'
						})),
						websites: agg.websites,
						handelsnamen: agg.handelsnamen,
						sbiCode: agg.sbiActiviteiten?.find(s => s.hoofd)?.sbiCode || agg.sbiActiviteiten?.[0]?.sbiCode,
						sbiDescription: agg.sbiActiviteiten?.find(s => s.hoofd)?.omschrijving || agg.sbiActiviteiten?.[0]?.omschrijving,
						kvkData: agg
					};
				}
			} catch (e) {
				console.warn('KVK enrichment failed:', e);
			}
		}
		
		// Create the client company
		const clientCompany = await repository.create({
			tenantId: auth.tenantId,
			name: data.name || enriched.name,
			kvkNumber: data.kvkNumber,
			legalForm: data.legalForm || enriched.legalForm,
			isOwnCompany: data.isOwnCompany === true,
			address: data.address || enriched.address,
			addresses: data.addresses || enriched.addresses,
			website: data.website,
			websites: data.websites || enriched.websites,
			sbiCode: data.sbiCode || enriched.sbiCode,
			sbiDescription: data.sbiDescription || enriched.sbiDescription,
			employees: data.employees,
			handelsnamen: data.handelsnamen || enriched.handelsnamen,
			kvkData: data.kvkData || enriched.kvkData,
			createdBy: auth.userId
		});
		
		await writeAudit({
			action: 'client_company.create',
			actorUserId: auth.userId,
			tenantId: auth.tenantId,
			companyId: auth.companyId,
			resourceType: 'clientCompany',
			resourceId: clientCompany._id?.toString(),
			metadata: { kvkNumber: clientCompany.kvkNumber, isOwnCompany: clientCompany.isOwnCompany }
		});
		
		return NextResponse.json({
			success: true,
			data: clientCompany
		}, { status: 201 });
	} catch (error: any) {
		console.error('Error creating client:', error);
		if (error.message === 'Forbidden') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}
		return NextResponse.json(
			{ error: 'Failed to create client company' },
			{ status: 500 }
		);
	}
}