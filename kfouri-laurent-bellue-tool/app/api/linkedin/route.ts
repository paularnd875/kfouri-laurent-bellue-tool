import { fetchAllSheetData } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network'); // 'bernard' | 'sabine' | 'both'
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const classification = searchParams.get('classification') || '';
    const cabinet = searchParams.get('cabinet') || '';

    if (!network || !['bernard', 'sabine', 'both'].includes(network)) {
      return NextResponse.json(
        { error: 'Paramètre network requis: bernard, sabine, ou both', success: false },
        { status: 400 }
      );
    }

    // Récupérer toutes les données depuis Google Sheets
    const sheetData = await fetchAllSheetData();

    let filteredData = sheetData.data;

    // Filtrer par réseau LinkedIn
    switch (network) {
      case 'bernard':
        filteredData = filteredData.filter(lawyer => lawyer.linkedin_bernard === true);
        break;
      case 'sabine':
        filteredData = filteredData.filter(lawyer => lawyer.linkedin_sabine === true);
        break;
      case 'both':
        filteredData = filteredData.filter(lawyer => 
          lawyer.linkedin_bernard === true && lawyer.linkedin_sabine === true
        );
        break;
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

    // Filtrer par classification
    if (classification && classification !== 'all') {
      if (classification === 'unclassified') {
        filteredData = filteredData.filter(lawyer => 
          !lawyer.classement || lawyer.classement === ''
        );
      } else {
        filteredData = filteredData.filter(lawyer => 
          lawyer.classement === classification
        );
      }
    }

    // Filtrer par cabinet
    if (cabinet && cabinet !== 'all') {
      filteredData = filteredData.filter(lawyer => 
        lawyer.cabinet === cabinet
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

    // Calculer les statistiques du réseau
    const networkStats = {
      total: filteredData.length,
      totalWithBoth: sheetData.data.filter(l => l.linkedin_bernard && l.linkedin_sabine).length,
      classifications: {
        c1: filteredData.filter(l => l.classement === 'C1').length,
        c2: filteredData.filter(l => l.classement === 'C2').length,
        c3: filteredData.filter(l => l.classement === 'C3').length,
        blacklist: filteredData.filter(l => l.classement === 'Blacklist').length,
        unclassified: filteredData.filter(l => !l.classement || l.classement === '').length,
      },
      topFirms: getTopFirmsFromData(filteredData),
      classificationRate: filteredData.length > 0 ? 
        Math.round(((filteredData.filter(l => l.classement && l.classement !== '').length) / filteredData.length) * 100) : 0
    };

    return NextResponse.json({
      success: true,
      network,
      data: paginatedData,
      pagination: {
        limit,
        offset,
        total: filteredData.length,
        hasMore: offset + limit < filteredData.length
      },
      stats: networkStats,
      lastUpdated: sheetData.lastUpdated
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du réseau LinkedIn:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      }, 
      { status: 500 }
    );
  }
}

function getTopFirmsFromData(lawyers: any[]): { name: string; count: number }[] {
  const firmCounts = new Map<string, number>();
  
  lawyers.forEach(lawyer => {
    const firm = lawyer.cabinet || 'Cabinet non spécifié';
    firmCounts.set(firm, (firmCounts.get(firm) || 0) + 1);
  });

  return Array.from(firmCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}