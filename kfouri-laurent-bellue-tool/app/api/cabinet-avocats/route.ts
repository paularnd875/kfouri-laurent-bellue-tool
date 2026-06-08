import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Interface pour les données des avocats d'un cabinet
interface AvocatCabinet {
  nomComplet: string;
  email: string;
  structure: string;
  telFixe?: string;
  telPortable?: string;
  linkedin?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer le nom du cabinet depuis les paramètres
    const { searchParams } = new URL(request.url);
    const cabinetName = searchParams.get('cabinet');
    
    if (!cabinetName) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nom du cabinet requis' 
      });
    }

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
    
    // Récupération des données avec le nom exact trouvé - élargie pour couvrir toutes les colonnes A:BX
    const range = `${sheetName}!A:BX`;
    
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

    // Utiliser les indices fixes des colonnes comme spécifié par l'utilisateur
    // Colonne I = index 8 : "Nom complet" (lisible pour le client)
    // Colonne J = index 9 : téléphone fixe  
    // Colonne K = index 10 : portable
    // Colonne O = index 14 : email
    // Colonne Q = index 16 : LinkedIn
    // Structure : détection automatique car position variable
    
    const headers = rows[0] || [];
    console.log('En-têtes trouvés (premiers 25):', headers.slice(0, 25));
    
    // Indices fixes des colonnes
    const nomIndex = 8;           // Colonne I "Nom complet"
    const telFixeIndex = 9;       // Colonne J  
    const telPortableIndex = 10;  // Colonne K
    const emailIndex = 14;        // Colonne O
    const linkedinIndex = 16;     // Colonne Q
    
    // Détection automatique seulement pour la structure (position variable)
    const structureIndex = headers.findIndex((header: string) => 
      header && (
        header.toLowerCase().includes('structure') ||
        header.toLowerCase().includes('cabinet') ||
        header.toLowerCase().includes('société') ||
        header.toLowerCase().includes('firm')
      )
    );
    
    console.log('Indices des colonnes utilisées:', {
      nom: `${nomIndex} (colonne I - "Nom complet")`,
      telFixe: `${telFixeIndex} (colonne J)`,
      telPortable: `${telPortableIndex} (colonne K)`,
      email: `${emailIndex} (colonne O)`,
      linkedin: `${linkedinIndex} (colonne Q)`,
      structure: `${structureIndex} (détection auto)`
    });

    // Skip header row et traiter les données
    const avocats: AvocatCabinet[] = rows.slice(1)
      .map((row, index): AvocatCabinet | null => {
        if (!row || row.length === 0) return null;

        const nomComplet = nomIndex >= 0 ? (row[nomIndex] || '') : '';
        const telFixe = telFixeIndex >= 0 ? (row[telFixeIndex] || '') : '';
        const telPortable = telPortableIndex >= 0 ? (row[telPortableIndex] || '') : '';
        const email = emailIndex >= 0 ? (row[emailIndex] || '') : '';
        const structure = structureIndex >= 0 ? (row[structureIndex] || '') : '';
        const linkedin = linkedinIndex >= 0 ? (row[linkedinIndex] || '') : '';

        // Debug log pour voir les données
        if (index < 3) {
          console.log(`Row ${index}:`, {
            nomComplet,
            telFixe,
            telPortable,
            email, 
            structure,
            linkedin,
            rowLength: row.length
          });
        }

        return {
          nomComplet,
          email,
          structure,
          telFixe: telFixe && telFixe !== '#N/A' && telFixe !== '' ? telFixe : undefined,
          telPortable: telPortable && telPortable !== '#N/A' && telPortable !== '' ? telPortable : undefined,
          linkedin: linkedin && linkedin !== '#N/A' && linkedin !== '' ? linkedin : undefined
        };
      })
      .filter((avocat): avocat is AvocatCabinet => 
        avocat !== null && 
        avocat.nomComplet !== '' &&
        avocat.structure !== ''
      );

    console.log('Total avocats récupérés:', avocats.length);
    console.log('Recherche cabinet:', cabinetName);
    console.log('Premiers cabinets trouvés:', avocats.slice(0, 10).map(a => a.structure));

    // Filtrer par cabinet (correspondance exacte ou partielle)
    const avocatsDuCabinet = avocats.filter(avocat => {
      const structureLower = avocat.structure.toLowerCase();
      const cabinetLower = cabinetName.toLowerCase();
      
      // Ignorer les structures vides
      if (!structureLower || structureLower.trim() === '') {
        return false;
      }
      
      // Correspondance exacte ou si le nom du cabinet est contenu dans la structure
      const match = structureLower === cabinetLower || 
                   structureLower.includes(cabinetLower) ||
                   cabinetLower.includes(structureLower);
      
      if (match) {
        console.log('Match trouvé:', avocat.structure, '<=>', cabinetName);
      }
      
      return match;
    });

    console.log('Avocats du cabinet trouvés:', avocatsDuCabinet.length);

    // Trier par nom
    avocatsDuCabinet.sort((a, b) => a.nomComplet.localeCompare(b.nomComplet));

    const stats = {
      totalAvocats: avocatsDuCabinet.length,
      avecEmail: avocatsDuCabinet.filter(a => a.email && a.email !== '').length,
      sansEmail: avocatsDuCabinet.filter(a => !a.email || a.email === '').length
    };

    return NextResponse.json({
      success: true,
      data: avocatsDuCabinet,
      cabinet: cabinetName,
      stats
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des avocats du cabinet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des données: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}