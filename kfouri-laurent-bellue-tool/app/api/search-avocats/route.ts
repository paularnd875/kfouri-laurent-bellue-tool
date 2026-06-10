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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const classification = searchParams.get('classification');
    const etiquette = searchParams.get('etiquette');
    const sortBy = searchParams.get('sortBy') || 'nom';

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

    // Vérifier le cache pour les données complètes
    const cacheKey = 'all-avocats-data-v1';
    let avocats = globalCache.get<Avocat[]>(cacheKey);

    if (!avocats) {
      console.log('💾 Données avocats non trouvées en cache, récupération depuis Google Sheets...');
      
      // Récupérer les en-têtes pour mapping dynamique
      const headersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Base principale'!1:1",
      });

      const headers = headersResponse.data.values?.[0] || [];

      // Créer le mapping dynamique des colonnes
      const columnMapping = {
        nom: headers.findIndex(h => h === 'Nom complet') >= 0 ? headers.findIndex(h => h === 'Nom complet') : 8,
        telFixe: headers.findIndex(h => h === 'tel_fixe') >= 0 ? headers.findIndex(h => h === 'tel_fixe') : 9,
        telPortable: headers.findIndex(h => h === 'Numéro de portable') >= 0 ? headers.findIndex(h => h === 'Numéro de portable') : 10,
        email: headers.findIndex(h => h === 'Email') >= 0 ? headers.findIndex(h => h === 'Email') : 14,
        linkedin: headers.findIndex(h => h === 'LinkedIn') >= 0 ? headers.findIndex(h => h === 'LinkedIn') : 16,
        structure: headers.findIndex(h => h === 'Structure') >= 0 ? headers.findIndex(h => h === 'Structure') : 35,
        classification: headers.findIndex(h => h === 'Classification') >= 0 ? headers.findIndex(h => h === 'Classification') : 45,
        photo: headers.findIndex(h => h === 'URL\nPDP') >= 0 ? headers.findIndex(h => h === 'URL\nPDP') : 74,
        vote1T: headers.findIndex(h => h === 'Vote 1T') >= 0 ? headers.findIndex(h => h === 'Vote 1T') : 71,
        vote2T: headers.findIndex(h => h === 'Vote 2T') >= 0 ? headers.findIndex(h => h === 'Vote 2T') : 72,
        etiquettesStart: 50,
        etiquettesEnd: 69,
        etiquettesNames: headers.slice(50, 70).filter(h => h && h.trim() !== '')
      };

      // Récupérer toutes les données
      const dataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "'Base principale'!A:BZ",
      });

      const rows = dataResponse.data.values || [];
      console.log(`📊 ${rows.length - 1} lignes de données récupérées`);

      // Traiter les données et créer la liste des avocats
      avocats = [];
      
      rows.slice(1).forEach((row, index) => {
        if (!row || row.length === 0) return;

        const avocat: Avocat = {
          nom: row[columnMapping.nom] || '',
          email: row[columnMapping.email] || '',
          telFixe: row[columnMapping.telFixe] || undefined,
          telPortable: row[columnMapping.telPortable] || undefined,
          linkedin: row[columnMapping.linkedin] || undefined,
          photo: (row[columnMapping.photo] && row[columnMapping.photo] !== '#N/A') ? row[columnMapping.photo] : undefined,
          structure: row[columnMapping.structure] || 'Individuels',
          classification: row[columnMapping.classification] as 'C1' | 'C2' | 'C3' | 'Blacklist' || undefined,
          vote1erTour: (row[columnMapping.vote1T] || '0') === '1',
          vote2emeTour: (row[columnMapping.vote2T] || '0') === '1',
          etiquettes: {}
        };

        // Traiter les étiquettes
        columnMapping.etiquettesNames.forEach((etiquetteName, etiquetteIndex) => {
          const colIndex = columnMapping.etiquettesStart + etiquetteIndex;
          if (row[colIndex] === '1') {
            avocat.etiquettes[etiquetteName] = true;
          }
        });

        // Skip avocats sans nom
        if (avocat.nom.trim()) {
          avocats!.push(avocat);
        }
      });

      // Mettre en cache pour 10 minutes
      globalCache.set(cacheKey, avocats, 10 * 60 * 1000);
      console.log(`✅ Données avocats mises en cache: ${avocats.length} avocats`);
    }

    // Filtrer les avocats
    let filteredAvocats = [...avocats];

    // Filtre par requête de recherche
    if (query.trim()) {
      const queryLower = query.toLowerCase().trim();
      filteredAvocats = filteredAvocats.filter(avocat => 
        avocat.nom.toLowerCase().includes(queryLower) ||
        avocat.email.toLowerCase().includes(queryLower) ||
        avocat.structure.toLowerCase().includes(queryLower)
      );
    }

    // Filtre par classification
    if (classification) {
      filteredAvocats = filteredAvocats.filter(avocat => 
        avocat.classification === classification
      );
    }

    // Filtre par étiquette
    if (etiquette) {
      filteredAvocats = filteredAvocats.filter(avocat => 
        avocat.etiquettes[etiquette] === true
      );
    }

    // Tri
    filteredAvocats.sort((a, b) => {
      if (sortBy === 'nom') {
        return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      } else if (sortBy === 'structure') {
        return a.structure.localeCompare(b.structure, 'fr', { sensitivity: 'base' });
      }
      return 0;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAvocats = filteredAvocats.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: paginatedAvocats,
      pagination: {
        page,
        limit,
        total: filteredAvocats.length,
        totalPages: Math.ceil(filteredAvocats.length / limit),
        hasNext: endIndex < filteredAvocats.length,
        hasPrev: page > 1
      },
      cached: globalCache.has(cacheKey)
    });

  } catch (error) {
    console.error('Erreur lors de la recherche des avocats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la recherche des avocats: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}