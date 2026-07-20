"""M2/M3/M4 - The intelligence spine.

signals   : statistical detectors on external series (z-score of recent
            window vs trailing year) -> price_spike / rain_deficit etc.
forecast  : per-sector monthly cash-flow projection, 6-month horizon.
            Exponential-smoothing family (interpretable), with external
            covariate adjustment: an active price signal shifts the cost
            projection of exposed sectors; a rain deficit shifts income of
            rain-coupled sectors. 80% band from residual spread.
cascade   : signal -> sector exposure -> per-enterprise flags with REASONS.
            Flag level from count/severity of reasons. Every reason carries
            bilingual text + machine evidence. No reasons, no flag.

Design stance (pitch-relevant): no deep learning. A field officer must be
able to defend every flag to the enterprise it concerns.
"""
from __future__ import annotations

import json
import math
from datetime import date, timedelta

import numpy as np
import pandas as pd

from . import db
from .data_layer import END_DATE

# sector -> which external drivers move its costs/income
EXPOSURE = {
    "maize_price": {"poultry": 0.65, "dairy": 0.35},     # feed cost share
    "soybean_price": {"food_processing": 0.5, "poultry": 0.2},
    "rain_deficit": {"dairy": 0.4, "rural_retail": 0.35, "food_processing": 0.2},
}

SUGGESTION_LIB = {
    ("poultry", "feed_cost"): (
        "Feed prices are rising. Buy 3-4 weeks of feed now at current rates; consider smaller next batch.",
        "फ़ीड के दाम बढ़ रहे हैं। अभी 3-4 हफ़्ते का फ़ीड मौजूदा दाम पर खरीद लें; अगला बैच छोटा रखने पर विचार करें।"),
    ("dairy", "feed_cost"): (
        "Fodder costs may rise. Stock dry fodder early and increase weekly savings to cover the gap.",
        "चारे की लागत बढ़ सकती है। सूखा चारा पहले से जमा करें और साप्ताहिक बचत बढ़ाएँ।"),
    ("food_processing", "input_cost"): (
        "Raw material prices are up. Negotiate forward purchase with your FPO/mandi trader before procurement season.",
        "कच्चे माल के दाम बढ़े हैं। खरीद सीज़न से पहले FPO/व्यापारी से अग्रिम सौदे की बात करें।"),
    ("*", "rain_deficit"): (
        "Weak monsoon in your district may reduce local demand. Keep 6 weeks of expenses as cash buffer.",
        "कमज़ोर मानसून से स्थानीय माँग घट सकती है। 6 हफ़्ते के खर्च जितनी नकदी बचाकर रखें।"),
    ("*", "repayment_gap"): (
        "EMI payments have been missed. Meet your field officer this week to discuss restructuring before it affects your record.",
        "EMI छूटी है। रिकॉर्ड पर असर पड़ने से पहले इसी हफ़्ते फ़ील्ड अधिकारी से पुनर्गठन पर बात करें।"),
    ("*", "savings_decline"): (
        "Group savings have fallen. Restart even a small weekly amount - regularity matters more than size for your Saakh.",
        "समूह बचत घटी है। छोटी ही सही, साप्ताहिक बचत फिर शुरू करें - साख के लिए नियमितता सबसे ज़रूरी है।"),
    ("*", "forecast_shortfall"): (
        "Coming months look tight. Delay non-essential purchases and talk to your officer about a working-capital bridge.",
        "आने वाले महीने तंग दिख रहे हैं। ग़ैर-ज़रूरी खरीद टालें और वर्किंग-कैपिटल के लिए अधिकारी से बात करें।"),
}


def _series_df(con, commodity: str) -> pd.DataFrame:
    rows = con.execute(
        "SELECT date, value FROM external_series WHERE commodity=? ORDER BY date",
        (commodity,)).fetchall()
    df = pd.DataFrame(rows, columns=["date", "value"])
    df["date"] = pd.to_datetime(df["date"])
    return df


def detect_signals(con, asof: date | None = None) -> list[dict]:
    """Z-score of last-30d mean vs trailing-365d distribution of 30d means."""
    asof = asof or END_DATE
    found = []
    for commodity, kind_hi in (("maize", "price"), ("soybean", "price"), ("rain", "rain")):
        df = _series_df(con, commodity)
        if df.empty:
            continue
        df = df[df["date"] <= pd.Timestamp(asof)]
        roll = df.set_index("date")["value"].rolling("30D").mean().dropna()
        if len(roll) < 90:
            continue
        recent, hist = roll.iloc[-1], roll.iloc[:-30]
        z = float((recent - hist.mean()) / (hist.std() + 1e-9))
        kind = None
        if kind_hi == "price" and z >= 1.8:
            kind = "price_spike"
        elif kind_hi == "price" and z <= -1.8:
            kind = "price_crash"
        elif kind_hi == "rain":
            # compare monsoon-to-date only when in/after monsoon months
            if asof.month in (6, 7, 8, 9, 10) and z <= -0.9:
                kind = "rain_deficit"
            elif z >= 2.2:
                kind = "rain_excess"
        if kind:
            cur = con.execute(
                "INSERT INTO signals(series_type, commodity, detected_at, kind,"
                " magnitude_z, window_days, detail) VALUES (?,?,?,?,?,?,?)",
                ("rainfall" if commodity == "rain" else "mandi_price", commodity,
                 asof.isoformat(), kind, round(z, 2), 30,
                 f"30d mean {recent:.1f} vs yr mean {hist.mean():.1f}"))
            found.append(dict(id=cur.lastrowid, commodity=commodity, kind=kind,
                              magnitude_z=round(z, 2)))
    con.commit()
    return found


def monthly_net(con, enterprise_id: int, asof: date | None = None) -> pd.DataFrame:
    asof = asof or END_DATE
    rows = con.execute(
        "SELECT entered_at, type, amount FROM transactions WHERE enterprise_id=?"
        " AND entered_at<=? ORDER BY entered_at",
        (enterprise_id, asof.isoformat())).fetchall()
    df = pd.DataFrame(rows, columns=["date", "type", "amount"])
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")
    g = df.pivot_table(index="month", columns="type", values="amount",
                       aggfunc="sum").fillna(0)
    for c in ("income", "expense", "savings", "loan_repayment"):
        if c not in g:
            g[c] = 0.0
    g["net"] = g["income"] - g["expense"] - g["loan_repayment"]
    return g.reset_index()


def forecast_enterprise(con, enterprise_id: int, sector: str,
                        active_signals: list[dict], horizon: int = 6) -> dict:
    """Seasonal-naive + trend blend with signal covariate adjustment.

    Interpretable by construction: forecast(month m) =
      0.55 * same-month-last-year + 0.45 * recent-3mo-mean, damped-trended,
      then cost/income shifted by active-signal exposure for this sector.

    Cold start (<13 months of records - the thin-file case the problem
    statement centres on): fall back to the SECTOR PRIOR - the median
    monthly income/expense profile of same-sector peers in the district,
    scaled to this enterprise's observed level. Tagged sector_prior_v1 so
    the provenance is visible everywhere the forecast appears.
    """
    g = monthly_net(con, enterprise_id)
    model_tag = "seasonal_blend_v1"
    if len(g) >= 13:
        inc, exp = g["income"].to_numpy(), (g["expense"] + g["loan_repayment"]).to_numpy()
    else:
        peers = [r["id"] for r in con.execute(
            "SELECT id FROM enterprises WHERE sector=? AND id!=?",
            (sector, enterprise_id))]
        profiles = []
        for pid in peers:
            pg = monthly_net(con, pid)
            if len(pg) >= 13:
                profiles.append((pg["income"].to_numpy()[-13:],
                                 (pg["expense"] + pg["loan_repayment"]).to_numpy()[-13:]))
        if not profiles:
            return {}
        inc = np.median([p[0] for p in profiles], axis=0)
        exp = np.median([p[1] for p in profiles], axis=0)
        # scale the peer profile to this enterprise's observed level, if any
        if len(g) >= 1 and g["income"].mean() > 0:
            ratio = float(np.clip(g["income"].mean() / (inc.mean() + 1e-9), 0.3, 3.0))
            inc, exp = inc * ratio, exp * ratio
        model_tag = "sector_prior_v1"

    def project(series: np.ndarray) -> np.ndarray:
        recent = series[-3:].mean()
        trend = np.clip((series[-3:].mean() - series[-6:-3].mean()) / 3,
                        -0.06 * recent, 0.06 * recent)
        out = []
        for h in range(1, horizon + 1):
            seasonal = series[-12 + (h - 1)] if len(series) >= 12 + h - 1 else recent
            out.append(0.55 * seasonal + 0.45 * recent + trend * h * 0.5)
        return np.array(out)

    f_inc, f_exp = project(inc), project(exp)

    adjustments = []
    for s in active_signals:
        key = {"maize": "maize_price", "soybean": "soybean_price"}.get(s["commodity"])
        if s["kind"] == "price_spike" and key and sector in EXPOSURE.get(key, {}):
            share = EXPOSURE[key][sector]
            bump = min(0.25, 0.06 * s["magnitude_z"]) * share
            f_exp = f_exp * (1 + bump)
            adjustments.append((s, f"expenses +{bump*100:.0f}%"))
        if s["kind"] == "rain_deficit" and sector in EXPOSURE["rain_deficit"]:
            share = EXPOSURE["rain_deficit"][sector]
            cut = min(0.2, 0.05 * abs(s["magnitude_z"])) * share
            f_inc = f_inc * (1 - cut)
            adjustments.append((s, f"income -{cut*100:.0f}%"))

    # Band from NET-flow residuals vs seasonal expectation (tighter and more
    # honest than summing income/expense spreads, which ignores their
    # co-movement: high-income months are usually high-expense months too).
    net_hist = inc - exp
    if len(net_hist) >= 13:
        seasonal_resid = net_hist[12:] - net_hist[:-12]
        resid = float(np.std(seasonal_resid)) / math.sqrt(2)
    else:
        resid = float(np.std(net_hist - net_hist.mean()))
    months = [(pd.Period(END_DATE.strftime("%Y-%m")) + h).strftime("%Y-%m")
              for h in range(1, horizon + 1)]
    net = f_inc - f_exp
    points = [dict(month=m, net=round(float(n)), income=round(float(i)),
                   expense=round(float(e)))
              for m, n, i, e in zip(months, net, f_inc, f_exp)]
    band = [dict(month=m, lo=round(float(n - 1.28 * resid)),
                 hi=round(float(n + 1.28 * resid))) for m, n in zip(months, net)]

    con.execute(
        "INSERT INTO forecasts(enterprise_id, generated_at, horizon_months,"
        " points_json, band_json, model_tag) VALUES (?,?,?,?,?,?)",
        (enterprise_id, END_DATE.isoformat(), horizon, json.dumps(points),
         json.dumps(band),
         f"{model_tag}+{len(adjustments)}adj"))
    con.commit()
    return {"points": points, "band": band, "adjustments": adjustments,
            "model_tag": model_tag}


def run_cascade(con, asof: date | None = None) -> dict:
    """Full pipeline: detect signals -> forecast all -> flag with reasons."""
    asof = asof or END_DATE
    con.execute("DELETE FROM flag_reasons"); con.execute("DELETE FROM suggestions")
    con.execute("DELETE FROM flags"); con.execute("DELETE FROM forecasts")
    con.execute("DELETE FROM signals")
    con.commit()

    signals = detect_signals(con, asof)
    enterprises = con.execute("SELECT * FROM enterprises").fetchall()
    flagged = 0

    for e in enterprises:
        reasons: list[dict] = []
        fc = forecast_enterprise(con, e["id"], e["sector"], signals)

        # -- external-shock exposure reasons
        for s, effect in (fc.get("adjustments") or []):
            nice = s["commodity"].capitalize()
            if s["kind"] == "price_spike":
                reasons.append(dict(
                    code="feed_cost" if e["sector"] in ("poultry", "dairy") else "input_cost",
                    text_en=f"{nice} price up sharply in district mandis (z={s['magnitude_z']}); projected {effect}",
                    text_hi=f"ज़िले की मंडियों में {nice} के दाम तेज़ी से बढ़े (z={s['magnitude_z']}); अनुमानित {effect}",
                    evidence={"signal_id": s["id"], "effect": effect}))
            else:
                reasons.append(dict(
                    code="rain_deficit",
                    text_en=f"Monsoon deficit in Wardha (z={s['magnitude_z']}); projected {effect}",
                    text_hi=f"वर्धा में मानसून की कमी (z={s['magnitude_z']}); अनुमानित {effect}",
                    evidence={"signal_id": s["id"], "effect": effect}))

        # -- internal-discipline reasons
        loan = con.execute("SELECT * FROM loans WHERE enterprise_id=?",
                           (e["id"],)).fetchone()
        if loan:
            paid = con.execute(
                "SELECT COUNT(*) c FROM transactions WHERE enterprise_id=? AND"
                " type='loan_repayment' AND entered_at>=?",
                (e["id"], (asof - timedelta(days=90)).isoformat())).fetchone()["c"]
            if paid < 2:
                reasons.append(dict(
                    code="repayment_gap",
                    text_en=f"Only {paid} of last 3 EMI cycles paid",
                    text_hi=f"पिछले 3 में से केवल {paid} EMI चुकाई गई",
                    evidence={"paid_90d": paid, "emi": loan["emi"]}))

        g = monthly_net(con, e["id"], asof)
        if len(g) >= 6:
            recent_sav = g["savings"].iloc[-3:].mean()
            past_sav = g["savings"].iloc[-6:-3].mean()
            if past_sav > 0 and recent_sav < 0.6 * past_sav:
                reasons.append(dict(
                    code="savings_decline",
                    text_en=f"Group savings down {100*(1-recent_sav/past_sav):.0f}% vs previous quarter",
                    text_hi=f"समूह बचत पिछली तिमाही से {100*(1-recent_sav/past_sav):.0f}% घटी",
                    evidence={"recent": round(recent_sav), "past": round(past_sav)}))

        # -- forward-looking shortfall reason
        if fc and loan:
            worst = min(p["net"] for p in fc["points"][:3])
            if worst < 0:
                reasons.append(dict(
                    code="forecast_shortfall",
                    text_en=f"Forecast shows ₹{abs(worst):,.0f} monthly shortfall against obligations within 3 months",
                    text_hi=f"पूर्वानुमान: 3 महीनों में देनदारियों के मुक़ाबले ₹{abs(worst):,.0f} मासिक कमी",
                    evidence={"worst_net_3mo": worst}))

        if not reasons:
            continue
        severity = len(reasons) + (1 if any(r["code"] == "repayment_gap" for r in reasons) else 0)
        level = "alert" if severity >= 4 else ("warning" if severity >= 2 else "watch")
        sig_id = next((r["evidence"].get("signal_id") for r in reasons
                       if "signal_id" in r.get("evidence", {})), None)
        fid = db.create_flag(con, e["id"], level, asof.isoformat(), reasons, sig_id)
        for r in reasons:
            key = (e["sector"], r["code"])
            sug = SUGGESTION_LIB.get(key) or SUGGESTION_LIB.get(("*", r["code"]))
            if sug:
                con.execute(
                    "INSERT INTO suggestions(flag_id, text_en, text_hi) VALUES (?,?,?)",
                    (fid, sug[0], sug[1]))
        flagged += 1

    con.commit()
    # Structured breakdown so the UI can narrate the cascade as it happened
    by_level = {r["level"]: r["c"] for r in con.execute(
        "SELECT level, COUNT(*) c FROM flags GROUP BY level")}
    by_sector = {r["sector"]: r["c"] for r in con.execute(
        "SELECT e.sector, COUNT(DISTINCT f.enterprise_id) c FROM flags f"
        " JOIN enterprises e ON e.id=f.enterprise_id GROUP BY e.sector")}
    return {"signals": signals, "enterprises": len(enterprises),
            "flagged": flagged, "by_level": by_level, "by_sector": by_sector}
