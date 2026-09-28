import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { parseServiceAccountKey } from '@/lib/google-credentials';
import { columnIndices } from '@/lib/column-map';
import { getSourceRange, getSourceTabTitle } from '@/lib/google-sheets';

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
      credentials = parseServiceAccountKey();
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
    const spreadsheetId = '12mDu_ceWutd4TqCaX0AJ81rtR5v04tlx8rWxO3o20z0';

    // Onglet source résolu par gid (immuable), plage A:CZ
    const sheetName = await getSourceTabTitle(sheets);
    console.log('Nom d\'onglet utilisé:', sheetName);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: await getSourceRange(sheets, 'A:CZ'),
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucune donnée trouvée'
      });
    }

    // Résolution des colonnes PAR NOM d'en-tête via le résolveur central.
    const headers = rows[0] || [];
    const idx = columnIndices(headers);
    const nomIndex = idx.nom_complet;
    const telPortableIndex = idx.telephone;
    const emailIndex = idx.email;
    const linkedinIndex = idx.linkedin;
    const structureIndex = idx.cabinet;

    console.log('Indices des colonnes utilisées:', {
      nom: nomIndex,
      telPortable: telPortableIndex,
      email: emailIndex,
      linkedin: linkedinIndex,
      structure: structureIndex,
    });

    // Skip header row et traiter les données
    const avocats: AvocatCabinet[] = rows.slice(1)
      .map((row, index): AvocatCabinet | null => {
        if (!row || row.length === 0) return null;

        const nomComplet = nomIndex >= 0 ? (row[nomIndex] || '') : '';
        // La nouvelle feuille ne fournit plus de colonne fixe dédiée.
        const telFixe = '';
        const telPortable = telPortableIndex >= 0 ? (row[telPortableIndex] || '') : '';
        const email = emailIndex >= 0 ? (row[emailIndex] || '') : '';
        const structure = structureIndex >= 0 ? (row[structureIndex] || '') : '';
        const linkedin = linkedinIndex >= 0 ? (row[linkedinIndex] || '') : '';

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