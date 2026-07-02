import { google } from 'googleapis';
import { columnIndices } from './column-map';

// Configuration pour l'accès sécurisé au Google Sheet
const SHEET_ID = '1e-xkI8LcsgbgefP2Lv9Ym4ZyCL-4VXHgGdVh6xLbtAw';
const RANGE = 'Base principale!A:BZ'; // Toutes les colonnes de A à BZ

// Authentification via Service Account
async function getAuthenticatedSheets() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// Interface pour les données du Google Sheet
export interface LawyerSheetData {
  // Colonnes de base (à ajuster selon la vraie structure)
  prenomnom?: string;
  civilite?: string;
  nom_complet?: string;
  telephone?: string;
  email?: string;
  annee_serment?: number;
  cabinet?: string;
  
  // Colonnes importantes mentionnées
  classement?: string; // Colonne AT - C1/C2/C3/Blacklist
  linkedin_sabine?: boolean; // Colonne BH - Relations LinkedIn Sabine (1 si relation, 0 sinon)
  linkedin_bernard?: boolean; // Colonne BI - Relations LinkedIn Bernard (1 si relation, 0 sinon) 
  photo_url?: string; // Colonne BW - URL photo
  
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
    
    // Récupérer les données
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
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
      lawyer.civilite = at(row, 'civilite');
      lawyer.cabinet = at(row, 'cabinet');
      lawyer.telephone = at(row, 'telephone') || at(row, 'tel_fixe');
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
      range: 'Base principale!1:1', // Seulement la première ligne
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