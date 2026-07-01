import { google } from 'googleapis';

// Journalise chaque changement de classement fait dans l'outil dans un onglet
// dedie du Google Sheet (append-only). N'ecrit JAMAIS dans les donnees : onglet
// separe cree automatiquement au premier usage.
// Prerequis : le service account doit avoir l'acces "Editeur" sur la feuille.

const SHEET_ID = '1e-xkI8LcsgbgefP2Lv9Ym4ZyCL-4VXHgGdVh6xLbtAw';
const TAB_NAME = 'Journal classifications outil';
const HEADER = [
  'Horodatage',
  'Email',
  'Nom',
  'Structure',
  'Ancienne classification',
  'Nouvelle classification',
  'Action',
  'Utilisateur',
];

function getWritableSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'], // lecture/ecriture
  });
  return google.sheets({ version: 'v4', auth });
}

// Cache par instance : evite un spreadsheets.get a chaque appel.
let tabEnsured = false;

async function ensureTab(sheets: ReturnType<typeof getWritableSheets>): Promise<void> {
  if (tabEnsured) return;
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets.properties.title',
  });
  const exists = (meta.data.sheets || []).some(s => s.properties?.title === TAB_NAME);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${TAB_NAME}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    });
  }
  tabEnsured = true;
}

export interface ClassifChange {
  email?: string;
  nom?: string;
  structure?: string;
  ancienne?: string;
  nouvelle?: string; // '' => retrait (avocat repasse "Non classe")
  utilisateur?: string;
}

export async function logClassifChange(change: ClassifChange): Promise<{ ok: boolean; error?: string }> {
  try {
    const sheets = getWritableSheets();
    await ensureTab(sheets);
    const horodatage = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    const action = change.nouvelle ? 'Classement' : 'Retrait';
    const row = [
      horodatage,
      change.email || '',
      change.nom || '',
      change.structure || '',
      change.ancienne || '',
      change.nouvelle || '',
      action,
      change.utilisateur || 'Equipe KLB',
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `'${TAB_NAME}'!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
    return { ok: true };
  } catch (e) {
    console.error('[sheet-log] echec journalisation:', e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
