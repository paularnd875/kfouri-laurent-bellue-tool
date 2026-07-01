import { NextResponse } from 'next/server';
import { logClassifChange } from '@/lib/sheet-log';

export const dynamic = 'force-dynamic';

// Stockage temporaire des modifications (en production, utiliser une base de données)
let classificationChanges: Map<string, string> = new Map();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const export_format = searchParams.get('export');

    if (export_format === 'csv') {
      // Export CSV des modifications
      let csvContent = 'prenomnom,ancien_classement,nouveau_classement,date_modification\n';
      
      for (const [prenomnom, newClassification] of classificationChanges.entries()) {
        csvContent += `"${prenomnom}","","${newClassification}","${new Date().toISOString()}"\n`;
      }

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="classifications_modifications.csv"'
        }
      });
    }

    // Retourner les modifications en cours
    const changes = Array.from(classificationChanges.entries()).map(([prenomnom, classification]) => ({
      prenomnom,
      classification,
      date: new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      changes,
      totalChanges: changes.length
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des modifications:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prenomnom, classification, action } = body;

    if (!prenomnom) {
      return NextResponse.json(
        { error: 'prenomnom requis', success: false },
        { status: 400 }
      );
    }

    if (action === 'update') {
      if (!classification) {
        return NextResponse.json(
          { error: 'classification requise pour la mise à jour', success: false },
          { status: 400 }
        );
      }

      // Stocker la modification
      classificationChanges.set(prenomnom, classification);

      // Journalisation durable dans l'onglet Google Sheet (best-effort)
      await logClassifChange({
        email: body.email,
        nom: body.nomComplet || prenomnom,
        structure: body.structure,
        ancienne: body.ancienneClassification,
        nouvelle: classification,
        utilisateur: 'Equipe KLB',
      });

      return NextResponse.json({
        success: true,
        message: 'Classification mise à jour',
        prenomnom,
        classification
      });

    } else if (action === 'remove') {
      // Supprimer la modification
      const removed = classificationChanges.delete(prenomnom);

      await logClassifChange({
        email: body.email,
        nom: body.nomComplet || prenomnom,
        structure: body.structure,
        nouvelle: '',
        utilisateur: 'Equipe KLB',
      });

      return NextResponse.json({
        success: true,
        message: removed ? 'Modification supprimée' : 'Aucune modification trouvée',
        prenomnom
      });

    } else if (action === 'clear_all') {
      // Vider toutes les modifications
      const count = classificationChanges.size;
      classificationChanges.clear();
      
      return NextResponse.json({
        success: true,
        message: `${count} modifications supprimées`,
        cleared: count
      });
    }

    return NextResponse.json(
      { error: 'Action non reconnue', success: false },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erreur lors de la modification de classification:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false
      }, 
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour récupérer les modifications
export function getClassificationChange(prenomnom: string): string | null {
  return classificationChanges.get(prenomnom) || null;
}