import { useState } from 'react';
import type { FormEvent } from 'react';
import { TrendingUp } from 'lucide-react';
import { appEnv } from '@/src/config/env';
import { supabase } from '@/src/lib/supabase';

type AuthMode = 'login' | 'signup';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setErrorMessage('Supabase não está configurado no ambiente.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
      }

      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      setInfoMessage('Conta criada e acesso liberado.');
    } else {
      setInfoMessage('Conta criada. Se o Supabase pedir confirmação, verifique o seu e-mail.');
    }

    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-premium-bg px-4 py-8 text-premium-text">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-premium-border bg-premium-surface shadow-[var(--shadow)] lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative hidden overflow-hidden bg-nav-bg p-10 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Supabase</p>
                  <h1 className="text-xl font-black tracking-tight">{appEnv.appName}</h1>
                </div>
              </div>

              <div className="space-y-5">
                <p className="max-w-md text-3xl font-black leading-tight">
                  Entre com a sua conta para sincronizar os registros da banca na nuvem.
                </p>
                <div className="space-y-3 text-sm text-slate-300">
                  <p>1. Crie sua conta com e-mail e senha.</p>
                  <p>2. Faça login no app.</p>
                  <p>3. Seus lançamentos passam a ser salvos no Supabase.</p>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Se o projeto estiver em `modo local`, essa tela não aparece.
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto flex max-w-md flex-col gap-6">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-500">Acesso</p>
                <h2 className="text-2xl font-black tracking-tight">
                  {mode === 'login' ? 'Entrar no app' : 'Criar uma conta'}
                </h2>
                <p className="text-sm text-premium-muted">
                  Use um e-mail válido. O schema já está preparado para salvar tudo por usuário.
                </p>
              </div>

              <div className="grid grid-cols-2 rounded-2xl bg-premium-bg p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                    mode === 'login' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-premium-muted'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                    mode === 'signup' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-premium-muted'
                  }`}
                >
                  Criar conta
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold uppercase tracking-[0.18em] text-premium-muted">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@email.com"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-bold uppercase tracking-[0.18em] text-premium-muted">
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={6}
                    required
                    className="w-full px-4 py-3"
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                    {errorMessage}
                  </div>
                )}

                {infoMessage && (
                  <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-600 dark:text-brand-500">
                    {infoMessage}
                  </div>
                )}

                <button type="submit" className="primary w-full py-3 text-sm" disabled={isSubmitting}>
                  {isSubmitting
                    ? 'Processando...'
                    : mode === 'login'
                      ? 'Entrar agora'
                      : 'Criar conta'}
                </button>
              </form>

              <div className="rounded-2xl border border-premium-border bg-premium-bg px-4 py-3 text-sm text-premium-muted">
                Se o cadastro pedir confirmação por e-mail, abra a caixa de entrada antes de tentar o login.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
