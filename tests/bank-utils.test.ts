import { describe, it, expect } from 'vitest';
import { getProviderBanks, resolveBankDetails } from '../src/lib/bank-utils.js';
import type { Provider, Client } from '../src/types.js';

describe('bank-utils', () => {
  const baseProvider: Provider = {
    name: 'Test Provider',
    address: { street: '123 Main St', city: 'Berlin 10115' },
    phone: '+49 123 456789',
    email: 'test@example.com',
    taxNumber: '123/456/789',
  };

  const baseClient: Client = {
    name: 'Acme Corp',
    address: { street: '456 Business Ave', city: 'New York, NY 10001' },
    language: 'en',
    invoicePrefix: 'AC',
    nextInvoiceNumber: 1,
    service: {
      description: 'Consulting',
      billingType: 'hourly',
      rate: 100,
      currency: 'USD',
    },
  };

  describe('getProviderBanks', () => {
    it('should return banks array when present', () => {
      const provider: Provider = {
        ...baseProvider,
        banks: [
          { label: 'EUR Account', name: 'ING DiBa', iban: 'DE123', bic: 'INGDDEFF' },
          { label: 'USD Account', name: 'Revolut', iban: 'GB456', bic: 'REVOGB2L' },
        ],
      };

      const result = getProviderBanks(provider);
      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('EUR Account');
      expect(result[1].label).toBe('USD Account');
    });

    it('should wrap legacy bank as single-element array', () => {
      const provider: Provider = {
        ...baseProvider,
        bank: { name: 'Test Bank', iban: 'DE789', bic: 'TESTBIC' },
      };

      const result = getProviderBanks(provider);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Test Bank');
      expect(result[0].iban).toBe('DE789');
    });

    it('should prefer banks array over legacy bank', () => {
      const provider: Provider = {
        ...baseProvider,
        bank: { name: 'Old Bank', iban: 'DE000', bic: 'OLD' },
        banks: [
          { label: 'New Bank', name: 'New Bank', iban: 'DE111', bic: 'NEW' },
        ],
      };

      const result = getProviderBanks(provider);
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('New Bank');
    });

    it('should return empty array when neither bank nor banks is set', () => {
      const result = getProviderBanks(baseProvider);
      expect(result).toHaveLength(0);
    });
  });

  describe('resolveBankDetails', () => {
    const providerWithBanks: Provider = {
      ...baseProvider,
      banks: [
        { label: 'EUR Account', name: 'ING DiBa', iban: 'DE123', bic: 'INGDDEFF' },
        { label: 'USD Account', name: 'Revolut', iban: 'GB456', bic: 'REVOGB2L' },
      ],
    };

    const legacyProvider: Provider = {
      ...baseProvider,
      bank: { name: 'Test Bank', iban: 'DE789', bic: 'TESTBIC' },
    };

    it('should use client bank override when present', () => {
      const client: Client = {
        ...baseClient,
        bank: { name: 'Client Bank', iban: 'US999', bic: 'CLIENTBIC' },
      };

      const result = resolveBankDetails(client, providerWithBanks);
      expect(result).toEqual({ name: 'Client Bank', iban: 'US999', bic: 'CLIENTBIC' });
    });

    it('should resolve bankLabel to matching provider bank', () => {
      const client: Client = {
        ...baseClient,
        bankLabel: 'USD Account',
      };

      const result = resolveBankDetails(client, providerWithBanks);
      expect(result).toEqual({ name: 'Revolut', iban: 'GB456', bic: 'REVOGB2L' });
    });

    it('should fall back to first provider bank when bankLabel does not match', () => {
      const client: Client = {
        ...baseClient,
        bankLabel: 'Nonexistent',
      };

      const result = resolveBankDetails(client, providerWithBanks);
      expect(result).toEqual({ name: 'ING DiBa', iban: 'DE123', bic: 'INGDDEFF' });
    });

    it('should default to first provider bank when client has no bank or bankLabel', () => {
      const result = resolveBankDetails(baseClient, providerWithBanks);
      expect(result).toEqual({ name: 'ING DiBa', iban: 'DE123', bic: 'INGDDEFF' });
    });

    it('should work with legacy single-bank provider', () => {
      const result = resolveBankDetails(baseClient, legacyProvider);
      expect(result).toEqual({ name: 'Test Bank', iban: 'DE789', bic: 'TESTBIC' });
    });

    it('should return undefined when provider has no banks at all', () => {
      const result = resolveBankDetails(baseClient, baseProvider);
      expect(result).toBeUndefined();
    });

    it('should not include label in returned bank details', () => {
      const result = resolveBankDetails(baseClient, providerWithBanks);
      expect(result).not.toHaveProperty('label');
    });

    it('should prioritize client.bank over bankLabel', () => {
      const client: Client = {
        ...baseClient,
        bank: { name: 'Override Bank', iban: 'OVER1', bic: 'OVER' },
        bankLabel: 'USD Account',
      };

      const result = resolveBankDetails(client, providerWithBanks);
      expect(result?.name).toBe('Override Bank');
    });
  });
});
