---
description: Boucle BMAD v4 — balaie toutes les stories non-Done, reprend chacune a son stade et la mene jusqu'a Done, en conformite avec le reste du projet. Sans argument, tout le backlog.
argument-hint: [epic-id optionnel]
disable-model-invocation: true
---

Tu es l'ORCHESTRATEUR d'une boucle de FINALISATION BMAD v4. BMAD v4 (.bmad-core)
est installe dans ce projet. Ta mission : amener au statut Done TOUTES les stories
qui ne le sont pas encore, chacune rendue conforme aux conventions et aux patterns
du reste du projet.

PERIMETRE :
- Si un argument est fourni, limite a cet epic : $ARGUMENTS
- Sinon, tout le backlog du projet.

CONTEXTE & REFERENCE DE CONFORMITE (a lire AVANT toute chose) :
- `.bmad-core/core-config.yaml`
- devLoadAlwaysFiles : coding-standards.md, tech-stack.md, project-structure.md
- `.bmad-core/data/technical-preferences.md`
- Les stories DEJA Done et le code existant : ce sont tes modeles de style,
  d'arborescence et de patterns. Tout nouveau code doit s'y aligner.

PLAFONDS :
- Max 5 allers-retours Dev<->QA PAR story.
- Si une story ne converge pas vers Done apres ce plafond -> marque-la BLOQUEE,
  PASSE a la suivante, et liste-la dans le rapport. Une seule story recalcitrante
  ne doit jamais bloquer tout le balayage ni vider le budget.

================================================================
ETAPE 1 — INVENTAIRE & ORDONNANCEMENT
================================================================
1. Liste toutes les stories prevues (epics shardes + `docs/stories/`) qui ne sont
   PAS au statut Done. Inclus les stories absentes (a creer).
2. Ordonne-les selon les dependances/la sequence (une story qui en debloque
   d'autres passe avant ; sinon suis l'ordre des epics).
3. Affiche la file de traitement : [ID | statut actuel | position].

================================================================
ETAPE 2 — BALAYAGE  (pour CHAQUE story de la file, dans l'ordre)
================================================================
Reprends la story a son STADE COURANT (ne recommence jamais a zero) :

- Absente / Draft :
   `*agent sm` -> `*draft` : cree/complete le fichier story (taches + AC) en
   t'alignant sur les patterns des stories deja Done.
   Validation (agent PO / checklist) -> Approved. (Manques -> re-draft.)

- Approved : va directement a l'implementation.

- Review : va directement a la revue QA.

Cycle d'implementation CONFORME :
- `*agent dev` -> `*develop-story` : implemente AC par AC, en TDD, en
  REUTILISANT les conventions, l'arborescence et les patterns existants (pas un
  style different). Aucune dependance non approuvee.
  Tests / lint / types verts -> statut Review.
  PREUVE : montre la sortie reelle des tests, jamais une simple affirmation.

- `*agent qa` -> `*review {story}` : verifie chaque AC ET la CONFORMITE au reste
  du projet (style, structure, patterns, exigences non fonctionnelles).
  Verdict : PASS / CONCERNS / FAIL.
   * FAIL ou CONCERNS bloquant -> retour Dev (dans la limite du plafond).
   * PASS -> continue.

- Portes finales : suite de tests complete verte, lint/types propres, build OK.
- Cloture de la story : commit atomique (message referencant l'ID), statut = Done.

Puis passe a la story suivante de la file.

================================================================
SORTIE DE BOUCLE
================================================================
Termine quand la file est vide : plus aucune story non-Done dans le perimetre
(hors stories marquees BLOQUEE).

================================================================
RAPPORT FINAL (livrable)
================================================================
- Stories passees a Done dans ce run : ID | titre | preuve (tests + QA PASS)
- Stories BLOQUEES (plafond atteint) : ID | ou ca a coince | etat laisse
- Etat final du backlog : X / Y Done
- Aucune action irreversible effectuee.

================================================================
GARDE-FOUS
================================================================
- CONFORMITE avant tout : chaque story livree s'aligne sur les conventions et
  patterns du projet ; n'introduis jamais un style divergent.
- NON-REGRESSION : la suite complete reste verte a chaque cloture de story.
- Le Dev ne touche pas l'archi/les specs ; changement necessaire -> repasse par
  l'agent Architect (maj des docs) avant de relancer le Dev.
- Ne saute JAMAIS la QA.
- Reversible uniquement : AUCUN push / merge / deploiement -> ARRETE, rends la main.
- Respecte le plafond par story (une story bloquee ne stoppe pas le balayage).
- A chaque transition : [STORY x/N] <id> -> <statut> -> <porte>
