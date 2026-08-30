# École Alpha et Binta — Application de gestion scolaire (V1)

Application web de gestion interne pour l'École maternelle privée Alpha et Binta
(Tivaouane, Sénégal). Ce n'est **pas** un site vitrine : c'est un logiciel avec
authentification, rôles, et interfaces différentes selon l'utilisateur connecté.

## Stack technique

- **Front-End** : React + Vite, React Router
- **Backend** : Supabase (Auth + Postgres + Row Level Security)
- Pas de backend Node/Express séparé pour cette V1.

## 1. Créer le projet Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécutez l'intégralité du fichier
   [`sql/schema.sql`](./sql/schema.sql). Il crée :
   - les 11 tables (référentiels, élèves, inscriptions, tarifs, parents,
     présences, paiements, informations école) ;
   - la vue `vue_solde_eleve` (calcul automatique du reste à payer) ;
   - les fonctions utilitaires et le trigger de protection du rôle ;
   - toutes les politiques RLS ;
   - les données de référence initiales (3 sections, année 2025-2026 active).
3. Dans **Authentication → Providers**, laissez uniquement **Email** activé
   (pas d'inscription publique : les comptes sont créés manuellement).
4. Dans **Authentication → Users**, créez manuellement les premiers comptes
   (directrice, enseignantes, maître d'arabe) avec un email + mot de passe.
   Ensuite, dans la table `profiles`, ajoutez la ligne correspondante pour
   chaque utilisateur créé (même `id` que dans `auth.users`), avec le bon
   `role` (`DIRECTRICE` ou `ENSEIGNANT`).
5. Renseignez des tarifs dans la table `tarifs` pour l'année active
   (inscription, mensualité par section) — sans cela, le calcul du reste à
   payer renverra 0.

> ⚠️ La création de comptes PARENT nécessite l'API Admin de Supabase (clé
> `service_role`), qui ne doit jamais être exposée au Front-End. Pour la V1,
> créez ces comptes directement depuis le tableau de bord Supabase
> (Authentication → Users → Add user), puis complétez `profiles` et `parents`
> / `parents_eleves` à la main ou via l'éditeur de table. Une Edge Function
> dédiée pourra automatiser ce flux dans une itération suivante.

## 2. Configurer le Front-End

```bash
cp .env.example .env
```

Renseignez dans `.env` :

```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique
```

Ces deux valeurs se trouvent dans **Project Settings → API** de votre projet
Supabase. La clé **anon** (publique) uniquement — jamais la clé `service_role`.

## 3. Lancer l'application

```bash
npm install
npm run dev
```

L'application démarre sur `http://localhost:5173`. La première page est la
page de connexion (`/login`) — il n'y a aucune page d'inscription publique.

## Structure du projet

```
src/
├── auth/           → contexte d'authentification, garde de routes
├── layout/         → Sidebar, Header, layout général, menus par rôle
├── components/     → composants UI génériques (StatCard, Loader, Toast…)
├── features/       → modules métier (eleves, presences, paiements, parents, informations-ecole)
├── pages/          → pages/dashboards par rôle
├── services/       → appels Supabase centralisés (un fichier par entité)
└── utils/          → formatage (montants FCFA, dates)
```

## Rôles

| Rôle | Accès |
|---|---|
| **DIRECTRICE** | Accès complet : élèves, présences, paiements, parents, informations, utilisateurs |
| **ENSEIGNANT** | Élèves (lecture), présences (lecture/écriture), pas d'accès aux paiements ni aux parents |
| **PARENT** | Ses propres enfants uniquement : présences, paiements, informations (lecture seule) |

Le maître d'arabe utilise le rôle `ENSEIGNANT` (avec `fonction = "Maître d'arabe"`
dans son profil) — il n'existe pas de rôle séparé pour lui.

## Sécurité

Toute la sécurité d'accès aux données repose sur les politiques **Row Level
Security** de Supabase (voir `sql/schema.sql`), pas sur la logique du
Front-End. Un parent ne peut jamais récupérer les données d'un autre enfant,
même en modifiant un identifiant dans une requête : Postgres refuse la ligne
au niveau de la base de données.

## Perspectives futures (non développées en V1)

- Applications mobiles natives (parents, enseignants)
- Application desktop pour la directrice
- Intégration directe des paiements Wave / Orange Money
- Notifications automatiques (absence, échéance, annonce)

Voir le prompt de conception original pour le détail complet des étapes de
développement (architecture → base de données → RLS → authentification →
layout → dashboards → modules → tests).
