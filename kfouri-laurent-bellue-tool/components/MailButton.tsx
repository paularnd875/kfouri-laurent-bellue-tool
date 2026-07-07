'use client';

import { Mail } from 'lucide-react';
import { buildComposeUrl, readMailProvider } from '@/lib/mail-compose';

// Bouton "enveloppe" qui respecte la messagerie preferee de l'utilisateur.
// - Provider 'default' : lien mailto natif (href) -> client mail systeme.
// - Provider 'outlook365' / 'gmail' : ouvre la composition WEB dans un onglet
//   (donc la boite pro connectee dans le navigateur), au clic.
export default function MailButton({
  email,
  name,
  className = 'klb-icon-btn',
  subject,
}: {
  email: string;
  name?: string;
  className?: string;
  subject?: string;
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const provider = readMailProvider();
    if (provider === 'default') return; // comportement natif (mailto)
    e.preventDefault();
    const { url, newTab } = buildComposeUrl(provider, email, { subject });
    if (newTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  return (
    <a
      href={`mailto:${email}`}
      onClick={handleClick}
      className={className}
      title={`Envoyer un email a ${name || email}`}
    >
      <Mail className="w-4 h-4" />
    </a>
  );
}
