import { describe, it, expect } from 'vitest';
import {
  getPrimaryEmail,
  groupClientsByEmail,
  groupInvoicesByEmail,
  hasSharedEmails,
  getClientsWithSharedEmails,
  GeneratedInvoiceInfo
} from '../src/lib/email-grouper.js';
import type { Client } from '../src/types.js';
import type { ClientInfo } from '../src/lib/config-manager.js';

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    name: 'Test Client',
    address: { street: '123 Main St', city: 'Berlin' },
    language: 'en',
    invoicePrefix: 'TC',
    nextInvoiceNumber: 1,
    service: { description: 'Consulting', billingType: 'hourly', rate: 100, currency: 'EUR' },
    ...overrides,
  };
}

function makeClientInfo(name: string, client: Client): ClientInfo {
  return {
    name,
    directory: `/fake/clients/${name}`,
    configPath: `/fake/clients/${name}/${name}.json`,
    client,
  };
}

describe('getPrimaryEmail', () => {
  it('should return null when no email config', () => {
    expect(getPrimaryEmail(makeClient())).toBeNull();
  });

  it('should return null for empty to array', () => {
    expect(getPrimaryEmail(makeClient({ email: { to: [] } }))).toBeNull();
  });

  it('should extract plain email address', () => {
    const client = makeClient({ email: { to: ['test@example.com'] } });
    expect(getPrimaryEmail(client)).toBe('test@example.com');
  });

  it('should extract email from "Name <email>" format', () => {
    const client = makeClient({ email: { to: ['John Doe <john@example.com>'] } });
    expect(getPrimaryEmail(client)).toBe('john@example.com');
  });

  it('should normalize to lowercase', () => {
    const client = makeClient({ email: { to: ['Test@EXAMPLE.COM'] } });
    expect(getPrimaryEmail(client)).toBe('test@example.com');
  });

  it('should trim whitespace', () => {
    const client = makeClient({ email: { to: ['  test@example.com  '] } });
    expect(getPrimaryEmail(client)).toBe('test@example.com');
  });

  it('should use first recipient only', () => {
    const client = makeClient({ email: { to: ['first@example.com', 'second@example.com'] } });
    expect(getPrimaryEmail(client)).toBe('first@example.com');
  });
});

describe('groupClientsByEmail', () => {
  it('should return empty map for no clients', () => {
    expect(groupClientsByEmail([])).toEqual(new Map());
  });

  it('should skip clients without email', () => {
    const clients = [makeClientInfo('a', makeClient())];
    expect(groupClientsByEmail(clients).size).toBe(0);
  });

  it('should group clients with same email', () => {
    const clients = [
      makeClientInfo('a', makeClient({ email: { to: ['shared@example.com'] } })),
      makeClientInfo('b', makeClient({ email: { to: ['shared@example.com'] } })),
    ];
    const groups = groupClientsByEmail(clients);
    expect(groups.size).toBe(1);
    expect(groups.get('shared@example.com')).toHaveLength(2);
  });

  it('should separate clients with different emails', () => {
    const clients = [
      makeClientInfo('a', makeClient({ email: { to: ['a@example.com'] } })),
      makeClientInfo('b', makeClient({ email: { to: ['b@example.com'] } })),
    ];
    const groups = groupClientsByEmail(clients);
    expect(groups.size).toBe(2);
  });

  it('should normalize email for grouping', () => {
    const clients = [
      makeClientInfo('a', makeClient({ email: { to: ['Test@Example.COM'] } })),
      makeClientInfo('b', makeClient({ email: { to: ['test@example.com'] } })),
    ];
    const groups = groupClientsByEmail(clients);
    expect(groups.size).toBe(1);
    expect(groups.get('test@example.com')).toHaveLength(2);
  });
});

describe('groupInvoicesByEmail', () => {
  it('should return empty map for no invoices', () => {
    expect(groupInvoicesByEmail([], [])).toEqual(new Map());
  });

  it('should group invoices by client email', () => {
    const clientA = makeClient({ email: { to: ['a@example.com'] } });
    const clients = [makeClientInfo('clientA', clientA)];
    const invoices: GeneratedInvoiceInfo[] = [
      { clientName: 'clientA', clientDisplayName: 'Client A', invoiceNumber: 'A-1', monthName: 'Jan 2025', totalAmount: 100, currency: 'EUR', pdfPath: '/a.pdf' },
    ];
    const groups = groupInvoicesByEmail(invoices, clients);
    expect(groups.size).toBe(1);
    expect(groups.get('a@example.com')).toHaveLength(1);
  });

  it('should skip invoices for unknown clients', () => {
    const invoices: GeneratedInvoiceInfo[] = [
      { clientName: 'unknown', clientDisplayName: 'Unknown', invoiceNumber: 'U-1', monthName: 'Jan', totalAmount: 100, currency: 'EUR', pdfPath: '/u.pdf' },
    ];
    const groups = groupInvoicesByEmail(invoices, []);
    expect(groups.size).toBe(0);
  });

  it('should skip invoices for clients without email', () => {
    const client = makeClient(); // no email
    const clients = [makeClientInfo('noEmail', client)];
    const invoices: GeneratedInvoiceInfo[] = [
      { clientName: 'noEmail', clientDisplayName: 'No Email', invoiceNumber: 'N-1', monthName: 'Jan', totalAmount: 100, currency: 'EUR', pdfPath: '/n.pdf' },
    ];
    const groups = groupInvoicesByEmail(invoices, clients);
    expect(groups.size).toBe(0);
  });

  it('should group multiple invoices to same email', () => {
    const sharedEmail = { to: ['shared@example.com'] };
    const clients = [
      makeClientInfo('a', makeClient({ email: sharedEmail })),
      makeClientInfo('b', makeClient({ email: sharedEmail })),
    ];
    const invoices: GeneratedInvoiceInfo[] = [
      { clientName: 'a', clientDisplayName: 'A', invoiceNumber: 'A-1', monthName: 'Jan', totalAmount: 100, currency: 'EUR', pdfPath: '/a.pdf' },
      { clientName: 'b', clientDisplayName: 'B', invoiceNumber: 'B-1', monthName: 'Jan', totalAmount: 200, currency: 'EUR', pdfPath: '/b.pdf' },
    ];
    const groups = groupInvoicesByEmail(invoices, clients);
    expect(groups.get('shared@example.com')).toHaveLength(2);
  });
});

describe('hasSharedEmails', () => {
  it('should return false for empty list', () => {
    expect(hasSharedEmails([])).toBe(false);
  });

  it('should return false when no shared emails', () => {
    const clients = [
      makeClientInfo('a', makeClient({ email: { to: ['a@example.com'] } })),
      makeClientInfo('b', makeClient({ email: { to: ['b@example.com'] } })),
    ];
    expect(hasSharedEmails(clients)).toBe(false);
  });

  it('should return true when emails are shared', () => {
    const clients = [
      makeClientInfo('a', makeClient({ email: { to: ['shared@example.com'] } })),
      makeClientInfo('b', makeClient({ email: { to: ['shared@example.com'] } })),
    ];
    expect(hasSharedEmails(clients)).toBe(true);
  });

  it('should return false for single client', () => {
    const clients = [
      makeClientInfo('a', makeClient({ email: { to: ['a@example.com'] } })),
    ];
    expect(hasSharedEmails(clients)).toBe(false);
  });
});

describe('getClientsWithSharedEmails', () => {
  it('should return empty array for no shared emails', () => {
    const clients = [
      makeClientInfo('a', makeClient({ email: { to: ['a@example.com'] } })),
      makeClientInfo('b', makeClient({ email: { to: ['b@example.com'] } })),
    ];
    expect(getClientsWithSharedEmails(clients)).toEqual([]);
  });

  it('should return all clients that share an email', () => {
    const clients = [
      makeClientInfo('a', makeClient({ email: { to: ['shared@example.com'] } })),
      makeClientInfo('b', makeClient({ email: { to: ['shared@example.com'] } })),
      makeClientInfo('c', makeClient({ email: { to: ['unique@example.com'] } })),
    ];
    const shared = getClientsWithSharedEmails(clients);
    expect(shared).toHaveLength(2);
    expect(shared.map(c => c.name)).toEqual(['a', 'b']);
  });

  it('should return empty for empty input', () => {
    expect(getClientsWithSharedEmails([])).toEqual([]);
  });
});
