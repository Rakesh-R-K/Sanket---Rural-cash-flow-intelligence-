# संकेत SANKET — Early-Warning & Cash-Flow Intelligence for Rural Micro Enterprises

**NABARD Hackathon @ GFF 2026** · *"Sanket sees trouble early. Saakh proves reliability."*

Rural India does not have a repayment problem — SHG lending runs at ~1.9% NPA,
better than most corporate books. It has a **visibility problem**: 46% of
savings-linked SHGs and over 80% of the 10,000 new FPOs cannot access formal
credit because no institution can *see* their cash flows. Sanket makes them
visible — to themselves before trouble hits, to field officers before default,
and to banks before the loan application.

## What it does

- **Predicts cash flows** over a 3–6-month horizon with per-sector models
  (dairy · poultry · food processing · handicrafts · rural retail — each with
  its real economic signature: 10-day milk payment cycles, 42-day broiler
  batches, festival demand, procurement seasons)
- **Detects shocks** in real public data (Agmarknet mandi prices, IMD-calibrated
  district rainfall) and **cascades** them: district signal → exposed sector →
  individual enterprise flag
- **Explains every flag** — a flag *cannot exist* without human-readable,
  bilingual (hi/en) reasons; enforced at the schema layer
- **Advises the enterprise** with sector-specific corrective suggestions, in
  Hindi, offline
- **Triages for the field officer** — 50 enterprises ranked by risk with
  reasons, district cascade map, intervention logging
- **Compiles SAAKH (साख)** — a bank-legible cash-flow evidence dossier the
  enterprise generates *at its own request*: the bridge from grants to credit

## Quickstart (3 commands)

```bash
cd api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ..
cd app && npm install && cd ..
./dev.sh          # seeds 50 enterprises + 24 months of data, starts API :8000 + PWA :5173
```

Or: `docker compose up`. API self-documents at `http://localhost:8000/docs`.

## The 7-minute demo path

1. **Officer console** — ranked triage list, district map, quiet portfolio
2. **▶ Feed-price spike** (scenario simulator) — maize signal z≈4.6 detected,
   cascade flags ~29/50 enterprises: all poultry (65% feed exposure), most
   dairy (35% fodder exposure), food processing untouched (its driver is
   soybean). The cascade discriminates by sector economics.
3. Open a flagged poultry SHG — forecast reshaped, three plain-language reasons
4. **Switch to Lakshmi's app** (phone, airplane mode) — entry saved locally,
   alert + Hindi suggestion visible, syncs when network returns
5. **SAAKH report** — print it. Hand it over. That page is the product.

## What's real vs what's simulated (honest table)

| Layer | Status |
|---|---|
| Agmarknet mandi price levels | **Real** — live `data.gov.in` API (verified), cached for offline demo |
| Rainfall seasonality | **Real climatology** (Wardha/Vidarbha monsoon pattern), calibrated series |
| Enterprise financials | **Simulated** (per the problem statement's constraint) — but *driven by* the real series above, with sector-true cash-flow signatures |
| Signals, forecasts, flags, reasons | **Real pipeline** — the same code would run on real data unchanged |
| UPI transaction proxies | Represented as aggregated district/sector indices only — no personal data, by design |

## Architecture

```
React PWA (Vite+TS+Tailwind, offline-first: service worker + Dexie outbox)
  ├─ Enterprise app (Lakshmi) — hi/en, 3-tap entry, alerts, SAAKH
  └─ Officer console (Arjun) — triage, profile, district cascade map
        │  /api (proxy)
FastAPI ── engine.py: signals → per-sector forecasts → cascade → flags+reasons
  ├─ simulator.py: 50 enterprises, 5 sectors, 24 months, deterministic seed
  ├─ shocks.py: injectable scenarios (feed spike / monsoon deficit)
  └─ SQLite — 11 tables; flag_reasons NOT NULL by contract
```

No deep learning, no LLMs at runtime — deliberately. A field officer must be
able to defend every flag to the enterprise it concerns. Interpretable
seasonal-blend forecasting + transparent statistical detectors is a feature,
not a fallback.

## Validation without accuracy theater

We make no accuracy-% claims on simulated data. Instead: shocks are injected
through the *same causal path* the risk engine reads (external series →
enterprise flows), and we measure **early-warning lead time** — flags fire
weeks before the simulated distress event materializes in cash balances.
`api/tests/` (8 tests) pins the contract: determinism, explainability,
ranking, cascade selectivity, offline sync, reset.

## Alignment with the problem statement

| PDF requirement | Where |
|---|---|
| 3–6-month AI/ML cash-flow prediction | `engine.forecast_enterprise`, profile chart |
| Multi-source data (financial + proxies + market/climate) | `external_series` + simulator |
| Early-warning system | signals → cascade → flags |
| Simple actionable insights, both personas | suggestion library (hi/en), alerts UI |
| Enterprise: entry, income/expense, alerts, suggestions | Lakshmi app |
| Officer: list, profiles, forecast view, risk panel | console |
| Sector-specific risk (5 named sectors) | `EXPOSURE` map + sector signatures |
| Climate & market risk integration | Agmarknet/IMD signals |
| Dashboard + risk visualisation | KPI strip, district map, badges |
| Offline / low-network | PWA + Dexie outbox (airplane-mode demo) |
| No sensitive personal data | aggregated indices only |
| Multilingual (optional) | full hi/en toggle |

*Prototype built for NABARD Hackathon @ GFF 2026. Wardha district, Maharashtra
is the demo geography; the platform is district-agnostic by design.*
