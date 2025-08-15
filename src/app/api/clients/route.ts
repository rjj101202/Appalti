import { NextRequest, NextResponse } from 'next/server';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { requireAuth } from '@/lib/auth/context';
import { kvkAPI } from '@/lib/kvk-api';

// GET /api/clients - Get all client companies
export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth(request);
		
		if (!auth.tenantId) {
			return NextResponse.json(
				{ error: 'No active tenant' },
				{ status: 400 }
			);
		}
		
		const repository = await getClientCompanyRepository();
		const clients = await repository.findAll(auth.tenantId);
		
		return NextResponse.json({
			success: true,
			data: clients
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
		const auth = await requireAuth(request);
		
		if (!auth.tenantId) {
			return NextResponse.json(
				{ error: 'No active tenant' },
				{ status: 400 }
			);
		}
		
		// Validate required fields
		if (!body.name && !body.kvkNumber) {
			return NextResponse.json(
				{ error: 'Company name or kvkNumber is required' },
				{ status: 400 }
			);
		}
		
		const repository = await getClientCompanyRepository();
		
		// Prevent duplicates on kvk
		if (body.kvkNumber) {
			const existing = await repository.findByKvkNumber(body.kvkNumber, auth.tenantId);
			if (existing) {
				return NextResponse.json(
					{ error: 'A company with this KVK number already exists' },
					{ status: 409 }
				);
			}
		}
		
		// Optional enrichment from KVK if kvkNumber provided
		let enriched: any = {};
		if (body.kvkNumber && (body.enrich === true || body.enrich === 'true')) {
			try {
				const agg = await kvkAPI.getAggregatedCompany(body.kvkNumber);
				if (agg) {
					enriched = {
						name: body.name || agg.name || agg.statutaireNaam,
						legalForm: body.legalForm || undefined, // v1 basisprofielen bevat geen directe rechtsvorm string; later uitbreiden
						address: agg.adressen?.[0] ? {
							street: `${agg.adressen[0].straat || ''} ${agg.adressen[0].huisnummer || ''}`.trim(),
							postalCode: agg.adressen[0].postcode || '',
							city: agg.adressen[0].plaats || '',
							country: 'NL'
						} : body.address,
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
			name: body.name || enriched.name,
			kvkNumber: body.kvkNumber,
			legalForm: body.legalForm || enriched.legalForm,
			address: body.address || enriched.address,
			addresses: body.addresses || enriched.addresses,
			website: body.website,
			websites: body.websites || enriched.websites,
			sbiCode: body.sbiCode || enriched.sbiCode,
			sbiDescription: body.sbiDescription || enriched.sbiDescription,
			employees: body.employees,
			handelsnamen: body.handelsnamen || enriched.handelsnamen,
			kvkData: body.kvkData || enriched.kvkData,
			createdBy: auth.userId
		});
		
		return NextResponse.json({
			success: true,
			data: clientCompany
		}, { status: 201 });
	} catch (error) {
		console.error('Error creating client:', error);
		return NextResponse.json(
			{ error: 'Failed to create client company' },
			{ status: 500 }
		);
	}
}