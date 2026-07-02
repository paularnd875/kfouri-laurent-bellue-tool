// Résolution des colonnes du Google Sheet par NOM d'en-tête (tolérant), avec
// l'index historique en filet de sécurité. Objectif : pouvoir réordonner /
// insérer / supprimer des colonnes dans le Sheet sans désorganiser l'outil,
// tant que les TITRES d'en-tête ci-dessous restent présents.

export const MAIN_TAB = 'Base principale';

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
  names: string[];
  fallback: number;
  optional?: boolean;
}

// Champs lus dans l'onglet principal (KLB). `names` = formes normalisées acceptées.
export const FIELDS: FieldDef[] = [
  { key: 'prenomnom', label: 'Clé (nomcomplet)', names: ['nomcomplet', 'prenomnom'], fallback: 0 },
  { key: 'nom_complet', label: 'Nom complet', names: ['nom complet'], fallback: 8 },
  { key: 'civilite', label: 'Civilité', names: ['nature', 'civilite'], fallback: 1, optional: true },
  { key: 'tel_fixe', label: 'Téléphone fixe', names: ['tel_fixe', 'tel fixe'], fallback: 9, optional: true },
  { key: 'telephone', label: 'Téléphone portable', names: ['numero de portable', 'portable'], fallback: 10, optional: true },
  { key: 'email', label: 'Email', names: ['email', 'adresse e-mail', 'e-mail'], fallback: 14 },
  { key: 'linkedin', label: 'LinkedIn (profil)', names: ['linkedin'], fallback: 16, optional: true },
  { key: 'annee_serment', label: 'Année de serment', names: ['annee de serment'], fallback: 28, optional: true },
  { key: 'cabinet', label: 'Cabinet / Structure', names: ['structure', 'cabinet'], fallback: 35 },
  { key: 'classement', label: 'Classement C123', names: ['c123 (onglet doc agrege) equipe'], fallback: 45 },
  { key: 'linkedin_sabine', label: 'Réseau LinkedIn Sabine (SK)', names: ['linkedin sk'], fallback: 59, optional: true },
  { key: 'linkedin_bernard', label: 'Réseau LinkedIn Bernard (BLB)', names: ['linkedin blb'], fallback: 60, optional: true },
  { key: 'vote1T', label: 'A voté 1er tour', names: ['a vote 1t 2025', 'a vote 1t'], fallback: 71, optional: true },
  { key: 'vote2T', label: 'A voté 2e tour', names: ['a vote 2t 2025', 'a vote 2t'], fallback: 72, optional: true },
  { key: 'photo_url', label: 'Photo (URL PDP)', names: ['url pdp'], fallback: 74, optional: true },
];

export type ColStatus = 'name' | 'fallback' | 'missing';

export interface ResolvedField {
  key: string;
  label: string;
  index: number;
  status: ColStatus;
  header: string;
  col: string;
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

export function resolveFields(headers: unknown[]): ResolvedField[] {
  const normalized = headers.map(normalizeHeader);
  return FIELDS.map((f) => {
    const byName = normalized.findIndex((h) => h !== '' && f.names.includes(h));
    let index: number;
    let status: ColStatus;
    if (byName >= 0) {
      index = byName;
      status = 'name';
    } else if (f.fallback < headers.length && String(headers[f.fallback] ?? '').trim() !== '') {
      index = f.fallback;
      status = 'fallback';
    } else {
      index = f.fallback;
      status = 'missing';
    }
    return {
      key: f.key,
      label: f.label,
      index,
      status,
      header: String(headers[index] ?? ''),
      col: colLetter(index),
      acceptedNames: f.names,
      optional: !!f.optional,
    };
  });
}

export function columnIndices(headers: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of resolveFields(headers)) map[r.key] = r.index;
  return map;
}

export function etiquetteColumns(headers: unknown[]): { name: string; index: number }[] {
  const out: { name: string; index: number }[] = [];
  headers.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (n.includes('soutien')) out.push({ name: String(h), index: i });
  });
  return out;
}
