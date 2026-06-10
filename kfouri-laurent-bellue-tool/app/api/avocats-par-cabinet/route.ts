import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { globalCache } from '@/lib/cache';

// Interface pour un avocat avec toutes ses données
interface Avocat {
  nom: string;
  email: string;
  telFixe?: string;
  telPortable?: string;
  linkedin?: string;
  photo?: string;
  structure: string;
  classification?: 'C1' | 'C2' | 'C3' | 'Blacklist';
  vote1erTour: boolean;
  vote2emeTour: boolean;
  etiquettes: { [key: string]: boolean };
}

// Interface pour un cabinet avec ses avocats et statistiques
interface CabinetData {
  nom: string;
  effectif: number;
  votants1T: number;
  tauxVote1T: number;
  votants2T: number;
  tauxVote2T: number;
  moyenneVote: number;
  avocats: Avocat[];
}

// Mapping des colonnes par nom (stocké en cache)
interface ColumnMapping {
  nom: number;           // Colonne I
  telFixe: number;       // Colonne J
  telPortable: number;   // Colonne K
  email: number;         // Colonne O  
  linkedin: number;      // Colonne Q
  structure: number;     // Colonne AJ
  classification: number; // Colonne AT
  photo: number;         // Colonne BW
  vote1T: number;        // Colonne BT
  vote2T: number;        // Colonne BU
  etiquettesStart: number; // Colonne AY
  etiquettesEnd: number;   // Colonne BR
  etiquettesNames: string[]; // Noms des colonnes étiquettes
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const cabinetFilter = searchParams.get('cabinet') || '';
    const minEffectif = parseInt(searchParams.get('minEffectif') || '1');
    const maxEffectif = parseInt(searchParams.get('maxEffectif') || '999');
    const classification = searchParams.get('classification');
    const etiquette = searchParams.get('etiquette');
    const sortBy = searchParams.get('sortBy') || 'effectif';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const ventresMous = searchParams.get('ventresMous') === 'true';

    // Configuration Google Sheets
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

    // Étape 1: Récupérer et analyser les en-têtes pour mapping dynamique
    console.log('🔍 Récupération des en-têtes pour mapping des colonnes...');
    
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Base principale'!1:1", // Ligne d'en-tête uniquement
    });

    const headers = headersResponse.data.values?.[0] || [];
    console.log('📋 En-têtes récupérés:', headers.length, 'colonnes');
    // Header mapping debug logs removed - photos working correctly

    // Créer le mapping dynamique des colonnes
    const columnMapping: ColumnMapping = {
      nom: headers.findIndex(h => h === 'Nom complet') >= 0 ? headers.findIndex(h => h === 'Nom complet') : 8, // I par défaut
      telFixe: headers.findIndex(h => h === 'tel_fixe') >= 0 ? headers.findIndex(h => h === 'tel_fixe') : 9, // J par défaut
      telPortable: headers.findIndex(h => h === 'Numéro de portable') >= 0 ? headers.findIndex(h => h === 'Numéro de portable') : 10, // K par défaut
      email: headers.findIndex(h => h === 'Email') >= 0 ? headers.findIndex(h => h === 'Email') : 14, // O par défaut  
      linkedin: headers.findIndex(h => h === 'LinkedIn') >= 0 ? headers.findIndex(h => h === 'LinkedIn') : 16, // Q par défaut
      structure: headers.findIndex(h => h === 'Structure') >= 0 ? headers.findIndex(h => h === 'Structure') : 35, // AJ par défaut
      classification: headers.findIndex(h => h === 'Classification') >= 0 ? headers.findIndex(h => h === 'Classification') : 45, // AT par défaut
      photo: headers.findIndex(h => h === 'URL\nPDP') >= 0 ? headers.findIndex(h => h === 'URL\nPDP') : 74, // BW par défaut
      vote1T: headers.findIndex(h => h === 'Vote 1T') >= 0 ? headers.findIndex(h => h === 'Vote 1T') : 71, // BT par défaut
      vote2T: headers.findIndex(h => h === 'Vote 2T') >= 0 ? headers.findIndex(h => h === 'Vote 2T') : 72, // BU par défaut
      etiquettesStart: 50, // AY par défaut
      etiquettesEnd: 69,   // BR par défaut
      etiquettesNames: headers.slice(50, 70).filter(h => h && h.trim() !== '') // Noms des étiquettes
    };

    console.log('🗂️ Mapping des colonnes:', columnMapping);

    // Vérifier le cache pour les données complètes
    const cacheKey = `avocats-cabinets-full-data-photos-v1`;
    let cabinetDataMap = globalCache.get<Map<string, CabinetData>>(cacheKey);

    if (!cabinetDataMap) {
      console.log('💾 Données non trouvées en cache, récupération depuis Google Sheets...');
      
      // Récupérer toutes les données de "Base principale"
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Base principale'!A:BZ", // Toutes les colonnes jusqu'à BZ pour inclure BW
      });

      const rows = dataResponse.data.values || [];
      console.log(`📊 ${rows.length - 1} lignes de données récupérées`);

      // Traiter les données et créer la map des cabinets
      cabinetDataMap = new Map<string, CabinetData>();
      
      rows.slice(1).forEach((row, index) => { // Skip header
        if (!row || row.length === 0) return;

        // Les photos sont maintenant récupérées correctement depuis la colonne BW (74)

        const avocat: Avocat = {
          nom: row[columnMapping.nom] || '',
          email: row[columnMapping.email] || '',
          telFixe: row[columnMapping.telFixe] || undefined,
          telPortable: row[columnMapping.telPortable] || undefined,
          linkedin: row[columnMapping.linkedin] || undefined,
          photo: (row[columnMapping.photo] && row[columnMapping.photo] !== '#N/A') ? row[columnMapping.photo] : undefined,
          structure: row[columnMapping.structure] || '',
          classification: row[columnMapping.classification] as 'C1' | 'C2' | 'C3' | 'Blacklist' || undefined,
          vote1erTour: (row[columnMapping.vote1T] || '0') === '1',
          vote2emeTour: (row[columnMapping.vote2T] || '0') === '1',
          etiquettes: {}
        };

        // Traiter les étiquettes (colonnes AY à BR)
        columnMapping.etiquettesNames.forEach((etiquetteName, etiquetteIndex) => {
          const colIndex = columnMapping.etiquettesStart + etiquetteIndex;
          if (row[colIndex] === '1') {
            avocat.etiquettes[etiquetteName] = true;
          }
        });

        // Déterminer le nom du cabinet
        const cabinetNom = avocat.structure || 'Individuels';

        // Ajouter l'avocat au cabinet
        if (!cabinetDataMap!.has(cabinetNom)) {
          cabinetDataMap!.set(cabinetNom, {
            nom: cabinetNom,
            effectif: 0,
            votants1T: 0,
            tauxVote1T: 0,
            votants2T: 0,
            tauxVote2T: 0,
            moyenneVote: 0,
            avocats: []
          });
        }

        const cabinet = cabinetDataMap!.get(cabinetNom);
        if (cabinet) {
          cabinet.avocats.push(avocat);
        }
      });

      // Calculer les statistiques pour chaque cabinet
      cabinetDataMap.forEach((cabinet, nom) => {
        cabinet.effectif = cabinet.avocats.length;
        cabinet.votants1T = cabinet.avocats.filter(a => a.vote1erTour).length;
        cabinet.votants2T = cabinet.avocats.filter(a => a.vote2emeTour).length;
        cabinet.tauxVote1T = cabinet.effectif > 0 ? (cabinet.votants1T / cabinet.effectif) * 100 : 0;
        cabinet.tauxVote2T = cabinet.effectif > 0 ? (cabinet.votants2T / cabinet.effectif) * 100 : 0;
        cabinet.moyenneVote = (cabinet.tauxVote1T + cabinet.tauxVote2T) / 2;
      });

      // Statistiques des photos
      let photosCount = 0;
      let avocatsCount = 0;
      cabinetDataMap.forEach(cabinet => {
        cabinet.avocats.forEach(avocat => {
          avocatsCount++;
          if (avocat.photo) photosCount++;
        });
      });
      
      // Mettre en cache pour 10 minutes
      globalCache.set(cacheKey, cabinetDataMap, 10 * 60 * 1000);
      console.log(`✅ Données mises en cache: ${cabinetDataMap.size} cabinets, ${photosCount}/${avocatsCount} avocats avec photos`);
    }

    // Convertir en array et filtrer si nécessaire
    let cabinets = Array.from(cabinetDataMap.values());

    // Filtre par nom de cabinet
    if (cabinetFilter) {
      cabinets = cabinets.filter(c => 
        c.nom.toLowerCase().includes(cabinetFilter.toLowerCase())
      );
    }

    // Filtre par effectif
    cabinets = cabinets.filter(c => 
      c.effectif >= minEffectif && c.effectif <= maxEffectif
    );

    // Filtre "ventres mous" (10-30 avocats)
    if (ventresMous) {
      cabinets = cabinets.filter(c => 
        c.effectif >= 10 && c.effectif <= 30
      );
    }

    // Filtre par classification ou étiquette
    if (classification || etiquette) {
      cabinets = cabinets.filter(cabinet => {
        return cabinet.avocats.some(avocat => {
          if (classification && avocat.classification === classification) {
            return true;
          }
          if (etiquette && avocat.etiquettes[etiquette] === true) {
            return true;
          }
          return false;
        });
      });
    }

    // Tri
    cabinets.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'nom':
          aValue = a.nom;
          bValue = b.nom;
          if (sortOrder === 'desc') {
            return bValue.localeCompare(aValue, 'fr', { sensitivity: 'base' });
          }
          return aValue.localeCompare(bValue, 'fr', { sensitivity: 'base' });
        case 'tauxVote1T':
          aValue = a.tauxVote1T;
          bValue = b.tauxVote1T;
          break;
        case 'tauxVote2T':
          aValue = a.tauxVote2T;
          bValue = b.tauxVote2T;
          break;
        case 'moyenneVote':
          aValue = a.moyenneVote;
          bValue = b.moyenneVote;
          break;
        case 'effectif':
        default:
          aValue = a.effectif;
          bValue = b.effectif;
          break;
      }

      if (sortOrder === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });

    // Placer "Individuels" en tête si présent
    const individuelsIndex = cabinets.findIndex(c => c.nom === 'Individuels');
    if (individuelsIndex > 0) {
      const individuels = cabinets.splice(individuelsIndex, 1)[0];
      cabinets.unshift(individuels);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCabinets = cabinets.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedCabinets,
      pagination: {
        page,
        limit,
        total: cabinets.length,
        totalPages: Math.ceil(cabinets.length / limit),
        hasNext: endIndex < cabinets.length,
        hasPrev: page > 1
      },
      columnMapping,
      cached: globalCache.has(cacheKey)
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des avocats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des avocats: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}