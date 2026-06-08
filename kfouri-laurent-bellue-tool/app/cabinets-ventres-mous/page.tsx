'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Target, Settings, BarChart3, Users, RotateCcw, Mail, Search, Download, ChevronDown, MailOpen, MailX, Tag, UserCircle, Phone, Smartphone } from 'lucide-react';

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
  photo?: string;
  // Nouvelles données
  classification?: 'C1' | 'C2' | 'C3' | 'Blacklist';
  vote1erTour?: boolean;
  vote2emeTour?: boolean;
  etiquettes?: { [key: string]: string }; // Labels dynamiques des colonnes AY-BR
  cercleAssigne?: 'C1' | 'C2' | 'C3' | 'Blacklist' | null; // Classification assignée par l'utilisateur
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

// Composant icône LinkedIn personnalisé
const LinkedInIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-gray-600`} style={{ fontSize: '14px' }}>
    in
  </div>
);

export default function CabinetsVentresMousPage() {
  const [cabinets, setCabinets] = useState<CabinetVoteData[]>([]);
  const [stats, setStats] = useState<CabinetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Gestion de l'affichage des avocats (comportement accordéon)
  const [selectedCabinet, setSelectedCabinet] = useState<string | null>(null);
  const [avocatsCabinet, setAvocatsCabinet] = useState<AvocatCabinet[]>([]);
  const [loadingAvocats, setLoadingAvocats] = useState(false);
  
  // Gestion du matching LinkedIn
  const [linkedinMatching, setLinkedinMatching] = useState<Record<string, any>>({});
  
  // Gestion des classifications assignées par l'utilisateur
  const [avocatClassifications, setAvocatClassifications] = useState<Record<string, 'C1' | 'C2' | 'C3' | 'Blacklist' | null>>({});
  
  // Filtres
  const [minEffectif, setMinEffectif] = useState(10);
  const [maxEffectif, setMaxEffectif] = useState(30);
  const [maxTauxVote, setMaxTauxVote] = useState(100);
  const [sortBy, setSortBy] = useState('moyenneVote');
  const [sortOrder, setSortOrder] = useState('asc');

  // Fonction utilitaire pour générer les initiales prénom + nom
  const getInitials = (nomComplet: string) => {
    const parts = nomComplet.trim().split(' ').filter(part => part.length > 0);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    // Prendre la première lettre du premier mot (prénom) et du dernier mot (nom)
    const prenom = parts[0].charAt(0).toUpperCase();
    const nom = parts[parts.length - 1].charAt(0).toUpperCase();
    return prenom + nom;
  };

  useEffect(() => {
    fetchCabinetData();
    fetchLinkedInMatchingData();
  }, [minEffectif, maxEffectif, maxTauxVote, sortBy, sortOrder]);

  const fetchCabinetData = async () => {
    try {
      setLoading(true);
      
      // Utiliser la nouvelle API qui récupère tous les cabinets avec leurs avocats
      const response = await fetch(`/api/avocats-par-cabinet?limit=1000`);
      const result = await response.json();
      
      if (result.success) {
        // Transformer les données pour correspondre à l'interface existante
        const cabinetsData: CabinetVoteData[] = result.data
          .filter((cabinet: any) => 
            cabinet.effectif >= minEffectif && 
            cabinet.effectif <= maxEffectif &&
            cabinet.moyenneVote <= maxTauxVote
          )
          .map((cabinet: any) => ({
            structure: cabinet.nom,
            effectif: cabinet.effectif,
            votants1T: cabinet.votants1T,
            tauxVote1T: cabinet.tauxVote1T,
            votants2T: cabinet.votants2T,
            tauxVote2T: cabinet.tauxVote2T,
            moyenneVote: cabinet.moyenneVote,
            trancheEffectif: cabinet.effectif <= 10 ? '≤ 10' : 
                           cabinet.effectif <= 30 ? '10-30' :
                           cabinet.effectif <= 50 ? '30-50' : '> 50'
          }))
          .sort((a: CabinetVoteData, b: CabinetVoteData) => {
            const aValue = sortBy === 'effectif' ? a.effectif :
                          sortBy === 'tauxVote1T' ? a.tauxVote1T :
                          sortBy === 'tauxVote2T' ? a.tauxVote2T :
                          a.moyenneVote;
            const bValue = sortBy === 'effectif' ? b.effectif :
                          sortBy === 'tauxVote1T' ? b.tauxVote1T :
                          sortBy === 'tauxVote2T' ? b.tauxVote2T :
                          b.moyenneVote;
            return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
          });

        setCabinets(cabinetsData);
        
        // Calculer les stats
        const statsData: CabinetStats = {
          totalCabinets: cabinetsData.length,
          effectifMoyen: Math.round(cabinetsData.reduce((sum, cab) => sum + cab.effectif, 0) / cabinetsData.length),
          tauxVoteMoyen: Math.round(cabinetsData.reduce((sum, cab) => sum + cab.moyenneVote, 0) / cabinetsData.length * 100) / 100,
          repartitionTranches: cabinetsData.reduce((acc, cab) => {
            acc[cab.trancheEffectif] = (acc[cab.trancheEffectif] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };
        setStats(statsData);
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
      
      // Récupération des vraies données depuis l'API
      const response = await fetch(`/api/avocats-par-cabinet?cabinet=${encodeURIComponent(cabinetName)}&limit=1000`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const cabinet = result.data[0];
        const avocatsFormatted: AvocatCabinet[] = cabinet.avocats.map((avocat: any) => ({
          nomComplet: avocat.nom,
          email: avocat.email,
          telFixe: avocat.telFixe,
          telPortable: avocat.telPortable,
          linkedin: avocat.linkedin,
          photo: avocat.photo,
          structure: avocat.structure || cabinetName,
          classification: avocat.classification,
          vote1erTour: avocat.vote1erTour,
          vote2emeTour: avocat.vote2emeTour,
          etiquettes: Object.keys(avocat.etiquettes).reduce((acc: any, key: string) => {
            if (avocat.etiquettes[key]) {
              acc[key] = "1";
            }
            return acc;
          }, {}),
          cercleAssigne: avocatClassifications[`${avocat.nom}-${cabinetName}`] || null
        }));
        
        setAvocatsCabinet(avocatsFormatted);
      } else {
        console.warn('Aucun avocat trouvé pour le cabinet:', cabinetName);
        setAvocatsCabinet([]);
      }
      
      setSelectedCabinet(cabinetName);
      console.log('Avocats loaded for', cabinetName);
      
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
    // Comportement accordéon : fermer le cabinet actuel si on clique dessus, sinon ouvrir le nouveau
    if (selectedCabinet === cabinetName) {
      // Fermer le cabinet actuel
      setSelectedCabinet(null);
      setAvocatsCabinet([]);
    } else {
      // Ouvrir le nouveau cabinet (ferme automatiquement le précédent)
      setSelectedCabinet(cabinetName);
      fetchAvocatsCabinet(cabinetName);
    }
  };

  const getTauxColor = (taux: number) => {
    if (taux < 30) return 'text-red-600 bg-red-50';
    if (taux < 50) return 'text-orange-600 bg-orange-50';
    if (taux < 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  // Fonction pour assigner une classification à un avocat
  const assignerClassification = (avocatNom: string, classification: 'C1' | 'C2' | 'C3' | 'Blacklist' | null) => {
    setAvocatClassifications(prev => ({
      ...prev,
      [avocatNom]: classification
    }));
  };

  // Système de couleurs harmonisées par catégorie
  const getEtiquetteColor = (etiquetteName: string) => {
    const name = etiquetteName.toUpperCase();
    
    // LinkedIn (Relations Sabine/Bernard) - Bleu marine
    if (name.includes('LINKEDIN')) {
      return 'bg-slate-800 text-white border-slate-600';
    }
    
    // Soutiens politiques - Indigo
    if (name.includes('SOUTIENS') || name.includes('PROCHES')) {
      return 'bg-indigo-100 text-indigo-700 border-indigo-300';
    }
    
    // Communications Outlook - Vert
    if (name.includes('OUTLOOK')) {
      return 'bg-green-100 text-green-700 border-green-300';
    }
    
    // Communications Téléphone - Teal
    if (name.includes('TÉLÉPHONE')) {
      return 'bg-teal-100 text-teal-700 border-teal-300';
    }
    
    // Formation & Éducation - Orange
    if (name.includes('DJCE') || name.includes('M2') || name.includes('SCIENCES PO') || name.includes('PARIS 2')) {
      return 'bg-orange-100 text-orange-700 border-orange-300';
    }
    
    // Outils & Data - Cyan
    if (name.includes('CLIQUEURS') || name.includes('DATOMICS')) {
      return 'bg-cyan-100 text-cyan-700 border-cyan-300';
    }
    
    // Couleur par défaut - Violet clair
    return 'bg-purple-100 text-purple-700 border-purple-300';
  };

  // Couleurs unifiées pour les classifications
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'C1': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'C2': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'C3': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Blacklist': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
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
              <span className="klb-badge-c3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Cabinets Ventres Mous
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
        <div className="mb-12 text-center">
          <h1 className="mb-6 flex items-center justify-center gap-3">
            <Target className="w-8 h-8" />
            Cabinets Ventres Mous
          </h1>
          <p className="klb-text-muted max-w-4xl mx-auto text-lg leading-relaxed">
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
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl inline-block backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                </div>
                <span className="text-red-700 font-medium">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Statistiques Overview */}
        {stats && (
          <div className="klb-grid klb-grid-responsive mb-12">
            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-metric-primary">{stats.totalCabinets}</div>
                <h5 className="klb-subsection-title mb-2">Cabinets Identifiés</h5>
                <p className="klb-text-caption">Dans la tranche 10-30 avocats</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-metric-primary">{stats.effectifMoyen}</div>
                <h5 className="klb-subsection-title mb-2">Effectif Moyen</h5>
                <p className="klb-text-caption">Nombre moyen d'avocats</p>
              </div>
            </div>

            <div className="klb-card">
              <div className="klb-card-body text-center">
                <div className="klb-metric-primary" style={{color: 'var(--klb-c3)'}}>{stats.tauxVoteMoyen}%</div>
                <h5 className="klb-subsection-title mb-2">Taux de Vote Moyen</h5>
                <p className="klb-text-caption">Participation moyenne</p>
              </div>
            </div>
          </div>
        )}

        {/* Filtres Interactifs */}
        <div className="klb-card mb-8">
          <div className="klb-card-header">
            <h4 className="klb-section-title flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              Filtres et Tri
            </h4>
          </div>
          <div className="klb-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div>
                <label className="klb-label">
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
                <span className="klb-text-small">{minEffectif} avocats</span>
              </div>
              
              <div>
                <label className="klb-label">
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
                <span className="klb-text-small">{maxEffectif} avocats</span>
              </div>

              <div>
                <label className="klb-label">
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
                <span className="klb-text-small">{maxTauxVote}%</span>
              </div>

              <div>
                <label className="klb-label">
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
                <label className="klb-label">
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
              <h4 className="klb-section-title flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                Cabinets Ventres Mous ({cabinets.length})
              </h4>
            </div>
            <div className="klb-card-body">
              <div className="overflow-x-auto">
                <table className="klb-table">
                  <thead className="klb-table-header">
                    <tr>
                      <th>Cabinet</th>
                      <th className="klb-table-cell-center">Effectif</th>
                      <th className="klb-table-cell-center">Taux 1er T</th>
                      <th className="klb-table-cell-center">Taux 2ème T</th>
                      <th className="klb-table-cell-center">Moyenne</th>
                      <th className="klb-table-cell-center">Contacts LinkedIn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cabinets.map((cabinet, index) => (
                      <React.Fragment key={index}>
                        <tr className={`klb-table-row ${selectedCabinet === cabinet.structure ? 'cabinet-selected' : ''}`}>
                          <td className="klb-table-cell">
                            <div 
                              className="klb-cabinet-name"
                              onClick={() => toggleCabinetExpansion(cabinet.structure)}
                            >
                              <span className="klb-text-body">{cabinet.structure}</span>
                              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${selectedCabinet === cabinet.structure ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="klb-text-micro" style={{marginTop: '4px'}}>
                              Tranche: {cabinet.trancheEffectif}
                            </div>
                          </td>
                          <td className="klb-table-cell klb-table-cell-center">
                            <span className="klb-classification-badge">{cabinet.effectif}</span>
                          </td>
                          <td className="klb-table-cell klb-table-cell-center">
                            <div className="klb-metric-secondary">
                              {cabinet.tauxVote1T.toFixed(1)}%
                            </div>
                            <div className="klb-text-micro" style={{marginTop: '2px'}}>
                              {cabinet.votants1T}/{cabinet.effectif}
                            </div>
                          </td>
                          <td className="klb-table-cell klb-table-cell-center">
                            <div className="klb-metric-secondary">
                              {cabinet.tauxVote2T.toFixed(1)}%
                            </div>
                            <div className="klb-text-micro" style={{marginTop: '2px'}}>
                              {cabinet.votants2T}/{cabinet.effectif}
                            </div>
                          </td>
                          <td className="klb-table-cell klb-table-cell-center">
                            <div className="klb-metric-secondary" style={{
                              color: cabinet.moyenneVote < 30 ? 'var(--klb-blacklist)' : 
                                     cabinet.moyenneVote < 50 ? 'var(--klb-c3)' : 
                                     cabinet.moyenneVote < 70 ? 'var(--klb-c2)' : 'var(--klb-c1)'
                            }}>
                              {cabinet.moyenneVote.toFixed(1)}%
                            </div>
                          </td>
                          <td className="klb-table-cell klb-table-cell-center">
                            <div style={{display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center'}}>
                              <div style={{display: 'flex', gap: '6px'}}>
                                <span className="klb-linkedin-badge">
                                  B: {linkedinMatching[cabinet.structure]?.bernardContacts.length || 0}
                                </span>
                                <span className="klb-linkedin-badge">
                                  S: {linkedinMatching[cabinet.structure]?.sabineContacts.length || 0}
                                </span>
                              </div>
                              <div className="klb-text-micro">
                                Total: {linkedinMatching[cabinet.structure]?.totalContacts || 0}
                              </div>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Ligne d'expansion pour les avocats */}
                        {selectedCabinet === cabinet.structure && (
                          <tr className="klb-table-expansion-row">
                            <td colSpan={6} className="klb-table-expansion-cell">
                              <div>
                                <div className="flex items-center justify-end" style={{marginBottom: 'var(--space-lg)'}}>
                                  {loadingAvocats && selectedCabinet === cabinet.structure && (
                                    <span className="klb-text-caption" style={{color: 'var(--klb-primary)'}}>
                                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2" style={{borderColor: 'var(--klb-primary)', marginRight: 'var(--space-sm)'}}></span>
                                      Chargement...
                                    </span>
                                  )}
                                </div>
                                
                                {selectedCabinet === cabinet.structure && !loadingAvocats && (
                                  <div>
                                    {avocatsCabinet.length > 0 ? (
                                      <div className="grid gap-6">
                                        {avocatsCabinet.map((avocat, avocatIndex) => (
                                          <div key={avocatIndex} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                                            
                                            {/* En-tête avocat avec avatar et informations */}
                                            <div className="flex items-start justify-between mb-4">
                                              <div className="flex items-center gap-4">
                                                {/* Avatar avec photo ou initiales */}
                                                <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center border-2 border-white shadow-md">
                                                  {avocat.photo ? (
                                                    <img 
                                                      src={avocat.photo} 
                                                      alt={avocat.nomComplet}
                                                      className="w-full h-full object-cover"
                                                      onError={(e) => {
                                                        // Fallback aux initiales si image échoue
                                                        e.currentTarget.style.display = 'none';
                                                        const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                                                        if (sibling) sibling.style.display = 'flex';
                                                      }}
                                                    />
                                                  ) : null}
                                                  <div 
                                                    className={`w-full h-full flex items-center justify-center text-xl font-bold text-purple-700 ${avocat.photo ? 'hidden' : 'flex'}`}
                                                    style={{ display: avocat.photo ? 'none' : 'flex' }}
                                                  >
                                                    {getInitials(avocat.nomComplet)}
                                                  </div>
                                                </div>
                                                
                                                <div className="flex-1">
                                                  <h6 className="klb-text-body font-semibold text-lg">{avocat.nomComplet}</h6>
                                                  {avocat.classification && (
                                                    <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold mt-1 ${getClassificationColor(avocat.classification)}`}>
                                                      Classification: {avocat.classification}
                                                    </div>
                                                  )}
                                                  
                                                  {/* Contact - icônes cliquables */}
                                                  <div className="flex items-center gap-2 mt-3">
                                                    <span className="text-sm text-gray-500">Contact:</span>
                                                    <div className="flex gap-2">
                                                      {/* LinkedIn */}
                                                      {avocat.linkedin && (
                                                        <button 
                                                          onClick={() => window.open(avocat.linkedin, '_blank')}
                                                          className="klb-action-button"
                                                          title="Voir le profil LinkedIn"
                                                        >
                                                          <LinkedInIcon className="w-4 h-4" />
                                                        </button>
                                                      )}
                                                      
                                                      {/* Téléphone fixe */}
                                                      {avocat.telFixe && (
                                                        <button 
                                                          onClick={() => window.open(`tel:${avocat.telFixe}`, '_blank')}
                                                          className="klb-action-button"
                                                          title="Appeler au fixe"
                                                        >
                                                          <Phone className="w-4 h-4" />
                                                        </button>
                                                      )}
                                                      
                                                      {/* Téléphone portable */}
                                                      {avocat.telPortable && (
                                                        <button 
                                                          onClick={() => window.open(`tel:${avocat.telPortable}`, '_blank')}
                                                          className="klb-action-button"
                                                          title="Appeler au portable"
                                                        >
                                                          <Smartphone className="w-4 h-4" />
                                                        </button>
                                                      )}
                                                      
                                                      {/* Email */}
                                                      {avocat.email && (
                                                        <button 
                                                          onClick={() => window.open(`mailto:${avocat.email}`, '_blank')}
                                                          className="klb-action-button"
                                                          title="Envoyer un email"
                                                        >
                                                          <Mail className="w-4 h-4" />
                                                        </button>
                                                      )}
                                                    </div>
                                                    {!avocat.email && !avocat.linkedin && !avocat.telFixe && !avocat.telPortable && (
                                                      <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                                        Aucun contact
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Dropdown assignation cercle */}
                                              <div className="flex flex-col items-end gap-2">
                                                <select
                                                  value={avocatClassifications[avocat.nomComplet] || ''}
                                                  onChange={(e) => assignerClassification(avocat.nomComplet, e.target.value as any || null)}
                                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                >
                                                  <option value="">Assigner cercle...</option>
                                                  <option value="C1">C1 - Priorité Max</option>
                                                  <option value="C2">C2 - Priorité Haute</option>
                                                  <option value="C3">C3 - Priorité Moyenne</option>
                                                  <option value="Blacklist">Blacklist</option>
                                                </select>
                                                {avocatClassifications[avocat.nomComplet] && (
                                                  <div className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${
                                                    avocatClassifications[avocat.nomComplet] === 'C1' ? 'bg-emerald-100 text-emerald-700' :
                                                    avocatClassifications[avocat.nomComplet] === 'C2' ? 'bg-blue-100 text-blue-700' :
                                                    avocatClassifications[avocat.nomComplet] === 'C3' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                                  }`}>
                                                    Cercle: {avocatClassifications[avocat.nomComplet]}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Icônes de vote */}
                                            <div className="flex items-center gap-3 mb-4">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">Vote:</span>
                                                <div className="flex gap-1">
                                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                    avocat.vote1erTour ? 'bg-green-100' : 'bg-red-100'
                                                  }`}>
                                                    {avocat.vote1erTour ? 
                                                      <Mail className="w-4 h-4 text-green-600" /> :
                                                      <MailX className="w-4 h-4 text-red-600" />
                                                    }
                                                  </div>
                                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                    avocat.vote2emeTour ? 'bg-green-100' : 'bg-red-100'
                                                  }`}>
                                                    {avocat.vote2emeTour ? 
                                                      <Mail className="w-4 h-4 text-green-600" /> :
                                                      <MailX className="w-4 h-4 text-red-600" />
                                                    }
                                                  </div>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                  ({avocat.vote1erTour ? '✓' : '✗'} T1, {avocat.vote2emeTour ? '✓' : '✗'} T2)
                                                </span>
                                              </div>
                                            </div>

                                            {/* Étiquettes dynamiques */}
                                            {avocat.etiquettes && Object.keys(avocat.etiquettes).length > 0 && (
                                              <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <Tag className="w-4 h-4 text-gray-500" />
                                                  <span className="text-sm font-medium text-gray-600">Étiquettes:</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                  {Object.entries(avocat.etiquettes).map(([label, value]) => (
                                                    value === "1" && (
                                                      <span
                                                        key={label}
                                                        className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${getEtiquetteColor(label)}`}
                                                      >
                                                        {label}
                                                      </span>
                                                    )
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="klb-text-caption" style={{fontStyle: 'italic'}}>
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
              <div style={{marginTop: 'var(--space-2xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div className="klb-text-caption">
                  {cabinets.length} cabinet(s) trouvé(s) avec un taux de participation {'<'} {maxTauxVote}%
                </div>
                <button className="klb-btn-primary flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Exporter en CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions pour le matching futur */}
        <div className="klb-card mt-8">
          <div className="klb-card-header">
            <h5 className="klb-subsection-title flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-amber-600" />
              </div>
              Prochaines étapes
            </h5>
          </div>
          <div className="klb-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h6 className="klb-subsection-title flex items-center gap-3" style={{marginBottom: 'var(--space-sm)'}}>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-green-600" />
                  </div>
                  Extraction Outlook
                </h6>
                <p className="klb-text-caption" style={{lineHeight: '1.5'}}>
                  Développement de l'outil d'extraction des contacts Outlook de Bernard, Sabine et leur équipe.
                </p>
              </div>
              <div>
                <h6 className="klb-subsection-title flex items-center gap-3" style={{marginBottom: 'var(--space-sm)'}}>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <Search className="w-4 h-4 text-purple-600" />
                  </div>
                  Matching Intelligent
                </h6>
                <p className="klb-text-caption" style={{lineHeight: '1.5'}}>
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