'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password === 'KLB2025!') {
      // Définir le cookie d'authentification
      document.cookie = 'klb_authenticated=true; path=/; max-age=86400'; // 24h
      // Rediriger vers la page d'accueil
      router.push('/');
    } else {
      setError('Mot de passe incorrect');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="klb-card w-full max-w-md">
          <div className="klb-card-header text-center">
            <h1 className="klb-section-title mb-4">
              Outil KLB
            </h1>
            <h2 className="klb-subsection-title mb-2">
              Accès sécurisé
            </h2>
            <p className="klb-text-body klb-text-muted">
              Outil de gestion de campagne<br />
              Kfouri & Laurent-Bellue
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="klb-card-body">
            <div className="mb-6">
              <label className="block klb-text-body font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="klb-input"
                placeholder="Entrez le mot de passe"
                required
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="klb-text-small text-red-700">❌ {error}</span>
              </div>
            )}
            
            <button 
              type="submit" 
              className="klb-btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="klb-card-body pt-0">
            <div className="text-center">
              <p className="klb-text-small klb-text-muted">
                Élections du Conseil de l'Ordre • Décembre 2025
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}