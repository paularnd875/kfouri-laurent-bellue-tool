// Parse robuste de la cle de compte de service Google.
// Supporte : JSON brut, JSON encode en base64 (prefixe 'ey' ou 'base64:'), et le
// cas ou private_key contient de VRAIS retours a la ligne (frequent selon la
// facon dont la variable a ete saisie) -> on les echappe pour rendre le JSON
// valide, sans effet si la cle est deja correcte.
export function parseServiceAccountKey(): Record<string, unknown> {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}';
  if (raw.startsWith('ey') || raw.includes('base64:')) {
    raw = Buffer.from(raw.replace('base64:', ''), 'base64').toString('utf-8');
  }
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/\r?\n/g, '\\n'));
  }
}
