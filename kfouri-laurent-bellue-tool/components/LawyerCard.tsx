'use client';

import { useState } from 'react';

interface LawyerCardProps {
  lawyer: {
    prenomnom?: string;
    nom_complet?: string;
    email?: string;
    cabinet?: string;
    classement?: string;
    linkedin_bernard?: boolean;
    linkedin_sabine?: boolean;
    photo_url?: string;
    raw_data?: any;
  };
  showClassificationEditor?: boolean;
  onClassificationChange?: () => void;
}

export default function LawyerCard({ 
  lawyer, 
  showClassificationEditor = true,
  onClassificationChange 
}: LawyerCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState(lawyer.classement || '');
  const [saving, setSaving] = useState(false);

  // Détecter toutes les étiquettes de soutien existantes
  const getSupportTags = () => {
    if (!lawyer.raw_data) return [];
    
    const supportTags = [];
    Object.keys(lawyer.raw_data).forEach(key => {
      if (key.includes('SOUTIENS') && lawyer.raw_data[key] === '1') {
        // Nettoyer le nom de l'étiquette
        let cleanTag = key
          .replace('2024\nSOUTIENS \n', '')
          .replace('2024\nSOUTIENS\n', '')
          .replace('2022\nSOUTIENS\n', '')
          .replace('2020\nSOUTIENS/PROCHES\n', '')
          .replace('\nimport 241121', '')
          .replace('\n', ' ');
        supportTags.push({
          key,
          display: `Soutien ${cleanTag}`,
          year: key.includes('2024') ? '2024' : key.includes('2022') ? '2022' : '2020'
        });
      }
      
      if (key.includes('C123') && lawyer.raw_data[key] && lawyer.raw_data[key] !== '' && lawyer.raw_data[key] !== '0') {
        let cleanTag = key
          .replace('C123\n(onglet doc\nagrégé)\n', '')
          .replace('C123\norigine\n', '')
          .replace('\n', ' ');
        supportTags.push({
          key,
          display: `${cleanTag}: ${lawyer.raw_data[key]}`,
          year: 'Classification'
        });
      }
    });
    
    return supportTags;
  };

  const handleSave = async () => {
    if (selectedClassification === (lawyer.classement || '')) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/classifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prenomnom: lawyer.prenomnom || lawyer.nom_complet,
          classification: selectedClassification,
          action: 'update'
        })
      });

      if (response.ok) {
        setIsEditing(false);
        // Mettre à jour visuellement la classification
        lawyer.classement = selectedClassification;
        if (onClassificationChange) {
          onClassificationChange();
        }
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  };

  const getClassificationBadge = (classification?: string) => {
    switch (classification) {
      case 'C1':
        return <span className="klb-badge-c1">C1 - Soutien Fort</span>;
      case 'C2':
        return <span className="klb-badge-c2">C2 - Soutien Modéré</span>;
      case 'C3':
        return <span className="klb-badge-c3">C3 - Neutre</span>;
      case 'Blacklist':
        return <span className="klb-badge-blacklist">Blacklist</span>;
      default:
        return <span className="klb-badge-outline">Non classé</span>;
    }
  };

  const supportTags = getSupportTags();

  return (
    <div className="klb-card">
      <div className="klb-card-body">
        <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-semibold text-gray-900">
              {lawyer.nom_complet || lawyer.prenomnom || 'Nom non disponible'}
            </h3>
            <div className="flex space-x-2">
              {lawyer.linkedin_bernard && (
                <span className="klb-badge-linkedin text-xs">🔗 Bernard</span>
              )}
              {lawyer.linkedin_sabine && (
                <span className="klb-badge-linkedin text-xs">🔗 Sabine</span>
              )}
            </div>
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            {lawyer.cabinet && (
              <div><strong>Cabinet:</strong> {lawyer.cabinet}</div>
            )}
            {lawyer.email && (
              <div><strong>Email:</strong> {lawyer.email}</div>
            )}
            {lawyer.raw_data?.['Année de serment'] && (
              <div><strong>Serment:</strong> {lawyer.raw_data['Année de serment']}</div>
            )}
            {lawyer.raw_data?.XP && (
              <div><strong>Expérience:</strong> {lawyer.raw_data.XP} ans</div>
            )}
            
            {/* Affichage des étiquettes de soutien existantes */}
            {supportTags.length > 0 && (
              <div className="mt-2">
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800">
                    🏷️ Étiquettes existantes ({supportTags.length})
                  </summary>
                  <div className="mt-1 space-y-1">
                    {supportTags.map((tag, i) => (
                      <div key={i} className="bg-blue-50 p-1 rounded text-xs flex justify-between">
                        <span>{tag.display}</span>
                        <span className="text-blue-500 font-mono text-xs">{tag.year}</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Affichage des formations/écoles */}
            {(lawyer.raw_data?.['DJCE\nMontpellier'] === '1' || 
              lawyer.raw_data?.['M2\nDANAA'] === '1' ||
              lawyer.raw_data?.['Sciences Po\nEdD'] === '1' ||
              lawyer.raw_data?.['Paris 2 \nDAR'] === '1') && (
              <div className="mt-1">
                <span className="text-xs text-purple-600">
                  🎓 {[
                    lawyer.raw_data?.['DJCE\nMontpellier'] === '1' && 'DJCE Montpellier',
                    lawyer.raw_data?.['M2\nDANAA'] === '1' && 'M2 DANAA',
                    lawyer.raw_data?.['Sciences Po\nEdD'] === '1' && 'Sciences Po',
                    lawyer.raw_data?.['Paris 2 \nDAR'] === '1' && 'Paris 2 DAR'
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {/* Informations de vote */}
            {(lawyer.raw_data?.['A voté 1T \n2025'] === '1' || 
              lawyer.raw_data?.['A voté 2T \n2025'] === '1') && (
              <div className="mt-1 text-xs text-green-600">
                🗳️ Participations: {[
                  lawyer.raw_data?.['A voté 1T \n2025'] === '1' && '1er tour 2025',
                  lawyer.raw_data?.['A voté 2T \n2025'] === '1' && '2ème tour 2025'
                ].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          {showClassificationEditor && !isEditing ? (
            <div className="flex items-center space-x-2">
              {getClassificationBadge(lawyer.classement)}
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                title="Modifier la classification"
              >
                ✏️
              </button>
            </div>
          ) : showClassificationEditor && isEditing ? (
            <div className="flex items-center space-x-2">
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 min-w-[120px]"
                disabled={saving}
              >
                <option value="">Non classé</option>
                <option value="C1">C1 - Soutien Fort</option>
                <option value="C2">C2 - Soutien Modéré</option>
                <option value="C3">C3 - Neutre</option>
                <option value="Blacklist">Blacklist</option>
              </select>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                title="Sauvegarder"
              >
                {saving ? '⏳' : '✅'}
              </button>
              <button
                onClick={() => {
                  setSelectedClassification(lawyer.classement || '');
                  setIsEditing(false);
                }}
                disabled={saving}
                className="text-xs text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                title="Annuler"
              >
                ❌
              </button>
            </div>
          ) : (
            <div>
              {getClassificationBadge(lawyer.classement)}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}