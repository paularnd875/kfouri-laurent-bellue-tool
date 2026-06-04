'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CabinetVoteData {
  structure: string;
  effectif: number;
  votants1T: number;
  tauxVote1T: number;
  votants2T: number;
  tauxVote2T: number;
  moyenneVote: number;
  trancheEffectif: string;
}

interface AvocatCabinet {
  nomComplet: string;
  email: string;
  structure: string;
  telFixe?: string;
  telPortable?: string;
  linkedin?: string;
}

interface CabinetStats {
  totalCabinets: number;
  effectifMoyen: number;
  tauxVoteMoyen: number;
  repartitionTranches: Record<string, number>;
}

interface ApiResponse {
  success: boolean;
  data: CabinetVoteData[];
  stats: CabinetStats;
  filters: {
    minEffectif: number;
    maxEffectif: number;
    maxTauxVote: number;
    sortBy: string;
    sortOrder: string;
  };
  error?: string;
}

export default function CabinetsVentresMousPage() {
  const [cabinets, setCabinets] = useState<CabinetVoteData[]>([]);
  const [stats, setStats] = useState<CabinetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Gestion de l'affichage des avocats
  const [selectedCabinet, setSelectedCabinet] = useState<string | null>(null);
  const [avocatsCabinet, setAvocatsCabinet] = useState<AvocatCabinet[]>([]);
  const [loadingAvocats, setLoadingAvocats] = useState(false);
  const [expandedCabinets, setExpandedCabinets] = useState<Set<string>>(new Set());
  
  // Gestion du matching LinkedIn
  const [linkedinMatching, setLinkedinMatching] = useState<Record<string, any>>({});
  
  // Filtres
  const [minEffectif, setMinEffectif] = useState(10);
  const [maxEffectif, setMaxEffectif] = useState(30);
  const [maxTauxVote, setMaxTauxVote] = useState(100);
  const [sortBy, setSortBy] = useState('moyenneVote');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    fetchCabinetData();
    fetchLinkedInMatchingData();
  }, [minEffectif, maxEffectif, maxTauxVote, sortBy, sortOrder]);

  const fetchCabinetData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        minEffectif: minEffectif.toString(),
        maxEffectif: maxEffectif.toString(),
        maxTauxVote: maxTauxVote.toString(),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/cabinets-votes?${params}`);
      const result: ApiResponse = await response.json();
      
      if (result.success) {
        setCabinets(result.data);
        setStats(result.stats);
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

  const fetchAvocatsCabinet = async (cabinetName: string) => {
    try {
      setLoadingAvocats(true);
      console.log('Fetching avocats for cabinet:', cabinetName);
      
      const response = await fetch(`/api/cabinet-avocats?cabinet=${encodeURIComponent(cabinetName)}`);
      const result = await response.json();
      
      console.log('API Response:', result);
      
      if (result.success) {
        setAvocatsCabinet(result.data);
        setSelectedCabinet(cabinetName);
        console.log('Avocats loaded:', result.data.length);
      } else {
        console.error('Erreur API:', result.error);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des avocats:', err);
    } finally {
      setLoadingAvocats(false);
    }
  };

  const fetchLinkedInMatchingData = async () => {
    try {
      const response = await fetch('/api/cabinets-linkedin-matching');
      const result = await response.json();
      
      if (result.success && result.data) {
        // Créer un index par nom de cabinet pour un accès rapide
        const matchingIndex = result.data.reduce((acc: any, cabinet: any) => {
          acc[cabinet.cabinetName] = cabinet;
          return acc;
        }, {});
        setLinkedinMatching(matchingIndex);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du matching LinkedIn:', err);
    }
  };

  const toggleCabinetExpansion = (cabinetName: string) => {
    const newExpanded = new Set(expandedCabinets);
    
    if (newExpanded.has(cabinetName)) {
      newExpanded.delete(cabinetName);
      setSelectedCabinet(null);
      setAvocatsCabinet([]);
    } else {
      newExpanded.add(cabinetName);
      fetchAvocatsCabinet(cabinetName);
    }
    
    setExpandedCabinets(newExpanded);
  };

  const getTauxColor = (taux: number) => {
    if (taux < 30) return 'text-red-600 bg-red-50';
    if (taux < 50) return 'text-orange-600 bg-orange-50';
    if (taux < 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header Sticky */}
      <header className="klb-header">
        <div className="klb-container py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <Link href="/" className="klb-brand">
                Kfouri & Laurent-Bellue
              </Link>
              <span className="klb-badge-c3">
                🎯 Cabinets Ventres Mous
              </span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/" className="klb-nav-item">
                Accueil
              </Link>
              <Link href="/bernard" className="klb-nav-item">
                Réseau Bernard
              </Link>
              <Link href="/sabine" className="klb-nav-item">
                Réseau Sabine
              </Link>
              <Link href="/search" className="klb-nav-item">
                Recherche
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="klb-page-content klb-container py-8">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🎯 Cabinets Ventres Mous
          </h1>
          <p className="text-lg klb-text-muted max-w-3xl mx-auto">
            Cabinets de 10-30 avocats avec les plus faibles taux de participation électorale - 
            Cibles prioritaires pour la mobilisation
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

        {/* Statistiques Overview */}
        {stats && (
          <div className="klb-grid klb-grid-responsive mb-8">
            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat">{stats.totalCabinets}</div>
                <h3 className="text-lg font-semibold text-gray-700">Cabinets Identifiés</h3>
                <p className="klb-text-small">Dans la tranche 10-30 avocats</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat">{stats.effectifMoyen}</div>
                <h3 className="text-lg font-semibold text-gray-700">Effectif Moyen</h3>
                <p className="klb-text-small">Nombre moyen d'avocats</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat text-orange-600">{stats.tauxVoteMoyen}%</div>
                <h3 className="text-lg font-semibold text-gray-700">Taux de Vote Moyen</h3>
                <p className="klb-text-small">Participation moyenne</p>
              </div>
            </div>
          </div>
        )}

        {/* Filtres Interactifs */}
        <div className="klb-card mb-6">
          <div className="klb-card-header">
            <h2 className="text-xl font-semibold text-gray-800">🎛️ Filtres et Tri</h2>
          </div>
          <div className="klb-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Effectif Min
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={minEffectif}
                  onChange={(e) => setMinEffectif(parseInt(e.target.value))}
                  className="klb-input"
                />
                <span className="text-xs text-gray-600">{minEffectif} avocats</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Effectif Max
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={maxEffectif}
                  onChange={(e) => setMaxEffectif(parseInt(e.target.value))}
                  className="klb-input"
                />
                <span className="text-xs text-gray-600">{maxEffectif} avocats</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taux Vote Max
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={maxTauxVote}
                  onChange={(e) => setMaxTauxVote(parseInt(e.target.value))}
                  className="klb-input"
                />
                <span className="text-xs text-gray-600">{maxTauxVote}%</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trier par
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="klb-input"
                >
                  <option value="moyenneVote">Taux Moyen</option>
                  <option value="effectif">Effectif</option>
                  <option value="tauxVote1T">Taux 1er Tour</option>
                  <option value="tauxVote2T">Taux 2ème Tour</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordre
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="klb-input"
                >
                  <option value="asc">Croissant</option>
                  <option value="desc">Décroissant</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau des Cabinets */}
        {cabinets.length > 0 && (
          <div className="klb-card">
            <div className="klb-card-header">
              <h2 className="text-xl font-semibold text-gray-800">
                📊 Cabinets Ventres Mous ({cabinets.length})
              </h2>
            </div>
            <div className="klb-card-body">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold">Cabinet</th>
                      <th className="text-center py-3 px-2 font-semibold">Effectif</th>
                      <th className="text-center py-3 px-2 font-semibold">Taux 1er T</th>
                      <th className="text-center py-3 px-2 font-semibold">Taux 2ème T</th>
                      <th className="text-center py-3 px-2 font-semibold">Moyenne</th>
                      <th className="text-center py-3 px-4 font-semibold">Contacts LinkedIn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cabinets.map((cabinet, index) => (
                      <React.Fragment key={index}>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div 
                              className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                              onClick={() => toggleCabinetExpansion(cabinet.structure)}
                            >
                              <div className="flex items-center space-x-2">
                                <span>{cabinet.structure}</span>
                                <span className="text-gray-400">
                                  {expandedCabinets.has(cabinet.structure) ? '−' : '+'}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Tranche: {cabinet.trancheEffectif}
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className="klb-badge-outline">{cabinet.effectif}</span>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTauxColor(cabinet.tauxVote1T)}`}>
                              {cabinet.tauxVote1T.toFixed(1)}%
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {cabinet.votants1T}/{cabinet.effectif}
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTauxColor(cabinet.tauxVote2T)}`}>
                              {cabinet.tauxVote2T.toFixed(1)}%
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {cabinet.votants2T}/{cabinet.effectif}
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getTauxColor(cabinet.moyenneVote)}`}>
                              {cabinet.moyenneVote.toFixed(1)}%
                            </span>
                          </td>
                          <td className="text-center py-3 px-4">
                            <div className="space-y-1">
                              <div className="text-xs">
                                <span className="klb-badge-linkedin text-xs">
                                  🔗 Bernard: {linkedinMatching[cabinet.structure]?.bernardContacts.length || 0}
                                </span>
                              </div>
                              <div className="text-xs">
                                <span className="klb-badge-linkedin text-xs">
                                  🔗 Sabine: {linkedinMatching[cabinet.structure]?.sabineContacts.length || 0}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                <em>
                                  Total: {linkedinMatching[cabinet.structure]?.totalContacts || 0} contacts
                                </em>
                              </div>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Ligne d'expansion pour les avocats */}
                        {expandedCabinets.has(cabinet.structure) && (
                          <tr className="bg-blue-50">
                            <td colSpan={6} className="px-4 py-6">
                              <div className="border-l-4 border-blue-400 pl-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-semibold text-gray-800">
                                    👥 Avocats du cabinet {cabinet.structure}
                                  </h4>
                                  {loadingAvocats && selectedCabinet === cabinet.structure && (
                                    <span className="text-blue-600 text-sm">
                                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></span>
                                      Chargement...
                                    </span>
                                  )}
                                </div>
                                
                                {selectedCabinet === cabinet.structure && !loadingAvocats && (
                                  <div>
                                    {avocatsCabinet.length > 0 ? (
                                      <div className="space-y-2">
                                        {avocatsCabinet.map((avocat, avocatIndex) => (
                                          <div key={avocatIndex} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900 text-sm">
                                                {avocat.nomComplet}
                                              </div>
                                            </div>
                                            
                                            <div className="flex items-center space-x-3 text-xs">
                                              {avocat.email && (
                                                <button 
                                                  onClick={() => window.open(`mailto:${avocat.email}`, '_blank')}
                                                  className="flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors duration-200 border border-blue-200 hover:border-blue-300"
                                                  title={`Envoyer un email à ${avocat.email}`}
                                                >
                                                  📧 <span className="ml-1 font-medium">Email</span>
                                                </button>
                                              )}
                                              
                                              {avocat.telFixe && (
                                                <button 
                                                  onClick={() => window.open(`tel:${avocat.telFixe}`, '_blank')}
                                                  className="flex items-center px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors duration-200 border border-green-200 hover:border-green-300"
                                                  title={`Appeler au ${avocat.telFixe}`}
                                                >
                                                  📞 <span className="ml-1 font-medium">Tel fixe</span>
                                                </button>
                                              )}
                                              
                                              {avocat.telPortable && (
                                                <button 
                                                  onClick={() => window.open(`tel:${avocat.telPortable}`, '_blank')}
                                                  className="flex items-center px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition-colors duration-200 border border-emerald-200 hover:border-emerald-300"
                                                  title={`Appeler au ${avocat.telPortable}`}
                                                >
                                                  📱 <span className="ml-1 font-medium">Portable</span>
                                                </button>
                                              )}

                                              {avocat.linkedin && (
                                                <button 
                                                  onClick={() => window.open(avocat.linkedin, '_blank')}
                                                  className="flex items-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors duration-200 border border-indigo-200 hover:border-indigo-300"
                                                  title={`Voir le profil LinkedIn`}
                                                >
                                                  💼 <span className="ml-1 font-medium">LinkedIn</span>
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-gray-500 text-sm italic">
                                        Aucun avocat trouvé pour ce cabinet
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {cabinets.length} cabinet(s) trouvé(s) avec un taux de participation {'<'} {maxTauxVote}%
                </div>
                <button className="klb-btn-primary">
                  📥 Exporter en CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions pour le matching futur */}
        <div className="klb-card mt-6">
          <div className="klb-card-header">
            <h3 className="text-lg font-semibold text-gray-800">🔄 Prochaines étapes</h3>
          </div>
          <div className="klb-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">📧 Extraction Outlook</h4>
                <p className="text-sm text-gray-600">
                  Développement de l'outil d'extraction des contacts Outlook de Bernard, Sabine et leur équipe.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🔍 Matching Intelligent</h4>
                <p className="text-sm text-gray-600">
                  Identification automatique des contacts dans les cabinets ventres mous pour ciblage prioritaire.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}