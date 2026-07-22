SmartRoad AI Validation Dataset
================================

Struktur ini disiapkan untuk pendekatan hybrid:

- `public/`: dataset publik yang dipakai sebagai baseline training/evaluasi.
- `internal/`: hasil export dari validasi admin SmartRoad.

Label yang digunakan:

- `pothole`
- `crack`
- `flood`
- `rough_road`
- `normal_road`
- `not_road_damage`

Export dataset internal dapat dijalankan oleh admin melalui:

`POST /api/reports/ai/dataset/export`

Backfill validasi AI untuk laporan lama:

`POST /api/reports/ai/validation/backfill`
