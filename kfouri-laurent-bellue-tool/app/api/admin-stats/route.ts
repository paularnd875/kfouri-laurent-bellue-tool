import { fetchAllSheetData } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sheetData = await fetchAllSheetData();

    // Calculer les statistiques générales
    const totalLawyers = sheetData.totalRows;
    const uniqueFirms = [...new Set(sheetData.data.map(l => l.cabinet).filter(Boolean))].length;

    // Statistiques LinkedIn
    const bernardLinkedIn = sheetData.data.filter(l => l.linkedin_bernard).length;
    const sabineLinkedIn = sheetData.data.filter(l => l.linkedin_sabine).length;

    // Statistiques de classification
    const classifications = {
      c1: sheetData.data.filter(l => l.classement === 'C1').length,
      c2: sheetData.data.filter(l => l.classement === 'C2').length,
      c3: sheetData.data.filter(l => l.classement === 'C3').length,
      blacklist: sheetData.data.filter(l => l.classement === 'Blacklist').length,
    };

    const totalClassified = classifications.c1 + classifications.c2 + classifications.c3 + classifications.blacklist;
    const classificationRate = totalLawyers > 0 ? Math.round((totalClassified / totalLawyers) * 100) : 0;

    // Analyse des cabinets les plus importants
    const firmCounts = new Map<string, number>();
    sheetData.data.forEach(lawyer => {
      if (lawyer.cabinet) {
        firmCounts.set(lawyer.cabinet, (firmCounts.get(lawyer.cabinet) || 0) + 1);
      }
    });

    const topFirms = Array.from(firmCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Score de soutien global
    const supportScore = (classifications.c1 * 3) + (classifications.c2 * 2) + (classifications.c3 * 1) + (classifications.blacklist * -1);
    const maxPossibleScore = totalLawyers * 3;
    const supportPercentage = maxPossibleScore > 0 ? Math.round((supportScore / maxPossibleScore) * 100) : 0;

    // Analyser les avocats avec photos
    const lawyersWithPhotos = sheetData.data.filter(l => l.photo_url && l.photo_url.trim().length > 0).length;
    const photoCompletionRate = totalLawyers > 0 ? Math.round((lawyersWithPhotos / totalLawyers) * 100) : 0;

    // Analyser les réseaux LinkedIn
    const bothLinkedIn = sheetData.data.filter(l => l.linkedin_bernard && l.linkedin_sabine).length;
    const linkedInCoverage = totalLawyers > 0 ? Math.round(((bernardLinkedIn + sabineLinkedIn - bothLinkedIn) / totalLawyers) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalLawyers,
        totalFirms: uniqueFirms,
        bernardLinkedIn,
        sabineLinkedIn,
        bothLinkedIn,
        linkedInCoverage,
        classifications,
        classificationRate,
        supportScore,
        supportPercentage,
        lawyersWithPhotos,
        photoCompletionRate,
        topFirms
      },
      metadata: {
        lastUpdated: sheetData.lastUpdated,
        dataSource: 'google_sheets',
        totalColumns: sheetData.headers.length
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques admin:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      }, 
      { status: 500 }
    );
  }
}