import { google } from 'googleapis';
import crypto from 'crypto';
import { fetchAllSheetData } from './google-sheets';
import { logClassifChange } from './sheet-log';

// Coeur de l'outil "Qualification des contacts" (interface swipe).
// Tout est stocke dans le meme Google Sheet que le reste de l'outil KLB :
//  - un onglet de config `_QUALIF_ACCESS` : la liste des participants + leurs
//    jetons (liens perso), la regle de liste, l'onglet cible et le curseur.
//  - un onglet PAR participant (ex. « Qualif — Sabine ») : ses reponses
//    (append/upsert par ID) = registre durable ET source de reprise.
// Aucune donnee source n'est modifiee, aucune ecriture dans le `classement`
// global : chaque choix est propre au participant (comme l'Apps Script).

const SHEET_ID = '1e-xkI8LcsgbgefP2Lv9Ym4ZyCL-4VXHgGdVh6xLbtAw';
const CONFIG_TAB = '_QUALIF_ACCESS';
const CONFIG_HEADER = ['id', 'name', 'token', 'network', 'tabName', 'active', 'cursor', 'createdAt'];
const ANSWER_HEADER = ['Horodatage', 'ID', 'Nom complet', 'Cabinet', 'LinkedIn', 'Cercle'];

// Reseaux disponibles en v1 (les 2 candidats). Cle = booleen expose par
// fetchAllSheetData ; label = affichage admin.
export const NETWORKS: Record<string, { label: string; field: 'linkedin_sabine' | 'linkedin_bernard' }> = {
  sabine: { label: 'Sabine (SK)', field: 'linkedin_sabine' },
  bernard: { label: 'Bernard (BLB)', field: 'linkedin_bernard' },
};

export interface Participant {
  id: string;
  name: string;
  token: string;
  network: string; // cle de NETWORKS
  tabName: string;
  active: boolean;
  cursor: number;
  createdAt: string;
  rowIndex: number; // ligne dans _QUALIF_ACCESS (1-based, en-tete = 1)
}

export interface QualifContact {
  id: string;
  name: string;
  cabinet: string;
  anneeSerment: string;
  linkedin: string;
  photo: string;
  voted: boolean;
  circle: string; // choix precedent du participant ('' si aucun)
}

function getSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function q(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`;
}

async function tabExists(sheets: ReturnType<typeof getSheets>, title: string): Promise<boolean> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties.title' });
  return (meta.data.sheets || []).some((s) => s.properties?.title === title);
}

async function ensureTab(sheets: ReturnType<typeof getSheets>, title: string, header: string[]): Promise<void> {
  if (!(await tabExists(sheets, title))) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${q(title)}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [header] },
  });
}

function newToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function newId(): string {
  return crypto.randomBytes(6).toString('hex');
}

// --- Config (_QUALIF_ACCESS) ------------------------------------------------

export async function readParticipants(): Promise<Participant[]> {
  const sheets = getSheets();
  await ensureTab(sheets, CONFIG_TAB, CONFIG_HEADER);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${q(CONFIG_TAB)}!A2:H` });
  const rows = res.data.values || [];
  return rows
    .map((r, i): Participant | null => {
      const id = String(r[0] || '').trim();
      if (!id) return null;
      return {
        id,
        name: String(r[1] || ''),
        token: String(r[2] || ''),
        network: String(r[3] || ''),
        tabName: String(r[4] || ''),
        active: String(r[5] || '').toUpperCase() !== 'FALSE',
        cursor: Number(r[6]) || 0,
        createdAt: String(r[7] || ''),
        rowIndex: i + 2,
      };
    })
    .filter((p): p is Participant => p !== null);
}

export async function findByToken(token: string): Promise<Participant | null> {
  const t = String(token || '').trim();
  if (!t) return null;
  const all = await readParticipants();
  return all.find((p) => p.token === t) || null;
}

export async function createParticipant(name: string, network: string): Promise<Participant> {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Nom requis.');
  if (!NETWORKS[network]) throw new Error('Reseau inconnu.');
  const sheets = getSheets();
  await ensureTab(sheets, CONFIG_TAB, CONFIG_HEADER);

  const existing = await readParticipants();
  let tabName = `Qualif — ${clean}`;
  let n = 2;
  const taken = new Set(existing.map((p) => p.tabName));
  while (taken.has(tabName)) tabName = `Qualif — ${clean} (${n++})`;

  const p: Participant = {
    id: newId(),
    name: clean,
    token: newToken(),
    network,
    tabName,
    active: true,
    cursor: 0,
    createdAt: new Date().toISOString(),
    rowIndex: 0,
  };
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${q(CONFIG_TAB)}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[p.id, p.name, p.token, p.network, p.tabName, 'TRUE', '0', p.createdAt]] },
  });
  await ensureTab(sheets, tabName, ANSWER_HEADER);
  return p;
}

async function writeCell(rowIndex: number, col: string, value: string): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${q(CONFIG_TAB)}!${col}${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
}

export async function setCursor(rowIndex: number, cursor: number): Promise<void> {
  await writeCell(rowIndex, 'G', String(Math.max(0, cursor)));
}

export async function setActive(id: string, active: boolean): Promise<void> {
  const p = (await readParticipants()).find((x) => x.id === id);
  if (!p) throw new Error('Participant introuvable.');
  await writeCell(p.rowIndex, 'F', active ? 'TRUE' : 'FALSE');
}

export async function rotateToken(id: string): Promise<string> {
  const p = (await readParticipants()).find((x) => x.id === id);
  if (!p) throw new Error('Participant introuvable.');
  const token = newToken();
  await writeCell(p.rowIndex, 'C', token);
  return token;
}

export async function deleteParticipant(id: string): Promise<void> {
  const p = (await readParticipants()).find((x) => x.id === id);
  if (!p) throw new Error('Participant introuvable.');
  const sheets = getSheets();
  // On vide la ligne de config (on ne supprime pas physiquement pour ne pas
  // decaler les rowIndex des autres). L'onglet de reponses reste intact.
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${q(CONFIG_TAB)}!A${p.rowIndex}:H${p.rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['', '', '', '', '', '', '', '']] },
  });
}

// --- Reponses (onglet par participant) --------------------------------------

async function readAnswers(tabName: string): Promise<Map<string, { circle: string; rowIndex: number }>> {
  const sheets = getSheets();
  await ensureTab(sheets, tabName, ANSWER_HEADER);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${q(tabName)}!A2:F` });
  const rows = res.data.values || [];
  const map = new Map<string, { circle: string; rowIndex: number }>();
  rows.forEach((r, i) => {
    const id = String(r[1] || '').trim();
    if (id) map.set(id, { circle: String(r[5] || '').trim(), rowIndex: i + 2 });
  });
  return map;
}

// --- Construction de la liste d'un participant ------------------------------

function isVoted(raw: Record<string, unknown> | undefined): boolean {
  if (!raw) return false;
  for (const [k, v] of Object.entries(raw)) {
    if (/vote/i.test(k)) {
      const val = String(v || '').trim().toLowerCase();
      if (val === '1' || val === 'true' || val === 'oui' || val === 'x') return true;
    }
  }
  return false;
}

export async function buildContacts(p: Participant): Promise<QualifContact[]> {
  const net = NETWORKS[p.network];
  if (!net) throw new Error('Reseau inconnu pour ce participant.');
  const [{ data }, answers] = await Promise.all([fetchAllSheetData(), readAnswers(p.tabName)]);

  const list = data
    .filter((l) => l[net.field] === true)
    .map((l): QualifContact => {
      const id = String(l.prenomnom || l.nom_complet || '').trim();
      return {
        id,
        name: l.nom_complet || l.prenomnom || 'Sans nom',
        cabinet: l.cabinet || '',
        anneeSerment: l.annee_serment ? String(l.annee_serment) : '',
        linkedin: l.linkedin || '',
        photo: l.photo_url || '',
        voted: isVoted(l.raw_data),
        circle: answers.get(id)?.circle || '',
      };
    })
    .filter((c) => c.id !== '');

  list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  return list;
}

export interface ParticipantStats extends Participant {
  networkLabel: string;
  total: number;
  answered: number;
}

export async function listWithStats(): Promise<ParticipantStats[]> {
  const participants = await readParticipants();
  if (participants.length === 0) return [];
  const { data } = await fetchAllSheetData();
  const out: ParticipantStats[] = [];
  for (const p of participants) {
    const net = NETWORKS[p.network];
    const total = net ? data.filter((l) => l[net.field] === true).length : 0;
    let answered = 0;
    try {
      answered = (await readAnswers(p.tabName)).size;
    } catch {
      answered = 0;
    }
    out.push({ ...p, networkLabel: net?.label || p.network, total, answered });
  }
  return out;
}

const VALID_CHOICES = new Set(['C1', 'C2', 'C3', 'Blacklist']);

export async function saveChoice(
  p: Participant,
  contact: { id: string; name: string; cabinet: string; linkedin: string },
  choice: string,
): Promise<void> {
  if (!VALID_CHOICES.has(choice)) throw new Error('Choix invalide.');
  const sheets = getSheets();
  const answers = await readAnswers(p.tabName);
  const horodatage = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const previous = answers.get(contact.id)?.circle || '';
  const row = [horodatage, contact.id, contact.name, contact.cabinet, contact.linkedin, choice];

  const existing = answers.get(contact.id);
  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${q(p.tabName)}!A${existing.rowIndex}:F${existing.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${q(p.tabName)}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });
  }

  // Journal global (best-effort) : attribue au participant.
  await logClassifChange({
    nom: contact.name,
    structure: contact.cabinet,
    ancienne: previous,
    nouvelle: choice,
    utilisateur: p.name,
  });
}
