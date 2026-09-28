import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { parseServiceAccountKey } from '@/lib/google-credentials';
import { globalCache } from '@/lib/cache';

// Interface pour les données de vote des cabinets
interface CabinetVoteData {
  structure: string;
  effectif: number;
  votants1T: number;
  tauxVote1T: number;
  votants2T: number;
  tauxVote2T: number;
  moyenneVote: number;
  trancheEffectif: string;
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(request.url);
    const minEffectif = parseInt(searchParams.get('minEffectif') || '10');
    const maxEffectif = parseInt(searchParams.get('maxEffectif') || '30');
    const maxTauxVote = parseInt(searchParams.get('maxTauxVote') || '100');
    const sortBy = searchParams.get('sortBy') || 'moyenneVote';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    // Créer clé de cache basée sur les paramètres
    const cacheKey = `cabinets-votes-${minEffectif}-${maxEffectif}-${maxTauxVote}-${sortBy}-${sortOrder}`;
    const cachedData = globalCache.get<any>(cacheKey);
    
    if (cachedData) {
      console.log('✅ Cabinets votes data served from cache');
      return NextResponse.json({
        ...cachedData,
        cached: true
      });
    }

    console.log('🔄 Loading cabinets votes data from Google Sheets...');

    // Configuration Google Sheets - utiliser la clé complète
    let credentials;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      credentials = parseServiceAccountKey();
    } else {
      // Fallback vers variables séparées si nécessaire
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

    // L'onglet de synthèse des votes n'existe plus sur la nouvelle feuille.
    // Lecture best-effort : si l'onglet est absent, on renvoie un jeu de données
    // vide (mêmes champs) plutôt que de casser la réponse.
    const range = "'Synthèse vote toutes structures'!A:H"; // Colonnes A à H
    let rows: string[][] = [];
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      rows = (response.data.values as string[][]) || [];
    } catch (e) {
      console.warn('Onglet votes absent sur la nouvelle feuille, données neutres:', e instanceof Error ? e.message : e);
      rows = [];
    }

    // Skip header row et traiter les données
    const cabinetData: CabinetVoteData[] = rows.slice(1)
      .map(row => {
        if (row.length < 8) return null; // S'assurer qu'on a toutes les colonnes

        return {
          structure: row[0] || '',
          effectif: parseInt(row[1]) || 0,
          votants1T: parseInt(row[2]) || 0,
          tauxVote1T: parseFloat(row[3]) || 0,
          votants2T: parseInt(row[4]) || 0,
          tauxVote2T: parseFloat(row[5]) || 0,
          moyenneVote: parseFloat(row[6]) || 0,
          trancheEffectif: row[7] || ''
        };
      })
      .filter((cabinet): cabinet is CabinetVoteData => 
        cabinet !== null && cabinet.structure !== ''
      );

    // Filtrage des cabinets "ventres mous" (10-30 avocats)
    let filteredCabinets = cabinetData.filter(cabinet => 
      cabinet.effectif >= minEffectif && 
      cabinet.effectif <= maxEffectif &&
      cabinet.moyenneVote <= maxTauxVote
    );

    // Tri des données
    filteredCabinets.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'effectif':
          aValue = a.effectif;
          bValue = b.effectif;
          break;
        case 'tauxVote1T':
          aValue = a.tauxVote1T;
          bValue = b.tauxVote1T;
          break;
        case 'tauxVote2T':
          aValue = a.tauxVote2T;
          bValue = b.tauxVote2T;
          break;
        case 'moyenneVote':
        default:
          aValue = a.moyenneVote;
          bValue = b.moyenneVote;
          break;
      }

      if (sortOrder === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });

    // Statistiques (garde des valeurs neutres si aucun cabinet, ex. onglet votes absent)
    const nbCab = filteredCabinets.length;
    const stats = {
      totalCabinets: nbCab,
      effectifMoyen: nbCab > 0 ? Math.round(
        filteredCabinets.reduce((sum, cab) => sum + cab.effectif, 0) / nbCab
      ) : 0,
      tauxVoteMoyen: nbCab > 0 ? Math.round(
        filteredCabinets.reduce((sum, cab) => sum + cab.moyenneVote, 0) / nbCab * 100
      ) / 100 : 0,
      repartitionTranches: filteredCabinets.reduce((acc, cab) => {
        acc[cab.trancheEffectif] = (acc[cab.trancheEffectif] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    // Préparer la réponse
    const responseData = {
      success: true,
      data: filteredCabinets,
      stats,
      filters: {
        minEffectif,
        maxEffectif,
        maxTauxVote,
        sortBy,
        sortOrder
      },
      cached: false
    };

    // Mettre en cache pour 5 minutes
    globalCache.set(cacheKey, responseData, 5 * 60 * 1000);
    console.log(`✅ Cabinets votes data cached (${filteredCabinets.length} cabinets)`);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Erreur lors de la récupération des données de vote:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des données: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}