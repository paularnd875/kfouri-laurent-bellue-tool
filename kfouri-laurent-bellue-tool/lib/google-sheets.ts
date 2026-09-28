import { google } from 'googleapis';
import { parseServiceAccountKey } from './google-credentials';
import { columnIndices, MAIN_TAB, SOURCE_TAB_GID } from './column-map';

// Configuration pour l'accès sécurisé au Google Sheet
const SHEET_ID = '12mDu_ceWutd4TqCaX0AJ81rtR5v04tlx8rWxO3o20z0';

// Authentification via Service Account
async function getAuthenticatedSheets() {
  const credentials = parseServiceAccountKey();

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// Cache memoire du titre de l'onglet source (resolu par gid, immuable). Evite un
// spreadsheets.get a chaque appel. Fallback sur MAIN_TAB si le gid est introuvable.
let sourceTabTitleCache: string | null = null;

export async function getSourceTabTitle(
  sheets: Awaited<ReturnType<typeof getAuthenticatedSheets>>
): Promise<string> {
  if (sourceTabTitleCache) return sourceTabTitleCache;
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      fields: 'sheets.properties(sheetId,title)',
    });
    const match = (meta.data.sheets || []).find(
      (s) => s.properties?.sheetId === SOURCE_TAB_GID
    );
    sourceTabTitleCache = match?.properties?.title || MAIN_TAB;
  } catch (e) {
    console.warn('Resolution onglet par gid impossible, fallback MAIN_TAB:', e);
    sourceTabTitleCache = MAIN_TAB;
  }
  return sourceTabTitleCache;
}

// Construit une plage A1 citee sur l'onglet source resolu par gid.
export async function getSourceRange(
  sheets: Awaited<ReturnType<typeof getAuthenticatedSheets>>,
  suffix: string = 'A:CZ'
): Promise<string> {
  const title = await getSourceTabTitle(sheets);
  return `'${title}'!${suffix}`;
}

// Interface pour les données du Google Sheet
export interface LawyerSheetData {
  // Colonnes de base (à ajuster selon la vraie structure)
  prenomnom?: string;
  civilite?: string;
  nom_complet?: string;
  telephone?: string;
  tel_fixe?: string; // Colonne tel_fixe
  tel_portable?: string; // Colonne "Numéro de portable"
  linkedin?: string; // Colonne LinkedIn (URL du profil)
  email?: string;
  annee_serment?: number;
  cabinet?: string; // raison sociale (cle technique de regroupement)
  cabinet_nom_commercial?: string; // nom commercial (affichage)
  cabinet_display?: string; // nom commercial si present, sinon raison sociale
  statut_cabinet?: string; // mode d'exercice
  xp?: string;
  specialite?: string;
  mandat?: string;
  langue?: string;
  nationalite?: string;
  tranche_taille_cabinet?: string;

  // Colonnes importantes mentionnées
  classement?: string; // C1/C2/C3/Blacklist
  linkedin_sabine?: boolean; // Relations LinkedIn Sabine (1 si relation, 0 sinon)
  linkedin_bernard?: boolean; // Relations LinkedIn Bernard (1 si relation, 0 sinon)
  photo_url?: string; // URL photo
  
  // Colonnes AX à BQ (étiquettes additionnelles)
  additional_tags?: { [key: string]: any };
  
  // Données brutes pour flexibilité
  raw_data?: { [key: string]: any };
}

// Fonction principale pour récupérer toutes les données
export async function fetchAllSheetData(): Promise<{
  headers: string[];
  data: LawyerSheetData[];
  totalRows: number;
  lastUpdated: Date;
}> {
  try {
    const sheets = await getAuthenticatedSheets();

    // Récupérer les données (onglet source résolu par gid, plage A:CZ)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: await getSourceRange(sheets, 'A:CZ'),
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      throw new Error('Aucune donnée trouvée dans le Google Sheet');
    }

    // Première ligne = headers
    const headers = rows[0] as string[];
    const dataRows = rows.slice(1);

    // Résolution des colonnes par NOM d'en-tête (avec index de secours)
    const idx = columnIndices(headers);
    const at = (row: string[], key: string): string => {
      const i = idx[key];
      return i != null && i >= 0 ? (row[i] || '') : '';
    };

    // Mapper les données en objets
    const data: LawyerSheetData[] = dataRows.map(row => {
      const raw_data: { [key: string]: string } = {};
      headers.forEach((header, index) => { raw_data[header] = row[index] || ''; });

      const lawyer: LawyerSheetData = { raw_data };

      const prenomnom = at(row, 'prenomnom');
      lawyer.prenomnom = prenomnom;
      lawyer.nom_complet = at(row, 'nom_complet') || prenomnom;

      // Civilité F/M : brute si présente, sinon dérivée de la salutation
      // « Cher / chère » (Chère -> F, Cher -> M) car l'onglet source ne fournit
      // pas toujours la lettre F/M directement.
      const civBrut = at(row, 'civilite').trim();
      const salut = at(row, 'civilite_salutation')
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents (chère -> chere)
        .trim().toLowerCase();
      lawyer.civilite = civBrut || (salut.startsWith('chere') ? 'F' : salut.startsWith('cher') ? 'M' : '');

      // Cabinet : `cabinet` = raison sociale (clé technique/regroupement).
      // `cabinet_display` = nom commercial (plus lisible) si présent, sinon raison sociale.
      const cabinetRaisonSociale = at(row, 'cabinet');
      const cabinetNomCommercial = at(row, 'cabinet_nom_commercial');
      lawyer.cabinet = cabinetRaisonSociale;
      lawyer.cabinet_nom_commercial = cabinetNomCommercial;
      lawyer.cabinet_display = cabinetNomCommercial || cabinetRaisonSociale;
      lawyer.statut_cabinet = at(row, 'statut_cabinet');
      lawyer.xp = at(row, 'xp');
      lawyer.specialite = at(row, 'specialite');
      lawyer.mandat = at(row, 'mandat');
      lawyer.langue = at(row, 'langue');
      lawyer.nationalite = at(row, 'nationalite');
      lawyer.tranche_taille_cabinet = at(row, 'tranche_taille_cabinet');
      lawyer.tel_portable = at(row, 'telephone'); // clé 'telephone' = colonne "Numéro de portable"
      lawyer.telephone = lawyer.tel_portable;
      lawyer.linkedin = at(row, 'linkedin');
      lawyer.email = at(row, 'email');

      const cls = at(row, 'classement').trim();
      if (cls && cls !== '#N/A' && cls !== '#N/D') lawyer.classement = cls;

      const sabine = at(row, 'linkedin_sabine');
      lawyer.linkedin_sabine = sabine === '1' || sabine.toLowerCase() === 'true';
      const bernard = at(row, 'linkedin_bernard');
      lawyer.linkedin_bernard = bernard === '1' || bernard.toLowerCase() === 'true';

      const pdp = at(row, 'photo_url').trim();
      if (pdp && pdp !== '#N/A' && pdp !== '#N/D' && (pdp.includes('http') || pdp.includes('www'))) {
        lawyer.photo_url = pdp;
      }

      return lawyer;
    });

    return {
      headers,
      data,
      totalRows: dataRows.length,
      lastUpdated: new Date()
    };

  } catch (error) {
    console.error('Erreur lors de la récupération des données Google Sheets:', error);
    throw error;
  }
}

// Fonction pour récupérer seulement les headers (pour analyser la structure)
export async function fetchSheetHeaders(): Promise<string[]> {
  try {
    const sheets = await getAuthenticatedSheets();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: await getSourceRange(sheets, '1:1'), // Seulement la première ligne (onglet résolu par gid)
    });

    return response.data.values?.[0] || [];
    
  } catch (error) {
    console.error('Erreur lors de la récupération des headers:', error);
    throw error;
  }
}

// Fonction pour analyser la structure complète du sheet
export async function analyzeSheetStructure() {
  try {
    const headers = await fetchSheetHeaders();
    
    const analysis = {
      totalColumns: headers.length,
      importantColumns: {
        classement: headers[45] || 'AT', // Colonne AT (index 45)
        linkedin_sabine: headers[59] || 'BH', // Colonne BH (index 59) - Sabine
        linkedin_bernard: headers[60] || 'BI', // Colonne BI (index 60) - Bernard  
        photo_url: headers[74] || 'BW', // Colonne BW (index 74)
      },
      allHeaders: headers,
      columnsAXtoBQ: headers.slice(49, 69), // Colonnes AX(50) à BQ(69)
    };

    return analysis;
    
  } catch (error) {
    console.error('Erreur lors de l\'analyse de la structure:', error);
    throw error;
  }
}

// Fonction pour tester la connexion
export async function testSheetConnection(): Promise<boolean> {
  try {
    await fetchSheetHeaders();
    return true;
  } catch (error) {
    return false;
  }
}