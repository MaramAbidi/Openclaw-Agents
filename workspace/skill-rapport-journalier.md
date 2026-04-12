# Skill: Rapport Journalier LumiCore

## Trigger phrases

Trigger when the user says anything like:
- rapport du jour
- daily report
- rapport journalier
- resume du jour
- apport du jour
- what happened today

## Goal

Produce a single combined daily report that summarizes cartons, palettes, magasins, and recent shipments for today.

## Procedure - follow IN ORDER, no skipping

1. Call `GET http://localhost:3001/tools/get_current_date` to get today's real date.
2. Detect the site name in the user message. Convert it to fcy_0 code using skill-sites.md.
3. If no site is provided, ask for the site before any tool calls.
4. Call ALL four tools below using exec with Invoke-RestMethod:

   a. volume_de_preparation_en_carton - POST with today's date + site code
   b. volume_de_preparation_en_palette - POST with empty body
   c. volume_de_preparation_par_magazin - POST with empty body
   d. list_recent_shipments - POST with {"limit":10}

5. Collect the real values from each tool response. NEVER invent or reuse cached numbers.
6. Output the report using EXACTLY the format below. No deviations. No prose. No extra sentences.

## MANDATORY OUTPUT FORMAT

You MUST output the report EXACTLY like this. Do not add prose before or after it.
Replace every placeholder with real values from the tool calls.

---REPORT_START---
📊 Rapport Journalier LumiCore — [DATE]
Site: [SITE CODE]
─────────────────────────────
📦 Volume Cartons     : [totalQty] cartons
🎁 Volume Palettes    : [totalQty] palettes
🏪 Magasins actifs    : [count] magasins
🚚 Expéditions récentes: [rowCount] expéditions

Top zones:
 • [zone 1] : [count] expéditions
 • [zone 2] : [count] expéditions
 • [zone 3] : [count] expéditions

✅ Rapport généré à [HH:MM]
---REPORT_END---

Rules for filling the template:
- [DATE] = today field from get_current_date
- [SITE CODE] = fcy_0 code (e.g. BAR, TUN)
- Volume Cartons = totalQty from volume_de_preparation_en_carton response
- Volume Palettes = totalQty from volume_de_preparation_en_palette response
- Magasins actifs = count from volume_de_preparation_par_magazin response
- Expeditions recentes = stats.rowCount from list_recent_shipments response
- Top zones = top 3 from stats.byZone array (zone + count)
- Time = current local time in HH:MM format
- If a tool returns 0, write 0. Never write N/A or omit the line.
- If a tool call fails, write ERREUR for that line and describe the error below the block.
- NEVER replace the report block with prose or a summary. Always output the full block.

## Notes

- Reply in the user language (French or English) for any conversational text.
- The template labels always stay in French with the emojis.
- Never ask the user to type the date in YYYY-MM-DD.
- Never summarize with prose instead of the template.