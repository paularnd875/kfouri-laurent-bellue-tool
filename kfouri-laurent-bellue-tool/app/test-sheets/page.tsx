'use client';

import { useState } from 'react';

export default function TestSheetsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-sheets');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      setError('Erreur de connexion: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeStructure = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze-sheets');
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      setError('Erreur de connexion: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="klb-container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="klb-card mb-8">
            <div className="klb-card-header">
              <h1 className="text-2xl font-bold text-gray-800">
                🧪 Test d'accès Google Sheets
              </h1>
              <p className="klb-text-muted">
                Tester la connexion avec le Service Account et analyser la structure des données
              </p>
            </div>
            
            <div className="klb-card-body">
              <div className="flex gap-4 mb-6">
                <button 
                  onClick={testConnection}
                  disabled={isLoading}
                  className="klb-btn-primary"
                >
                  {isLoading ? '⏳ Test en cours...' : '🔍 Tester la connexion'}
                </button>
                
                <button 
                  onClick={analyzeStructure}
                  disabled={isLoading}
                  className="klb-btn-outline"
                >
                  {isLoading ? '⏳ Analyse en cours...' : '📊 Analyser la structure'}
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <h3 className="font-semibold text-red-800 mb-2">❌ Erreur</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {result && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Résultats</h3>
                  <div className="bg-white p-4 rounded border overflow-auto max-h-96">
                    <pre className="text-sm text-gray-700">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                  
                  {result.headers && (
                    <div className="mt-4 p-4 bg-blue-50 rounded border">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        📋 Colonnes détectées ({result.headers.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {result.headers.map((header: string, index: number) => (
                          <div key={index} className="p-2 bg-white rounded border text-gray-700">
                            <span className="font-mono text-blue-600">
                              {String.fromCharCode(65 + Math.floor(index / 26))}
                              {String.fromCharCode(65 + (index % 26))}:
                            </span>
                            {' '}
                            {header}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {result.importantColumns && (
                    <div className="mt-4 p-4 bg-yellow-50 rounded border">
                      <h4 className="font-semibold text-yellow-800 mb-2">
                        🎯 Colonnes importantes identifiées
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">AS - Classification:</span>
                          <span className="klb-badge-outline ml-2">{result.importantColumns.classement}</span>
                        </div>
                        <div>
                          <span className="font-semibold">BG - LinkedIn Sabine:</span>
                          <span className="klb-badge-linkedin ml-2">{result.importantColumns.linkedin_sabine}</span>
                        </div>
                        <div>
                          <span className="font-semibold">BH - LinkedIn Bernard:</span>
                          <span className="klb-badge-linkedin ml-2">{result.importantColumns.linkedin_bernard}</span>
                        </div>
                        <div>
                          <span className="font-semibold">BU - Photo URL:</span>
                          <span className="klb-badge-outline ml-2">{result.importantColumns.photo_url}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="klb-card">
            <div className="klb-card-header">
              <h2 className="text-xl font-semibold text-gray-800">
                📝 Instructions de configuration
              </h2>
            </div>
            <div className="klb-card-body">
              <div className="space-y-4 text-sm text-gray-700">
                <div className="p-4 bg-blue-50 rounded border">
                  <h3 className="font-semibold mb-2">1. Télécharger le fichier JSON</h3>
                  <p>Dans Google Cloud Console → Service Accounts → kfouri-sheets-reader → Keys → Add Key → Create new key (JSON)</p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded border">
                  <h3 className="font-semibold mb-2">2. Configurer les variables d'environnement</h3>
                  <p>Copier le contenu du fichier JSON dans un fichier .env.local</p>
                  <code className="block mt-2 p-2 bg-gray-100 rounded font-mono text-xs">
                    {`GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'`}
                  </code>
                </div>
                
                <div className="p-4 bg-green-50 rounded border">
                  <h3 className="font-semibold mb-2">3. Tester la connexion</h3>
                  <p>Une fois configuré, utiliser les boutons ci-dessus pour vérifier l'accès</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}