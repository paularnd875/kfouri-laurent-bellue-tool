import { testSheetConnection, fetchSheetHeaders } from '@/lib/google-sheets';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Tester la connexion
    const isConnected = await testSheetConnection();
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          error: 'Impossible de se connecter au Google Sheet. Vérifiez la configuration du Service Account.',
          connected: false 
        }, 
        { status: 500 }
      );
    }

    // Si connecté, récupérer les headers
    const headers = await fetchSheetHeaders();

    return NextResponse.json({
      connected: true,
      message: 'Connexion réussie au Google Sheet!',
      totalColumns: headers.length,
      headers: headers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur lors du test Google Sheets:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        connected: false,
        details: 'Vérifiez que GOOGLE_SERVICE_ACCOUNT_KEY est correctement configuré dans .env.local'
      }, 
      { status: 500 }
    );
  }
}