import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Interface pour les données de matching LinkedIn
interface LinkedInMatch {
  nomComplet: string;
  email: string;
  cabinet: string;
  linkedin_bernard?: boolean;
  linkedin_sabine?: boolean;
}

interface CabinetLinkedInMatching {
  cabinetName: string;
  bernardContacts: LinkedInMatch[];
  sabineContacts: LinkedInMatch[];
  totalContacts: number;
}

export async function GET(request: NextRequest) {
  try {
    // Configuration Google Sheets - utiliser la clé complète
    let credentials;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } else {
      credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1e-xkI8LcsgbgefP2Lv9Ym4ZyCL-4VXHgGdVh6xLbtAw';
    
    // D'abord, obtenir les informations sur les onglets pour voir les noms exacts
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    console.log('Onglets disponibles:', spreadsheetInfo.data.sheets?.map(s => s.properties?.title));
    
    // Trouver le bon nom d'onglet - utiliser "Base principale" qui contient les données
    const resourcesSheet = spreadsheetInfo.data.sheets?.find(s => 
      s.properties?.title?.toLowerCase().includes('base') ||
      s.properties?.title?.toLowerCase().includes('principale') ||
      s.properties?.title?.toLowerCase().includes('ressources') ||
      s.properties?.title?.toLowerCase().includes('humaines')
    );
    
    const sheetName = resourcesSheet?.properties?.title || 'Base principale';
    console.log('Nom d\'onglet utilisé:', sheetName);
    
    // Récupération des données LinkedIn depuis l'onglet approprié avec le nom exact trouvé
    const range = `${sheetName}!A:BX`; // Étendu pour récupérer toutes les colonnes
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Aucune donnée trouvée' 
      });
    }

    // Skip header row et traiter les données LinkedIn
    const linkedinData: LinkedInMatch[] = rows.slice(1)
      .map((row, index) => {
        if (!row || row.length === 0) return null;

        const nomComplet = row[0] || ''; // Colonne I
        const email = row[6] || '';       // Colonne O  
        const structure = row[26] || '';  // Colonne AI

        // Rechercher les colonnes LinkedIn (à adapter selon l'onglet exact)
        // Ces colonnes doivent être identifiées dans l'onglet Google Sheets
        const linkedin_bernard = false; // À adapter selon les colonnes réelles
        const linkedin_sabine = false;  // À adapter selon les colonnes réelles

        return {
          nomComplet,
          email,
          cabinet: structure,
          linkedin_bernard,
          linkedin_sabine
        };
      })
      .filter((contact): contact is LinkedInMatch => 
        contact !== null && 
        contact.nomComplet !== '' && 
        contact.cabinet !== ''
      );

    // Grouper par cabinet
    const cabinetMatching: Record<string, CabinetLinkedInMatching> = {};
    
    linkedinData.forEach(contact => {
      if (!cabinetMatching[contact.cabinet]) {
        cabinetMatching[contact.cabinet] = {
          cabinetName: contact.cabinet,
          bernardContacts: [],
          sabineContacts: [],
          totalContacts: 0
        };
      }

      if (contact.linkedin_bernard) {
        cabinetMatching[contact.cabinet].bernardContacts.push(contact);
      }
      
      if (contact.linkedin_sabine) {
        cabinetMatching[contact.cabinet].sabineContacts.push(contact);
      }

      cabinetMatching[contact.cabinet].totalContacts++;
    });

    // Paramètres optionnels pour filtrer par cabinet spécifique
    const { searchParams } = new URL(request.url);
    const cabinetFilter = searchParams.get('cabinet');
    
    if (cabinetFilter) {
      // Retourner seulement le matching pour un cabinet spécifique
      const matching = Object.values(cabinetMatching).find(c => 
        c.cabinetName.toLowerCase().includes(cabinetFilter.toLowerCase()) ||
        cabinetFilter.toLowerCase().includes(c.cabinetName.toLowerCase())
      );
      
      return NextResponse.json({
        success: true,
        data: matching || null,
        cabinet: cabinetFilter
      });
    }

    // Retourner tous les matchings
    return NextResponse.json({
      success: true,
      data: Object.values(cabinetMatching),
      total: Object.keys(cabinetMatching).length
    });

  } catch (error) {
    console.error('Erreur lors du matching LinkedIn:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors du matching LinkedIn: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}