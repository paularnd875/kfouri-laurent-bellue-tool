import { NextResponse } from 'next/server';
import { buildContacts, findByToken, saveChoice } from '@/lib/qualif';
import type { Participant } from '@/lib/qualif';

export const dynamic = 'force-dynamic';

// API participante, authentifiee par jeton (aucune connexion requise).
// GET  ?token=...              -> { participant, contacts (non encore qualifies par lui) }
// POST { token, action, ... }  -> saveChoice | startNewPass | reviewDone
// Le paquet ne contient QUE les personnes que CE participant n'a pas encore
// qualifiees (celles qu'il a deja traitees ne reviennent pas). La navigation
// (Precedent / Je passe) est purement cote client : pas de curseur serveur.

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function resolve(token: string): Promise<{ p?: Participant; error?: NextResponse }> {
  const p = await findByToken(token);
  if (!p) return { error: fail('Lien invalide ou expire.', 403) };
  if (!p.active) return { error: fail('Votre acces a ete suspendu.', 403) };
  return { p };
}

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token') || '';
    const { p, error } = await resolve(token);
    if (error) return error;
    const all = await buildContacts(p!);
    const contacts = all.filter((c) => !c.circle);
    return NextResponse.json({
      participant: p!.name,
      contacts,
      remaining: contacts.length,
      answered: all.length - contacts.length,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Erreur inconnue.', 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { p, error } = await resolve(String(body.token || ''));
    if (error) return error;
    const action = String(body.action || '');

    if (action === 'saveChoice') {
      const contact = body.contact || {};
      if (!contact.id) return fail('Contact invalide.');
      await saveChoice(
        p!,
        {
          id: String(contact.id),
          name: String(contact.name || ''),
          cabinet: String(contact.cabinet || ''),
          linkedin: String(contact.linkedin || ''),
        },
        String(body.choice || ''),
      );
      return NextResponse.json({ ok: true });
    }

    if (action === 'startNewPass') {
      // Reprendre les personnes passees (non encore qualifiees par ce participant).
      const contacts = (await buildContacts(p!)).filter((c) => !c.circle);
      return NextResponse.json({ contacts });
    }

    if (action === 'reviewDone') {
      // Revoir / modifier les reponses deja donnees par ce participant.
      const contacts = (await buildContacts(p!)).filter((c) => c.circle);
      return NextResponse.json({ contacts });
    }

    return fail('Action inconnue.');
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Erreur inconnue.', 500);
  }
}
