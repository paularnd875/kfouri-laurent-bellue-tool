'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface ClassificationChange {
  prenomnom: string;
  classification: string;
  date: string;
}

interface AdminStats {
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
  classificationRate: number;
  lastUpdated?: string;
}

export default function AdminPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [changes, setChanges] = useState<ClassificationChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    loadChanges();
  }, []);

  const handleLogout = () => {
    // Supprimer le cookie d'authentification
    document.cookie = 'klb_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    // Rediriger vers la page de login
    router.push('/login');
  };

  const loadStats = async () => {
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
          classifications: result.stats.classifications,
          classificationRate: result.stats.classificationRate,
          lastUpdated: result.metadata.lastUpdated
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement des stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChanges = async () => {
    try {
      const response = await fetch('/api/classifications');
      const result = await response.json();
      
      if (result.success) {
        const formattedChanges = result.classifications.map((classification: any) => ({
          prenomnom: classification.nom,
          classification: classification.nouvelleClassification,
          date: classification.dateModification
        }));
        setChanges(formattedChanges || []);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des modifications:', err);
    }
  };

  const exportCSV = async () => {
    try {
      const response = await fetch('/api/classifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        const blob = new Blob([result.csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || `classifications_modifications_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Erreur lors de l\'export CSV:', err);
    }
  };

  const clearAllChanges = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les modifications en attente ?')) {
      return;
    }

    try {
      const response = await fetch('/api/classifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'vider'
        })
      });

      const result = await response.json();
      if (result.success) {
        setChanges([]);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression des modifications:', err);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
      <main className="klb-page-content klb-container py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 klb-page-title">
            ⚙️ Interface d'Administration
          </h1>
          <p className="text-lg klb-text-muted max-w-2xl mx-auto">
            Tableau de bord de gestion des classifications et export des données
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="klb-grid klb-grid-responsive klb-section-spacing">
            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat">{stats.totalLawyers}</div>
                <h3 className="text-lg font-semibold text-gray-700">Avocats Total</h3>
                <p className="klb-text-small">Base de données</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat">{stats.totalFirms}</div>
                <h3 className="text-lg font-semibold text-gray-700">Cabinets</h3>
                <p className="klb-text-small">Structures identifiées</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat">{stats.bernardLinkedIn + stats.sabineLinkedIn}</div>
                <h3 className="text-lg font-semibold text-gray-700">Réseau LinkedIn</h3>
                <p className="klb-text-small">Total connexions</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-stat">{stats.classificationRate}%</div>
                <h3 className="text-lg font-semibold text-gray-700">Classification</h3>
                <p className="klb-text-small">Taux global</p>
              </div>
            </div>
          </div>
        )}

        {/* Classification Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Modifications en attente */}
          <div className="klb-card">
            <div className="klb-card-header">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  📝 Modifications de Classification
                </h2>
                <div className="flex space-x-2">
                  {changes.length > 0 && (
                    <>
                      <button onClick={exportCSV} className="klb-btn-outline text-sm">
                        📥 Export CSV
                      </button>
                      <button onClick={clearAllChanges} className="klb-btn-outline text-sm text-red-600">
                        🗑️ Vider
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="klb-card-body">
              {changes.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {changes.map((change, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {change.prenomnom}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(change.date).toLocaleString('fr-FR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`klb-badge-${change.classification.toLowerCase()}`}>
                            {change.classification}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📝</div>
                  <p>Aucune modification en attente</p>
                  <p className="text-sm">Les modifications apparaîtront ici</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions rapides */}
          <div className="klb-card">
            <div className="klb-card-header">
              <h2 className="text-xl font-semibold text-gray-800">⚡ Actions Rapides</h2>
            </div>
            <div className="klb-card-body space-y-4">
              <Link href="/classification" className="klb-card hover:scale-105 transition-transform block">
                <div className="klb-card-body text-center">
                  <div className="text-3xl mb-2">📊</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Gérer Classifications</h3>
                  <p className="klb-text-small">Interface de modification des étiquettes</p>
                </div>
              </Link>


              <button 
                onClick={exportCSV}
                className="klb-card hover:scale-105 transition-transform w-full text-left"
              >
                <div className="klb-card-body text-center">
                  <div className="text-3xl mb-2">📥</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Export Global</h3>
                  <p className="klb-text-small">Télécharger toutes les modifications</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 klb-card">
          <div className="klb-card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="klb-text-small font-medium">Système opérationnel</span>
              </div>
              <div className="klb-text-small">
                {stats?.lastUpdated ? (
                  `Dernière sync: ${new Date(stats.lastUpdated).toLocaleString('fr-FR')}`
                ) : (
                  'Dernière sync: En attente...'
                )}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Interface d'administration • {changes.length} modification{changes.length > 1 ? 's' : ''} en attente
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}