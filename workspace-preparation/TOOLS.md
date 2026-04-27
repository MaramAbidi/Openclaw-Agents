# Outils - Agent Preparation

Cet agent doit appeler les outils MySQL via MCP avec `mcporter`.
Ne jamais simuler leur resultat.

Serveur MCP : `lumicore`

| Outil | Declencheur | Appel mcporter |
|---|---|---|
| get_current_date | date relative (aujourd'hui, hier, etc.) | `mcporter call lumicore.get_current_date` |
| list_recent_shipments | dernieres expeditions / historique | `mcporter call lumicore.list_recent_shipments limit=8` |
| preparation_summary | summary journaliere preparation | `mcporter call lumicore.preparation_summary date=YYYY-MM-DD site=FCY_0 type=carton` |
| volume_de_preparation_en_palette | volume palettes | `mcporter call lumicore.volume_de_preparation_en_palette` |
| volume_de_preparation_en_carton | volume carton | `mcporter call lumicore.volume_de_preparation_en_carton date=YYYY-MM-DD site=FCY_0` |
| volume_de_preparation_en_palette_image | volume palettes + image | `mcporter call lumicore.volume_de_preparation_en_palette_image` |
| volume_de_preparation_par_magazin | volume magasins | `mcporter call lumicore.volume_de_preparation_par_magazin` |
| volume_de_preparation_par_magazin_image | volume magasins + image | `mcporter call lumicore.volume_de_preparation_par_magazin_image` |
| performance_hourly_kpi | KPI horaire | `mcporter call lumicore.performance_hourly_kpi date=YYYY-MM-DD site=FCY_0` |
| performance_kpi_summary | KPI performance / qualite / service | `mcporter call lumicore.performance_kpi_summary date=YYYY-MM-DD site=FCY_0 scope=daily_summary|picker_productivity|zone_productivity|site_productivity|quality_service` |
| multi_site_supervision_summary | supervision multi-site par date et scope | `mcporter call lumicore.multi_site_supervision_summary date=YYYY-MM-DD scope=global_status|risk_ranking|performance_ranking|staffing|urgent_pressure|anomalies` |

## Ordre d'appel obligatoire

1. Si l'utilisateur utilise une date relative (`aujourd'hui`, `hier`, `avant-hier`, etc.), appeler `mcporter call lumicore.get_current_date` en premier.
2. Convertir ensuite la date relative en date absolue au format `YYYY-MM-DD`.
3. Puis appeler l'outil metier correspondant.

## Regle daily summary

Si l'utilisateur demande la preparation du jour, le restant, le pourcentage, le travail en cours, ou le waiting, utiliser `preparation_summary`.
Le `site` est obligatoire. Si le site manque, demander le site avant d'appeler l'outil.

Si l'utilisateur demande une supervision multi-site, utiliser `multi_site_supervision_summary` avec `date` et `scope` uniquement.

## Regles KPI performance

Si l'utilisateur demande une question sur les KPI de performance, la productivite, la qualite, le service, le taux de preparation par heure, les lignes preparees par heure, ou les commandes preparees par heure, utiliser les nouveaux outils famille 3 :

- `performance_hourly_kpi` pour les KPI horaires
- `performance_kpi_summary` pour les resumes, la productivite, la qualite et le service

Pour `performance_kpi_summary`, choisir le bon `scope` selon la question :

- `daily_summary` pour les indicateurs principaux et les ecarts vs objectif
- `picker_productivity` pour la productivite par picker
- `zone_productivity` pour la productivite par zone
- `site_productivity` pour la productivite du site
- `quality_service` pour le taux d'erreur et le service level

Si la date est relative (`today`, `yesterday`, `aujourd'hui`, `hier`), appeler d'abord `get_current_date`, puis reutiliser la date absolue avec l'outil KPI.

## Regle image

Si l'utilisateur dit `image`, `photo`, `graphique`, `en image`, ou demande un rendu visuel, utiliser la variante `_image` quand elle existe.

## Regle MySQL de modification

Si l'utilisateur demande de modifier des donnees de preparation dans MySQL, par exemple `update`, `delete`, `insert`, `corriger`, `changer une valeur`, `delete the zonne-prep where ...`, ou `update the credat-date of ... to ...`, utiliser le skill `mysql-prep-admin`.

### Comportement obligatoire

1. Preparer le SQL exact avant toute execution.
2. Expliquer l'impact attendu, surtout si plusieurs lignes peuvent etre touchees.
3. Demander une confirmation explicite avant d'executer.
4. Ne jamais lancer la requete sur un simple `ok` ambigu.
5. Si l'utilisateur refuse ou modifie la demande, arreter et reconfirmer.
6. Pour executer la requete approuvee, utiliser `mcporter` avec le serveur MCP `lumicore` et le tool `execute_sql`.
   - D'abord appeler le tool avec `confirm=false` si la requete est mutating pour obtenir un preview.
   - Ensuite, seulement apres confirmation explicite de l'utilisateur, rappeler le tool avec `confirm=true`.
   - Les requetes `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN` et `WITH` peuvent etre lancees directement.
   - Exemple: `mcporter call lumicore.execute_sql sql="UPDATE shipments SET zcontrat_0='embalage' WHERE zcontrat_0='COMFRAIS-EMB';" confirm=false`
7. Le serveur MCP `lumicore` charge automatiquement `C:\Users\hp\.openclaw\workspace\test2\.env` si les variables MySQL ne sont pas deja presentes.
8. Le tool doit echouer si `affectedRows = 0` sur une requete de modification; ne jamais dire que la modification a reussi dans ce cas.
9. S'appuyer sur `C:\Users\hp\.openclaw\workspace\test2\db\mysql.js` comme reference de connexion MySQL et sur les variables `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
10. Apres execution, afficher le resultat reel et les lignes affectees si disponibles.

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


Use the martok9803-reminder-engine skill whenever the user asks to create, manage, or check reminders.

Trigger examples:
- "remind me in 20 minutes to..."
- "remind me tomorrow at 9 to..."
- "set a reminder for..."
- "every day at 8 remind me to..."
- "every Monday remind me to..."
- "list my reminders"
- "cancel my reminder"
- "snooze this reminder"
- "disable/enable this reminder"

Behavior:
1. Detect if the request is:
   - one-time reminder
   - recurring reminder
   - list reminders
   - cancel reminder
   - snooze reminder
2. Extract:
   - reminder message
   - date/time
   - recurrence if any
   - timezone if mentioned
3. Always confirm before creating, canceling, or changing a reminder.
4. After confirmation, use the Reminder Engine skill to create or manage the OpenClaw cron job.
5. Reminder messages must be short and start with:
   "Reminder:"
6. Default delivery target is the current OpenClaw main session unless the user asks for another channel.
7. If the date/time is unclear, ask one short clarification question.
8. Never create spammy recurring reminders without explicit confirmation.

Example:
User: "remind me in 20 minutes to call the client"
Agent: "Confirming: one-time reminder in 20 minutes to say: Reminder: call the client. Should I create it?"
After user confirms, run Reminder Engine.
When the user asks to be reminded in Telegram, do NOT create a main-session reminder.

Use Reminder Engine / OpenClaw cron with:
- sessionTarget: "isolated"
- payload.kind: "agentTurn"
- delivery.mode: "announce"
- delivery.channel: "telegram"
- delivery.to: the user's Telegram chat ID, username, or configured Telegram target

If the Telegram target is unknown, ask:
"Which Telegram chat should I send it to? Give me the chat ID, username, or configured target."

For Telegram reminders, confirm:
- reminder text
- schedule
- timezone
- Telegram target

Example:
User: "remind me on Telegram tomorrow at 9 to call the supplier"
Agent: "Confirming: one-time Telegram reminder tomorrow at 09:00 to: Reminder: call the supplier. Telegram target: <target>. Should I create it?"
Then create an isolated cron job with announce delivery to Telegram.
For Telegram reminders, never fall back to the current OpenClaw session.

Use:
- sessionTarget: "isolated"
- payload.kind: "agentTurn"
- delivery.mode: "announce"
- delivery.channel: "telegram"
- delivery.to: the Telegram bot/chat target provided by the user

If delivery.mode is missing, the cron job is invalid. Do not continue by creating a main-session reminder.

Example:
User: "remind me in telegram bot (@LumicorePreparationbot) to eat in 2min"

Create an isolated cron job:
- schedule: one-shot in 2 minutes
- message: "Reminder: eat"
- delivery:
  mode: "announce"
  channel: "telegram"
  to: "@LumicorePreparationbot"

If Telegram delivery fails, tell the user the Telegram target may need a chat ID instead of bot username, and ask for the correct chat ID.
For Telegram reminders, DO NOT use:sessionTarget: "session:telegram:..."That creates a new Telegram session inside OpenClaw and is wrong.Use:sessionTarget: "isolated"delivery must include the actual channel target:delivery: {  mode: "announce",  channel: "telegram",  to: "@LumicorePreparationbot"}payload:{  kind: "agentTurn",  message: "Reminder: Eat"}If the cron tool does not accept channel/to fields, stop and report that Telegram delivery is not configured. Never fall back to sessionTarget="session:telegram:...".
Correct shape should be closer to:
{  "name": "reminder-eat",  "schedule": {    "kind": "at",    "at": "2026-04-27T10:44:00.000Z"  },  "sessionTarget": "isolated",  "payload": {    "kind": "agentTurn",    "message": "Reminder: Eat"  },  "delivery": {    "mode": "announce",    "channel": "telegram",    "to": "@LumicorePreparationbot"  }}
The key fix:
sessionTarget = isolated
not:
sessionTarget = session:telegram:@LumicorePreparationbot