# Building Intelligence

**Automatic concrete crack detection from inspection photos, with structured defect-sheet generation.**

A take-home for SECO. From a single inspection photo the system classifies the
concrete surface as *crack / no-crack* with a confidence score, then generates a
structured, Eurocode-grounded **defect sheet** (type, severity, location,
recommendation, normative reference). A portfolio dashboard rolls inspections up
across a set of supervised structures.

- **Frontend:** React + Vite + TypeScript + Tailwind
- **Backend:** Python / FastAPI
- **Storage:** SQLite
- **Classifier:** classical-CV baseline out of the box; MobileNetV3-Small (transfer
  learning on SDNET2018) when trained
- **LLM:** Anthropic `claude-sonnet-4-6` for the defect sheet, with a deterministic
  fallback when no key is set

---

## 1. The problem and who it's for

Visual inspection of concrete structures is slow, subjective, and hard to compare
over time. Two users feel this most:

- **The field inspector** — photographs hundreds of surfaces per visit and must
  decide, on the spot, what is a crack, how serious it is, and what to write in the
  defect sheet. Building Intelligence does the first triage (crack / no-crack +
  confidence) and drafts the sheet so the inspector edits rather than writes from
  scratch.
- **The asset manager** — supervises a portfolio of bridges, decks and walls and
  needs to know *which structure to worry about first*. The dashboard ranks
  structures by a composite risk score and shows the severity mix and defect-detection
  rate at a glance.

## 2. Why it's relevant to SECO

SECO is an independent technical-control and engineering group (Luxembourg / Belgium):
building and infrastructure inspection, technical risk prevention, drones /
thermography / photogrammetry. Crack detection sits exactly on that path:

- It **augments the inspector** instead of replacing judgement — every AI output is
  labelled with its confidence and the basis for its severity call, and the defect
  sheet is editable.
- It is **traceable and normative** — severity and recommendations are tied to
  **Eurocode 2 (EN 1992-1-1)** and related EN standards (EN 1504 repair, EN 206
  durability, EN 13670 execution), the language SECO already reports in.
- It **scales the photogrammetry/drone pipeline** SECO is investing in: thousands of
  images become a ranked, structured backlog instead of a folder of JPEGs.

## 3. The two screens

1. **Upload & analysis** (`/`) — drop a concrete photo. The image is framed as an
   instrument readout (scan sweep, corner brackets); the classifier returns a
   crack / no-crack verdict with a confidence gauge and regions of interest; then a
   structured defect sheet is generated and is exportable as JSON or printable.
2. **Portfolio dashboard** (`/portfolio`) — KPIs (structures monitored, images
   analyzed, defect-detection rate, cracks detected), a severity-mix donut, a
   crack-type distribution, structures ranked by risk, a Luxembourg map of the assets
   coloured by risk band, and a sortable asset register with severity chips and
   supervisory status.

## 4. Architecture

```
React (Vite, TS, Tailwind)            Python (FastAPI)                 Storage
─────────────────────────             ─────────────────                ───────
Analysis screen ── POST /api/predict ──► classifier ──┐                 SQLite
                                          (baseline /  │  inspections ──► app.db
                                           MobileNet)  │
                ── POST /api/defect-sheet ─► LLM defect ┘  features cached
                                            sheet (Claude / fallback)
Portfolio screen ─ GET /api/portfolio ──► aggregate ◄──── structures (seed)
header chip ────── GET /api/meta ───────► active classifier + LLM provider
```

**Data flow.** `/predict` runs the classifier, derives regions + crack features
(orientation, width proxy, location), logs the inspection to SQLite and returns the
verdict. `/defect-sheet` reads those features back and prompts the LLM to produce the
sheet (structured tool call), falling back to a deterministic generator with no key.
`/portfolio` aggregates the seeded structures store.

**Mock-first.** The frontend ships with a built-in mock (`VITE_USE_MOCK` defaults on)
so both screens run with **no backend at all** — the fastest way to see it. Point it
at the real API by setting `VITE_USE_MOCK=false`.

## 5. Quickstart

### A. Frontend only (mock — fastest, no Python)
```bash
cd web
npm install
npm run dev        # http://localhost:5173 — both screens on mock data
```

### B. Full stack (real backend + real LLM)
```bash
# 1) backend
python -m venv .venv
.venv\Scripts\activate            # Windows  (source .venv/bin/activate on macOS/Linux)
pip install -r api/requirements.txt
copy api\.env.example api\.env    # then put your ANTHROPIC_API_KEY in api/.env
uvicorn api.main:app --reload --port 8000

# 2) frontend against the backend
cd web
npm install
# web/.env:  VITE_USE_MOCK=false
npm run dev
```
Without `ANTHROPIC_API_KEY` the API still runs — the defect sheet uses the
deterministic fallback and the header chip shows `mock`.

### C. Build the dataset (SDNET2018)
```bash
python ml/download_and_prepare.py --zip path/to/SDNET2018.zip
# -> ml/data/processed/{train,val}/{crack,uncracked}/  + manifest.csv + summary.json
```

### D. Train the classifier
```bash
pip install -r ml/requirements-train.txt
python ml/train.py --epochs 3 --batch-size 64 --limit 4000
# -> models/crack_mobilenet.pt  (the API loads it automatically on next start)
```

## 6. Data sources, and why

**SDNET2018** — 56,000+ labelled 256×256 images of cracked / non-cracked concrete
(bridge decks, walls, pavements). Utah State University, DOI `10.15142/T3TD19`; Kaggle
mirrors exist.

- **100% public and reproducible** — no confidential SECO data; anyone can rebuild the
  exact dataset from the script.
- **On-domain** — real concrete surfaces across three structure types, which matches
  SECO's inspection targets better than generic "surface crack" datasets.

`ml/download_and_prepare.py` makes the pipeline visible and idempotent: **collect**
(local zip / Kaggle / URL), **clean** (drop corrupt and zero-byte files, de-duplicate
by SHA-1), **structure** (map the `C*`/`U*` folders to crack/uncracked, preserve
deck/pavement/wall origin, deterministic stratified train/val split), and **store**
(organised folders + `manifest.csv` + `summary.json`).

## 7. The AI component

**Classifier — two backends, one interface.**
- *Baseline (default, zero-setup):* a classical-CV detector — denoise → black-hat
  morphology to surface dark thin features → crack-pixel **coverage** gated by spatial
  **linearity** (cracks are elongated; speckle is scattered). It runs in tens of
  milliseconds with no dataset and no training, and it returns honest regions of
  interest and crack features.
- *Trained (drop-in upgrade):* `ml/train.py` transfer-learns **MobileNetV3-Small** on
  SDNET2018 and saves `models/crack_mobilenet.pt`. The API loads it automatically and
  swaps it in for the probability; everything else is unchanged. Class order is fixed
  to `[uncracked, crack]` to match the API.

**Defect sheet — LLM with a real fallback.** The classifier's geometric signals
(orientation, width proxy, coverage, location) are handed to `claude-sonnet-4-6` via a
**forced structured tool call**, which returns a Eurocode/EN-grounded sheet: crack
type, severity, structural element, location, estimated width, normative reference,
severity rationale and recommendation. With no API key, a deterministic feature-driven
generator produces a plausible sheet so the product is never broken.

> **Honesty note.** The baseline is a heuristic, not a calibrated detector — it is the
> "runs immediately" option the brief asks for, and the trained MobileNet is the real
> classifier. The estimated crack width is **indicative** (no image scale is known);
> it is flagged as such and is meant to be confirmed on site.

## 8. Design system

The UI is **not** a from-scratch theme. It reuses the design system of an existing
in-house app (`seco/buildinglens`): the CSS-variable dark/light palette, the
Oswald / Inter / JetBrains Mono type, the dot-grid "engineering-instrument" backdrop,
and the full `ui/` primitive kit (Panel, Card, Badge, Button, Tabs, DossierNumber,
ScanFrame, DecodeText, …). Severity colours and the Recharts theme come from the same
shared helpers, so the new screens are on-brand from the first render.

## 9. Technical decisions and trade-offs

- **Mock-first frontend.** The whole UI runs without a backend, so the demo is
  instant and the two layers evolve independently. Trade-off: the mock and the seed
  data are duplicated (TS and Python) — acceptable for a take-home, would be one shared
  fixture in production.
- **Classical-CV baseline before the CNN.** A working classifier from minute one with
  no GPU, no 5 GB download. Trade-off: lower accuracy than the trained model — hence
  the transparent upgrade path.
- **SQLite + stdlib `sqlite3`.** Zero-config, reproducible, file-based. Trade-off: not
  for concurrent production write load — swap for Postgres later.
- **LLM for the sheet, not for detection.** The LLM does what it is good at (turning
  signals into normative prose), the vision model does the perception. Trade-off:
  width/severity depend on coarse features today; per-pixel segmentation would sharpen
  them.
- **Inline SVG, no icon/UI mega-deps.** Small bundle, full control; Recharts and
  Leaflet are code-split so they load only on the dashboard.

## 10. To production tomorrow vs. throw away

**Keep / promote**
- The two-screen UX, the design system, and the API contract.
- The data pipeline (`download_and_prepare.py`) and the MobileNet trainer.
- The LLM defect-sheet structured-tool approach and the degraded-mode fallback.
- The inspections log and the portfolio aggregation model.

**Throw away / replace**
- The classical-CV baseline (demo bridge only) → the trained model, then a
  segmentation model for localisation and a real width measurement.
- The duplicated TS/Python seed/mock → one shared fixture + real ingested inspections.
- SQLite → Postgres; in-memory feature cache → persisted artefacts / object storage.
- Hardcoded structure seed → a real asset register with auth and per-structure history.

## 11. Three-month vision

- **Month 1 — real model in the loop.** Train and evaluate MobileNet/ResNet on
  SDNET2018, add calibration and a confidence threshold that routes low-confidence
  images to human review; track precision/recall per structure type.
- **Month 2 — localisation & measurement.** Crack **segmentation** (U-Net) for masks,
  width estimation from a known scale (reference marker or photogrammetry), and
  severity from measured width against the Eurocode limit for the exposure class.
- **Month 3 — portfolio intelligence.** Time-series of crack growth per structure,
  drone/photogrammetry batch ingestion, PDF defect-report export aligned to SECO
  templates, and role-based access for inspectors vs. asset managers.

## 12. Repository layout

```
web/                     React + Vite + Tailwind frontend (design system reused)
  src/components/ui/      reused primitive kit
  src/components/analysis dropzone, scan frame, confidence gauge, defect sheet
  src/components/portfolio KPIs, charts, asset table, map
  src/data/mock.ts        deterministic demo data (mock mode)
api/                     FastAPI backend
  ml/                     classifier (baseline + MobileNet loader), preprocessing
  llm/                    Anthropic defect-sheet generation + fallback
  db/                     SQLite schema, seed, portfolio aggregation
  routes/                 /meta /predict /defect-sheet /portfolio
ml/                      download_and_prepare.py (SDNET2018) + train.py
```

## 13. Notes

- `api/.env` (the Anthropic key) is git-ignored; only `api/.env.example` is committed.
  **Rotate any key that has been shared in plain text.**
- Built for the SECO "Building Intelligence" challenge. Dataset: SDNET2018
  (DOI 10.15142/T3TD19). Repo: `github.com/Bodirck/Building-Intelligence`.
