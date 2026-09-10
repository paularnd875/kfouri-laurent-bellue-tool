import { NextResponse } from 'next/server';
import { buildContacts, findByToken, saveChoice, setCursor } from '@/lib/qualif';

export const dynamic = 'force-dynamic';

// API participante, authentifiee par jeton (aucune connexion requise).
// GET  ?token=...              -> { participant, contacts, cursor }
// POST { token, action, ... }  -> saveChoice | moveCursor | startNewPass

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token') || '';
    const p = await findByToken(token);
    if (!p) return fail('Lien invalide ou expire.', 403);
    if (!p.active) return fail('Votre acces a ete suspendu.', 403);
    const contacts = await buildContacts(p);
    const cursor = Math.min(p.cursor, contacts.length);
    return NextResponse.json({ participant: p.name, contacts, cursor });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Erreur inconnue.', 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || '');
    const p = await findByToken(token);
    if (!p) return fail('Lien invalide ou expire.', 403);
    if (!p.active) return fail('Votre acces a ete suspendu.', 403);

    const action = String(body.action || '');

    if (action === 'saveChoice') {
      const contact = body.contact || {};
      if (!contact.id) return fail('Contact invalide.');
      await saveChoice(
        p,
        {
          id: String(contact.id),
          name: String(contact.name || ''),
          cabinet: String(contact.cabinet || ''),
          linkedin: String(contact.linkedin || ''),
        },
        String(body.choice || ''),
      );
      await setCursor(p.rowIndex, Number(body.nextCursor) || 0);
      return NextResponse.json({ ok: true });
    }

    if (action === 'moveCursor') {
      const cursor = Number(body.cursor) || 0;
      await setCursor(p.rowIndex, cursor);
      return NextResponse.json({ cursor });
    }

    if (action === 'startNewPass') {
      const contacts = (await buildContacts(p)).filter((c) => !c.circle);
      await setCursor(p.rowIndex, 0);
      return NextResponse.json({ contacts, cursor: 0 });
    }

    return fail('Action inconnue.');
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Erreur inconnue.', 500);
  }
}
