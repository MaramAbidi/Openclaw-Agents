# Outils - Agent Preparation

Cet agent doit appeler les outils MySQL via MCP avec `mcporter`.
Ne jamais simuler leur resultat.

Serveur MCP : `lumicore`

| Outil | Declencheur | Appel mcporter |
|---|---|---|
| get_current_date | date relative (aujourd'hui, hier, etc.) | `mcporter call lumicore.get_current_date` |
| list_recent_shipments | dernieres expeditions / historique | `mcporter call lumicore.list_recent_shipments limit=8` |
| volume_de_preparation_en_palette | volume palettes | `mcporter call lumicore.volume_de_preparation_en_palette` |
| volume_de_preparation_en_carton | volume carton | `mcporter call lumicore.volume_de_preparation_en_carton date=YYYY-MM-DD site=FCY_0` |
| volume_de_preparation_en_palette_image | volume palettes + image | `mcporter call lumicore.volume_de_preparation_en_palette_image` |
| volume_de_preparation_par_magazin | volume magasins | `mcporter call lumicore.volume_de_preparation_par_magazin` |
| volume_de_preparation_par_magazin_image | volume magasins + image | `mcporter call lumicore.volume_de_preparation_par_magazin_image` |

## Ordre d'appel obligatoire

1. Si l'utilisateur utilise une date relative (`aujourd'hui`, `hier`, `avant-hier`, etc.), appeler `mcporter call lumicore.get_current_date` en premier.
2. Convertir ensuite la date relative en date absolue au format `YYYY-MM-DD`.
3. Puis appeler l'outil metier correspondant.

## Regle image

Si l'utilisateur dit `image`, `photo`, `graphique`, `en image`, ou demande un rendu visuel, utiliser la variante `_image` quand elle existe.

## Regle envoi d'email

Si l'utilisateur dit `send mail`, `send email`, `envoyer ce mail a`, `envoyer ceci a`, `envoie ca a`, ou toute formulation equivalente pour envoyer un email, utiliser le skill `send-email` situe dans `skills/send-email`.

### Comportement obligatoire pour l'email

1. Declencher le skill `send-email`.
2. Si l'utilisateur a deja fourni clairement le destinataire, le sujet et le corps du message, executer le workflow d'envoi.
3. Si le sujet ou le corps manque, demander uniquement les elements necessaires avant execution.
4. Ne jamais inventer le sujet ni le corps du mail.
5. Ne pas envoyer automatiquement un email ambigu, incomplet ou insuffisamment specifie.

## Regle creation de presentation

Si l'utilisateur demande de creer une presentation, un PowerPoint, un slide deck, un fichier `.pptx`, ou utilise des formulations comme :

- `create me a presentation about ...`
- `make me a powerpoint about ...`
- `build a slide deck about ...`
- `cree une presentation sur ...`
- `fais-moi un powerpoint sur ...`
- `prepare une presentation sur ...`

alors utiliser automatiquement le skill `create-pptx` situe dans `skills/create-pptx`.

### Comportement obligatoire pour la presentation

1. Declencher le skill `create-pptx`.
2. Produire un vrai fichier PowerPoint `.pptx`, pas une page HTML.
3. Si l'utilisateur donne seulement un sujet, generer automatiquement un plan coherent.
4. Si l'utilisateur precise l'audience, la langue, le ton, le style, le nombre de slides ou la structure, respecter ces consignes.
5. Si aucun nombre de slides n'est precise, produire par defaut une presentation professionnelle de 6 a 10 slides.
6. Si l'utilisateur dit d'utiliser un template, ouvrir un fichier `.pptx` du dossier `skills/create-pptx/assets/` et l'utiliser comme base.
   - Extraire et reutiliser le style du template.
   - Construire la nouvelle presentation en conservant ce systeme graphique.
   - Ne pas supprimer les slides de branding ou credits requis sauf demande explicite.
   - Si des placeholders sont inutilisables, dupliquer une slide valide existante et l'adapter.
   - Si aucun template n'est disponible ou utilisable, creer la presentation depuis zero avec `python-pptx`.
7. Verifier avant livraison :
   - l'overflow du texte,
   - l'alignement,
   - la coherence visuelle,
   - les placeholders restants,
   - et la lisibilite globale.
8. Ne pas repondre avec un simple outline texte si l'utilisateur demande explicitement une presentation ou un PowerPoint.
9. Si la demande est suffisamment claire, executer directement le skill.
10. Si des informations essentielles manquent, demander uniquement les precisions strictement necessaires.

## Skills ajoutes dans l'espace de travail

| Skill | Usage | Installation |
|---|---|---|
| `Arabic` | Redaction en tunisien uniquement, sans MSA ni autres dialectes. | Aucun `npm install` requis. |
| `task-planner-3.0.5` | Gestion locale de taches, priorites et echeances via `bash` + `python3`. | Aucun `npm install` requis. |
| `summarize-pro-1.0.0` | Resumes, TL;DR, points cles, comptes rendus et formats de synthese. | Aucun `npm install` requis. |

### Triggers directs for task-planner-3.0.5

Use this skill immediately when the user says:

- `add a task`
- `create a task`
- `new task`
- `task planner`
- `task list`
- `show tasks`
- `list tasks`
- `pending tasks`
- `done task`
- `mark task as done`
- `complete task`
- `set priority`
- `high priority task`
- `medium priority task`
- `low priority task`
- `due today`
- `due tomorrow`
- `tasks due this week`
- `what do I need to do`
- `my todo list`
- `organize my tasks`
- `track deadlines`
- `plan my work`
- `lister mes taches`
- `afficher mes taches`
- `mes taches`
- `quoi en est-il de mes taches`

### Use Cases for task-planner-3.0.5

- add a new task quickly
- assign a priority to a task
- attach an optional due date
- list pending, done, or all tasks
- review work by urgency
- mark tasks as finished
- keep a local private to-do list
- answer "what tasks do I have?"
- show pending tasks by default when the user only says `lister mes taches`
- show all tasks when the user explicitly asks for everything

### How to Run task-planner-3.0.5

Use the script directly from the workspace:

```bash
bash C:/Users/hp/.openclaw/workspace-preparation/skills/task-planner-3.0.5/scripts/script.sh list
```

Legacy compatible entrypoints that also work:

- `C:/Users/hp/.openclaw/workspace-preparation/skills/task-planner-3.0.5/task`
- `C:/Users/hp/.openclaw/workspace-preparation/skills/task-planner-3.0.5/task.py`
- `C:/Users/hp/.openclaw/workspace-preparation/skills/task-planner-3.0.5/scripts/list-tasks.sh`

List pending tasks:

```bash
bash C:/Users/hp/.openclaw/workspace-preparation/skills/task-planner-3.0.5/scripts/script.sh list --status pending
```

List all tasks:

```bash
bash C:/Users/hp/.openclaw/workspace-preparation/skills/task-planner-3.0.5/scripts/script.sh list --status all
```

### Triggers directs for summarize-pro-1.0.0

Use this skill immediately when the user says:

- `summarize`
- `summary`
- `tldr`
- `tl;dr`
- `bullet points`
- `key takeaways`
- `action items`
- `executive summary`
- `meeting summary`
- `email summary`
- `thread summary`
- `chapter summary`
- `compare`
- `summarize in [language]`
- `summarize in [X] words`
- `make it shorter`
- `make it longer`
- `save summary`
- `summary history`
- `summary stats`
- `my stats`

## Priorite generale

- Toujours utiliser les outils ou skills reels quand ils existent.
- Ne jamais simuler un resultat d'outil.
- En cas d'ambiguite, demander une clarification minimale.
- Si la demande est claire, executer directement le bon outil ou le bon skill.
