'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw, Power, Trash2, Plus, Loader2 } from 'lucide-react';

interface Row {
  id: string;
  name: string;
  network: string;
  networkLabel: string;
  active: boolean;
  total: number;
  answered: number;
  link: string;
}
interface Net {
  key: string;
  label: string;
}

export default function QualifAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [networks, setNetworks] = useState<Net[]>([]);
  const [name, setName] = useState('');
  const [network, setNetwork] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ msg: string; error: boolean } | null>(null);

  const call = useCallback(async (body: Record<string, unknown>, msg?: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/qualif-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setRows(data.participants || []);
      setNetworks(data.networks || []);
      if (msg) setNotice({ msg, error: false });
      return true;
    } catch (e) {
      setNotice({ msg: e instanceof Error ? e.message : 'Erreur', error: true });
      return false;
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    call({ action: 'dashboard' });
  }, [call]);

  useEffect(() => {
    if (!network && networks.length) setNetwork(networks[0].key);
  }, [networks, network]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await call({ action: 'createUser', name, network }, 'Lien créé. Prêt à envoyer.');
    if (ok) setName('');
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setNotice({ msg: 'Lien copié.', error: false });
    } catch {
      window.prompt('Copiez ce lien :', link);
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 18px 70px' }}>
      <p className="klb-text-small" style={{ letterSpacing: '.13em', textTransform: 'uppercase', color: '#7662c8' }}>
        Qualification des contacts
      </p>
      <h1 className="klb-section-title" style={{ fontSize: 30, marginTop: 8 }}>
        Liens de qualification
      </h1>
      <p className="klb-text-muted" style={{ marginTop: 6 }}>
        Créez un lien personnel par candidat, envoyez-le : la personne qualifie son réseau depuis son téléphone, tout
        se sauvegarde et se reprend automatiquement dans son onglet dédié du Google Sheet.
      </p>

      {notice && (
        <div
          role="status"
          style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 12,
            background: notice.error ? '#fbecef' : '#eaf5ee',
            color: notice.error ? '#953349' : '#275b3c',
          }}
        >
          {notice.msg}
        </div>
      )}

      <section className="klb-card" style={{ padding: 22, marginTop: 20 }}>
        <h2 className="klb-subsection-title" style={{ marginBottom: 14 }}>
          Créer un lien
        </h2>
        <form onSubmit={create} style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="klb-label" htmlFor="qa-name">
              Prénom / nom affiché
            </label>
            <input
              id="qa-name"
              className="klb-input"
              value={name}
              maxLength={100}
              placeholder="Ex. Sabine"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="klb-label" htmlFor="qa-net">
              Réseau (liste auto)
            </label>
            <select id="qa-net" className="klb-input" value={network} onChange={(e) => setNetwork(e.target.value)}>
              {networks.map((n) => (
                <option key={n.key} value={n.key}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
          <button className="klb-btn klb-btn-primary" disabled={busy} type="submit">
            <Plus size={16} style={{ marginRight: 6 }} /> Créer le lien
          </button>
        </form>
      </section>

      <section className="klb-card" style={{ padding: 22, marginTop: 20 }}>
        <h2 className="klb-subsection-title" style={{ marginBottom: 6 }}>
          Participants
        </h2>
        {loading ? (
          <p className="klb-text-muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={16} className="klb-spin" /> Chargement…
          </p>
        ) : rows.length === 0 ? (
          <p className="klb-text-muted">Aucun participant pour le moment.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} style={{ borderTop: '1px solid #eeeaf4', padding: '18px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 17 }}>{r.name}</strong>
                <span
                  style={{
                    fontSize: 11,
                    borderRadius: 20,
                    padding: '4px 8px',
                    background: r.active ? '#eaf5ee' : '#fbecef',
                    color: r.active ? '#34754c' : '#a73d53',
                  }}
                >
                  {r.active ? 'Actif' : 'Suspendu'}
                </span>
                <span className="klb-text-small" style={{ marginLeft: 'auto' }}>
                  Réseau {r.networkLabel} · {r.answered}/{r.total} qualifiés
                </span>
              </div>
              <input
                readOnly
                value={r.link}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="klb-input"
                style={{ marginTop: 10, fontSize: 12 }}
                aria-label={`Lien personnel de ${r.name}`}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button className="klb-btn klb-btn-secondary klb-btn-sm" type="button" onClick={() => copy(r.link)}>
                  <Copy size={14} style={{ marginRight: 6 }} /> Copier le lien
                </button>
                <button
                  className="klb-btn klb-btn-secondary klb-btn-sm"
                  type="button"
                  disabled={busy}
                  onClick={() => call({ action: 'setActive', id: r.id, active: !r.active }, 'Accès mis à jour.')}
                >
                  <Power size={14} style={{ marginRight: 6 }} /> {r.active ? 'Désactiver' : 'Réactiver'}
                </button>
                <button
                  className="klb-btn klb-btn-secondary klb-btn-sm"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`L’ancien lien de ${r.name} sera invalidé (progression conservée). Continuer ?`))
                      call({ action: 'rotateUser', id: r.id }, 'Nouveau lien créé.');
                  }}
                >
                  <RefreshCw size={14} style={{ marginRight: 6 }} /> Renouveler le lien
                </button>
                <button
                  className="klb-btn klb-btn-sm"
                  type="button"
                  disabled={busy}
                  style={{ background: '#fbebee', color: '#a73d53' }}
                  onClick={() => {
                    if (confirm(`Supprimer l’accès de ${r.name} ? Ses réponses restent dans le Sheet.`))
                      call({ action: 'deleteUser', id: r.id }, 'Accès supprimé. Réponses conservées.');
                  }}
                >
                  <Trash2 size={14} style={{ marginRight: 6 }} /> Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
