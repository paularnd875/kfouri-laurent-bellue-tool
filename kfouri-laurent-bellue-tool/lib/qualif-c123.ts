import { google } from 'googleapis';
import { parseServiceAccountKey } from './google-credentials';

// Ecriture des classifications du swipe directement dans l'onglet « C123 agrégés (S&B) »
// (gid 410772729) du meme classeur. On remplit UNIQUEMENT les colonnes :
//   D = prenomnom (cle uniformisee, calculee par l'outil)
//   F = Cercle (C1/C2/C3/Blacklist ; « Neutre » n'est JAMAIS ecrit ici)
//   I = Provenance Sabine/Bernard (candidat : « Sabine » ou « Bernard »)
//   J = Doc provenance (canaux : LinkedIn / Outlook / Téléphone)
//   K = Date
//   L = Remarque (marqueur automatique = permet de retrouver NOS lignes)
// Les colonnes G (Cercle mutualisé) et H (Provenance C+) contiennent une formule
// LET par ligne : on la PROLONGE sur chaque nouvelle ligne via un copyPaste
// PASTE_FORMULA depuis la ligne 2 (les references relatives D2->D{ligne}
// s'ajustent automatiquement, sans souci de locale FR « ; »). On ne modifie
// jamais G/H des lignes existantes, ni A/B/C/E.
//
// Securite : une ligne n'est mise a jour que si c'est l'outil qui l'a creee
// (marqueur en L). On ne touche JAMAIS une ligne saisie a la main (mails, etc.).

const SHEET_ID = '12mDu_ceWutd4TqCaX0AJ81rtR5v04tlx8rWxO3o20z0';
const C123_GID = 410772729;
// Ligne « modele » dont on copie les formules G/H (doit avoir G ET H remplies).
const TEMPLATE_ROW = 2;
export const AUTO_MARK_SUBSTR = 'outil de qualification';
const AUTO_MARK = "Rempli automatiquement via l'outil de qualification (swipe)";

function getSheetId(): string {
  return SHEET_ID;
}

function getSheets() {
  const credentials = parseServiceAccountKey();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function q(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

let c123Title: string | null = null;
async function getC123Title(sheets: ReturnType<typeof getSheets>): Promise<string> {
  if (c123Title) return c123Title;
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: getSheetId(),
    fields: 'sheets.properties(sheetId,title)',
  });
  const match = (meta.data.sheets || []).find((s) => s.properties?.sheetId === C123_GID);
  if (!match?.properties?.title) throw new Error(`Onglet C123 agrégés (gid ${C123_GID}) introuvable.`);
  c123Title = match.properties.title;
  return c123Title;
}

export interface C123Input {
  prenomnom: string; // cle uniformisee (colonne D)
  cercle: string; // C1 | C2 | C3 | Blacklist
  candidat: string; // « Sabine » | « Bernard » (colonne I)
  canaux: string; // « LinkedIn », « LinkedIn, Téléphone »… (colonne J)
}

// Ecrit (ou met a jour NOTRE ligne) dans « C123 agrégés ». Best-effort cote appelant.
export async function writeC123Classification(input: C123Input): Promise<void> {
  const prenomnom = String(input.prenomnom || '').trim();
  const cercle = String(input.cercle || '').trim();
  const candidat = String(input.candidat || '').trim();
  const canaux = String(input.canaux || '').trim();
  if (!prenomnom || !cercle || cercle === 'Neutre') return; // Neutre jamais ecrit ici

  const sheets = getSheets();
  const sid = getSheetId();
  const title = await getC123Title(sheets);

  // Lecture des colonnes D (cle), I (candidat), L (marqueur) pour trouver notre
  // ligne existante et la derniere ligne de donnees.
  const resp = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sid,
    ranges: [`${q(title)}!D2:D`, `${q(title)}!I2:I`, `${q(title)}!L2:L`],
  });
  const Dcol = resp.data.valueRanges?.[0]?.values || [];
  const Icol = resp.data.valueRanges?.[1]?.values || [];
  const Lcol = resp.data.valueRanges?.[2]?.values || [];

  let lastData = 1; // derniere ligne (1-based) avec D non vide (au moins l'en-tete)
  for (let i = 0; i < Dcol.length; i++) {
    if (String(Dcol[i]?.[0] ?? '').trim() !== '') lastData = i + 2;
  }

  // Notre ligne pour ce couple (prenomnom, candidat) : uniquement une ligne creee
  // par l'outil (marqueur en L). Sinon on ajoute une nouvelle ligne.
  let target = 0;
  const n = Math.max(Dcol.length, Icol.length, Lcol.length);
  for (let i = 0; i < n; i++) {
    const d = String(Dcol[i]?.[0] ?? '').trim();
    const iv = String(Icol[i]?.[0] ?? '').trim();
    const lv = String(Lcol[i]?.[0] ?? '');
    if (d === prenomnom && iv === candidat && lv.includes(AUTO_MARK_SUBSTR)) {
      target = i + 2;
      break;
    }
  }

  const rowNum = target > 0 ? target : lastData + 1;
  const date = new Date().toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  // 1) Valeurs D, F, I..L (on NE touche PAS E, ni G/H, ni A/B/C).
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sid,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `${q(title)}!D${rowNum}`, values: [[prenomnom]] },
        { range: `${q(title)}!F${rowNum}`, values: [[cercle]] },
        { range: `${q(title)}!I${rowNum}:L${rowNum}`, values: [[candidat, canaux, date, AUTO_MARK]] },
      ],
    },
  });

  // 2) Prolonger les formules G et H : copie PASTE_FORMULA depuis la ligne modele
  // (references relatives D2 -> D{rowNum} ajustees automatiquement).
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sid,
    requestBody: {
      requests: [
        {
          copyPaste: {
            source: {
              sheetId: C123_GID,
              startRowIndex: TEMPLATE_ROW - 1,
              endRowIndex: TEMPLATE_ROW,
              startColumnIndex: 6, // G (0-based)
              endColumnIndex: 8, // jusqu'a H inclus
            },
            destination: {
              sheetId: C123_GID,
              startRowIndex: rowNum - 1,
              endRowIndex: rowNum,
              startColumnIndex: 6,
              endColumnIndex: 8,
            },
            pasteType: 'PASTE_FORMULA',
          },
        },
      ],
    },
  });
}
