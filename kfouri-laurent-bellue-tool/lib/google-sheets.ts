import { google } from 'googleapis';

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
  classement?: string; // Colonne AS - C1/C2/C3/Blacklist
  linkedin_sabine?: boolean; // Colonne BG - Relations LinkedIn Sabine
  linkedin_bernard?: boolean; // Colonne BH - Relations LinkedIn Bernard  
  photo_url?: string; // Colonne BU - URL photo
  
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

    // Mapper les données en objets
    const data: LawyerSheetData[] = dataRows.map(row => {
      const lawyer: LawyerSheetData = {
        raw_data: {}
      };

      // Mapper chaque colonne
      headers.forEach((header, index) => {
        const cellValue = row[index] || '';
        
        // Mapping des colonnes importantes
        switch (header.toLowerCase().trim()) {
          case 'prenomnom':
          case 'prenom nom':
          case 'nom complet':
          case 'nomcomplet':
            if (!lawyer.prenomnom) { // Only set if not already set
              lawyer.prenomnom = cellValue;
            }
            lawyer.nom_complet = cellValue;
            break;
          case 'civilite':
          case 'civilité':
            lawyer.civilite = cellValue;
            break;
          case 'cabinet':
          case 'structure':
            lawyer.cabinet = cellValue;
            break;
          case 'telephone':
          case 'téléphone':
            lawyer.telephone = cellValue;
            break;
          case 'email':
            lawyer.email = cellValue;
            break;
          default:
            // Pour toutes les autres colonnes, stocker dans raw_data
            if (lawyer.raw_data) {
              lawyer.raw_data[header] = cellValue;
            }
        }
      });

      // Traitement spécial pour les colonnes par position (AS, BG, BH, BU)
      // AS = colonne 45 (A=1, S=19 → AS=45)
      if (row[44]) { // Index 44 = colonne AS
        lawyer.classement = row[44];
      }
      
      // BG = colonne 59 (B=2, G=7 → BG=59) 
      if (row[58]) { // Index 58 = colonne BG
        lawyer.linkedin_sabine = row[58] === '1' || row[58].toLowerCase() === 'true';
      }
      
      // BH = colonne 60
      if (row[59]) { // Index 59 = colonne BH  
        lawyer.linkedin_bernard = row[59] === '1' || row[59].toLowerCase() === 'true';
      }
      
      // BU = colonne 73
      if (row[72]) { // Index 72 = colonne BU
        lawyer.photo_url = row[72];
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
        classement: headers[44] || 'AS', // Colonne AS
        linkedin_sabine: headers[58] || 'BG', // Colonne BG
        linkedin_bernard: headers[59] || 'BH', // Colonne BH  
        photo_url: headers[72] || 'BU', // Colonne BU
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