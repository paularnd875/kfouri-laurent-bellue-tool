# Guide pour reprendre le développement - Outil Kfouri-Laurent Bellue

## 📍 Votre projet est sauvegardé ici :
🔗 **https://github.com/paularnd875/kfouri-laurent-bellue-tool**

---

## 🚀 Comment relancer le projet (étapes simples)

### 1. Récupérer le projet depuis GitHub

Ouvrir le Terminal sur Mac et taper ces commandes une par une :

```bash
# Aller sur le Bureau
cd ~/Desktop

# Télécharger le projet depuis GitHub
git clone https://github.com/paularnd875/kfouri-laurent-bellue-tool.git

# Aller dans le dossier du projet
cd kfouri-laurent-bellue-tool
```

### 2. Installer les dépendances

```bash
npm install
```
*(Cela va télécharger toutes les bibliothèques nécessaires)*

### 3. Reconfigurer le fichier .env (IMPORTANT)

Le fichier `.env.local` contient tes clés Google Sheets. Il faut le recréer :

```bash
# Créer le fichier .env.local
touch .env.local
```

Puis ouvrir ce fichier avec un éditeur de texte et y mettre tes variables Google :

```
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

**⚠️ IMPORTANT : Tu dois remettre tes vraies clés Google Sheets dans ce fichier !**

### 4. Lancer le serveur de développement

```bash
npm run dev
```

Le site sera accessible sur : **http://localhost:3000**

---

## 📁 Structure du projet (ce que tu trouveras)

```
kfouri-laurent-bellue-tool/
├── app/
│   ├── cabinets-ventres-mous/page.tsx   ← Page principale "Cabinets Ventres Mous"
│   ├── api/
│   │   ├── cabinet-avocats/route.ts     ← API pour récupérer les avocats d'un cabinet
│   │   ├── cabinets-votes/route.ts      ← API pour les données de vote
│   │   └── cabinets-linkedin-matching/  ← API pour LinkedIn
│   ├── globals.css                      ← Design system complet
│   └── layout.tsx                       ← Structure générale du site
├── .env.local                           ← Tes clés Google (à recréer)
└── package.json                         ← Configuration du projet
```

---

## 🔑 Variables d'environnement (.env.local)

**Tu dois créer un fichier `.env.local` avec tes clés Google Sheets :**

1. Créer le fichier : `touch .env.local`
2. Y mettre tes clés Google :

```bash
# Variables Google Sheets
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"ton-projet","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**Comment récupérer ces clés :**
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un compte de service
3. Télécharger la clé JSON
4. Copier tout le contenu JSON dans la variable ci-dessus

---

## 🎯 Fonctionnalités actuelles

### ✅ Ce qui fonctionne :
- **Page "Cabinets Ventres Mous"** : http://localhost:3000/cabinets-ventres-mous
- **Filtrage des cabinets** par taille (10-30 avocats) et taux de vote
- **Affichage des avocats** par cabinet avec boutons cliquables :
  - 📧 **Email** (ouvre l'email)
  - 📞 **Téléphone fixe** (lance l'appel)
  - 📱 **Portable** (lance l'appel)
  - 💼 **LinkedIn** (ouvre le profil)
- **Design professionnel** basé sur kfouri-laurentbellue.paris
- **System flexible** qui s'adapte aux nouvelles colonnes Google Sheets

### 📊 Mapping des colonnes Google Sheets :
- **Colonne I** : Nom complet (affiché)
- **Colonne J** : Téléphone fixe
- **Colonne K** : Portable
- **Colonne O** : Email
- **Colonne Q** : LinkedIn
- **Détection automatique** de la colonne Structure/Cabinet

---

## 🛠️ Commandes utiles

```bash
# Lancer le serveur de développement
npm run dev

# Sauvegarder des changements sur GitHub
git add .
git commit -m "description des changements"
git push

# Voir le statut du projet
git status

# Installer une nouvelle bibliothèque
npm install nom-de-la-bibliotheque
```

---

## 🔄 Workflow pour continuer le développement

### 1. Faire des modifications
- Modifier les fichiers dans `app/`
- Le serveur se recharge automatiquement

### 2. Tester
- Ouvrir http://localhost:3000
- Tester les fonctionnalités

### 3. Sauvegarder
```bash
git add .
git commit -m "description de ce que j'ai changé"
git push
```

---

## 🆘 En cas de problème

### Erreur "Port 3000 is already in use"
```bash
# Trouver le processus qui utilise le port 3000
lsof -ti :3000

# Le tuer (remplacer XXXX par le numéro affiché)
kill -9 XXXX

# Relancer
npm run dev
```

### Erreur Google Sheets
- Vérifier que le fichier `.env.local` existe
- Vérifier que les clés Google sont correctes
- S'assurer que le Google Sheet est partagé avec l'email du service account

### Erreur "Cannot find module"
```bash
# Réinstaller les dépendances
rm -rf node_modules
npm install
```

---

## 📞 Support

**Repository GitHub :** https://github.com/paularnd875/kfouri-laurent-bellue-tool

Pour toute question technique :
1. Ouvrir le Terminal
2. Aller dans le dossier du projet : `cd chemin/vers/kfouri-laurent-bellue-tool`
3. Utiliser Claude Code : `claude`
4. Expliquer le problème

---

## 🎯 Prochaines améliorations possibles

1. **Export des données** en CSV/Excel
2. **Filtres avancés** par région, spécialité
3. **Dashboard statistiques** plus détaillé
4. **Intégration email** pour campagnes
5. **Historique des interactions**
6. **Mode sombre**
7. **Version mobile optimisée**

---

*Guide créé le 4 juin 2026 - Version 1.0*