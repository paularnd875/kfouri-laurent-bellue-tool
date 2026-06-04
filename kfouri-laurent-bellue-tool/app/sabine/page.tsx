'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LawyerCard from '@/components/LawyerCard';

interface LawyerLinkedIn {
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

interface NetworkStats {
  total: number;
  totalWithBoth: number;
  classifications: {
    c1: number;
    c2: number;
    c3: number;
    blacklist: number;
    unclassified: number;
  };
  topFirms: { name: string; count: number }[];
  classificationRate: number;
}

export default function SabineNetworkPage() {
  const [lawyers, setLawyers] = useState<LawyerLinkedIn[]>([]);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('all');
  const [selectedFirm, setSelectedFirm] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const limit = 20;

  useEffect(() => {
    fetchNetworkData(true);
  }, [searchTerm, selectedClassification, selectedFirm]);

  const fetchNetworkData = async (reset = false) => {
    try {
      setLoading(true);
      const offset = reset ? 0 : currentPage * limit;
      
      const params = new URLSearchParams({
        network: 'sabine',
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (searchTerm) params.set('search', searchTerm);
      if (selectedClassification !== 'all') params.set('classification', selectedClassification);
      if (selectedFirm !== 'all') params.set('cabinet', selectedFirm);

      const response = await fetch(`/api/linkedin?${params}`);
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
      fetchNetworkData(false);
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
              <span className="klb-badge-linkedin">
                Réseau LinkedIn Sabine
              </span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/" className="klb-nav-item">
                Accueil
              </Link>
              <Link href="/bernard" className="klb-nav-item">
                Réseau Bernard
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
            🔗 Réseau LinkedIn de Sabine Kfouri
          </h1>
          <p className="text-lg klb-text-muted max-w-2xl mx-auto">
            Gestion et analyse des connexions LinkedIn de Sabine pour la campagne électorale
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

        {/* Stats Overview */}
        {stats && (
          <div className="klb-grid klb-grid-responsive mb-8">
            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat">{stats.total}</div>
                <h3 className="text-lg font-semibold text-gray-700">Connexions Sabine</h3>
                <p className="klb-text-small">Total dans le réseau</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat">{stats.totalWithBoth}</div>
                <h3 className="text-lg font-semibold text-gray-700">Connexions Croisées</h3>
                <p className="klb-text-small">Aussi connectés à Bernard</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat">{stats.classificationRate}%</div>
                <h3 className="text-lg font-semibold text-gray-700">Taux de Classification</h3>
                <p className="klb-text-small">Contacts étiquetés</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat text-green-600">{stats.classifications.c1 + stats.classifications.c2}</div>
                <h3 className="text-lg font-semibold text-gray-700">Soutiens Potentiels</h3>
                <p className="klb-text-small">C1 + C2</p>
              </div>
            </div>
          </div>
        )}

        {/* Classification Breakdown */}
        {stats && (
          <div className="klb-card mb-6">
            <div className="klb-card-header">
              <h2 className="text-xl font-semibold text-gray-800">📊 Répartition des Classifications</h2>
            </div>
            <div className="klb-card-body">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="klb-stat text-green-600">{stats.classifications.c1}</div>
                  <div className="klb-badge-c1 mt-2">C1 - Soutien Fort</div>
                </div>
                <div className="text-center">
                  <div className="klb-stat text-green-500">{stats.classifications.c2}</div>
                  <div className="klb-badge-c2 mt-2">C2 - Soutien Modéré</div>
                </div>
                <div className="text-center">
                  <div className="klb-stat" style={{ color: 'var(--klb-c3)' }}>{stats.classifications.c3}</div>
                  <div className="klb-badge-c3 mt-2">C3 - Neutre</div>
                </div>
                <div className="text-center">
                  <div className="klb-stat text-red-600">{stats.classifications.blacklist}</div>
                  <div className="klb-badge-blacklist mt-2">Blacklist</div>
                </div>
                <div className="text-center">
                  <div className="klb-stat text-gray-600">{stats.classifications.unclassified}</div>
                  <div className="klb-badge-outline mt-2">Non classé</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="klb-card mb-6">
          <div className="klb-card-header">
            <h2 className="text-xl font-semibold text-gray-800">🔍 Filtres de Recherche</h2>
          </div>
          <div className="klb-card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche par nom ou email
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
                  <option value="unclassified">Non classé</option>
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
                  {stats?.topFirms.map(firm => (
                    <option key={firm.name} value={firm.name}>
                      {firm.name} ({firm.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Lawyers List */}
        <div className="klb-card">
          <div className="klb-card-header">
            <h2 className="text-xl font-semibold text-gray-800">
              👥 Contacts LinkedIn ({stats?.total || 0})
            </h2>
          </div>
          <div className="klb-card-body">
            <div className="space-y-4">
              {lawyers.map((lawyer, index) => (
                <LawyerCard 
                  key={index} 
                  lawyer={lawyer}
                  showClassificationEditor={true}
                  onClassificationChange={() => fetchNetworkData(true)}
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
                Tous les contacts ont été chargés
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}