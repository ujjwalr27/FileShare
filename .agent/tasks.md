# Documentation Consolidation Plan

I will consolidate the numerous documentation files into a clean, organized structure in the `docs/` directory, and remove the clutter from the root directory.

## File Mapping Plan

1.  **Deployment Guide** (`docs/DEPLOYMENT.md`)
    *   *Sources:* `FINAL_DEPLOYMENT_STEPS.md`, `QUICK_DEPLOY.md`, `RENDER_ENV_SETUP.md`, `VERCEL_DEPLOYMENT_FIX.md`, `ML_SERVICE_DEPLOYMENT_FIX.md`, `ML_SERVICE_RENDER_FIX.md`, `QUICK_IPv6_FIX.md`
    *   *Content:* Render and Vercel setup, environment variables, troubleshooting deployment.

2.  **Setup & Configuration** (`docs/SETUP.md`)
    *   *Sources:* `GETTING_STARTED.md`, `SUPABASE_SETUP.md`, `SUPABASE_STORAGE_SETUP.md`, `ml_service/SETUP.md`, `ml_service/GEMINI_SETUP.md`
    *   *Content:* Local development setup, Supabase configuration, ML service requirements.

3.  **Architecture & Features** (`docs/ARCHITECTURE.md`)
    *   *Sources:* `REPOSITORY_ANALYSIS.md`
    *   *Content:* System overview, database schema, API endpoints, ML features.

4.  **Changelog & Fixes** (`docs/CHANGELOG.md`)
    *   *Sources:* `FIXES_APPLIED.md`, `IMPORT_FIXES_SUMMARY.md`, `DEPLOYMENT_FIXES_SUMMARY.md`
    *   *Content:* Historical record of applied fixes and issues resolved.

5.  **Main Readme** (`README.md`)
    *   *Content:* High-level overview, links to the above docs.

## Steps
1.  Read source files to extract content.
2.  Create the new consolidated files in `docs/`.
3.  Update `README.md`.
4.  Delete the old files.
