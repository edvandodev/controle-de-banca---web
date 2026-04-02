import { appEnv, isSupabaseConfigured } from '@/src/config/env';
import { createLocalBankrollRepository } from './localBankrollRepository';
import { createSupabaseBankrollRepository } from './supabaseBankrollRepository';
import { createSupabasePlaceholderRepository } from './supabasePlaceholderRepository';
import type { BankrollRepository } from './types';

interface CreateBankrollRepositoryOptions {
  userId?: string | null;
}

export function createBankrollRepository(
  options: CreateBankrollRepositoryOptions = {},
): BankrollRepository {
  const localRepository = createLocalBankrollRepository();

  if (appEnv.dataProvider === 'supabase') {
    if (!isSupabaseConfigured) {
      console.warn(
        '[Controle de Banca] Variáveis do Supabase não encontradas. Voltando para localStorage.',
      );
      return localRepository;
    }

    if (options.userId) {
      return createSupabaseBankrollRepository(options.userId);
    }

    return createSupabasePlaceholderRepository(localRepository);
  }

  return localRepository;
}
