"""M1 - Enterprise simulator. The credibility engine.

Generates 24 months of financial history for ~50 enterprises across the five
sectors named in the problem statement. Each sector has a distinct cash-flow
SIGNATURE, and income/expense are DRIVEN by the external series (mandi
prices, rainfall) so that shocks propagate the way they do in the real rural
economy:

  dairy           daily milk income (10-day collection-centre payment cycle),
                  fodder cost tracks maize price, monsoon flush raises yield,
                  summer heat stress lowers it
  poultry         42-day broiler batches -> lumpy income; feed ~65% of cost,
                  indexed to maize/soymeal; batch mortality risk
  food_processing procurement season (post-harvest) working-capital sink,
                  steady processed-goods sales; raw-material cost = soybean
  handicrafts     festival-driven demand (Diwali/wedding season spikes),
                  long receivable lags, flat input costs
  rural_retail    daily kirana flows tracking village purchasing power =
                  f(harvest cash-in, monsoon health); UPI-proxy-like base

Deterministic under a fixed seed. Shocks are injected by appending to the
external series and re-deriving affected flows (see shocks.py), never by
hand-editing outcomes - the same causal path the risk engine reads.
"""
from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Callable

import numpy as np

from .data_layer import END_DATE, DAYS

FIRST_NAMES = ["Lakshmi", "Savita", "Anita", "Rekha", "Sunita", "Meera",
               "Kavita", "Pushpa", "Sangita", "Vandana", "Ramesh", "Suresh",
               "Prakash", "Vithal", "Ganesh", "Manisha", "Shobha", "Asha"]
GROUP_WORDS = {
    "dairy": ["Dugdh", "Gokul", "Kamdhenu", "Godavari"],
    "poultry": ["Kukkut", "Suvarna", "Pankh", "Udaan"],
    "food_processing": ["Anna", "Swaad", "Poshan", "Ruchi"],
    "handicrafts": ["Kala", "Hastkala", "Shilp", "Rang"],
    "rural_retail": ["Gram", "Vyapar", "Bazar", "Seva"],
}
# Vidarbha districts, each with real tehsil/block names and villages
DISTRICTS: dict[str, dict[str, list[str]]] = {
    "Wardha": {
        "Deoli": ["Pulgaon", "Nachangaon", "Sonegaon", "Bhidi"],
        "Arvi": ["Kharangana", "Rohna", "Wadhona", "Pachod"],
        "Hinganghat": ["Wadner", "Alipur", "Pohna", "Sawali"],
        "Seloo": ["Zadshi", "Rehki", "Surgaon", "Junona"],
    },
    "Nagpur": {
        "Katol": ["Kondhali", "Yenva", "Murti", "Sawargaon"],
        "Umred": ["Bela", "Makardhokda", "Hewti", "Pachgaon"],
        "Ramtek": ["Nagardhan", "Mansar", "Deolapar", "Musewadi"],
        "Kalmeshwar": ["Mohpa", "Dhapewada", "Gondkhairi", "Ubali"],
    },
    "Amravati": {
        "Achalpur": ["Paratwada", "Rasegaon", "Belora", "Pathrot"],
        "Morshi": ["Riddhapur", "Hiwarkhed", "Nerpingalai", "Ambada"],
        "Daryapur": ["Yeoda", "Thilori", "Banosa", "Mahuli"],
        "Chandur": ["Talegaon", "Shirajgaon", "Amla", "Ghuikhed"],
    },
    "Yavatmal": {
        "Pusad": ["Shembalpimpri", "Bansi", "Belora", "Marwadi"],
        "Wani": ["Shindola", "Rajur", "Punvat", "Kayar"],
        "Darwha": ["Mahagaon", "Ladkhed", "Bori", "Chikhli"],
        "Kelapur": ["Pandharkawada", "Patanbori", "Rampur", "Sakhi"],
    },
}
SECTOR_MIX = [("dairy", 12), ("poultry", 8), ("food_processing", 7),
              ("handicrafts", 7), ("rural_retail", 8)]  # = 42 per district


def _series_map(series: list[dict]) -> dict[str, float]:
    return {p["date"]: p["value"] for p in series}


def _norm(price_map: dict[str, float]) -> Callable[[str], float]:
    base = np.median(list(price_map.values()))
    return lambda d: price_map.get(d, base) / base   # 1.0 = typical level


def generate(external: dict[str, list[dict]], seed: int = 42) -> dict:
    """Returns {"enterprises": [...], "transactions": [...], "loans": [...]}"""
    rng = np.random.default_rng(seed)
    maize = _norm(_series_map(external["maize"]))
    soy = _norm(_series_map(external["soybean"]))
    rain_map = _series_map(external["rain"])

    # 30-day trailing rain vs climatology-ish trailing mean -> monsoon health
    def rain_health(d: date) -> float:
        total = sum(rain_map.get((d - timedelta(days=i)).isoformat(), 0.0)
                    for i in range(30))
        return min(1.25, max(0.55, 0.75 + total / 400.0))

    start = END_DATE - timedelta(days=DAYS - 1)
    dates = [start + timedelta(days=i) for i in range(DAYS)]

    enterprises, transactions, loans = [], [], []
    eid = 0

    for district, village_map in DISTRICTS.items():
      blocks = list(village_map.keys())
      for sector, count in SECTOR_MIX:
        for k in range(count):
            eid += 1
            block = blocks[(eid + k) % 4]
            village = village_map[block][rng.integers(0, 4)]
            word = GROUP_WORDS[sector][k % 4]
            leader = FIRST_NAMES[int(rng.integers(0, len(FIRST_NAMES)))]
            is_shg = rng.random() < 0.6
            name = (f"{word} {'SHG' if is_shg else 'Udyog'} ({leader})")
            members = int(rng.integers(8, 15)) if is_shg else 1
            scale = float(rng.uniform(0.7, 1.5))       # size heterogeneity
            skill = float(rng.uniform(0.9, 1.1))       # management quality
            enterprises.append(dict(
                id=eid, name=name, sector=sector, village=village,
                block=block, district=district, members=members,
                started_at=(start - timedelta(days=int(rng.integers(100, 900)))).isoformat()))

            has_loan = rng.random() < 0.65
            emi = 0.0
            if has_loan:
                principal = float(rng.choice([50, 100, 150, 200, 300])) * 1000 * scale
                emi = round(principal / 36 * 1.09, -1)   # ~36mo, flat-ish
                loans.append(dict(enterprise_id=eid, principal=principal,
                                  outstanding=principal * float(rng.uniform(0.3, 0.9)),
                                  emi=emi, due_day=5, lender=f"{district} Gramin Bank"))

            txns = _simulate_enterprise(
                rng, sector, scale, skill, dates, maize, soy, rain_health, emi)
            for t in txns:
                t["enterprise_id"] = eid
            transactions.extend(txns)

    # Pin the demo protagonist: enterprise #1 is always Lakshmi's dairy SHG
    # (dairy is first in SECTOR_MIX so id 1 is dairy by construction).
    enterprises[0].update(name="Gokul Dugdh SHG (Lakshmi Devi)",
                          village="Pulgaon", block="Deoli", members=12)
    if not any(l["enterprise_id"] == 1 for l in loans):
        loans.append(dict(enterprise_id=1, principal=150000.0,
                          outstanding=98000.0, emi=4540.0, due_day=5,
                          lender=f"{district} Gramin Bank"))
        for d in dates:
            if d.day == 5:
                transactions.append(dict(enterprise_id=1, type="loan_repayment",
                                         amount=4540.0, note="EMI",
                                         entered_at=d.isoformat(),
                                         source="simulated"))

    return {"enterprises": enterprises, "transactions": transactions,
            "loans": loans}


def _simulate_enterprise(rng, sector, scale, skill, dates, maize, soy,
                         rain_health, emi) -> list[dict]:
    txns: list[dict] = []

    def add(d: date, typ: str, amount: float, note: str = ""):
        if amount >= 1:
            txns.append(dict(type=typ, amount=round(float(amount), 0),
                             note=note, entered_at=d.isoformat(),
                             source="simulated"))

    weekly_savings = 50 * scale * (2 if sector == "dairy" else 1)

    if sector == "dairy":
        litres_base = 55 * scale
        pay_acc = 0.0
        for d in dates:
            ds = d.isoformat()
            # monsoon flush (Jul-Oct) raises yield; Apr-Jun heat cuts it
            season = 1.15 if d.month in (7, 8, 9, 10) else (0.85 if d.month in (4, 5, 6) else 1.0)
            litres = litres_base * season * skill * rain_health(d) * rng.uniform(0.92, 1.08)
            pay_acc += litres * 34.0                      # Rs/litre farmgate
            if d.day in (1, 11, 21):                      # 10-day cycle payout
                add(d, "income", pay_acc, "milk payment (collection centre)")
                pay_acc = 0.0
                add(d, "expense", litres_base * 10 * 11.5 * maize(ds) / skill,
                    "cattle feed & fodder")
            if d.weekday() == 0:
                add(d, "savings", weekly_savings, "group savings")
            if d.day == 5 and emi:
                add(d, "loan_repayment", emi, "EMI")

    elif sector == "poultry":
        offset = int(rng.integers(0, 42))
        for i, d in enumerate(dates):
            ds = d.isoformat()
            cycle_day = (i + offset) % 49                 # 42d grow + 7d rest
            if cycle_day == 42:                           # batch sale day
                birds = 480 * scale * rng.uniform(0.88, 1.0)  # mortality
                add(d, "income", birds * 2.1 * 92 * skill, "broiler batch sale")
            if cycle_day in (0, 14, 28):                  # feed purchases
                add(d, "expense", 320 * scale * 33 * maize(ds) * 0.45,
                    "feed purchase (maize/soya)")
            if cycle_day == 0:
                add(d, "expense", 480 * scale * 38, "day-old chicks")
            if d.weekday() == 0:
                add(d, "savings", weekly_savings, "group savings")
            if d.day == 5 and emi:
                add(d, "loan_repayment", emi, "EMI")

    elif sector == "food_processing":
        for d in dates:
            ds = d.isoformat()
            if d.day in (3, 18):                          # fortnightly sales
                season = 1.2 if d.month in (10, 11, 12, 1) else 1.0
                add(d, "income", 21000 * scale * skill * season / 2, "processed goods sales")
            # procurement season: heavy raw-material buying post-harvest
            if d.month in (10, 11, 12) and d.day in (6, 20):
                add(d, "expense", 16000 * scale * soy(ds), "raw material procurement")
            elif d.day == 6:
                add(d, "expense", 6500 * scale * soy(ds), "raw material top-up")
            if d.day == 12:
                add(d, "expense", 3200 * scale, "labour & fuel")
            if d.weekday() == 0:
                add(d, "savings", weekly_savings, "group savings")
            if d.day == 5 and emi:
                add(d, "loan_repayment", emi, "EMI")

    elif sector == "handicrafts":
        for d in dates:
            # Diwali (Oct-Nov) + wedding season (Jan-Feb) demand; receivables
            # lag: income lands ~1 month after the demand season
            demand = {11: 2.6, 12: 2.0, 2: 1.6, 3: 1.3}.get(d.month, 0.7)
            if d.day == 15:
                add(d, "income", 9000 * scale * skill * demand * rng.uniform(0.85, 1.15),
                    "craft order payments")
                add(d, "expense", 3400 * scale, "raw material (cloth/cane/dye)")
            if d.weekday() == 0:
                add(d, "savings", weekly_savings * 0.8, "group savings")
            if d.day == 5 and emi:
                add(d, "loan_repayment", emi, "EMI")

    else:  # rural_retail
        for d in dates:
            season = 1.25 if d.month in (10, 11) else (0.9 if d.month in (6, 7) else 1.0)
            daily = 3800 * scale * skill * season * rain_health(d) * rng.uniform(0.85, 1.15)
            if d.weekday() == 6:                          # weekly cash summary
                add(d, "income", daily * 7 * 0.18, "weekly margin (shop sales)")
            if d.day in (2, 16):
                add(d, "expense", daily * 15 * 0.145, "stock purchase (wholesaler)")
            if d.weekday() == 0:
                add(d, "savings", weekly_savings, "group savings")
            if d.day == 5 and emi:
                add(d, "loan_repayment", emi, "EMI")

    # imperfect repayment discipline for a realistic minority
    if emi and rng.random() < 0.18:
        skip_from = int(rng.integers(int(len(dates) * 0.75), int(len(dates) * 0.92)))
        cutoff = dates[skip_from].isoformat()
        txns = [t for t in txns
                if not (t["type"] == "loan_repayment" and t["entered_at"] >= cutoff)]
    return txns
