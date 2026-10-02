'use client';

import { deleteInvoice } from '../api/invoices';

export function useBillingActions(token: string) {
  async function removeInvoice(id: number) {
    if (!window.confirm('Void/delete this invoice?')) return;
    await deleteInvoice(token, id);
    window.location.reload();
  }

  return { removeInvoice };
}
