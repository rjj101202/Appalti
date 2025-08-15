import { getDatabase } from '@/lib/mongodb';

export interface AuditEvent {
	timestamp: Date;
	actorUserId?: string;
	tenantId?: string;
	companyId?: string;
	action: string;
	resourceType?: string;
	resourceId?: string;
	metadata?: any;
}

export async function writeAudit(event: AuditEvent): Promise<void> {
	try {
		const db = await getDatabase();
		const col = db.collection<AuditEvent>('auditLogs');
		await col.insertOne({ ...event, timestamp: new Date() });
	} catch (e) {
		console.error('Failed to write audit log:', e);
	}
}