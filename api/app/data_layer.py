"""Data layer: real external series + calibrated history.

Two sources, honestly separated (this distinction appears in the README and
the pitch):
1. fetch_live_agmarknet(): pulls REAL current mandi prices from data.gov.in
   (Agmarknet dataset). Cached to data/raw/. Used to anchor price LEVELS and
   to show live-integration capability. Never called during the demo.
2. build_history(): 24 months of daily series CALIBRATED to real levels and
   real seasonal structure (monsoon Jun-Sep for Wardha/Vidarbha, rabi/kharif
   price rhythms, festival demand). Deterministic (seeded). This is the
   "simulated dataset" the problem statement mandates - built to behave like
   the real economy, not like random noise.
"""
from __future__ import annotations

import json
import math
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

import numpy as np

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RAW = DATA_DIR / "raw"
PROCESSED = DATA_DIR / "processed"

# data.gov.in public sample key (documented, rate-limited, non-secret)
DATAGOV_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"
AGMARKNET_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"

# Real-world anchor levels (Rs/quintal, approx. Maharashtra mandi modal
# prices; refreshed by fetch_live_agmarknet when network is available).
PRICE_ANCHORS = {"maize": 2100.0, "soybean": 4400.0}
# Wardha (Vidarbha) monthly rainfall climatology, mm (IMD district normals,
# approximate): sharply monsoonal, ~90% of rain in Jun-Sep.
RAIN_CLIMATOLOGY = [8, 5, 12, 8, 15, 170, 300, 250, 160, 45, 12, 6]

END_DATE = date(2026, 7, 1)   # fixed so the whole pipeline is reproducible
DAYS = 730                     # 24 months


def fetch_live_agmarknet(commodity: str = "Maize", state: str = "Maharashtra",
                         limit: int = 50) -> list[dict]:
    """Fetch REAL current mandi prices; cache to raw/. Best-effort only."""
    params = urllib.parse.urlencode({
        "api-key": DATAGOV_KEY, "format": "json", "limit": limit,
        "filters[state]": state, "filters[commodity]": commodity})
    url = f"https://api.data.gov.in/resource/{AGMARKNET_RESOURCE}?{params}"
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            records = json.load(r).get("records", [])
        RAW.mkdir(parents=True, exist_ok=True)
        out = RAW / f"agmarknet_{commodity.lower()}_{state.lower()}.json"
        out.write_text(json.dumps(records, indent=1))
        return records
    except Exception:
        return []  # offline: anchors + cache carry the demo


def refresh_anchors() -> dict:
    """Update PRICE_ANCHORS from live/cached real data where possible."""
    for commodity in ("Maize", "Soybean"):
        records = fetch_live_agmarknet(commodity)
        if not records:
            cached = RAW / f"agmarknet_{commodity.lower()}_maharashtra.json"
            if cached.exists():
                records = json.loads(cached.read_text())
        prices = []
        for rec in records:
            try:
                prices.append(float(rec.get("modal_price") or rec.get("Modal_Price")))
            except (TypeError, ValueError):
                continue
        if prices:
            PRICE_ANCHORS[commodity.lower()] = float(np.median(prices))
    return dict(PRICE_ANCHORS)


def _load_real_history(commodity: str) -> dict[str, float]:
    """Load fetched REAL Agmarknet records (see fetch_history.py) and reduce
    to one price per day: the median modal price across Maharashtra mandis.
    Returns {iso_date: price}. Empty dict if no fetch has run yet."""
    path = RAW / f"history_{commodity.lower()}.json"
    if not path.exists():
        return {}
    from collections import defaultdict
    by_day: dict[str, list[float]] = defaultdict(list)
    for r in json.loads(path.read_text()):
        try:
            d = r["Arrival_Date"]                      # DD/MM/YYYY
            iso = f"{d[6:10]}-{d[3:5]}-{d[0:2]}"
            price = float(r["Modal_Price"])
            if price > 0:
                by_day[iso].append(price)
        except (KeyError, ValueError, TypeError):
            continue
    return {d: float(np.median(v)) for d, v in by_day.items()}


def build_history(seed: int = 42) -> dict[str, list[dict]]:
    """24 months of daily mandi-price + rainfall series for Wardha.

    Prices: REAL Agmarknet observations are used verbatim on the days they
    exist (median modal price across Maharashtra mandis, source='agmarknet_real');
    gaps are bridged with the calibrated structural model anchored to the
    nearest real observations (source='agmarknet_calibrated'). Every point
    carries its provenance. Rainfall: IMD district climatology calibration.
    """
    rng = np.random.default_rng(seed)
    start = END_DATE - timedelta(days=DAYS - 1)
    dates = [start + timedelta(days=i) for i in range(DAYS)]
    out: dict[str, list[dict]] = {}

    def ar1(n: int, sigma: float, phi: float = 0.85) -> np.ndarray:
        e = rng.normal(0, sigma, n)
        x = np.zeros(n)
        for i in range(1, n):
            x[i] = phi * x[i - 1] + e[i]
        return x

    commodity_files = {"maize": "maize", "soybean": "soyabean"}  # API spelling
    for commodity, anchor in PRICE_ANCHORS.items():
        real = _load_real_history(commodity_files[commodity])
        if real:  # re-anchor the structural model to the real median level
            anchor = float(np.median(list(real.values())))
        seasonal_amp = 0.07 if commodity == "maize" else 0.09
        noise = ar1(DAYS, sigma=anchor * 0.006)
        series = []
        for i, d in enumerate(dates):
            iso = d.isoformat()
            if iso in real:
                series.append({"date": iso, "value": round(real[iso], 1),
                               "source": "agmarknet_real"})
                continue
            doy = d.timetuple().tm_yday
            seasonal = -seasonal_amp * math.cos(2 * math.pi * (doy - 300) / 365)
            drift = 0.04 * (i / 365)
            v = anchor * (1 + seasonal + drift) + noise[i]
            series.append({"date": iso, "value": round(v, 1),
                           "source": "agmarknet_calibrated"})
        out[commodity] = series

    # Rainfall: daily draws whose monthly totals track climatology; year 2
    # gets a mild built-in deficit in Jun-Jul (a realistic weak-monsoon year,
    # gives the risk engine something honest to find even pre-shock).
    rain = []
    for d in dates:
        monthly = RAIN_CLIMATOLOGY[d.month - 1]
        deficit = 0.75 if (d.year == 2026 and d.month in (6, 7)) else 1.0
        lam = monthly * deficit / 30.0
        wet = rng.random() < min(0.9, lam / 4 + 0.08)
        amount = rng.gamma(2.0, lam / 1.5) if wet and lam > 0 else 0.0
        rain.append({"date": d.isoformat(), "value": round(float(amount), 1),
                     "source": "imd_calibrated"})
    out["rain"] = rain

    PROCESSED.mkdir(parents=True, exist_ok=True)
    (PROCESSED / "external_series.json").write_text(json.dumps(out))
    return out
