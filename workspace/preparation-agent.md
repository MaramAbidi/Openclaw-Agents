# Preparation Agent

## Purpose
A dedicated agent to handle preparation tasks such as carton preparation volumes, pallet preparation, and magazin preparation, utilizing existing tools and generating reports as needed.

## Functionalities
- Retrieve preparation volumes for cartons, palettes, and magazins.
- Generate visual representations (images) for preparation summaries if requested.
- Structured to handle site-specific and date-specific data.

## Tools Integrated
### Volume Tools
- `volume_de_preparation_en_carton`: Handles carton preparation volumes, requires date and site code.
- `volume_de_preparation_en_palette`: Retrieves the preparation palette count.
- `volume_de_preparation_par_magazin`: Provides the number of magasins or delivery points.
- `volume_de_preparation`: Generic fallback tool to choose between carton, palette, or magazin.

### Image Tools
- Carton preparation
- Palette preparation
- Magazin preparation

## Structure
1. **Input Handling**:
   - Validate user inputs (date, site, type).
   - Default to carton if no type is specified.

2. **Tool Invocation**:
   - Map user requirements to the correct tool.
   - Use the LumiCore Bridge for API calls.

3. **Output Delivery**:
   - Return volumes directly.
   - Generate images upon request.

4. **Error Handling**:
   - Graceful fallback for tool failures.
   - Notify the user of missing/incorrect inputs or system errors.

## Pending Tasks
- [ ] Define API request examples for `exec` calls.
- [ ] Implement control flow for user requests.
- [ ] Test and debug individual tool integrations.