'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface Champ {
  champ: string;
  cle: string;
  statut: 'name' | 'fallback' | 'missing';
  colonne: string;
  enTeteTrouve: string;
  nomsAcceptes: string[];
  optionnel: boolean;
}

interface Diag {
  success: boolean;
  onglet: string;
  totalColonnes: number;
  resume: { trouvesParNom: number; secoursParIndex: number; manquants: number };
  champs: Champ[];
  enTetes: { colonne: string; titre: string }[];
  error?: string;
}

function Statut({ s }: { s: Champ['statut'] }) {
  if (s === 'name') return <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle size={16} /> Trouvé par nom</span>;
  if (s === 'fallback') return <span className="inline-flex items-center gap-1 text-orange-600"><AlertTriangle size={16} /> Index de secours</span>;
  return <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={16} /> Manquant</span>;
}

export default function DiagnosticPage() {
  const [diag, setDiag] = useState<Diag | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/diagnostic-colonnes', { cache: 'no-store' });
      setDiag(await r.json());
    } catch (e) {
      setDiag({ success: false } as Diag);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Diagnostic des colonnes — Google Sheet</h1>
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            <RefreshCw size={16} /> Rafraîchir
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Chaque donnée est cherchée par le <strong>titre de l&apos;en-tête</strong> (tolérant : casse/accents/espaces).
          Si un titre est introuvable, l&apos;outil retombe sur la <strong>position historique</strong> (index de secours).
          Tant que les titres ci-dessous restent présents, tu peux réordonner/insérer/supprimer des colonnes librement.
        </p>

        {loading && <div className="text-gray-500">Chargement…</div>}

        {!loading && diag && !diag.success && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">Erreur : {diag.error || 'inconnue'}</div>
        )}

        {!loading && diag && diag.success && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white border rounded p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{diag.resume.trouvesParNom}</div>
                <div className="text-xs text-gray-500">trouvés par nom</div>
              </div>
              <div className="bg-white border rounded p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{diag.resume.secoursParIndex}</div>
                <div className="text-xs text-gray-500">index de secours</div>
              </div>
              <div className="bg-white border rounded p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{diag.resume.manquants}</div>
                <div className="text-xs text-gray-500">manquants</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-2">
              Onglet <strong>{diag.onglet}</strong> — {diag.totalColonnes} colonnes détectées
            </div>

            <div className="bg-white border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="text-left p-2">Donnée</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="text-left p-2">Colonne</th>
                    <th className="text-left p-2">En-tête trouvé</th>
                    <th className="text-left p-2">Titres acceptés</th>
                  </tr>
                </thead>
                <tbody>
                  {diag.champs.map((c) => (
                    <tr key={c.cle} className={`border-t ${c.statut === 'missing' && !c.optionnel ? 'bg-red-50' : c.statut === 'fallback' ? 'bg-orange-50' : ''}`}>
                      <td className="p-2 font-medium text-gray-900">{c.champ}{c.optionnel && <span className="text-gray-400 text-xs"> (optionnel)</span>}</td>
                      <td className="p-2"><Statut s={c.statut} /></td>
                      <td className="p-2 font-mono">{c.colonne}</td>
                      <td className="p-2 text-gray-700">{c.enTeteTrouve || <span className="text-gray-400">—</span>}</td>
                      <td className="p-2 text-gray-500 text-xs">{c.nomsAcceptes.join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
