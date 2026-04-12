# TOOLS.md - Local Notes

This file contains environment-specific tool notes that must be available in every session.

## Skills Index

Read these files when the user asks for those topics or enable automated action:
- skill-rapport-journalier.md: daily report flow
- skill-dates.md: natural language date conversion
- skill-sites.md: site name normalization and code mapping
- skills/send-email/SKILL.md: Send email skill; When the user types "send mail to...", this skill is triggered automatically without manual confirmation.

## LumiCore DB Bridge

The LumiCore logistics bridge runs as an HTTP API at `http://127.0.0.1:3001`.

When a user asks for a LumiCore value, call the HTTP endpoint immediately using the `exec` tool and return the result. Do not ask for platform details when required inputs are present.

If the user writes a spaced alias like `volume_de preparation_en_carton`, interpret it as the real tool name `volume_de_preparation_en_carton`.

### Tool: `get_current_date` ← CALL FIRST for any relative date

- Use when the user says: aujourd'hui, today, hier, yesterday, ce jour, or any relative date expression.
- You do NOT know the real date. ALWAYS call this endpoint before using today's or yesterday's date.
- HTTP: `POST /tools/get_current_date`
- Input: `{}`
- Returns: `{ result: { structuredContent: { today, yesterday, utcNow }}}`

## Site Name Mapping

Use these codes and names when the user mentions a site informally. Always map to the `fcy_0` code:
- BAR: Bouargoub
- BKS: Bareket Essah(e)l / Baraket El Sahel / (Arabic: بركة الساحل)
- CAP: Cap Bon / Nabeul
- GAB: Gabes
- JER: Jerba
- SAL: Sahlin
- SFX: Sfax
- TUN: Tunis

Never call a tool with the informal name. Replace it with the `fcy_0` code first.
If the site is misspelled, choose the closest match and confirm. If unknown, list the available codes and ask which one they meant.

## Date Handling

If the user says today/aujourd'hui/ce jour, use the system current date (YYYY-MM-DD) automatically before calling tools.

## Executable Example Verification Below! Complete

- Use when the user asks for recent shipments or shipment history.
- HTTP: `POST /tools/list_recent_shipments`
- Input: `{ "limit": 8 }`

### Tool: `volume_de_preparation_en_carton`

- Aliases: `volume_de preparation_en_carton`, `volume preparation carton`, `carton prep volume`
- Use when the user asks for carton preparation volume.
- Required inputs: `date` in `YYYY-MM-DD` and `site`
- HTTP: `POST /tools/volume_de_preparation_en_carton`
- Input: `{ "date": "YYYY-MM-DD", "site": "CODE_SITE" }`
- If `date` or `site` is missing, ask for it before calling the tool.

### Tool: `volume_de_preparation_en_palette`

- Aliases: `volume_de preparation_en_palette`, `palette prep volume`
- Use when the user asks for palette count.
- HTTP: `POST /tools/volume_de_preparation_en_palette`
- Input: `{}`

### Tool: `volume_de_preparation_par_magazin`

- Aliases: `volume_de preparation_par_magazin`, `magazin prep volume`
- Use when the user asks for number of magasins or delivery points.
- HTTP: `POST /tools/volume_de_preparation_par_magazin`
- Input: `{}`

### Tool: `volume_de_preparation`

- Generic fallback tool.
- If the user does not specify type, default to `carton`.
- For `carton`, `date` and `site` are required.
- HTTP: `POST /tools/volume_de_preparation`
- Input: `{ "date": "YYYY-MM-DD", "site": "CODE_SITE", "type": "carton|palette|magazin" }`

### Image Tools

- `POST /tools/volume_de_preparation_en_palette_image`
- `POST /tools/volume_de_preparation_par_magazin_image`
- `POST /tools/volume_de_preparation_en_carton_image` (requires `date` + `site`)

## Response Rules

- Reply in the user's language.
- Never invent logistics numbers.
- Prefer calling the bridge instead of describing manual calculations.
- On WhatsApp, keep formatting simple and avoid markdown tables.

## IMAGE RESPONSES — MANDATORY PROCEDURE

**When the user's message contains ANY of: "image", "photo", "graphique", "en image", "génère une image", "envoie une image":**

You MUST call the corresponding HTTP image endpoint directly. Do NOT say "je ne peux pas générer une image" — the tools work.

- For palette volume image: call `POST /tools/volume_de_preparation_en_palette_image`
- For magasin volume image: call `POST /tools/volume_de_preparation_par_magazin_image`
- For carton volume image: call `POST /tools/volume_de_preparation_en_carton_image` with `{ "date": "DATE", "site": "SITE" }`

Never claim command formatting issues before trying the API call.

## Execution Pattern (REQUIRED)

Use the `exec` tool with Node fetch. Preferred command pattern:

`node -e "fetch('http://127.0.0.1:3001/tools/TOOL_NAME',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(PAYLOAD)}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j))).catch(e=>{console.error(e);process.exit(1);})"`

Then parse JSON and answer in user language.

## Output Parsing (MANDATORY)

- For LumiCore API responses, extract and use `result.content[0].text` when present.
- Never tell the user "result is encapsulated" or "I need another process".
- Never ask for execution instructions if endpoint and payload are known.
- If site is `sfax`, map directly to `SFX` and execute immediately.

