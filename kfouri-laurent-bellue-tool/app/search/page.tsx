'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LawyerCard from '@/components/LawyerCard';

interface LawyerSearch {
  prenomnom?: string;
  nom_complet?: string;
  email?: string;
  cabinet?: string;
  classement?: string;
  linkedin_bernard?: boolean;
  linkedin_sabine?: boolean;
  photo_url?: string;
  raw_data?: any;
}

interface SearchStats {
  total: number;
  totalLawyers: number;
  totalFirms: number;
  bernardLinkedIn: number;
  sabineLinkedIn: number;
  classifications: {
    c1: number;
    c2: number;
    c3: number;
    blacklist: number;
  };
}

export default function SearchPage() {
  const [lawyers, setLawyers] = useState<LawyerSearch[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('all');
  const [selectedFirm, setSelectedFirm] = useState('all');
  const [linkedInFilter, setLinkedInFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [availableFirms, setAvailableFirms] = useState<string[]>([]);

  const limit = 25;

  useEffect(() => {
    // Charger les cabinets disponibles
    loadFirms();
  }, []);

  useEffect(() => {
    if (searchTerm || selectedClassification !== 'all' || selectedFirm !== 'all' || linkedInFilter !== 'all') {
      performSearch(true);
    } else {
      // Reset si aucun filtre
      setLawyers([]);
      setStats(null);
    }
  }, [searchTerm, selectedClassification, selectedFirm, linkedInFilter]);

  const loadFirms = async () => {
    try {
      const response = await fetch('/api/cabinets?limit=50');
      const result = await response.json();
      
      if (result.success) {
        const firmNames = result.data.map((firm: any) => firm.name).filter((name: string) => name !== 'Cabinet non spécifié');
        setAvailableFirms(firmNames);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des cabinets:', err);
    }
  };

  const performSearch = async (reset = false) => {
    if (!searchTerm && selectedClassification === 'all' && selectedFirm === 'all' && linkedInFilter === 'all') {
      return;
    }

    try {
      setLoading(true);
      const offset = reset ? 0 : currentPage * limit;
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (searchTerm) params.set('search', searchTerm);
      if (selectedClassification !== 'all') params.set('classification', selectedClassification);
      if (selectedFirm !== 'all') params.set('cabinet', selectedFirm);

      // Filtrage LinkedIn spécial
      let endpoint = '/api/lawyers';
      if (linkedInFilter === 'bernard') {
        endpoint = '/api/linkedin';
        params.set('network', 'bernard');
      } else if (linkedInFilter === 'sabine') {
        endpoint = '/api/linkedin';
        params.set('network', 'sabine');
      } else if (linkedInFilter === 'both') {
        endpoint = '/api/linkedin';
        params.set('network', 'both');
      }

      const response = await fetch(`${endpoint}?${params}`);
      const result = await response.json();
      
      if (result.success) {
        if (reset) {
          setLawyers(result.data);
          setCurrentPage(0);
        } else {
          setLawyers(prev => [...prev, ...result.data]);
        }
        setStats(result.stats);
        setHasMore(result.pagination.hasMore);
        setError(null);
      } else {
        setError(result.error || 'Erreur lors de la recherche');
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
      performSearch(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClassification('all');
    setSelectedFirm('all');
    setLinkedInFilter('all');
    setLawyers([]);
    setStats(null);
    setError(null);
    setCurrentPage(0);
    setHasMore(true);
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

  const hasActiveFilters = searchTerm || selectedClassification !== 'all' || selectedFirm !== 'all' || linkedInFilter !== 'all';

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
                🔍 Recherche Avocats
              </span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/" className="klb-nav-item">
                Accueil
              </Link>
              <Link href="/classification" className="klb-nav-item">
                Classification
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
            🔍 Recherche d'Avocats
          </h1>
          <p className="text-lg klb-text-muted max-w-2xl mx-auto">
            Recherche avancée dans la base de données de 36 751 avocats du barreau de Paris
          </p>
          {loading && (
            <div className="mt-4 text-blue-600">
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></span>
              Recherche en cours...
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg inline-block">
              <span className="text-red-700">❌ {error}</span>
            </div>
          )}
        </div>

        {/* Search Filters */}
        <div className="klb-card mb-6">
          <div className="klb-card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">🎯 Filtres de Recherche</h2>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="klb-btn-outline text-sm">
                  🔄 Effacer les filtres
                </button>
              )}
            </div>
          </div>
          <div className="klb-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche par nom/email
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nom, prénom, email..."
                  className="klb-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Classification
                </label>
                <select
                  value={selectedClassification}
                  onChange={(e) => setSelectedClassification(e.target.value)}
                  className="klb-input"
                >
                  <option value="all">Toutes les classifications</option>
                  <option value="C1">C1 - Soutien Fort</option>
                  <option value="C2">C2 - Soutien Modéré</option>
                  <option value="C3">C3 - Neutre</option>
                  <option value="Blacklist">Blacklist</option>
                  <option value="">Non classé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Réseau LinkedIn
                </label>
                <select
                  value={linkedInFilter}
                  onChange={(e) => setLinkedInFilter(e.target.value)}
                  className="klb-input"
                >
                  <option value="all">Tous les avocats</option>
                  <option value="bernard">Réseau Bernard seulement</option>
                  <option value="sabine">Réseau Sabine seulement</option>
                  <option value="both">Connectés aux deux</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cabinet
                </label>
                <select
                  value={selectedFirm}
                  onChange={(e) => setSelectedFirm(e.target.value)}
                  className="klb-input"
                >
                  <option value="all">Tous les cabinets</option>
                  {availableFirms.slice(0, 20).map(firm => (
                    <option key={firm} value={firm}>
                      {firm}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results Summary */}
        {stats && (
          <div className="klb-card mb-6">
            <div className="klb-card-body">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-gray-600">Résultats</div>
                  </div>
                  {stats.classifications && (
                    <>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{stats.classifications.c1 + stats.classifications.c2}</div>
                        <div className="text-sm text-gray-600">Soutiens (C1+C2)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-yellow-600">{stats.classifications.c3}</div>
                        <div className="text-sm text-gray-600">Neutres (C3)</div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="text-sm text-gray-500">
                  {lawyers.length} résultats chargés{hasMore && ' • Charger plus pour voir tous les résultats'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {lawyers.length > 0 && (
          <div className="klb-card">
            <div className="klb-card-header">
              <h2 className="text-xl font-semibold text-gray-800">
                📋 Résultats de la recherche ({stats?.total || 0})
              </h2>
            </div>
            <div className="klb-card-body">
              <div className="space-y-4">
                {lawyers.map((lawyer, index) => (
                  <LawyerCard 
                    key={index} 
                    lawyer={lawyer}
                    showClassificationEditor={true}
                    onClassificationChange={() => performSearch(true)}
                  />
                ))}
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
                  Tous les résultats ont été chargés
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Results */}
        {hasActiveFilters && !loading && lawyers.length === 0 && !error && (
          <div className="klb-card">
            <div className="klb-card-body text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Aucun résultat trouvé
              </h3>
              <p className="text-gray-500 mb-4">
                Essayez de modifier vos critères de recherche
              </p>
              <button onClick={clearFilters} className="klb-btn-outline">
                Effacer tous les filtres
              </button>
            </div>
          </div>
        )}

        {/* Help Card */}
        {!hasActiveFilters && (
          <div className="klb-card">
            <div className="klb-card-body text-center py-12">
              <div className="text-gray-300 text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Recherche d'avocats
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Utilisez les filtres ci-dessus pour rechercher parmi les 36 751 avocats du barreau de Paris.
                Vous pouvez filtrer par nom, classification, réseau LinkedIn ou cabinet.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}