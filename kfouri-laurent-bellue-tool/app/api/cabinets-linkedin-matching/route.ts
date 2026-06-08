import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { globalCache } from '@/lib/cache';

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
    
    // D'abord, obtenir les informations sur les onglets pour voir les noms exacts
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    console.log('Onglets disponibles:', spreadsheetInfo.data.sheets?.map(s => s.properties?.title));
    
    // Trouver le bon nom d'onglet - utiliser "Base principale" qui contient les données
    const resourcesSheet = spreadsheetInfo.data.sheets?.find(s => 
      s.properties?.title?.toLowerCase().includes('base') ||
      s.properties?.title?.toLowerCase().includes('principale') ||
      s.properties?.title?.toLowerCase().includes('ressources') ||
      s.properties?.title?.toLowerCase().includes('humaines')
    );
    
    const sheetName = resourcesSheet?.properties?.title || 'Base principale';
    console.log('Nom d\'onglet utilisé:', sheetName);
    
    // Récupération des colonnes nécessaires pour LinkedIn
    // Colonnes: I (nom), O (email), AJ (structure), BH (Sabine), BI (Bernard)
    const range = `${sheetName}!A:BK`; // Inclure jusqu'à BK pour BH et BI
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Aucune donnée trouvée' 
      });
    }

    // Skip header row et traiter les données LinkedIn
    const linkedinData: LinkedInMatch[] = rows.slice(1)
      .map((row, index): LinkedInMatch | null => {
        if (!row || row.length === 0) return null;

        const nomComplet = row[8] || '';  // Colonne I (index 8)
        const email = row[14] || '';      // Colonne O (index 14)  
        const structure = row[35] || '';  // Colonne AJ (index 35)

        // Colonnes LinkedIn selon les spécifications :
        // BH = Sabine (index 59) - 1 si relation, 0 sinon
        // BI = Bernard (index 60) - 1 si relation, 0 sinon
        const linkedin_sabine = row[59] === '1';  // Colonne BH
        const linkedin_bernard = row[60] === '1'; // Colonne BI
        
        // Debug pour les 5 premiers
        if (index < 5) {
          console.log(`🔍 Debug LinkedIn ligne ${index + 1}: BH(59)="${row[59]}" BI(60)="${row[60]}" → Sabine: ${linkedin_sabine}, Bernard: ${linkedin_bernard}`);
        }

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