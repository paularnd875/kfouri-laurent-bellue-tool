import { analyzeSheetStructure } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const analysis = await analyzeSheetStructure();

    return NextResponse.json({
      success: true,
      message: 'Analyse de la structure terminée',
      ...analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur lors de l\'analyse Google Sheets:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false,
        details: 'Impossible d\'analyser la structure du Google Sheet'
      }, 
      { status: 500 }
    );
  }
}