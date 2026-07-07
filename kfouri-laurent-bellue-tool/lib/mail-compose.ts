// Construction du lien de composition d'email selon la messagerie preferee de
// l'utilisateur. Objectif : eviter que le bouton "enveloppe" ouvre le client
// mail par defaut de Windows (souvent la boite perso) ; a la place, on ouvre la
// composition WEB de la messagerie choisie (Outlook 365 pro, Gmail), qui utilise
// la session navigateur -> donc la boite pro ou l'utilisateur est connecte.

export type MailProvider = 'default' | 'outlook365' | 'gmail';

export const MAIL_PREF_KEY = 'klb_mail_provider';

export const MAIL_PROVIDERS: { value: MailProvider; label: string }[] = [
  { value: 'default', label: 'Outlook installé sur le PC (app par défaut)' },
  { value: 'outlook365', label: 'Outlook / Microsoft 365 (en ligne)' },
  { value: 'gmail', label: 'Gmail (en ligne)' },
];

export interface ComposeLink {
  url: string;
  newTab: boolean;
}

export function buildComposeUrl(
  provider: MailProvider,
  email: string,
  opts?: { subject?: string; body?: string }
): ComposeLink {
  const to = encodeURIComponent(email);
  switch (provider) {
    case 'gmail': {
      let url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}`;
      if (opts?.subject) url += `&su=${encodeURIComponent(opts.subject)}`;
      if (opts?.body) url += `&body=${encodeURIComponent(opts.body)}`;
      return { url, newTab: true };
    }
    case 'outlook365': {
      let url = `https://outlook.office.com/mail/deeplink/compose?to=${to}`;
      if (opts?.subject) url += `&subject=${encodeURIComponent(opts.subject)}`;
      if (opts?.body) url += `&body=${encodeURIComponent(opts.body)}`;
      return { url, newTab: true };
    }
    default: {
      let url = `mailto:${email}`;
      const params: string[] = [];
      if (opts?.subject) params.push(`subject=${encodeURIComponent(opts.subject)}`);
      if (opts?.body) params.push(`body=${encodeURIComponent(opts.body)}`);
      if (params.length) url += `?${params.join('&')}`;
      return { url, newTab: false };
    }
  }
}

// Lit la preference stockee dans le navigateur (localStorage). Cote serveur
// ou si rien n'est defini -> 'default'.
export function readMailProvider(): MailProvider {
  if (typeof window === 'undefined') return 'default';
  const v = window.localStorage.getItem(MAIL_PREF_KEY);
  if (v === 'outlook365' || v === 'gmail' || v === 'default') return v;
  return 'default';
}
