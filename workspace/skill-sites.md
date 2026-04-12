# Skill: Site Name Normalization

## Purpose

Understand site name shortcuts so users never need to type exact database codes. Always call tools with the correct `fcy_0` value.

## Source of truth (live database)

This list is built from:
SELECT DISTINCT fcy_0 FROM shipments WHERE fcy_0 IS NOT NULL AND TRIM(fcy_0) != '';

Available site codes:
- BAR
- BKS
- CAP
- GAB
- JER
- SAL
- SFX
- TUN

## Mapping rules

1. Normalize input: trim, collapse spaces, uppercase, remove accents.
2. If the user provides a code that matches one of the available codes, use it directly.
3. If the user provides a close match or typo to a known code, map it to the closest code:
   - Example: "Sfaz" -> SFX
4. If the user uses a well-known site name, map it to the closest code only when confident:
   - Sfax -> SFX
   - Tunis -> TUN
   - Jerba -> JER
   - Gabes -> GAB
    - Bouargoub -> BAR
    - Bareket Essah(e)l / Baraket El Sahel -> BKS
    - Cap Bon / Nabeul -> CAP
    - Sahlin -> SAL
5. Case insensitive matching always.

## Tool call rule

Never call tools with the informal name. Always replace it with the `fcy_0` code first.

## Unknown site handling

If the site name does not match any known code or confident mapping:
- Say the site is not recognized.
- List the available site codes.
- Ask the user to confirm which one they meant.

## Site list requests

If the user asks "quels sont les sites disponibles ?" or "list all sites", reply with the full list in a clean format.
