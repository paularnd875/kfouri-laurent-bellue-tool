import { fetchAllSheetData } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

interface FirmStats {
  name: string;
  lawyer_count: number;
  c1_count: number;
  c2_count: number;
  c3_count: number;
  bl_count: number;
  unclassified_count: number;
  bernard_linkedin_count: number;
  sabine_linkedin_count: number;
  classified_percentage: number;
  support_score: number; // Score basé sur C1=3, C2=2, C3=1, Blacklist=-1
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'lawyer_count';
    const order = searchParams.get('order') || 'desc';

    // Récupérer toutes les données depuis Google Sheets
    const sheetData = await fetchAllSheetData();

    // Grouper les avocats par cabinet
    const firmMap = new Map<string, FirmStats>();

    sheetData.data.forEach(lawyer => {
      const firmName = lawyer.cabinet || 'Cabinet non spécifié';
      
      if (!firmMap.has(firmName)) {
        firmMap.set(firmName, {
          name: firmName,
          lawyer_count: 0,
          c1_count: 0,
          c2_count: 0,
          c3_count: 0,
          bl_count: 0,
          unclassified_count: 0,
          bernard_linkedin_count: 0,
          sabine_linkedin_count: 0,
          classified_percentage: 0,
          support_score: 0
        });
      }

      const firm = firmMap.get(firmName)!;
      firm.lawyer_count++;

      // Compter les classifications
      switch (lawyer.classement) {
        case 'C1':
          firm.c1_count++;
          break;
        case 'C2':
          firm.c2_count++;
          break;
        case 'C3':
          firm.c3_count++;
          break;
        case 'Blacklist':
          firm.bl_count++;
          break;
        default:
          firm.unclassified_count++;
      }

      // Compter les connexions LinkedIn
      if (lawyer.linkedin_bernard) {
        firm.bernard_linkedin_count++;
      }
      if (lawyer.linkedin_sabine) {
        firm.sabine_linkedin_count++;
      }
    });

    // Calculer les pourcentages et scores pour chaque cabinet
    const firms: FirmStats[] = Array.from(firmMap.values()).map(firm => {
      const classifiedCount = firm.c1_count + firm.c2_count + firm.c3_count + firm.bl_count;
      firm.classified_percentage = firm.lawyer_count > 0 
        ? Math.round((classifiedCount / firm.lawyer_count) * 100) 
        : 0;
      
      // Score de soutien : C1=3pts, C2=2pts, C3=1pt, Blacklist=-1pt
      firm.support_score = (firm.c1_count * 3) + (firm.c2_count * 2) + (firm.c3_count * 1) + (firm.bl_count * -1);
      
      return firm;
    });

    // Trier les cabinets
    firms.sort((a, b) => {
      const aValue = a[sortBy as keyof FirmStats] as number;
      const bValue = b[sortBy as keyof FirmStats] as number;
      
      if (order === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    // Appliquer la limite
    const limitedFirms = firms.slice(0, limit);

    // Calculer les statistiques globales
    const totalStats = {
      totalFirms: firms.length,
      totalLawyers: sheetData.totalRows,
      averageFirmSize: Math.round(sheetData.totalRows / firms.length),
      topSupportFirm: firms.length > 0 ? firms.reduce((max, firm) => 
        firm.support_score > max.support_score ? firm : max
      ) : null,
      mostLinkedInConnections: firms.length > 0 ? firms.reduce((max, firm) => 
        (firm.bernard_linkedin_count + firm.sabine_linkedin_count) > 
        (max.bernard_linkedin_count + max.sabine_linkedin_count) ? firm : max
      ) : null
    };

    return NextResponse.json({
      success: true,
      data: limitedFirms,
      stats: totalStats,
      pagination: {
        limit,
        total: firms.length,
        showing: limitedFirms.length
      },
      lastUpdated: sheetData.lastUpdated
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des cabinets:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      }, 
      { status: 500 }
    );
  }
}