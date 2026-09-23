# NEVO reference data

Bundled `nevo2025-v9.0.json` is derived from **NEVO-online version 2025/9.0, RIVM, Bilthoven** (unchanged nutrient values).

To refresh from a local RIVM download:

```bash
NEVO_CSV_PATH="C:/path/to/NEVO2025_v9.0.csv" npm run db:import-nevo -w @savorly/api
```

Raw RIVM files must not be committed; see RIVM conditions of use.
