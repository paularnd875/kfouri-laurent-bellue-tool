'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface DashboardStats {
  totalLawyers: number;
  totalFirms: number;
  bernardLinkedIn: number;
  sabineLinkedIn: number;
  linkedInCoverage: number;
  classifications: {
    c1: number;
    c2: number;
    c3: number;
    blacklist: number;
  };
  classificationRate: number;
  supportPercentage: number;
  lastUpdated?: string;
}

export default function Home() {
  const pathname = usePathname();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalLawyers: 0,
    totalFirms: 0,
    bernardLinkedIn: 0,
    sabineLinkedIn: 0,
    linkedInCoverage: 0,
    classifications: {
      c1: 0,
      c2: 0,
      c3: 0,
      blacklist: 0
    },
    classificationRate: 0,
    supportPercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = () => {
    // Supprimer le cookie d'authentification
    document.cookie = 'klb_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    // Rediriger vers la page de login
    router.push('/login');
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin-stats');
      const result = await response.json();
      
      if (result.success) {
        setStats({
          totalLawyers: result.stats.totalLawyers,
          totalFirms: result.stats.totalFirms,
          bernardLinkedIn: result.stats.bernardLinkedIn,
          sabineLinkedIn: result.stats.sabineLinkedIn,
          linkedInCoverage: result.stats.linkedInCoverage,
          classifications: result.stats.classifications,
          classificationRate: result.stats.classificationRate,
          supportPercentage: result.stats.supportPercentage,
          lastUpdated: result.metadata.lastUpdated
        });
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
              <button
                onClick={handleLogout}
                className="klb-nav-item text-red-400 hover:text-red-300 flex items-center space-x-2"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="klb-container" style={{paddingTop: '60px'}}>
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="klb-section-title klb-page-title">
            Tableau de Bord de Campagne
          </h1>
          <p className="klb-text-body klb-text-muted max-w-2xl">
            Outil de gestion et d'analyse des relations pour les élections du Conseil de l'Ordre 
            des avocats du barreau de Paris - Décembre 2026
          </p>
          {loading && (
            <div className="mt-4 klb-text-body" style={{ color: 'var(--klb-primary)' }}>
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

        {/* Stats Cards */}
        <div className="klb-grid klb-grid-responsive klb-section-spacing">
          {/* Total Lawyers */}
          <div className="klb-card">
            <div className="klb-card-body text-center">
              <div className="klb-stat">{stats.totalLawyers}</div>
              <h3 className="klb-subsection-title">Avocats Total</h3>
              <p className="klb-text-small">Base de données complète</p>
            </div>
          </div>

          {/* Total Firms */}
          <div className="klb-card">
            <div className="klb-card-body text-center">
              <div className="klb-stat">{stats.totalFirms}</div>
              <h3 className="klb-subsection-title">Cabinets</h3>
              <p className="klb-text-small">Structures analysées</p>
            </div>
          </div>

          {/* Bernard LinkedIn */}
          <div className="klb-card">
            <div className="klb-card-body text-center">
              <div className="klb-stat">{stats.bernardLinkedIn}</div>
              <h3 className="klb-subsection-title">Réseau Bernard</h3>
              <div className="klb-badge-linkedin mt-2">LinkedIn</div>
            </div>
          </div>

          {/* Sabine LinkedIn */}
          <div className="klb-card">
            <div className="klb-card-body text-center">
              <div className="klb-stat">{stats.sabineLinkedIn}</div>
              <h3 className="klb-subsection-title">Réseau Sabine</h3>
              <div className="klb-badge-linkedin mt-2">LinkedIn</div>
            </div>
          </div>
        </div>

        {/* Classifications Overview */}
        <div className="klb-card klb-section-spacing">
          <div className="klb-card-header">
            <h3 className="klb-subsection-title">Classification des Contacts</h3>
          </div>
          <div className="klb-card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="klb-grid klb-grid-responsive">
          <Link href="/search" className="klb-card hover:scale-105 transition-transform">
            <div className="klb-card-body text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="klb-subsection-title mb-2">Recherche Avocats</h3>
              <p className="klb-text-small">Trouver et analyser les profils</p>
            </div>
          </Link>

          <Link href="/classification" className="klb-card hover:scale-105 transition-transform">
            <div className="klb-card-body text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="klb-subsection-title mb-2">Classification</h3>
              <p className="klb-text-small">Gérer les étiquettes C1-C2-C3</p>
            </div>
          </Link>

          <Link href="/cabinets-analysis" className="klb-card hover:scale-105 transition-transform">
            <div className="klb-card-body text-center">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="klb-subsection-title mb-2">Analyse Cabinets</h3>
              <p className="klb-text-small">Tri par taux de participation</p>
            </div>
          </Link>

          <div className="klb-card hover:scale-105 transition-transform">
            <div className="klb-card-body text-center">
              <div className="text-4xl mb-4">📥</div>
              <h3 className="klb-subsection-title mb-2">Test Google Sheets</h3>
              <p className="klb-text-small mb-4">Tester l'accès aux données</p>
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/test-sheets');
                    const result = await response.json();
                    alert(response.ok ? 'Connexion réussie !' : `Erreur: ${result.error}`);
                  } catch (error) {
                    alert('Erreur de connexion: ' + error);
                  }
                }}
                className="klb-btn-primary"
              >
                🧪 Test
              </button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : loading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              <span className="klb-text-small font-medium">
                {error ? 'Erreur de connexion' : loading ? 'Chargement...' : 'Système opérationnel'}
              </span>
            </div>
            <div className="klb-text-small">
              {stats.lastUpdated ? (
                `Dernière synchronisation: ${new Date(stats.lastUpdated).toLocaleString('fr-FR')}`
              ) : (
                'Dernière synchronisation: En attente...'
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center space-x-4 klb-text-small klb-text-muted">
            <span>Taux de classification: {stats.classificationRate}%</span>
            <span>Score de soutien: {stats.supportPercentage}%</span>
            <span>Couverture LinkedIn: {stats.linkedInCoverage}%</span>
            <button 
              onClick={fetchStats} 
              className="klb-btn-outline klb-text-small py-1 px-2 ml-auto"
              disabled={loading}
            >
              🔄 Actualiser
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
