import { NextRequest, NextResponse } from 'next/server';
import { logClassifChange } from '@/lib/sheet-log';

export const dynamic = 'force-dynamic';

// Interface pour une classification
interface Classification {
  id: string;
  nom: string;
  email: string;
  structure: string;
  ancienneClassification?: string;
  nouvelleClassification: 'C1' | 'C2' | 'C3' | 'Blacklist';
  dateModification: string;
  utilisateur: string;
}

// Stockage en mémoire (sera persisté en localStorage côté client)
let classificationsEnMemoire: Classification[] = [];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      classifications: classificationsEnMemoire,
      count: classificationsEnMemoire.length
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des classifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...classificationData } = body;

    switch (action) {
      case 'ajouter':
        const nouvelleClassification: Classification = {
          id: Date.now().toString(),
          ...classificationData,
          dateModification: new Date().toISOString(),
          utilisateur: 'Équipe KLB' // Ou récupérer de la session
        };
        
        classificationsEnMemoire.push(nouvelleClassification);

        // Journalisation durable dans l'onglet Google Sheet (best-effort)
        await logClassifChange({
          email: classificationData.email,
          nom: classificationData.nom,
          structure: classificationData.structure,
          ancienne: classificationData.ancienneClassification,
          nouvelle: classificationData.nouvelleClassification,
          utilisateur: 'Equipe KLB',
        });

        return NextResponse.json({
          success: true,
          message: 'Classification ajoutée',
          classification: nouvelleClassification,
          count: classificationsEnMemoire.length
        });

      case 'vider':
        classificationsEnMemoire = [];
        
        return NextResponse.json({
          success: true,
          message: 'Toutes les classifications supprimées',
          count: 0
        });

      case 'export':
        // Génération du CSV
        const csvHeader = 'Nom,Email,Structure,Ancienne Classification,Nouvelle Classification,Date Modification,Utilisateur\n';
        const csvData = classificationsEnMemoire.map(c => 
          `"${c.nom}","${c.email}","${c.structure}","${c.ancienneClassification || ''}","${c.nouvelleClassification}","${c.dateModification}","${c.utilisateur}"`
        ).join('\n');
        
        const csvContent = csvHeader + csvData;
        
        return NextResponse.json({
          success: true,
          csvData: csvContent,
          count: classificationsEnMemoire.length,
          filename: `classifications_${new Date().toISOString().split('T')[0]}.csv`
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Action non reconnue' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erreur lors du traitement de la classification' },
      { status: 500 }
    );
  }
}