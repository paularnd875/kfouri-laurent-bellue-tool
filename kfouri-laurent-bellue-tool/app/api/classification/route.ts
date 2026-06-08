import { fetchAllSheetData } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classification = searchParams.get('classification'); // C1|C2|C3|Blacklist|unclassified
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    if (!classification) {
      return NextResponse.json(
        { error: 'Paramètre classification requis', success: false },
        { status: 400 }
      );
    }

    // Récupérer toutes les données depuis Google Sheets
    const sheetData = await fetchAllSheetData();

    let filteredData = sheetData.data;

    // Filtrer par classification
    if (classification === 'unclassified') {
      filteredData = filteredData.filter(lawyer => 
        !lawyer.classement || lawyer.classement === ''
      );
    } else {
      filteredData = filteredData.filter(lawyer => 
        lawyer.classement === classification
      );
    }

    // Appliquer les filtres de recherche
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(lawyer => 
        lawyer.prenomnom?.toLowerCase().includes(searchLower) ||
        lawyer.nom_complet?.toLowerCase().includes(searchLower) ||
        lawyer.email?.toLowerCase().includes(searchLower) ||
        lawyer.cabinet?.toLowerCase().includes(searchLower)
      );
    }

    // Trier par nom
    filteredData.sort((a, b) => {
      const nameA = a.nom_complet || a.prenomnom || '';
      const nameB = b.nom_complet || b.prenomnom || '';
      return nameA.localeCompare(nameB, 'fr');
    });

    // Appliquer la pagination
    const paginatedData = filteredData.slice(offset, offset + limit);

    // Calculer les statistiques
    const allClassifications = {
      c1: sheetData.data.filter(l => l.classement === 'C1').length,
      c2: sheetData.data.filter(l => l.classement === 'C2').length,
      c3: sheetData.data.filter(l => l.classement === 'C3').length,
      blacklist: sheetData.data.filter(l => l.classement === 'Blacklist').length,
      unclassified: sheetData.data.filter(l => !l.classement || l.classement === '').length,
    };

    // Analyser les sources de classification existantes depuis raw_data
    const classificationSources = new Set<string>();
    paginatedData.forEach(lawyer => {
      if (lawyer.raw_data) {
        const rawData = lawyer.raw_data;
        // Chercher les colonnes de classification
        Object.keys(rawData).forEach(key => {
          if (key.includes('C123') || key.includes('SOUTIENS') || key.includes('PROCHES')) {
            if (rawData[key] && rawData[key] !== '0' && rawData[key] !== '') {
              classificationSources.add(`${key}: ${rawData[key]}`);
            }
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      classification,
      data: paginatedData,
      pagination: {
        limit,
        offset,
        total: filteredData.length,
        hasMore: offset + limit < filteredData.length
      },
      stats: {
        current: filteredData.length,
        allClassifications,
        classificationRate: sheetData.totalRows > 0 ? 
          Math.round(((allClassifications.c1 + allClassifications.c2 + allClassifications.c3 + allClassifications.blacklist) / sheetData.totalRows) * 100) : 0
      },
      metadata: {
        sources: Array.from(classificationSources).slice(0, 10), // Limite pour éviter trop de données
        lastUpdated: sheetData.lastUpdated
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la classification:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      }, 
      { status: 500 }
    );
  }
}