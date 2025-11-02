import { NextRequest, NextResponse } from 'next/server';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { getCompanyRepository } from '@/lib/db/repositories/companyRepository';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { kvkAPI } from '@/lib/kvk-api';
import { CompanyRole } from '@/lib/db/models/Membership';
import { z } from 'zod';
import { writeAudit } from '@/lib/audit';
import { handleApiError, validateRequiredFields } from '@/lib/error-handler';
import { 
	UnauthorizedError, 
	ForbiddenError, 
	DuplicateError,
	KVKValidationError,
	ValidationError 
} from '@/lib/errors';
import type { 
	ClientCompanyListResponse, 
	ClientCompanyResponse,
	PaginatedResponse,
	ClientCompanyData 
} from '@/types/api';

const createClientSchema = z.object({
	name: z.string().min(1).optional().or(z.literal('')),
	kvkNumber: z.string().regex(/^[0-9]{8}$/).optional().or(z.literal('')),
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
	website: z.string().url().optional().or(z.literal('')),
	websites: z.array(z.string().url()).optional(),
	sbiCode: z.string().optional(),
	sbiDescription: z.string().optional(),
	employees: z.string().optional(),
	handelsnamen: z.array(z.string()).optional(),
	kvkData: z.any().optional(),
	enrich: z.union([z.boolean(), z.string()]).optional()
}).refine(d => {
	// At least name or valid kvkNumber must be provided
	const hasName = d.name && d.name.trim().length > 0;
	const hasValidKvk = d.kvkNumber && /^[0-9]{8}$/.test(d.kvkNumber);
	return hasName || hasValidKvk;
}, { message: 'Company name or valid 8-digit KVK number is required' });

// GET /api/clients - Get all client companies (paginated)
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<ClientCompanyData>>> {
	try {
		const auth = await requireAuth(request);
		
		if (!auth.tenantId) {
			throw new UnauthorizedError('No active tenant');
		}
		
		const { searchParams } = new URL(request.url);
		const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
		const cursor = searchParams.get('cursor') || undefined;
		const includeArchived = searchParams.get('includeArchived') === 'true';
		
		const repository = await getClientCompanyRepository();
		let { items, nextCursor } = await repository.findPaginated(auth.tenantId, { limit, cursor, includeArchived });

		// Voor client-gebruikers (niet-Appalti) willen we altijd één eigen bedrijf tonen.
		// Als er nog geen ClientCompany bestaat binnen deze tenant, maak er dan automatisch één aan
		// op basis van de Company gegevens voor de actieve tenant.
		if (!auth.isAppaltiUser && items.length === 0) {
			try {
				const companyRepo = await getCompanyRepository();
				const company = await companyRepo.findByTenantId(auth.tenantId);
				if (company) {
					const created = await repository.create({
						tenantId: auth.tenantId,
						name: company.name,
						kvkNumber: company.kvkNumber,
						isOwnCompany: true,
						createdBy: auth.userId
					});
					items = [created];
					nextCursor = undefined;
				}
			} catch (e) {
				console.warn('Auto-create own ClientCompany failed:', e);
			}
		}
		
		return NextResponse.json({
			success: true,
			data: items as ClientCompanyData[],
			pagination: {
				hasMore: !!nextCursor,
				nextCursor: nextCursor || null
			}
		});
	} catch (error) {
		return handleApiError(error, {
			endpoint: 'GET /api/clients',
			userId: (await requireAuth(request).catch(() => ({ userId: 'unknown' }))).userId,
			tenantId: (await requireAuth(request).catch(() => ({ tenantId: 'unknown' }))).tenantId
		}) as any;
	}
}

// POST /api/clients - Create new client company
export async function POST(request: NextRequest): Promise<NextResponse<ClientCompanyResponse>> {
	try {
		const body = await request.json();
		const parse = createClientSchema.safeParse(body);
		if (!parse.success) {
			throw new ValidationError('Invalid request body', undefined, { issues: parse.error.issues });
		}
		const data = parse.data;
		
		const auth = await requireAuth(request);
		
		if (!auth.tenantId) {
			throw new UnauthorizedError('No active tenant');
		}
		
		// Only admins/owners can create
		try {
			await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN);
		} catch {
			throw new ForbiddenError('Requires admin role or higher');
		}
		
		// Validate KVK number if provided
		if (data.kvkNumber && !/^[0-9]{8}$/.test(data.kvkNumber)) {
			throw new KVKValidationError('Invalid KVK number format. Must be 8 digits', data.kvkNumber);
		}
		
		// Prevent duplicates on kvk
		if (data.kvkNumber) {
			const repository = await getClientCompanyRepository();
			const existing = await repository.findByKvkNumber(data.kvkNumber, auth.tenantId);
			if (existing) {
				throw new DuplicateError('kvkNumber', data.kvkNumber);
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
				// KVK enrichment failure is not critical - continue without it
			}
		}
		
		// Validate: either name or enriched name must be present
		if (!data.name && !enriched.name) {
			throw new ValidationError('Company name is required', 'name');
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
			data: clientCompany as ClientCompanyData
		}, { status: 201 });
	} catch (error) {
		return handleApiError(error, {
			endpoint: 'POST /api/clients',
			userId: (await requireAuth(request).catch(() => ({ userId: 'unknown' }))).userId,
			tenantId: (await requireAuth(request).catch(() => ({ tenantId: 'unknown' }))).tenantId
		}) as any;
	}
}