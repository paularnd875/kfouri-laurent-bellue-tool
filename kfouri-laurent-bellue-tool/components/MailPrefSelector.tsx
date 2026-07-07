'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { MAIL_PROVIDERS, MAIL_PREF_KEY, MailProvider, readMailProvider } from '@/lib/mail-compose';

// Selecteur global (memorise par navigateur) de la messagerie ouverte par les
// boutons "enveloppe". A placer dans l'en-tete des pages.
export default function MailPrefSelector() {
  const [provider, setProvider] = useState<MailProvider>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setProvider(readMailProvider());
    setMounted(true);
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as MailProvider;
    setProvider(v);
    try {
      window.localStorage.setItem(MAIL_PREF_KEY, v);
    } catch {
      /* localStorage indisponible : on ignore */
    }
  };

  // Evite un mismatch d'hydratation (localStorage cote client uniquement)
  if (!mounted) return null;

  return (
    <label
      className="flex items-center gap-1 text-xs text-gray-600"
      title="Choisir la messagerie ouverte par le bouton email (memorise sur cet appareil)"
    >
      <Mail className="w-4 h-4 text-gray-400" />
      <span className="hidden md:inline">Emails via</span>
      <select
        value={provider}
        onChange={onChange}
        className="border border-gray-300 rounded px-1 py-1 text-xs bg-white"
      >
        {MAIL_PROVIDERS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
