import { fetchAllSheetData } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const classification = searchParams.get('classification') || '';
    const cabinet = searchParams.get('cabinet') || '';

    // Récupérer toutes les données depuis Google Sheets
    const sheetData = await fetchAllSheetData();

    let filteredData = sheetData.data;

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

    // Filtrer par classification
    if (classification && classification !== 'all') {
      filteredData = filteredData.filter(lawyer => 
        lawyer.classement === classification
      );
    }

    // Filtrer par cabinet
    if (cabinet && cabinet !== 'all') {
      filteredData = filteredData.filter(lawyer => 
        lawyer.cabinet === cabinet
      );
    }

    // Appliquer la pagination
    const paginatedData = filteredData.slice(offset, offset + limit);

    // Calculer les statistiques
    const stats = {
      total: filteredData.length,
      totalLawyers: sheetData.totalRows,
      totalFirms: [...new Set(sheetData.data.map(l => l.cabinet).filter(Boolean))].length,
      bernardLinkedIn: sheetData.data.filter(l => l.linkedin_bernard).length,
      sabineLinkedIn: sheetData.data.filter(l => l.linkedin_sabine).length,
      classifications: {
        c1: sheetData.data.filter(l => l.classement === 'C1').length,
        c2: sheetData.data.filter(l => l.classement === 'C2').length,
        c3: sheetData.data.filter(l => l.classement === 'C3').length,
        blacklist: sheetData.data.filter(l => l.classement === 'Blacklist').length,
      }
    };

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        limit,
        offset,
        total: filteredData.length,
        hasMore: offset + limit < filteredData.length
      },
      stats,
      lastUpdated: sheetData.lastUpdated
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des avocats:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      }, 
      { status: 500 }
    );
  }
}