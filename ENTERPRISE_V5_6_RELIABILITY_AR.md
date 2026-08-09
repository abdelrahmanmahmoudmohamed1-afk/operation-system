Operation System Enterprise 5.6 — Reliability & Cinematic UX

- Frontend/Backend API manifest handshake.
- Backend build 5.6 exposes its supported actions so createSystemUser/uploadUnitFloorPlan mismatches are detected before execution.
- uploadUnitFloorPlan is present in Code.gs + Documents.gs in the included backend.
- Faster Inventory API path reads inventory sheets only, avoiding transaction sheets for the inventory screen.
- 10-minute inventory core cache with explicit invalidation.
- Full-screen tired-worker boot story, theme-aware.
- Module-to-module door transition with source/target module labels.
- Creative operation loaders for Payment Plan, PDF/Drawing upload, User creation, Reports and Save operations.
- Unknown actions are converted to a readable backend-version mismatch error instead of raw Unknown action.

IMPORTANT: Frontend and Operation_System_Backend must be deployed as the same release.
