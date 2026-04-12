# LumiCore Tools Reference

## list_recent_shipments
URL: POST http://localhost:3001/tools/list_recent_shipments
Body: { "limit": 8 } — optional, max 50
Returns: rows array + stats (rowCount, totalQty, byZone)
Use when: user asks for recent shipments, history, last orders

## volume_de_preparation_en_carton
URL: POST http://localhost:3001/tools/volume_de_preparation_en_carton
Body: { "date": "YYYY-MM-DD", "site": "fcy_0 value" }
Returns: { totalQty, usedDate, usedSite }
Use when: user asks for carton volume for a specific date and site
Both date and site are REQUIRED — ask user if missing

## volume_de_preparation_en_palette
URL: POST http://localhost:3001/tools/volume_de_preparation_en_palette
Body: {}
Returns: { totalQty } — COUNT DISTINCT shpnum_0
Use when: user asks for palette count or number of shipment references

## volume_de_preparation_par_magazin
URL: POST http://localhost:3001/tools/volume_de_preparation_par_magazin
Body: {}
Returns: { totalQty } — COUNT DISTINCT dlvnam_1
Use when: user asks for number of active stores or delivery points

## volume_de_preparation (generic)
URL: POST http://localhost:3001/tools/volume_de_preparation
Body: { "type": "carton|palette|magazin", "date": "...", "site": "..." }
Use when: type is ambiguous — defaults to carton if not specified
