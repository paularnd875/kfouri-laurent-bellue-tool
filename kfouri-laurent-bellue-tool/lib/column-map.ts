// Resolution des colonnes du Google Sheet PAR NOM d'en-tete UNIQUEMENT.
// Objectif : pouvoir reordonner / inserer / supprimer des colonnes dans le Sheet
// sans desorganiser l'outil, tant que les TITRES d'en-tete ci-dessous restent
// presents. Le filet « par position » (fallback) a ete retire volontairement :
// puisque des colonnes sont supprimees/deplacees cote source, un secours
// positionnel attrape silencieusement la MAUVAISE colonne. Si aucun nom accepte
// n'est trouve -> champ manquant (index -1 -> valeur vide), jamais une colonne
// erronee.
//
// Le resolveur est aussi utilise par la page de diagnostic (/diagnostic-colonnes)
// qui montre, pour chaque champ, s'il est trouve par nom ou manquant.

// Onglet source. Identifie de facon ROBUSTE par son gid (immuable, survit aux
// renommages) ; MAIN_TAB n'est qu'un titre de secours si le gid est introuvable.
export const SOURCE_TAB_GID = 1348323710;
export const MAIN_TAB = 'NEW - Base principale';

// Normalise un en-tete pour une comparaison tolerante :
// minuscules, sans accents, retours a la ligne/espaces multiples reduits.
export function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface FieldDef {
  key: string;
  label: string;
  names: string[]; // titres acceptes (sous forme normalisee)
  optional?: boolean; // si absent, pas de warning bloquant
}

// Champs lus dans l'onglet source. `names` = formes normalisees acceptees
// (normalizeHeader ecrase accents/casse/espaces multiples). La resolution ne
// s'appuie QUE sur `names`.
export const FIELDS: FieldDef[] = [
  { key: 'prenomnom', label: 'Cle (prenom1particulenom)', names: ['prenom1particulenom', 'nomcomplet', 'prenomnom'] },
  { key: 'civilite', label: 'Civilite (F/M)', names: ['cnb_civilit', 'nature', 'civilite'], optional: true },
  // Si CNB_civilit est vide -> on derive F/M depuis la salutation « Cher / chere » (voir google-sheets).
  { key: 'civilite_salutation', label: 'Salutation (Cher / chere)', names: ['cher / chere'], optional: true },
  { key: 'nom_seul', label: 'Nom', names: ['nom'], optional: true },
  { key: 'prenom_seul', label: 'Prenom', names: ['prenom1'], optional: true },
  { key: 'nom_complet', label: 'Nom complet', names: ['prenom1 particule nom', 'nom complet'] },
  { key: 'telephone', label: 'Telephone portable', names: ['cnb_cbtel', 'numero de portable', 'portable'], optional: true },
  { key: 'email', label: 'Email', names: ['cnb_avmelordre', 'email', 'adresse e-mail', 'e-mail'] },
  { key: 'linkedin', label: 'LinkedIn (profil)', names: ['linkedin'], optional: true },
  { key: 'annee_serment', label: 'Annee de serment', names: ['annee_serment', 'annee de serment'], optional: true },
  { key: 'statut_cabinet', label: 'Statut cabinet (mode exercice)', names: ['mode_exe'], optional: true },
  { key: 'cabinet', label: 'Cabinet / Structure (raison sociale = cle technique)', names: ['st_raison_sociale', 'structure', 'cabinet'] },
  // Nom commercial du cabinet (plus lisible) : utilise pour l'AFFICHAGE ; la
  // raison sociale reste la cle de regroupement/routing. Voir `cabinet_display`.
  { key: 'cabinet_nom_commercial', label: 'Cabinet (nom commercial)', names: ['cabinet_nom_commercial'], optional: true },
  { key: 'classement', label: 'Classement C123', names: ['c123 (agreges - listes envoyees par binome)', 'c123 (onglet doc agrege) equipe'] },
  { key: 'linkedin_sabine', label: 'Reseau LinkedIn Sabine', names: ['linkedin sk (source : sk)', 'linkedin sk'], optional: true },
  { key: 'linkedin_bernard', label: 'Reseau LinkedIn Bernard', names: ['linkedin blb (source : blb)', 'linkedin blb'], optional: true },
  { key: 'photo_url', label: 'Photo (URL PDP)', names: ['url_pdp', 'url pdp'], optional: true },

  // Champs profil supplementaires (filtres/badges)
  { key: 'xp', label: 'Anciennete (tranche)', names: ['xp'], optional: true },
  { key: 'specialite', label: 'Specialite', names: ["specialite / domaine d'activite", 'specialite'], optional: true },
  { key: 'mandat', label: 'Mandat', names: ['mandat'], optional: true },
  { key: 'langue', label: 'Langue(s)', names: ['langue'], optional: true },
  { key: 'nationalite', label: 'Nationalite', names: ['nationalite'], optional: true },
  { key: 'tranche_taille_cabinet', label: 'Tranche taille cabinet', names: ['tranche taille cabinet'], optional: true },
];

export type ColStatus = 'name' | 'fallback' | 'missing';

export interface ResolvedField {
  key: string;
  label: string;
  index: number;
  status: ColStatus;
  header: string; // en-tete reellement trouve
  col: string; // lettre de colonne (A, B, ... AU) ou '—' si manquant
  acceptedNames: string[];
  optional: boolean;
}

export function colLetter(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Resolution PAR NOM UNIQUEMENT. Si aucun nom accepte n'est trouve -> champ
// manquant (index -1, status 'missing', col '—').
export function resolveFields(headers: unknown[]): ResolvedField[] {
  const normalized = headers.map(normalizeHeader);
  return FIELDS.map((f) => {
    const byName = normalized.findIndex((h) => h !== '' && f.names.includes(h));
    const found = byName >= 0;
    return {
      key: f.key,
      label: f.label,
      index: found ? byName : -1,
      status: (found ? 'name' : 'missing') as ColStatus,
      header: found ? String(headers[byName] ?? '') : '',
      col: found ? colLetter(byName) : '—',
      acceptedNames: f.names,
      optional: !!f.optional,
    };
  });
}

// Map simple { key: index } pour un usage direct dans les lecteurs.
export function columnIndices(headers: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of resolveFields(headers)) map[r.key] = r.index;
  return map;
}

// Colonnes "etiquettes" (soutiens historiques) detectees par motif dans l'en-tete
// -> robuste au reordonnancement (pas d'index fige). Renvoie [{name, index}].
export function etiquetteColumns(headers: unknown[]): { name: string; index: number }[] {
  const out: { name: string; index: number }[] = [];
  headers.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (n.includes('soutien')) out.push({ name: String(h), index: i });
  });
  return out;
}
