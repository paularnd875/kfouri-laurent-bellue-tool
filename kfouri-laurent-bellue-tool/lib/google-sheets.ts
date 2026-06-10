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

      // Traitement spécial pour les colonnes importantes - utilisation des noms d'en-têtes
      headers.forEach((header, index) => {
        const cellValue = row[index] || '';
        const headerName = header.trim();
        
        // Classification (colonne AT - index 45)
        if (headerName === 'Classification' || headerName.includes('classement') || headerName.includes('Classement') || index === 45) {
          if (cellValue && cellValue.trim() && cellValue !== '#N/A' && cellValue !== '#N/D') {
            lawyer.classement = cellValue.trim();
          }
        }
        
        // LinkedIn Sabine (colonne BH - index 59)
        else if (headerName.includes('Sabine') || index === 59) {
          lawyer.linkedin_sabine = cellValue === '1' || cellValue.toLowerCase() === 'true';
        }
        
        // LinkedIn Bernard (colonne BI - index 60) 
        else if (headerName.includes('Bernard') || index === 60) {
          lawyer.linkedin_bernard = cellValue === '1' || cellValue.toLowerCase() === 'true';
        }
        
        // Photo URL (colonne BW - index 74)
        else if (headerName === 'URL\nPDP' || headerName.includes('photo') || headerName.includes('PDP') || headerName.includes('URL') || index === 74) {
          if (cellValue && cellValue !== '#N/A' && cellValue !== '#N/D' && cellValue.trim().length > 0 && (cellValue.includes('http') || cellValue.includes('www'))) {
            lawyer.photo_url = cellValue.trim();
          }
        }
      });

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