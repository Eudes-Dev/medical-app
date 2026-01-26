# 📅 SPRINT 1 : Fondations & Infrastructure
*Objectif : Mettre en place un environnement de développement robuste et sécurisé.*

- [ ] **Ticket 1.1 : Initialisation Next.js 16**
  - Setup du projet avec `npx create-next-app@latest` (v16).
  - Configuration de TypeScript, TailwindCSS et ESLint.
  - Installation et initialisation de **Shadcn UI**.
- [ ] **Ticket 1.2 : Couche de Données (Prisma & Supabase)**
  - Initialisation de Prisma.
  - Configuration de la connexion PostgreSQL avec Supabase.
  - Création et migration du schéma (User, Patient, Appointment).
- [ ] **Ticket 1.3 : Authentification Praticien**
  - Configuration de **Supabase Auth**.
  - Création de la page de login pour le praticien.
  - Sécurisation des routes `/dashboard/**` via Middleware.
