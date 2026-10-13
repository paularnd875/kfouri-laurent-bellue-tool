import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { parseServiceAccountKey } from '@/lib/google-credentials';
import { globalCache } from '@/lib/cache';
import { columnIndices, etiquetteColumns } from '@/lib/column-map';
import { getSourceRange } from '@/lib/google-sheets';

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
  etiquettes: { [key: string]: boolean };
  // Champs additionnels utilises par les nouveaux filtres
  statutCabinet?: string;
  anneeSerment?: string;
  tailleCabinet?: string;
}

// Interface pour un cabinet avec ses avocats et statistiques
interface CabinetData {
  nom: string;
  effectif: number;
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
    // Nouveaux filtres : mode d'exercice (CSV), bornes annee de serment, taille cabinet (CSV)
    const modeExerciceParam = searchParams.get('modeExercice');
    const modeExercice = modeExerciceParam
      ? modeExerciceParam.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const sermentMinParam = searchParams.get('sermentMin');
    const sermentMaxParam = searchParams.get('sermentMax');
    const sermentMin = sermentMinParam ? parseInt(sermentMinParam, 10) : null;
    const sermentMax = sermentMaxParam ? parseInt(sermentMaxParam, 10) : null;
    const tailleCabinetParam = searchParams.get('tailleCabinet');
    const tailleCabinet = tailleCabinetParam
      ? tailleCabinetParam.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Configuration Google Sheets
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

    // Étape 1: Récupérer et analyser les en-têtes pour mapping dynamique
    console.log('🔍 Récupération des en-têtes pour mapping des colonnes...');

    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: await getSourceRange(sheets, '1:1'), // Ligne d'en-tête uniquement (onglet résolu par gid)
    });

    const headers = headersResponse.data.values?.[0] || [];
    console.log('📋 En-têtes récupérés:', headers.length, 'colonnes');
    // Header mapping debug logs removed - photos working correctly

    // Mapping des colonnes par NOM d'en-tête (index de secours) via le résolveur central
    const idx = columnIndices(headers);
    const etiquettes = etiquetteColumns(headers);
    const columnMapping: ColumnMapping = {
      nom: idx.nom_complet,
      telFixe: -1, // colonne fixe absente de la nouvelle feuille
      telPortable: idx.telephone,
      email: idx.email,
      linkedin: idx.linkedin,
      structure: idx.cabinet,
      classification: idx.classement,
      photo: idx.photo_url,
      etiquettesStart: 0,
      etiquettesEnd: 0,
      etiquettesNames: [],
    };

    console.log('🗂️ Mapping des colonnes:', columnMapping);

    // Vérifier le cache pour les données complètes
    const cacheKey = `avocats-cabinets-full-data-photos-v2`;
    let cabinetDataMap = globalCache.get<Map<string, CabinetData>>(cacheKey);

    if (!cabinetDataMap) {
      console.log('💾 Données non trouvées en cache, récupération depuis Google Sheets...');
      
      // Récupérer toutes les données (onglet source résolu par gid, plage A:CZ)
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: await getSourceRange(sheets, 'A:CZ'),
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
          // telFixe : la nouvelle feuille ne fournit plus de colonne fixe dédiée.
          telFixe: undefined,
          telPortable: row[columnMapping.telPortable] || undefined,
          linkedin: row[columnMapping.linkedin] || undefined,
          photo: (row[columnMapping.photo] && row[columnMapping.photo] !== '#N/A') ? row[columnMapping.photo] : undefined,
          structure: row[columnMapping.structure] || '',
          classification: row[columnMapping.classification] as 'C1' | 'C2' | 'C3' | 'Blacklist' || undefined,
          etiquettes: {},
          statutCabinet: row[idx.statut_cabinet] || undefined,
          anneeSerment: row[idx.annee_serment] || undefined,
          tailleCabinet: row[idx.tranche_taille_cabinet] || undefined,
        };

        // Étiquettes (soutiens) détectées par nom d'en-tête, robuste au réordonnancement
        etiquettes.forEach(({ name, index: colIndex }) => {
          if (row[colIndex] === '1') {
            avocat.etiquettes[name] = true;
          }
        });

        // Déterminer le nom du cabinet
        const cabinetNom = avocat.structure || 'Individuels';

        // Ajouter l'avocat au cabinet
        if (!cabinetDataMap!.has(cabinetNom)) {
          cabinetDataMap!.set(cabinetNom, {
            nom: cabinetNom,
            effectif: 0,
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

    // Nouveaux filtres (mode d'exercice / annee de serment / taille cabinet) :
    // un cabinet est conserve s'il possede au moins un avocat satisfaisant TOUS
    // les filtres actifs (ET entre filtres, OR interne aux selections multiples).
    const hasNewFilter =
      modeExercice.length > 0 ||
      sermentMin !== null ||
      sermentMax !== null ||
      tailleCabinet.length > 0;
    if (hasNewFilter) {
      cabinets = cabinets.filter(cabinet => {
        return cabinet.avocats.some(avocat => {
          if (modeExercice.length > 0) {
            if (!avocat.statutCabinet || !modeExercice.includes(avocat.statutCabinet)) {
              return false;
            }
          }
          if (sermentMin !== null || sermentMax !== null) {
            const annee = parseInt(avocat.anneeSerment || '', 10);
            if (isNaN(annee)) return false;
            if (sermentMin !== null && annee < sermentMin) return false;
            if (sermentMax !== null && annee > sermentMax) return false;
          }
          if (tailleCabinet.length > 0) {
            if (!avocat.tailleCabinet || !tailleCabinet.includes(avocat.tailleCabinet)) {
              return false;
            }
          }
          return true;
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