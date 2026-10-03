'use client';
import { useState } from 'react';
import { deleteInvoice } from '../../../lib/api/invoices';
export function BillingView({ data, token, openEdit, statusClass }: any) {
  const [status, setStatus] = useState('All');
  const rows = data.filter((i: any) => status === 'All' || i.status === status);
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Invoice register</p>
          <h2>Billing history</h2>
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All</option>
          <option>Due</option>
          <option>Paid</option>
          <option>Void</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Patient</th>
              <th>Package / service</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Issued</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((i: any) => (
              <tr key={i.id}>
                <td className="mono">INV-{String(i.id).padStart(4, '0')}</td>
                <td>{i.patient_name}</td>
                <td>{i.package_name || i.service}</td>
                <td className="mono">${i.total.toFixed(2)}</td>
                <td>
                  <span className={`pill ${statusClass(i.status)}`}>{i.status}</span>
                </td>
                <td>{new Date(i.issued_at).toLocaleDateString()}</td>
                <td className="row-actions">
                  <button
                    className="assign-button"
                    onClick={() => openEdit({ kind: 'invoice', record: i })}
                  >
                    Edit
                  </button>
                  <button
                    className="assign-button"
                    onClick={async () => {
                      if (confirm('Void/delete this invoice?')) {
                        await deleteInvoice(token, i.id);
                        location.reload();
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
