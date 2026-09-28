import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { parseServiceAccountKey } from '@/lib/google-credentials';
import { columnIndices } from '@/lib/column-map';
import { getSourceRange } from '@/lib/google-sheets';

export async function GET() {
  try {
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

    // Récupérer les en-têtes d'abord (onglet source résolu par gid)
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: await getSourceRange(sheets, '1:1'),
    });

    const headers = headersResponse.data.values?.[0] || [];
    console.log('📋 En-têtes récupérés:', headers.length, 'colonnes');

    // Colonnes LinkedIn Sabine (SK) / Bernard (BLB) résolues PAR NOM d'en-tête.
    const idx = columnIndices(headers);
    const bhIndex = idx.linkedin_sabine; // Sabine (LINKEDIN SK)
    const biIndex = idx.linkedin_bernard; // Bernard (LINKEDIN BLB)

    console.log(`📍 LinkedIn Sabine (${bhIndex}): "${headers[bhIndex]}"`);
    console.log(`📍 LinkedIn Bernard (${biIndex}): "${headers[biIndex]}"`);

    // Récupérer toutes les données (onglet source résolu par gid, plage A:CZ)
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: await getSourceRange(sheets, 'A:CZ'),
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
      const bhValue = bhIndex >= 0 ? (row[bhIndex] || '') : ''; // Sabine (LINKEDIN SK)
      const biValue = biIndex >= 0 ? (row[biIndex] || '') : ''; // Bernard (LINKEDIN BLB)

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