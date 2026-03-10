import { useState, useEffect } from 'react';
import type { FormSectionProps } from './types';
import type { ProviderBank } from '../../../services/api';

export interface BankSectionProps extends FormSectionProps {
  providerBanks: ProviderBank[];
}

export function BankSection({
  register,
  providerBanks,
  watch,
  setValue,
}: BankSectionProps) {
  const bankLabel = watch?.('bankLabel');
  const clientBank = watch?.('bank');
  const hasCustomBank = !!(clientBank?.name || clientBank?.iban);

  const [mode, setMode] = useState<'provider' | 'custom'>(
    hasCustomBank ? 'custom' : 'provider'
  );

  // Sync mode when form data loads
  useEffect(() => {
    if (hasCustomBank) {
      setMode('custom');
    }
  }, [hasCustomBank]);

  const handleModeChange = (newMode: 'provider' | 'custom') => {
    setMode(newMode);
    if (newMode === 'provider') {
      // Clear custom bank details
      setValue?.('bank', undefined as never);
    } else {
      // Clear bankLabel when switching to custom
      setValue?.('bankLabel', undefined as never, { shouldDirty: true });
    }
  };

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Bank Account</h2>

      <div className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={mode === 'provider'}
              onChange={() => handleModeChange('provider')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Use provider bank account</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={mode === 'custom'}
              onChange={() => handleModeChange('custom')}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Custom bank details</span>
          </label>
        </div>

        {mode === 'provider' && providerBanks.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Bank Account
            </label>
            <select
              value={bankLabel || ''}
              onChange={(e) => setValue?.('bankLabel', e.target.value || undefined as never, { shouldDirty: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Default (first account)</option>
              {providerBanks.map((bank) => (
                <option key={bank.label} value={bank.label}>
                  {bank.label} — {bank.name} ({bank.iban})
                </option>
              ))}
            </select>
            <p className="text-gray-500 text-xs mt-1">
              Select which of the provider's bank accounts to use on invoices for this client
            </p>
          </div>
        )}

        {mode === 'provider' && providerBanks.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No provider bank accounts configured. Add bank accounts in Provider Settings.
          </p>
        )}

        {mode === 'custom' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                {...register('bank.name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Bank Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IBAN *
              </label>
              <input
                type="text"
                {...register('bank.iban')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                placeholder="DE89 3704 0044 0532 0130 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BIC/SWIFT
              </label>
              <input
                type="text"
                {...register('bank.bic')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                placeholder="COBADEFFXXX"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
