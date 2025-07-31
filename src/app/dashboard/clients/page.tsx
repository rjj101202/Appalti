'use client';

import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function ClientsPage() {
  // TODO: Fetch from database
  const clients: any[] = [];

  return (
    <DashboardLayout>
      <div className="page-container">
        <div className="header-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Client Companies</h1>
              <p>Beheer uw klantbedrijven en hun IKP profielen</p>
            </div>
            <Link href="/dashboard/clients/new" className="btn btn-primary">
              + Nieuwe Client
            </Link>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="empty-state">
            <h3>Nog geen client companies</h3>
            <p>Voeg uw eerste client company toe om te beginnen met tender matching</p>
            <Link href="/dashboard/clients/new" className="btn btn-primary">
              Eerste Client Toevoegen
            </Link>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Bedrijfsnaam</th>
                  <th>KVK Nummer</th>
                  <th>IKP Status</th>
                  <th>Actieve Tenders</th>
                  <th>Toegevoegd</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <Link href={`/dashboard/clients/${client.id}`} style={{ color: '#9333ea', textDecoration: 'none' }}>
                        {client.name}
                      </Link>
                    </td>
                    <td>{client.kvkNumber}</td>
                    <td>
                      <span className={`badge ${client.ikpComplete ? 'badge-success' : 'badge-warning'}`}>
                        {client.ikpComplete ? 'Compleet' : 'Onvolledig'}
                      </span>
                    </td>
                    <td>{client.activeTenders || 0}</td>
                    <td>{new Date(client.createdAt).toLocaleDateString('nl-NL')}</td>
                    <td>
                      <Link href={`/dashboard/clients/${client.id}/edit`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }}>
                        Bewerken
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}