---
description: Boucle de clonage visuel — reproduit au pixel pres une capture (image et/ou video) fournie, avec le CONTENU du projet en cours. Itere via diff jusqu'a correspondance sous le seuil.
argument-hint: [chemin capture(s) + page cible]
disable-model-invocation: true
---

Tu es l'ORCHESTRATEUR d'une boucle de CLONAGE VISUEL pilotee par diff.
Mission : reproduire fidelement la capture de reference fournie (image fixe
et/ou video), jusqu'a ce que le rendu produit corresponde a la reference sous
le seuil de difference — EN UTILISANT le contenu du projet en cours (textes,
donnees, idees), et NON le contenu present dans la capture.

ENTREES : $ARGUMENTS
  (chemin(s) de la/les capture(s) de reference, et la page/composant a produire)

PRINCIPE CLE — la verification est OBJECTIVE, jamais "a l'oeil" :
tu rends la page, tu la captures, tu la compares au pixel pres a la reference
avec `visual_diff.mjs`. C'est SON score (code 0/1 + diff.png) qui decide si la
boucle continue. Tu ne declares jamais "c'est ressemblant" sans ce score.

SEPARATION VISUEL / CONTENU :
- La capture fournit le SYSTEME VISUEL : mise en page, espacements, couleurs,
  typographie, composants, animations. PAS son texte.
- Le contenu (textes, donnees, images, idees) vient du PROJET : lis le contenu
  reel du projet (pages, fichiers de contenu, contexte) et c'est lui qui peuple
  le clone.

================================================================
PREPARATION
================================================================
P1. Outils : `npm i -D playwright pixelmatch pngjs` puis
    `npx playwright install chromium`.
P2. Releve le VIEWPORT de reference = dimensions exactes de la capture. Tout le
    diff se fera a ce viewport.
P3. Si la reference est une VIDEO : extrais les frames (ffmpeg, ex. 2-4 img/s) +
    un instantane de l'etat de repos stable. Identifie chaque animation : type
    (entree, survol, scroll, transition), duree approx., easing, proprietes
    animees. Garde l'instantane de repos comme image de reference de la Phase 1.

================================================================
PHASE 1 — FIDELITE VISUELLE (etat statique, pilotee par diff pixel)
================================================================
Plafond : 12 iterations. Seuil de reussite : <= 1% de pixels differents.

Boucle :
  1. Implemente/ajuste le HTML/CSS de la cible pour coller a la reference
     statique : grille, mise en page, espacements, couleurs EXACTES, rayons,
     ombres, typographie, tailles, etats.
     -> Pour CETTE phase de calage uniquement, utilise un contenu de
        SUBSTITUTION proche de la capture (meme longueur de texte, memes blocs)
        pour que le diff pixel soit pertinent. Le vrai contenu projet arrive en
        Phase 3.
  2. Sers la page localement, puis lance :
        node visual_diff.mjs <reference.png> <url> <largeur> <hauteur> 0.01
  3. PORTE :
     - code 1 -> ouvre diff.png, repere les zones rouges (ou ca differe),
       corrige PRECISEMENT ces ecarts, recommence.
     - code 0 -> fidelite statique atteinte ; passe en Phase 2 (video) ou
       directement Phase 3 (image seule).
  Plafond atteint sans passer le seuil -> ARRETE, montre le meilleur diff et les
  ecarts residuels, demande-moi.

================================================================
PHASE 2 — ANIMATIONS (seulement si une video a ete fournie)
================================================================
Plafond : 8 iterations.
  1. Reproduis chaque animation identifiee (duree, easing, proprietes,
     declencheur) en CSS/JS.
  2. Capture l'animation produite (Playwright : enregistrement video, ou
     screenshots aux MEMES timestamps que les frames de reference).
  3. Compare frame a frame aux instants echantillonnes (visual_diff.mjs sur
     chaque paire de frames a timestamp egal).
  4. PORTE : frames cles sous le seuil -> continue ; sinon ajuste
     duree/easing/sequence et recommence.
  HONNETETE : le "ressenti" exact d'une animation (micro-timing, courbe d'easing
  precise) n'est pas entierement verifiable automatiquement. Quand les frames
  cles correspondent, SIGNALE les points a controler a l'oeil plutot que de
  tourner indefiniment dessus.

================================================================
PHASE 3 — SUBSTITUTION DU CONTENU PROJET
================================================================
  1. Remplace le contenu de substitution par le contenu REEL du projet, SANS
     toucher au systeme visuel (styles, layout, espacements, composants, anims).
  2. Gere les differences de longueur de texte conformement au design
     (wrapping, ellipses, debordement) pour ne PAS casser la mise en page.
  3. Re-rends et verifie qu'aucune regression de structure n'est apparue : le
     contenu differe de la capture, mais grille / espacements / couleurs /
     typographie restent ceux de la reference.

================================================================
DEFINITION DE "TERMINE" (stricte)
================================================================
  1. Phase 1 : visual_diff.mjs renvoie code 0 (<= seuil) sur l'etat statique, ET
  2. Phase 2 (si video) : frames cles sous le seuil, residuel d'anim signale, ET
  3. Phase 3 : contenu projet en place, systeme visuel preserve (pas de
     regression de layout).
Montre les PREUVES : score de diff, diff.png, captures avant/apres. Jamais une
simple affirmation "c'est identique".

================================================================
GARDE-FOUS
================================================================
- Le "0% absolu" n'est PAS la cible : anti-aliasing, rendu des polices et
  sous-pixels rendent 0.00% quasi inatteignable. Le seuil (<=1%) + le plafond
  d'iterations evitent la boucle infinie.
- Detection de stagnation : si le score ne s'ameliore pas sur 2 iterations
  consecutives -> ARRETE, montre l'ecart residuel et demande-moi (ne tourne pas
  dans le vide en brulant le budget).
- Contenu/assets : utilise mes propres donnees projet et des assets dont j'ai le
  droit de me servir. Ne telecharge pas d'assets proprietaires depuis la source.
- Reversible uniquement : aucun push/deploiement -> ARRETE, rends la main.
- A chaque iteration : [PHASE n] iteration k -> score diff -> decision.
