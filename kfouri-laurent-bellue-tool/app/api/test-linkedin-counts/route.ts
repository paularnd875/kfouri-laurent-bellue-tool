import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  try {
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

    // Récupérer les en-têtes d'abord
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Base principale'!1:1",
    });
    
    const headers = headersResponse.data.values?.[0] || [];
    console.log('📋 En-têtes récupérés:', headers.length, 'colonnes');

    // Analyser les colonnes BH et BI
    const bhIndex = 59; // Colonne BH (Sabine selon tes indications)
    const biIndex = 60; // Colonne BI (Bernard selon tes indications)
    
    console.log(`📍 Colonne BH (${bhIndex}): "${headers[bhIndex]}"`);
    console.log(`📍 Colonne BI (${biIndex}): "${headers[biIndex]}"`);

    // Récupérer seulement les colonnes BH et BI pour compter
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Base principale'!BH:BI",
    });

    const rows = dataResponse.data.values || [];
    console.log(`📊 ${rows.length - 1} lignes de données récupérées`);

    // Compter les relations LinkedIn
    let sabineCount = 0;
    let bernardCount = 0;
    let bothCount = 0;

    // Exemples des 10 premières valeurs pour debug
    const sampleData: Array<{ row: number, bh: string, bi: string }> = [];

    rows.slice(1).forEach((row, index) => {
      const bhValue = row[0] || ''; // Colonne BH (Sabine)
      const biValue = row[1] || ''; // Colonne BI (Bernard)
      
      const sabineHasRelation = bhValue === '1';
      const bernardHasRelation = biValue === '1';

      if (sabineHasRelation) sabineCount++;
      if (bernardHasRelation) bernardCount++;
      if (sabineHasRelation && bernardHasRelation) bothCount++;

      // Garder les 10 premiers pour l'exemple
      if (index < 10) {
        sampleData.push({
          row: index + 2,
          bh: bhValue,
          bi: biValue
        });
      }
    });

    return NextResponse.json({
      success: true,
      columnInfo: {
        bhIndex,
        biIndex,
        bhHeader: headers[bhIndex],
        biHeader: headers[biIndex],
      },
      counts: {
        sabine: sabineCount,
        bernard: bernardCount,
        both: bothCount,
        total: rows.length - 1
      },
      sampleData,
      verification: {
        expectedSabine: 1124,
        expectedBernard: 785,
        sabineMatch: sabineCount === 1124,
        bernardMatch: bernardCount === 785
      }
    });

  } catch (error) {
    console.error('Erreur lors du test des comptages LinkedIn:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors du test: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}