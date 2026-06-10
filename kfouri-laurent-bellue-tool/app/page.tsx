'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Phone, ExternalLink, ChevronDown, ChevronUp, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// Interface pour un avocat avec toutes ses données
interface Avocat {
  nom: string;
  email: string;
  telFixe?: string;
  telPortable?: string;
  linkedin?: string;
  photo?: string;
  structure: string;
  classification?: 'C1' | 'C2' | 'C3' | 'Blacklist';
  vote1erTour: boolean;
  vote2emeTour: boolean;
  etiquettes: { [key: string]: boolean };
}

// Interface pour un cabinet avec ses avocats et statistiques
interface CabinetData {
  nom: string;
  effectif: number;
  votants1T: number;
  tauxVote1T: number;
  votants2T: number;
  tauxVote2T: number;
  moyenneVote: number;
  avocats: Avocat[];
}

// Interface pour les données de l'API
interface ApiResponse {
  success: boolean;
  data: CabinetData[] | Avocat[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  columnMapping?: any;
  cached?: boolean;
  error?: string;
}

// Icône LinkedIn personnalisée
const LinkedInIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-gray-600`} style={{ fontSize: '14px' }}>
    in
  </div>
);

export default function HomePage() {
  // États principaux
  const pathname = usePathname();
  const [searchMode, setSearchMode] = useState<'cabinets' | 'avocats'>('cabinets');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Données
  const [cabinetsData, setCabinetsData] = useState<CabinetData[]>([]);
  const [avocatsData, setAvocatsData] = useState<Avocat[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Filtres
  const [filters, setFilters] = useState({
    minEffectif: 1,
    maxEffectif: 999,
    ventresMous: false,
    classification: '',
    etiquette: '',
    sortBy: searchMode === 'cabinets' ? 'effectif' : 'nom',
    sortOrder: searchMode === 'cabinets' ? 'desc' : 'asc'
  });

  // États UI
  const [expandedCabinets, setExpandedCabinets] = useState<Set<string>>(new Set());
  const [availableEtiquettes, setAvailableEtiquettes] = useState<string[]>([]);

  // Charger les données initiales
  useEffect(() => {
    loadData();
    loadAvailableEtiquettes();
  }, []);

  // Recharger quand les filtres ou le mode change
  useEffect(() => {
    loadData();
  }, [searchMode, filters, searchQuery, pagination.page]);

  const loadAvailableEtiquettes = async () => {
    try {
      const response = await fetch('/api/avocats-par-cabinet?limit=1');
      const result: ApiResponse = await response.json();
      if (result.success && result.columnMapping) {
        setAvailableEtiquettes(result.columnMapping.etiquettesNames || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des étiquettes:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '';
      let params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }

      if (searchMode === 'cabinets') {
        url = '/api/avocats-par-cabinet';
        if (searchQuery.trim()) {
          params.append('cabinet', searchQuery.trim());
        }
        params.append('minEffectif', filters.minEffectif.toString());
        params.append('maxEffectif', filters.maxEffectif.toString());
        params.append('ventresMous', filters.ventresMous.toString());
      } else {
        url = '/api/search-avocats';
      }
      

      if (filters.classification) {
        params.append('classification', filters.classification);
      }
      if (filters.etiquette) {
        params.append('etiquette', filters.etiquette);
      }

      const response = await fetch(`${url}?${params}`);
      const result: ApiResponse = await response.json();

      if (result.success) {
        if (searchMode === 'cabinets') {
          setCabinetsData(result.data as CabinetData[]);
          setAvocatsData([]);
        } else {
          setAvocatsData(result.data as Avocat[]);
          setCabinetsData([]);
        }
        setPagination(result.pagination);
      } else {
        setError(result.error || 'Erreur lors du chargement des données');
      }
    } catch (err) {
      setError('Erreur de connexion: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCabinet = (cabinetNom: string) => {
    const newExpanded = new Set(expandedCabinets);
    if (newExpanded.has(cabinetNom)) {
      newExpanded.delete(cabinetNom);
    } else {
      newExpanded.add(cabinetNom);
    }
    setExpandedCabinets(newExpanded);
  };

  const resetFilters = () => {
    setFilters({
      minEffectif: 1,
      maxEffectif: 999,
      ventresMous: false,
      classification: '',
      etiquette: '',
      sortBy: searchMode === 'cabinets' ? 'effectif' : 'nom',
      sortOrder: searchMode === 'cabinets' ? 'desc' : 'asc'
    });
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearchModeChange = (mode: 'cabinets' | 'avocats') => {
    setSearchMode(mode);
    setFilters(prev => ({
      ...prev,
      sortBy: mode === 'cabinets' ? 'effectif' : 'nom',
      sortOrder: mode === 'cabinets' ? 'desc' : 'asc'
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Fonction pour générer les numéros de page à afficher
  const getPageNumbers = () => {
    const { page, totalPages } = pagination;
    const delta = 2; // Nombre de pages à afficher de chaque côté de la page actuelle
    const range = [];
    const rangeWithDots = [];

    // Toujours inclure la première page
    range.push(1);
    
    // Ajouter les pages autour de la page actuelle
    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }
    
    // Toujours inclure la dernière page (si > 1)
    if (totalPages > 1) {
      range.push(totalPages);
    }

    // Ajouter les "..." si nécessaire
    let prev = 0;
    for (const current of range) {
      if (current - prev > 1) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(current);
      prev = current;
    }

    return rangeWithDots;
  };

  // Fonctions utilitaires
  const getInitials = (nomComplet: string) => {
    const parts = nomComplet.trim().split(' ').filter(part => part.length > 0);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    const prenom = parts[0].charAt(0).toUpperCase();
    const nom = parts[parts.length - 1].charAt(0).toUpperCase();
    return prenom + nom;
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'C1': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'C2': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'C3': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Blacklist': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getEtiquetteColor = (etiquetteName: string) => {
    const name = etiquetteName.toUpperCase();
    if (name.includes('LINKEDIN')) {
      return 'bg-slate-800 text-white border-slate-600';
    } else if (name.includes('SOUTIEN') || name.includes('SUPPORT') || name.includes('2024') || name.includes('2022')) {
      return 'bg-indigo-100 text-indigo-700 border-indigo-300';
    } else if (name.includes('OUTLOOK') || name.includes('TÉLÉPHONE') || name.includes('CONTACT')) {
      return 'bg-green-100 text-green-700 border-green-300';
    } else if (name.includes('DJCE') || name.includes('M2') || name.includes('SCIENCES') || name.includes('PARIS')) {
      return 'bg-orange-100 text-orange-700 border-orange-300';
    } else if (name.includes('CLIQUEUR') || name.includes('DATA')) {
      return 'bg-cyan-100 text-cyan-700 border-cyan-300';
    }
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const renderAvocatCard = (avocat: Avocat, showStructure = false) => (
    <div key={`${avocat.nom}-${avocat.email}`} className="klb-card mb-4">
      <div className="klb-card-body">
        <div className="w-full">
          {/* Ligne principale avec avatar et infos */}
          <div className="flex items-start justify-between w-full mb-4">
            {/* Avatar */}
            <div className="flex-shrink-0 mr-6">
              {avocat.photo ? (
                <img 
                  src={avocat.photo} 
                  alt={avocat.nom}
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling!.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-lg ${avocat.photo ? 'hidden' : ''}`}>
                {getInitials(avocat.nom)}
              </div>
            </div>

            {/* Nom et cabinet */}
            <div className="flex-1 min-w-0 mr-8">
              <h3 className="klb-text-body font-medium">{avocat.nom}</h3>
              {showStructure && (
                <p className="klb-structure-text mt-2 mb-4">{avocat.structure}</p>
              )}
            </div>
            
            {/* Enveloppes de vote à gauche des contacts */}
            <div className="flex items-center space-x-6 mr-6">
              {/* Système d'enveloppes pour les votes */}
              <div className="flex items-center space-x-3">
                {/* Enveloppe 1er Tour */}
                <div className="flex flex-col items-center">
                  <div title={`Vote 1er Tour: ${avocat.vote1erTour ? 'Voté' : 'N\'a pas voté'}`}>
                    <Mail 
                      className={`w-5 h-5 ${avocat.vote1erTour ? 'text-green-600' : 'text-red-500'}`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-1">1T</span>
                </div>
                
                {/* Enveloppe 2ème Tour */}
                <div className="flex flex-col items-center">
                  <div title={`Vote 2ème Tour: ${avocat.vote2emeTour ? 'Voté' : 'N\'a pas voté'}`}>
                    <Mail 
                      className={`w-5 h-5 ${avocat.vote2emeTour ? 'text-green-600' : 'text-red-500'}`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-1">2T</span>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="flex items-center space-x-2">
              {avocat.email && (
                <a 
                  href={`mailto:${avocat.email}`}
                  className="klb-icon-btn"
                  title={`Envoyer un email à ${avocat.nom}`}
                >
                  <Mail className="w-4 h-4" />
                </a>
              )}
              {avocat.telFixe && (
                <a 
                  href={`tel:${avocat.telFixe}`}
                  className="klb-icon-btn"
                  title={`Appeler au fixe: ${avocat.telFixe}`}
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              {avocat.telPortable && (
                <a 
                  href={`tel:${avocat.telPortable}`}
                  className="klb-icon-btn"
                  title={`Appeler au portable: ${avocat.telPortable}`}
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              {avocat.linkedin && (
                <a 
                  href={avocat.linkedin}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="klb-icon-btn"
                  title={`Voir le profil LinkedIn de ${avocat.nom}`}
                >
                  <LinkedInIcon />
                </a>
              )}
            </div>
          </div>

          {/* Ligne des étiquettes en dessous */}
          <div className="flex flex-wrap gap-2 ml-22">
            {/* Classification */}
            {avocat.classification && (
              <span className={`klb-badge-small ${getClassificationColor(avocat.classification)}`}>
                {avocat.classification}
              </span>
            )}
            
            {/* Étiquettes */}
            {Object.entries(avocat.etiquettes).map(([etiquette, active]) => 
              active && (
                <span 
                  key={etiquette}
                  className={`klb-badge-small ${getEtiquetteColor(etiquette)}`}
                >
                  {etiquette}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="klb-header">
        <div className="klb-container h-full">
          <div className="flex items-center justify-between h-full w-full">
            {/* Logo ferré à gauche */}
            <div className="flex-shrink-0">
              <Link href="/" className="klb-brand">
                Outil KLB
              </Link>
            </div>
            
            {/* Espace flexible au centre */}
            <div className="flex-grow"></div>
            
            {/* Navigation ferrée à droite */}
            <nav className="flex items-center space-x-8 flex-shrink-0">
              <Link 
                href="/" 
                className={`klb-nav-item ${pathname === '/' ? 'klb-nav-item-active' : ''}`}
              >
                Recherche
              </Link>
              <Link 
                href="/dashboard" 
                className={`klb-nav-item ${pathname === '/dashboard' ? 'klb-nav-item-active' : ''}`}
              >
                Tableau de bord
              </Link>
              <Link 
                href="/admin" 
                className={`klb-nav-item ${pathname === '/admin' ? 'klb-nav-item-active' : ''}`}
              >
                Administration
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="klb-container" style={{paddingTop: '60px'}}>
        {/* Titre et barre de recherche */}
        <div className="mb-12">
          <h1 className="klb-section-title klb-page-title">
            Recherche Cabinets & Avocats
          </h1>
          
          {/* Barre de recherche avec toggle */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center space-x-4 mb-4">
              {/* Toggle mode de recherche */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleSearchModeChange('cabinets')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    searchMode === 'cabinets' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Cabinets
                </button>
                <button
                  onClick={() => handleSearchModeChange('avocats')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    searchMode === 'avocats' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Avocats
                </button>
              </div>
              
              {/* Barre de recherche */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Rechercher ${searchMode === 'cabinets' ? 'un cabinet' : 'un avocat'}...`}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Bouton filtres */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-3 border rounded-lg transition-colors flex items-center space-x-2 ${
                  showFilters ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span>Filtres</span>
              </button>
            </div>

            {/* Panel des filtres */}
            {showFilters && (
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Filtre Ventres Mous (seulement en mode cabinets) */}
                  {searchMode === 'cabinets' && (
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={filters.ventresMous}
                          onChange={(e) => setFilters(prev => ({ ...prev, ventresMous: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Ventres Mous (10-30)</span>
                      </label>
                    </div>
                  )}

                  {/* Effectif min/max (seulement en mode cabinets) */}
                  {searchMode === 'cabinets' && !filters.ventresMous && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Effectif minimum
                        </label>
                        <input
                          type="number"
                          value={filters.minEffectif}
                          onChange={(e) => setFilters(prev => ({ ...prev, minEffectif: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Effectif maximum
                        </label>
                        <input
                          type="number"
                          value={filters.maxEffectif}
                          onChange={(e) => setFilters(prev => ({ ...prev, maxEffectif: parseInt(e.target.value) || 999 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          min="1"
                        />
                      </div>
                    </>
                  )}

                  {/* Classification */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Classification
                    </label>
                    <select
                      value={filters.classification}
                      onChange={(e) => setFilters(prev => ({ ...prev, classification: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Toutes</option>
                      <option value="C1">C1 - Soutien Fort</option>
                      <option value="C2">C2 - Soutien Modéré</option>
                      <option value="C3">C3 - Neutre</option>
                      <option value="Blacklist">Blacklist</option>
                    </select>
                  </div>

                  {/* Étiquettes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Étiquette
                    </label>
                    <select
                      value={filters.etiquette}
                      onChange={(e) => setFilters(prev => ({ ...prev, etiquette: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Toutes</option>
                      {availableEtiquettes.map(etiquette => (
                        <option key={etiquette} value={etiquette}>
                          {etiquette}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={resetFilters}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Résultats */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 klb-text-caption">Chargement des données...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <>
            {/* Informations sur les résultats */}
            <div className="mb-6 flex justify-between items-center">
              <p className="klb-text-caption">
                {pagination.total} {searchMode === 'cabinets' ? 'cabinets' : 'avocats'} trouvé{pagination.total > 1 ? 's' : ''}
                {searchQuery && ` pour "${searchQuery}"`}
              </p>
              
              {/* Tri */}
              <div className="flex items-center space-x-2">
                <span className="klb-text-micro">Tri par:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="px-2 py-1 border border-gray-300 rounded klb-text-micro"
                >
                  {searchMode === 'cabinets' ? (
                    <>
                      <option value="effectif">Effectif</option>
                      <option value="nom">Nom</option>
                      <option value="tauxVote1T">Taux vote 1T</option>
                      <option value="tauxVote2T">Taux vote 2T</option>
                      <option value="moyenneVote">Moyenne vote</option>
                    </>
                  ) : (
                    <>
                      <option value="nom">Nom</option>
                      <option value="structure">Cabinet</option>
                    </>
                  )}
                </select>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                  className="px-2 py-1 border border-gray-300 rounded klb-text-micro"
                >
                  <option value="asc">Croissant</option>
                  <option value="desc">Décroissant</option>
                </select>
              </div>
            </div>

            {/* Liste des résultats */}
            <div className="space-y-4">
              {/* Mode Cabinets */}
              {searchMode === 'cabinets' && cabinetsData.map((cabinet) => (
                <div key={cabinet.nom} className="klb-card">
                  <div className="klb-card-body">
                    {/* En-tête du cabinet */}
                    <div className="klb-cabinet-header" onClick={() => toggleCabinet(cabinet.nom)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <h2 className="klb-subsection-title">{cabinet.nom}</h2>
                          <span className="klb-badge-outline">
                            {cabinet.effectif} avocat{cabinet.effectif > 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {/* Statistiques de vote modernes */}
                          <div className="klb-vote-stats">
                            <div className="klb-vote-stat">
                              <div className="klb-vote-label">Vote 1er Tour</div>
                              <div className="klb-vote-value">
                                {cabinet.votants1T}/{cabinet.effectif}
                                <span className="klb-vote-percentage">({Math.round(cabinet.tauxVote1T)}%)</span>
                              </div>
                            </div>
                            
                            <div className="klb-vote-stat">
                              <div className="klb-vote-label">Vote 2nd Tour</div>
                              <div className="klb-vote-value">
                                {cabinet.votants2T}/{cabinet.effectif}
                                <span className="klb-vote-percentage">({Math.round(cabinet.tauxVote2T)}%)</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Bouton expansion moderne */}
                          <div className="klb-expand-btn">
                            {expandedCabinets.has(cabinet.nom) ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Liste des avocats (si étendu) */}
                    {expandedCabinets.has(cabinet.nom) && (
                      <div className="mt-6 pl-4 border-l-2 border-gray-200">
                        <div className="grid gap-4">
                          {cabinet.avocats.map((avocat) => renderAvocatCard(avocat))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Mode Avocats */}
              {searchMode === 'avocats' && avocatsData.map((avocat) => renderAvocatCard(avocat, true))}
            </div>

            {/* Pagination moderne */}
            {pagination.totalPages > 1 && (
              <div className="klb-pagination">
                {/* Première page */}
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page === 1}
                  className="klb-pagination-btn"
                  title="Première page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                
                {/* Page précédente */}
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="klb-pagination-btn"
                  title="Page précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Numéros de page */}
                {getPageNumbers().map((pageNumber, index) => (
                  pageNumber === '...' ? (
                    <div key={`ellipsis-${index}`} className="klb-pagination-ellipsis">
                      ...
                    </div>
                  ) : (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber as number)}
                      className={`klb-pagination-btn ${pagination.page === pageNumber ? 'active' : ''}`}
                    >
                      {pageNumber}
                    </button>
                  )
                ))}
                
                {/* Page suivante */}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="klb-pagination-btn"
                  title="Page suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                {/* Dernière page */}
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                  className="klb-pagination-btn"
                  title="Dernière page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}