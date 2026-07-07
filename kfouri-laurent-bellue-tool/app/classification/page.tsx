'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import MailButton from '@/components/MailButton';
import MailPrefSelector from '@/components/MailPrefSelector';

// Icone LinkedIn personnalisee (identique a la page d'accueil)
const LinkedInIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-gray-600`} style={{ fontSize: '14px' }}>
    in
  </div>
);

interface LawyerClassification {
  prenomnom?: string;
  nom_complet?: string;
  email?: string;
  cabinet?: string;
  tel_fixe?: string;
  tel_portable?: string;
  linkedin?: string;
  classement?: string;
  linkedin_bernard?: boolean;
  linkedin_sabine?: boolean;
  photo_url?: string;
  raw_data?: any;
}

interface ClassificationStats {
  current: number;
  allClassifications: {
    c1: number;
    c2: number;
    c3: number;
    blacklist: number;
    unclassified: number;
  };
  classificationRate: number;
}

// Composant pour chaque carte d'avocat avec modification de classification
function LawyerClassificationCard({ 
  lawyer, 
  sources, 
  onClassificationChange 
}: { 
  lawyer: LawyerClassification;
  sources: string[];
  onClassificationChange: (reset?: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState(lawyer.classement || '');
  const [saving, setSaving] = useState(false);

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
          nomComplet: lawyer.nom_complet || lawyer.prenomnom,
          email: lawyer.email || '',
          structure: lawyer.cabinet || '',
          ancienneClassification: lawyer.classement || '',
          classification: selectedClassification,
          action: 'update'
        })
      });

      if (response.ok) {
        setIsEditing(false);
        onClassificationChange(true); // Refresh the list
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
        return <span className="klb-badge-c1">C1</span>;
      case 'C2':
        return <span className="klb-badge-c2">C2</span>;
      case 'C3':
        return <span className="klb-badge-c3">C3</span>;
      case 'Blacklist':
        return <span className="klb-badge-blacklist">BL</span>;
      default:
        return <span className="klb-badge-outline">NC</span>;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
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

            {/* Boutons de contact (email / tel fixe / tel portable / LinkedIn) */}
            {(lawyer.email || lawyer.tel_fixe || lawyer.tel_portable || lawyer.linkedin) && (
              <div className="flex items-center space-x-2 pt-1">
                {lawyer.email && (
                  <MailButton email={lawyer.email} name={lawyer.nom_complet || lawyer.prenomnom} />
                )}
                {lawyer.tel_fixe && (
                  <a
                    href={`tel:${lawyer.tel_fixe}`}
                    className="klb-icon-btn"
                    title={`Appeler au fixe: ${lawyer.tel_fixe}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                {lawyer.tel_portable && (
                  <a
                    href={`tel:${lawyer.tel_portable}`}
                    className="klb-icon-btn"
                    title={`Appeler au portable: ${lawyer.tel_portable}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                {lawyer.linkedin && lawyer.linkedin.includes('http') && (
                  <a
                    href={lawyer.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="klb-icon-btn"
                    title={`Voir le profil LinkedIn de ${lawyer.nom_complet || lawyer.prenomnom}`}
                  >
                    <LinkedInIcon />
                  </a>
                )}
              </div>
            )}
            
            {/* Affichage des sources de classification */}
            {sources.length > 0 && (
              <div className="mt-2">
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800">
                    📋 Sources ({sources.length})
                  </summary>
                  <div className="mt-1 text-xs text-gray-500 space-y-1">
                    {sources.map((source, i) => (
                      <div key={i} className="bg-blue-50 p-1 rounded text-xs">
                        {source}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          {!isEditing ? (
            <div className="flex items-center space-x-2">
              {getClassificationBadge(lawyer.classement)}
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-800"
                title="Modifier la classification"
              >
                ✏️
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1"
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
                className="text-xs text-green-600 hover:text-green-800"
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
                className="text-xs text-red-600 hover:text-red-800"
                title="Annuler"
              >
                ❌
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClassificationPage() {
  const [selectedCategory, setSelectedCategory] = useState('C1');
  const [lawyers, setLawyers] = useState<LawyerClassification[]>([]);
  const [stats, setStats] = useState<ClassificationStats | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const limit = 30;

  const categories = [
    { id: 'C1', name: 'C1 - Soutien Fort', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { id: 'C2', name: 'C2 - Soutien Modéré', color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { id: 'C3', name: 'C3 - Neutre', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { id: 'Blacklist', name: 'Blacklist', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    { id: 'unclassified', name: 'Non classé', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
  ];

  useEffect(() => {
    fetchClassificationData(true);
  }, [selectedCategory, searchTerm]);

  const fetchClassificationData = async (reset = false) => {
    try {
      setLoading(true);
      const offset = reset ? 0 : currentPage * limit;
      
      const params = new URLSearchParams({
        classification: selectedCategory,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (searchTerm) params.set('search', searchTerm);

      const response = await fetch(`/api/classification?${params}`);
      const result = await response.json();
      
      if (result.success) {
        if (reset) {
          setLawyers(result.data);
          setCurrentPage(0);
        } else {
          setLawyers(prev => [...prev, ...result.data]);
        }
        setStats(result.stats);
        setSources(result.metadata?.sources || []);
        setHasMore(result.pagination.hasMore);
        setError(null);
      } else {
        setError(result.error || 'Erreur lors du chargement des données');
      }
    } catch (err) {
      setError('Erreur de connexion: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1);
      fetchClassificationData(false);
    }
  };

  const getClassificationBadge = (classification?: string) => {
    switch (classification) {
      case 'C1':
        return <span className="klb-badge-c1">C1</span>;
      case 'C2':
        return <span className="klb-badge-c2">C2</span>;
      case 'C3':
        return <span className="klb-badge-c3">C3</span>;
      case 'Blacklist':
        return <span className="klb-badge-blacklist">BL</span>;
      default:
        return <span className="klb-badge-outline">NC</span>;
    }
  };

  const getClassificationSources = (lawyer: LawyerClassification) => {
    if (!lawyer.raw_data) return [];
    
    const sources: string[] = [];
    Object.keys(lawyer.raw_data).forEach(key => {
      if (key.includes('C123') && lawyer.raw_data[key] && lawyer.raw_data[key] !== '0' && lawyer.raw_data[key] !== '') {
        sources.push(`${key.replace('C123\n(onglet doc\nagrégé)\n', '').replace('\n', ' ')}: ${lawyer.raw_data[key]}`);
      }
      if (key.includes('SOUTIENS') && lawyer.raw_data[key] === '1') {
        sources.push(`Soutien: ${key.replace('2024\nSOUTIENS \n', '').replace('2022\nSOUTIENS\n', '').replace('\n', ' ')}`);
      }
      if (key.includes('origine') && lawyer.raw_data[key] && lawyer.raw_data[key] !== '') {
        sources.push(`Origine: ${lawyer.raw_data[key]}`);
      }
    });
    
    return sources;
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="klb-header">
        <div className="klb-container py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold" style={{ color: 'var(--klb-primary)' }}>
                KFOURI & LAURENT-BELLUE
              </Link>
              <span className="klb-badge-outline">
                📊 Classifications
              </span>
            </div>
            <nav className="flex items-center space-x-4">
              <MailPrefSelector />
              <Link href="/" className="klb-nav-item">
                Accueil
              </Link>
              <Link href="/search" className="klb-nav-item">
                Recherche
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="klb-container py-8">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📊 Gestion des Classifications
          </h1>
          <p className="text-lg klb-text-muted max-w-2xl mx-auto">
            Visualisation et gestion des étiquettes de soutien électoral existantes
          </p>
          {loading && (
            <div className="mt-4 text-blue-600">
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></span>
              Chargement des données...
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg inline-block">
              <span className="text-red-700">❌ {error}</span>
            </div>
          )}
        </div>

        {/* Classification Overview */}
        {stats && (
          <div className="klb-card mb-8">
            <div className="klb-card-header">
              <h2 className="text-xl font-semibold text-gray-800">📈 Vue d'ensemble des Classifications</h2>
            </div>
            <div className="klb-card-body">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                {categories.map(category => {
                  const count = category.id === 'unclassified' 
                    ? stats.allClassifications.unclassified 
                    : stats.allClassifications[category.id.toLowerCase() as keyof typeof stats.allClassifications];
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        selectedCategory === category.id
                          ? `${category.bgColor} ${category.borderColor} ${category.color}`
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-2xl font-bold mb-1">{count}</div>
                      <div className="text-sm font-medium">{category.name}</div>
                    </button>
                  );
                })}
              </div>
              
              <div className="text-center text-sm text-gray-600 mt-4">
                Taux de classification global: <span className="font-semibold">{stats.classificationRate}%</span>
                {' • '}
                Total classifiés: <span className="font-semibold">
                  {stats.allClassifications.c1 + stats.allClassifications.c2 + stats.allClassifications.c3 + stats.allClassifications.blacklist}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Search Filter */}
        <div className="klb-card mb-6">
          <div className="klb-card-body">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom, email ou cabinet..."
                  className="klb-input"
                />
              </div>
              <div className="text-sm text-gray-600">
                {stats?.current || 0} résultat{(stats?.current || 0) > 1 ? 's' : ''} dans cette catégorie
              </div>
            </div>
          </div>
        </div>

        {/* Current Category Display */}
        {selectedCategoryData && (
          <div className="klb-card mb-6">
            <div className="klb-card-header">
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedCategoryData.name} ({stats?.current || 0} avocats)
              </h2>
            </div>
            
            {/* Show sources for current category if available */}
            {sources.length > 0 && (
              <div className="klb-card-body border-t border-gray-200">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    📋 Sources de classification détectées ({sources.length})
                  </summary>
                  <div className="mt-3 text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                    {sources.map((source, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded">
                        {source}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            <div className="klb-card-body">
              <div className="space-y-4">
                {lawyers.map((lawyer, index) => {
                  const lawyerSources = getClassificationSources(lawyer);
                  
                  return (
                    <LawyerClassificationCard 
                      key={index} 
                      lawyer={lawyer} 
                      sources={lawyerSources}
                      onClassificationChange={fetchClassificationData}
                    />
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-6">
                  <button 
                    onClick={loadMore}
                    disabled={loading}
                    className="klb-btn-primary"
                  >
                    {loading ? '⏳ Chargement...' : 'Charger plus'}
                  </button>
                </div>
              )}

              {!hasMore && lawyers.length > 0 && (
                <div className="text-center mt-6 text-gray-500">
                  Tous les contacts de cette catégorie ont été chargés
                </div>
              )}

              {lawyers.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'Aucun résultat trouvé pour cette recherche' : 'Aucun contact dans cette catégorie'}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}