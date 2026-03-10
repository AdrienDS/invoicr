/**
 * Bank account resolution utilities
 * Resolves which bank details to use for a given client/provider pair.
 */
import { BankDetails, LabeledBankDetails, Provider, Client } from '../types.js';

/**
 * Get all provider bank accounts as labeled entries.
 * If provider uses the `banks` array, returns it directly.
 * If provider uses legacy `bank` field, wraps it with label = bank.name.
 */
export function getProviderBanks(provider: Provider): LabeledBankDetails[] {
  if (provider.banks && provider.banks.length > 0) {
    return provider.banks;
  }
  if (provider.bank) {
    return [{ ...provider.bank, label: provider.bank.name }];
  }
  return [];
}

/**
 * Resolve bank details for an invoice.
 *
 * Resolution order:
 * 1. Client has full bank override (`client.bank`) — use it
 * 2. Client has `bankLabel` — look up in provider's banks by label
 * 3. Default to provider's first bank
 *
 * Returns undefined only if provider has no banks configured at all.
 */
export function resolveBankDetails(client: Client, provider: Provider): BankDetails | undefined {
  // 1. Client full override
  if (client.bank) {
    return client.bank;
  }

  const providerBanks = getProviderBanks(provider);
  if (providerBanks.length === 0) {
    return undefined;
  }

  // 2. Client selects a provider bank by label
  if (client.bankLabel) {
    const match = providerBanks.find(b => b.label === client.bankLabel);
    if (match) {
      const { label: _, ...bankDetails } = match;
      return bankDetails;
    }
    // Label not found — fall through to default
  }

  // 3. Default: first provider bank
  const { label: _, ...defaultBank } = providerBanks[0];
  return defaultBank;
}
