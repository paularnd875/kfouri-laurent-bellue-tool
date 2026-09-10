'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Check,
  CheckCheck,
  ArrowUpRight,
  X,
  ChevronLeft,
  ArrowRight,
  ExternalLink,
  Star,
  Loader2,
  Building2,
  RotateCcw,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  cabinet: string;
  anneeSerment: string;
  linkedin: string;
  photo: string;
  voted: boolean;
  circle: string;
}

type Choice = 'C1' | 'C2' | 'C3' | 'Blacklist';

const CHOICES: { key: Choice; klass: string; title: string; sub: string }[] = [
  { key: 'C1', klass: 'certain', title: 'Confirmé', sub: 'Soutien certain' },
  { key: 'C2', klass: 'probable', title: 'Presque acquis', sub: 'Soutien attendu, à confirmer' },
  { key: 'C3', klass: 'contact', title: 'À convaincre', sub: 'Appeler ou solliciter' },
  { key: 'Blacklist', klass: 'exclude', title: 'À exclure', sub: 'Concurrent, ennemi ou à écarter' },
];

const CHOICE_LABELS: Record<Choice, string> = {
  C1: 'Confirmé · Soutien certain',
  C2: 'Presque acquis · Soutien attendu, à confirmer',
  C3: 'À convaincre · Appeler ou solliciter',
  Blacklist: 'À exclure',
};

function choiceIcon(key: Choice) {
  if (key === 'C1') return <Check size={20} strokeWidth={3} />;
  if (key === 'C2') return <CheckCheck size={20} strokeWidth={3} />;
  if (key === 'C3') return <ArrowUpRight size={20} strokeWidth={3} />;
  return <X size={20} strokeWidth={3} />;
}

export default function QualifPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || '');

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [participant, setParticipant] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cursor, setCursor] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = contacts.length;
  const complete = cursor >= total;
  const contact = complete ? null : contacts[cursor];

  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), error ? 3500 : 1300);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/qualif?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue.');
      setParticipant(data.participant || '');
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
      setCursor(Number(data.cursor) || 0);
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const transitionTo = useCallback((next: number, msg?: string) => {
    setLeaving(true);
    setTimeout(() => {
      setCursor(next);
      setLeaving(false);
      setBusy(false);
      if (msg) showToast(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 170);
  }, [showToast]);

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/qualif', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Enregistrement impossible');
    return data;
  }

  async function choose(choice: Choice) {
    if (busy || !contact) return;
    setBusy(true);
    const next = cursor + 1;
    try {
      await post({
        action: 'saveChoice',
        contact: { id: contact.id, name: contact.name, cabinet: contact.cabinet, linkedin: contact.linkedin },
        choice,
        nextCursor: next,
      });
      setContacts((prev) => prev.map((c, i) => (i === cursor ? { ...c, circle: choice } : c)));
      transitionTo(next, 'Enregistré');
    } catch (e) {
      setBusy(false);
      showToast(e instanceof Error ? e.message : 'Erreur', true);
    }
  }

  async function persistMove(next: number, msg?: string) {
    setBusy(true);
    try {
      const data = await post({ action: 'moveCursor', cursor: next });
      transitionTo(Number(data.cursor) || 0, msg);
    } catch (e) {
      setBusy(false);
      showToast(e instanceof Error ? e.message : 'Erreur', true);
    }
  }

  function skip() {
    if (!busy) persistMove(cursor + 1, 'Passé');
  }
  function back() {
    if (!busy && cursor > 0) persistMove(cursor - 1);
  }
  function backFromComplete() {
    if (!busy && contacts.length) persistMove(contacts.length - 1);
  }

  async function startNewPass() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await post({ action: 'startNewPass' });
      const list: Contact[] = Array.isArray(data.contacts) ? data.contacts : [];
      setContacts(list);
      setCursor(0);
      setBusy(false);
      showToast(list.length ? 'Nouveau passage lancé' : 'Tout est déjà classé');
    } catch (e) {
      setBusy(false);
      showToast(e instanceof Error ? e.message : 'Erreur', true);
    }
  }

  const progress = total ? Math.min(100, (cursor / total) * 100) : 100;
  const specialties = contact ? [contact.anneeSerment ? `Serment ${contact.anneeSerment}` : ''].filter(Boolean).join(' · ') : '';
  const hasLinkedin = !!contact && /^https?:\/\//i.test(contact.linkedin || '');
  const previousChoice = contact && contact.circle && CHOICE_LABELS[contact.circle as Choice];

  return (
    <div className="qz-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span className="qz-ambient qz-ambient-one" aria-hidden />
      <span className="qz-ambient qz-ambient-two" aria-hidden />

      <main className="qz-shell">
        {status === 'loading' && (
          <section className="qz-state qz-state-center" aria-live="polite">
            <Loader2 className="qz-spin" size={36} />
            <p>Préparation de votre liste…</p>
          </section>
        )}

        {status === 'error' && (
          <section className="qz-state qz-state-center" role="alert">
            <div className="qz-state-icon">!</div>
            <h1>Impossible d’ouvrir la liste</h1>
            <p>{errorMsg}</p>
            <button className="qz-secondary" type="button" onClick={() => window.location.reload()}>
              Réessayer
            </button>
          </section>
        )}

        {status === 'ready' && (
          <>
            <header className="qz-topbar">
              <div>
                <p className="qz-eyebrow">Qualification des contacts</p>
                <h1 className="qz-hello">Bonjour {participant}</h1>
              </div>
              <div className="qz-counter" aria-label="Progression">
                <strong>{complete ? total : cursor + 1}</strong>
                <span>/</span>
                <span>{total}</span>
              </div>
            </header>

            <div className="qz-track" aria-hidden>
              <div className="qz-bar" style={{ width: `${progress}%` }} />
            </div>

            {!complete && contact && (
              <section>
                <article className={`qz-card ${leaving ? 'qz-leave' : 'qz-enter'}`} key={contact.id}>
                  <div className="qz-heading">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {contact.photo && /^https?:\/\//i.test(contact.photo) ? (
                      <img className="qz-photo" src={contact.photo} alt="" loading="eager" decoding="async" />
                    ) : null}
                    <h2>{contact.name}</h2>
                    {contact.voted && (
                      <span className="qz-voted" title="A voté">
                        <Star size={13} fill="currentColor" />
                      </span>
                    )}
                  </div>

                  <div className="qz-details">
                    {contact.cabinet && (
                      <div className="qz-row">
                        <span className="qz-ic"><Building2 size={15} /></span>
                        <strong>{contact.cabinet}</strong>
                      </div>
                    )}
                    {specialties && (
                      <div className="qz-row">
                        <span className="qz-ic">✦</span>
                        <strong>{specialties}</strong>
                      </div>
                    )}
                  </div>

                  {hasLinkedin && (
                    <a className="qz-linkedin" href={contact.linkedin} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={16} /> Voir sur LinkedIn
                    </a>
                  )}

                  {previousChoice && <div className="qz-current">Choix actuel : {previousChoice}</div>}
                </article>

                <div className="qz-choices" aria-label="Choisir une catégorie">
                  {CHOICES.map((c) => (
                    <button
                      key={c.key}
                      className={`qz-choice qz-choice-${c.klass}`}
                      type="button"
                      disabled={busy}
                      onClick={() => choose(c.key)}
                    >
                      <span className="qz-mark">{choiceIcon(c.key)}</span>
                      <span>
                        <strong>{c.title}</strong>
                        <small>{c.sub}</small>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="qz-nav">
                  <button className="qz-text-btn" type="button" onClick={back} disabled={busy || cursor === 0}>
                    <ChevronLeft size={16} /> Précédent
                  </button>
                  <button className="qz-skip" type="button" onClick={skip} disabled={busy}>
                    Je passe <ArrowRight size={16} />
                  </button>
                </div>
              </section>
            )}

            {complete && (
              <section className="qz-complete">
                <div className="qz-orbit">
                  <span><Check size={30} strokeWidth={3} /></span>
                </div>
                <p className="qz-eyebrow">Liste parcourue</p>
                <h2>Mission accomplie&nbsp;!</h2>
                <p className="qz-muted">
                  Vous avez examiné <strong>{total}</strong> contact{total > 1 ? 's' : ''}.
                </p>
                <div className="qz-complete-actions">
                  <button className="qz-secondary" type="button" onClick={startNewPass} disabled={busy}>
                    <RotateCcw size={16} /> Revoir les personnes passées
                  </button>
                  <button className="qz-text-btn" type="button" onClick={backFromComplete} disabled={busy}>
                    <ChevronLeft size={16} /> Revoir la dernière personne
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {toast && <div className={`qz-toast qz-show ${toast.error ? 'qz-toast-err' : ''}`}>{toast.msg}</div>}
    </div>
  );
}

const CSS = `
.qz-root{position:fixed;inset:0;overflow-y:auto;z-index:60;color:#172033;
  background:radial-gradient(circle at 15% 10%,rgba(255,215,151,.28),transparent 28rem),
  radial-gradient(circle at 90% 32%,rgba(106,91,210,.13),transparent 30rem),
  linear-gradient(145deg,#fffdf8 0%,#f8f5ef 100%);
  font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;}
.qz-root *{box-sizing:border-box;}
.qz-root h1,.qz-root h2{color:inherit;margin:0;font-family:inherit;}
.qz-ambient{position:fixed;border-radius:999px;filter:blur(2px);pointer-events:none;opacity:.55;}
.qz-ambient-one{width:220px;height:220px;top:-130px;right:-60px;background:#eadfff;}
.qz-ambient-two{width:170px;height:170px;bottom:-100px;left:-70px;background:#ffe4b9;}
.qz-shell{position:relative;z-index:1;width:min(100%,560px);min-height:100svh;margin:0 auto;padding:max(24px,env(safe-area-inset-top)) 18px max(28px,env(safe-area-inset-bottom));}
.qz-topbar{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;}
.qz-eyebrow{margin:0 0 5px;color:#5647b9;font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;}
.qz-hello{font-size:clamp(1.65rem,7vw,2.2rem);line-height:1.05;letter-spacing:-.045em;}
.qz-counter{display:flex;align-items:baseline;gap:4px;color:#687086;font-size:.88rem;}
.qz-counter strong{color:#172033;font-size:1.35rem;}
.qz-track{height:7px;margin:18px 0 22px;overflow:hidden;border-radius:99px;background:rgba(86,71,185,.1);}
.qz-bar{height:100%;border-radius:inherit;background:linear-gradient(90deg,#7565d6,#4d8bc9);transition:width 350ms ease;}
.qz-card{position:relative;padding:24px 22px 20px;overflow:hidden;text-align:center;border:1px solid rgba(255,255,255,.8);border-radius:28px;background:rgba(255,255,255,.92);box-shadow:0 24px 60px rgba(38,44,70,.12);backdrop-filter:blur(16px);}
.qz-card::before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,#7667d4,#d99165,#4ca383);}
.qz-heading{display:flex;align-items:center;justify-content:center;gap:13px;}
.qz-photo{width:48px;height:48px;flex:0 0 48px;object-fit:cover;border:2px solid #fff;border-radius:50%;background:#f1eee8;box-shadow:0 6px 16px rgba(23,32,51,.14);}
.qz-card h2{font-size:clamp(1.55rem,7vw,2.15rem);line-height:1.08;letter-spacing:-.04em;}
.qz-voted{display:grid;width:25px;height:25px;flex:0 0 25px;place-items:center;color:#a86f20;border:1px solid rgba(178,116,36,.2);border-radius:50%;background:#fff4d8;}
.qz-details{display:grid;gap:7px;margin-top:22px;text-align:left;}
.qz-row{display:grid;grid-template-columns:24px 1fr;gap:7px;align-items:start;}
.qz-ic{color:#5647b9;text-align:center;font-size:.8rem;line-height:1.4;}
.qz-row strong{display:block;font-size:.86rem;line-height:1.4;font-weight:400;}
.qz-linkedin{display:inline-flex;align-items:center;gap:7px;margin-top:17px;padding:9px 13px;color:#185da1;border-radius:99px;background:#edf6ff;font-size:.86rem;font-weight:750;text-decoration:none;}
.qz-current{margin-top:14px;color:#687086;font-size:.8rem;font-weight:700;}
.qz-choices{display:grid;gap:10px;margin-top:17px;}
.qz-choice{display:grid;grid-template-columns:42px 1fr;align-items:center;width:100%;min-height:68px;padding:10px 15px;color:#172033;text-align:left;border:1px solid transparent;border-radius:18px;cursor:pointer;transition:transform 130ms ease,box-shadow 130ms ease,filter 130ms ease;}
.qz-choice:active{transform:scale(.975);}
.qz-choice:disabled{cursor:wait;filter:saturate(.55);opacity:.68;}
.qz-choice strong,.qz-choice small{display:block;}
.qz-choice strong{font-size:1rem;}
.qz-choice small{margin-top:2px;opacity:.72;font-size:.77rem;}
.qz-mark{display:grid;width:31px;height:31px;place-items:center;color:#fff;border-radius:11px;}
.qz-choice-certain{color:#16785b;border-color:rgba(22,120,91,.12);background:#e9f6f0;}
.qz-choice-certain .qz-mark{background:#16785b;}
.qz-choice-probable{color:#3158c8;border-color:rgba(49,88,200,.12);background:#edf1ff;}
.qz-choice-probable .qz-mark{background:#3158c8;}
.qz-choice-contact{color:#b75f15;border-color:rgba(183,95,21,.12);background:#fff2e5;}
.qz-choice-contact .qz-mark{background:#b75f15;}
.qz-choice-exclude{color:#ad3d4b;border-color:rgba(173,61,75,.12);background:#ffedf0;}
.qz-choice-exclude .qz-mark{background:#ad3d4b;}
.qz-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 4px 0;}
.qz-text-btn{display:inline-flex;align-items:center;gap:4px;padding:10px 4px;color:#687086;background:transparent;border:0;cursor:pointer;font-weight:750;}
.qz-text-btn:disabled{opacity:.32;cursor:default;}
.qz-skip{display:inline-flex;align-items:center;gap:6px;padding:12px 17px;color:#fff;border:0;border-radius:14px;background:#172033;box-shadow:0 8px 18px rgba(23,32,51,.16);cursor:pointer;font-weight:750;}
.qz-skip:disabled{opacity:.5;cursor:wait;}
.qz-state{min-height:calc(100svh - 52px);}
.qz-state-center{display:grid;align-content:center;justify-items:center;text-align:center;gap:8px;}
.qz-state p{max-width:360px;color:#687086;line-height:1.55;}
.qz-state-icon{display:grid;width:52px;height:52px;place-items:center;margin-bottom:8px;color:#ad3d4b;border-radius:18px;background:#ffedf0;font-size:1.5rem;font-weight:900;}
.qz-spin{color:#5647b9;animation:qzspin .75s linear infinite;}
.qz-complete{margin-top:70px;padding:38px 24px;text-align:center;border:1px solid rgba(255,255,255,.8);border-radius:28px;background:rgba(255,255,255,.92);box-shadow:0 24px 60px rgba(38,44,70,.12);}
.qz-complete h2{margin:5px 0 8px;font-size:2rem;}
.qz-muted{color:#687086;}
.qz-orbit{display:grid;width:76px;height:76px;margin:0 auto 22px;place-items:center;border-radius:50%;background:conic-gradient(#57a785,#7565d6,#e6a26a,#57a785);}
.qz-orbit span{display:grid;width:62px;height:62px;place-items:center;color:#16785b;border-radius:50%;background:#fff;}
.qz-complete-actions{display:grid;justify-items:center;gap:9px;margin-top:18px;}
.qz-secondary{display:inline-flex;align-items:center;gap:8px;padding:12px 17px;color:#fff;border:0;border-radius:14px;background:#172033;box-shadow:0 8px 18px rgba(23,32,51,.16);cursor:pointer;font-weight:750;}
.qz-secondary:disabled{opacity:.5;cursor:wait;}
.qz-toast{position:fixed;z-index:10;left:50%;bottom:max(22px,env(safe-area-inset-bottom));padding:10px 16px;color:#fff;border-radius:99px;background:rgba(23,32,51,.94);box-shadow:0 10px 28px rgba(23,32,51,.24);font-size:.84rem;font-weight:750;transform:translate(-50%,0);}
.qz-toast-err{background:#9f3341;}
.qz-enter{animation:qzenter 240ms ease both;}
.qz-leave{animation:qzleave 180ms ease both;}
@keyframes qzspin{to{transform:rotate(360deg);}}
@keyframes qzenter{from{opacity:0;transform:translateX(18px) scale(.985);}to{opacity:1;transform:translateX(0) scale(1);}}
@keyframes qzleave{to{opacity:0;transform:translateX(-18px) rotate(-.5deg) scale(.985);}}
@media (min-width:650px){.qz-shell{padding-top:44px;}.qz-choices{grid-template-columns:1fr 1fr;}}
@media (prefers-reduced-motion:reduce){.qz-spin,.qz-enter,.qz-leave{animation-duration:1ms;}}
`;
