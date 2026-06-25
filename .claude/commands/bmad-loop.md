---
description: Boucle BMAD v4 — pilote une story de Draft jusqu'a Done (SM -> Dev -> QA -> portes -> Done). Sans argument, prend la prochaine story du backlog.
argument-hint: [story-id]
disable-model-invocation: true
---

Tu es l'ORCHESTRATEUR d'une boucle d'implementation BMAD v4 complete.
BMAD v4 (.bmad-core) est installe dans ce projet. Ta mission : piloter UNE
story sur tout son cycle, de Draft jusqu'au statut Done, en autonomie, en
respectant la separation des roles BMAD et les portes qualite.

CIBLE :
- Si un argument est fourni, c'est l'ID (ou la description) de la story a traiter : $ARGUMENTS
- Si AUCUN argument n'est fourni, l'agent SM tire la PROCHAINE story du backlog
  (epics sharded), via sa commande de creation de story standard.

CONTEXTE PROJET (a lire AVANT toute chose) :
- `.bmad-core/core-config.yaml` (emplacements, versions, devLoadAlwaysFiles)
- Les devLoadAlwaysFiles (typiquement) :
  `docs/architecture/coding-standards.md`,
  `docs/architecture/tech-stack.md`,
  `docs/architecture/project-structure.md`
- `.bmad-core/data/technical-preferences.md`
Respecte ces conventions pendant toute la boucle.

DISCIPLINE DE CONTEXTE : execute chaque cycle d'agent dans un contexte frais.
Toi, orchestrateur, ne conserves qu'un etat leger : ID de la story, statut
courant, resultat de la derniere porte.

PLAFOND : maximum 5 allers-retours Dev<->QA. Si depasse : ARRETE, resume ce
qui bloque, et demande-moi.

================================================================
LA BOUCLE
================================================================

PHASE 1 — Creation de la story  (agent SM, "Bob")
- `*agent sm` puis `*draft` : redige le fichier story dans `docs/stories/`,
  auto-suffisant, avec taches/sous-taches et criteres d'acceptation (AC).
- Statut = Draft.

PHASE 2 — Validation de la story  (agent PO / checklist)
- Valide le brouillon contre le PRD et l'architecture (completude, coherence,
  pret-pour-dev).
- PORTE : manques -> retour PHASE 1 (re-draft) ; OK -> statut = Approved.

PHASE 3 — Implementation  (agent Dev, "James")
- `*agent dev` puis `*develop-story` : execute les taches dans l'ordre, code ET
  tests, met a jour la progression dans le fichier story.
- Reste STRICTEMENT dans le perimetre. Aucune dependance non approuvee.
- Lance toutes les validations (tests, lint, types). Tous les AC faits + local
  vert -> statut = Review (Ready for Review).
- PREUVE : montre la sortie reelle des tests, jamais une simple affirmation.

PHASE 4 — Revue qualite  (agent QA, "Quinn")
- `*agent qa` puis `*review {story}` : revue senior, verifie chaque AC, la
  couverture de tests, les exigences non fonctionnelles ; refactor mineur et
  ajout de tests autorises dans le perimetre.
- Verdict de porte : PASS / CONCERNS / FAIL.
- PORTE : FAIL ou CONCERNS bloquant -> retour PHASE 3 avec constats precis.
  Ne poursuis pas les remarques cosmetiques. PASS -> continue.

PHASE 5 — Portes qualite finales
- Suite complete verte, lint/types propres, build OK.
- PORTE : echec -> retour PHASE 3 ; tout passe -> continue.

PHASE 6 — Cloture
- Commit atomique de TOUS les changements, message clair referencant l'ID story.
- Statut = Done. Mets a jour le suivi si present.
- AUCUNE action irreversible (push, merge, deploiement) : ARRETE et rends la main.

================================================================
DEFINITION DE "DONE" (stricte — seule sortie de boucle)
================================================================
Termine UNIQUEMENT si simultanement :
  1. statut == Done, ET
  2. chaque AC verifie satisfait avec preuve, ET
  3. suite de tests complete verte (montre la sortie), ET
  4. porte QA == PASS.
Pas de completion sur affirmation : montre la preuve.

================================================================
GARDE-FOUS
================================================================
- Le Dev ne touche jamais l'archi/les specs. Changement de spec necessaire ->
  ARRETE, repasse par l'Architect (maj des docs), puis relance le Dev.
- Ne saute JAMAIS la QA.
- Privilegie le reversible. Action destructive (push, deploiement, suppression,
  ecrasement de specs) -> ARRETE et demande.
- Nom de commande different sur cette install v4 ? Active l'agent et tape
  `*help` pour lister ses commandes ; conserve la logique phases/portes/statuts.
- A chaque transition, affiche : [PHASE n] <story-id> -> <statut> -> <porte>
