"""Paginated fetcher for REAL Agmarknet historical mandi prices.

data.gov.in resource 35985678 (variety-wise daily market prices). The public
sample key caps responses at 10 records/request and throttles aggressively,
so this fetcher paginates with exponential backoff and saves progress
incrementally - safe to interrupt and re-run (resumes from where it left).

Usage:  python -m app.fetch_history            # Maize + Soyabean, Maharashtra
Output: data/raw/history_<commodity>.json      # list of raw records

With a personal (free) data.gov.in API key in env DATAGOV_KEY, the per-request
cap rises and this completes in seconds instead of minutes.
"""
from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request

from .data_layer import RAW

KEY = os.environ.get(
    "DATAGOV_KEY", "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b")
RESOURCE = "35985678-0d79-46b4-9ed6-6f13308a1d24"
BASE = f"https://api.data.gov.in/resource/{RESOURCE}"


def _get(params: dict, tries: int = 5) -> dict:
    url = BASE + "?" + urllib.parse.urlencode(params)
    delay = 2.0
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(delay)
            delay = min(delay * 2, 30)
    return {}


def fetch_commodity(commodity: str, state: str = "Maharashtra",
                    page: int = 100, max_records: int = 4000) -> int:
    out_path = RAW / f"history_{commodity.lower()}.json"
    records: list[dict] = []
    seen: set[tuple] = set()
    if out_path.exists():                       # resume
        records = json.loads(out_path.read_text())
        seen = {(r["Arrival_Date"], r["Market"], r.get("Variety")) for r in records}

    offset = len(records)
    stall = 0
    while len(records) < max_records and stall < 3:
        d = _get({"api-key": KEY, "format": "json", "limit": page,
                  "offset": offset, "filters[commodity]": commodity,
                  "filters[state]": state})
        recs = d.get("records", [])
        if not recs:
            stall += 1
            time.sleep(3)
            continue
        new = [r for r in recs
               if (r["Arrival_Date"], r["Market"], r.get("Variety")) not in seen]
        for r in new:
            seen.add((r["Arrival_Date"], r["Market"], r.get("Variety")))
        records.extend(new)
        offset += len(recs)
        stall = 0 if new else stall + 1
        RAW.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(records))
        print(f"{commodity}: {len(records)} records (total avail {d.get('total')})",
              flush=True)
        time.sleep(1.2)                          # be polite to the throttler
    return len(records)


if __name__ == "__main__":
    for c in ("Maize", "Soyabean"):
        n = fetch_commodity(c)
        print(f"DONE {c}: {n} real records saved")
