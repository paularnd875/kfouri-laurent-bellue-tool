import { NextResponse } from 'next/server';
import { fetchSheetHeaders } from '@/lib/google-sheets';
import { resolveFields, colLetter, MAIN_TAB } from '@/lib/column-map';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const headers = await fetchSheetHeaders();
    const fields = resolveFields(headers);

    const parName = fields.filter(f => f.status === 'name').length;
    const parIndex = fields.filter(f => f.status === 'fallback').length;
    const manquants = fields.filter(f => f.status === 'missing').length;

    return NextResponse.json({
      success: true,
      onglet: MAIN_TAB,
      totalColonnes: headers.length,
      resume: { trouvesParNom: parName, secoursParIndex: parIndex, manquants },
      champs: fields.map(f => ({
        champ: f.label,
        cle: f.key,
        statut: f.status,
        colonne: f.col,
        enTeteTrouve: f.header,
        nomsAcceptes: f.acceptedNames,
        optionnel: f.optional,
      })),
      enTetes: headers.map((h, i) => ({ colonne: colLetter(i), titre: String(h ?? '') })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
