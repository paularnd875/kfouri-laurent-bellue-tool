<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Règles strictes

## Emojis — INTERDITS
- N'écris JAMAIS d'emoji brut dans le code source (JSX, chaînes, commentaires).
- N'affiche JAMAIS d'emoji dans tes réponses, résumés ou diffs.
- Pour les icônes d'interface, utilise exclusivement `lucide-react` (`import { IconName } from 'lucide-react'`).
- Raison : les emojis multi-codepoints (ex. 🎛️, 🎯) cassent l'encodage UTF-16 quand un diff est tronqué → erreur API « no low surrogate in string » qui bloque définitivement la session.

## Édition de fichiers
- Édite les gros fichiers par petits blocs ciblés, jamais en réécrivant tout le fichier d'un coup (réduit le risque de troncature de diff).
- Vise des composants < 300 lignes quand c'est possible.

## TypeScript
- Quand un `.map()` peut retourner `null`, annote le type de retour du callback (ex. `.map((x): MonType | null => …)`) pour que le type guard du `.filter()` narrow correctement.
- Vérifie `npm run build` avant de considérer une tâche terminée.
