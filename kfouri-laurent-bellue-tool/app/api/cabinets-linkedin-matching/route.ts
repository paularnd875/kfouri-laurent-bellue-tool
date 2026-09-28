import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { parseServiceAccountKey } from '@/lib/google-credentials';
import { globalCache } from '@/lib/cache';
import { columnIndices } from '@/lib/column-map';
import { getSourceRange } from '@/lib/google-sheets';

// Interface pour les données de matching LinkedIn
interface LinkedInMatch {
  nomComplet: string;
  email: string;
  cabinet: string;
  linkedin_bernard?: boolean;
  linkedin_sabine?: boolean;
}

interface CabinetLinkedInMatching {
  cabinetName: string;
  bernardContacts: LinkedInMatch[];
  sabineContacts: LinkedInMatch[];
  totalContacts: number;
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier le cache d'abord
    const cacheKey = 'linkedin-matching-data-v4';
    const cachedData = globalCache.get<CabinetLinkedInMatching[]>(cacheKey);
    
    if (cachedData) {
      console.log('✅ LinkedIn matching data served from cache');
      
      // Filtrage par cabinet si demandé
      const { searchParams } = new URL(request.url);
      const cabinetFilter = searchParams.get('cabinet');
      
      if (cabinetFilter) {
        const matching = cachedData.find(c => 
          c.cabinetName.toLowerCase().includes(cabinetFilter.toLowerCase()) ||
          cabinetFilter.toLowerCase().includes(c.cabinetName.toLowerCase())
        );
        
        return NextResponse.json({
          success: true,
          data: matching || null,
          cabinet: cabinetFilter,
          cached: true
        });
      }

      return NextResponse.json({
        success: true,
        data: cachedData,
        total: cachedData.length,
        cached: true
      });
    }

    console.log('🔄 Loading LinkedIn matching data from Google Sheets...');

    // Configuration Google Sheets - utiliser la clé complète
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

    // Onglet source résolu par gid (immuable), toutes les colonnes A:CZ
    // (mapping par nom d'en-tête ensuite).
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: await getSourceRange(sheets, 'A:CZ'),
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucune donnée trouvée'
      });
    }

    // Résolution des colonnes par NOM d'en-tête (index de secours)
    const idx = columnIndices(rows[0] || []);

    // Skip header row et traiter les données LinkedIn
    const linkedinData: LinkedInMatch[] = rows.slice(1)
      .map((row, index): LinkedInMatch | null => {
        if (!row || row.length === 0) return null;

        const nomComplet = row[idx.nom_complet] || '';
        const email = row[idx.email] || '';
        const structure = row[idx.cabinet] || '';
        const linkedin_sabine = row[idx.linkedin_sabine] === '1';
        const linkedin_bernard = row[idx.linkedin_bernard] === '1';

        return {
          nomComplet,
          email,
          cabinet: structure,
          linkedin_bernard,
          linkedin_sabine
        };
      })
      .filter((contact): contact is LinkedInMatch => {
        if (contact === null || contact.nomComplet === '' || contact.cabinet === '') {
          return false;
        }
        
        // Debug: compter les connexions LinkedIn détectées
        if (contact.linkedin_bernard || contact.linkedin_sabine) {
          console.log(`✅ LinkedIn détecté: ${contact.nomComplet} (${contact.cabinet}) - Bernard: ${contact.linkedin_bernard}, Sabine: ${contact.linkedin_sabine}`);
        }
        
        return true;
      });

    // Grouper par cabinet
    const cabinetMatching: Record<string, CabinetLinkedInMatching> = {};
    
    linkedinData.forEach(contact => {
      if (!cabinetMatching[contact.cabinet]) {
        cabinetMatching[contact.cabinet] = {
          cabinetName: contact.cabinet,
          bernardContacts: [],
          sabineContacts: [],
          totalContacts: 0
        };
      }

      if (contact.linkedin_bernard) {
        cabinetMatching[contact.cabinet].bernardContacts.push(contact);
      }
      
      if (contact.linkedin_sabine) {
        cabinetMatching[contact.cabinet].sabineContacts.push(contact);
      }

      cabinetMatching[contact.cabinet].totalContacts++;
    });

    // Convertir en tableau et mettre en cache
    const cabinetMatchingArray = Object.values(cabinetMatching);
    
    // Mettre en cache pour 10 minutes (600,000ms)
    globalCache.set(cacheKey, cabinetMatchingArray, 10 * 60 * 1000);
    
    console.log(`✅ LinkedIn matching data cached (${cabinetMatchingArray.length} cabinets)`);

    // Paramètres optionnels pour filtrer par cabinet spécifique
    const { searchParams } = new URL(request.url);
    const cabinetFilter = searchParams.get('cabinet');
    
    if (cabinetFilter) {
      // Retourner seulement le matching pour un cabinet spécifique
      const matching = cabinetMatchingArray.find(c => 
        c.cabinetName.toLowerCase().includes(cabinetFilter.toLowerCase()) ||
        cabinetFilter.toLowerCase().includes(c.cabinetName.toLowerCase())
      );
      
      return NextResponse.json({
        success: true,
        data: matching || null,
        cabinet: cabinetFilter,
        cached: false
      });
    }

    // Retourner tous les matchings
    return NextResponse.json({
      success: true,
      data: cabinetMatchingArray,
      total: cabinetMatchingArray.length,
      cached: false
    });

  } catch (error) {
    console.error('Erreur lors du matching LinkedIn:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors du matching LinkedIn: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}