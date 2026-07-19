"""Sanket API. Auto-documented at /docs (the DPG/open-API story, for free)."""
from __future__ import annotations

import json
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import db
from .engine import monthly_net
from .shocks import SHOCKS, inject, reset_and_recascade

app = FastAPI(title="Sanket API",
              description="Early-warning & cash-flow intelligence for rural "
                          "micro enterprises. NABARD Hackathon @ GFF 2026.",
              version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"])

LEVEL_RANK = {"alert": 0, "warning": 1, "watch": 2, None: 3}


class TxnIn(BaseModel):
    enterprise_id: int
    type: str
    amount: float
    note: str = ""
    entered_at: str
    source: str = "manual"


class InterventionIn(BaseModel):
    enterprise_id: int
    flag_id: int | None = None
    officer_note: str
    outcome: str = ""


def _flags_with_reasons(con, enterprise_id: int) -> list[dict]:
    flags = []
    for f in con.execute(
            "SELECT * FROM flags WHERE enterprise_id=? AND status='open'"
            " ORDER BY opened_at DESC", (enterprise_id,)):
        reasons = [dict(r) for r in con.execute(
            "SELECT code, text_en, text_hi, evidence_json FROM flag_reasons"
            " WHERE flag_id=?", (f["id"],))]
        suggestions = [dict(s) for s in con.execute(
            "SELECT id, text_en, text_hi, action_status FROM suggestions"
            " WHERE flag_id=?", (f["id"],))]
        flags.append({**dict(f), "reasons": reasons, "suggestions": suggestions})
    return flags


@app.get("/enterprises")
def list_enterprises(district: str = "Wardha"):
    """Triage list: every enterprise + its worst open flag, ranked."""
    con = db.connect()
    rows = [dict(e) for e in con.execute(
        "SELECT * FROM enterprises WHERE district=?", (district,))]
    for e in rows:
        f = con.execute(
            "SELECT id, level, opened_at FROM flags WHERE enterprise_id=? AND"
            " status='open' ORDER BY CASE level WHEN 'alert' THEN 0 WHEN"
            " 'warning' THEN 1 ELSE 2 END LIMIT 1", (e["id"],)).fetchone()
        e["risk"] = f["level"] if f else "healthy"
        e["reason_count"] = con.execute(
            "SELECT COUNT(*) c FROM flag_reasons fr JOIN flags fl ON"
            " fl.id=fr.flag_id WHERE fl.enterprise_id=? AND fl.status='open'",
            (e["id"],)).fetchone()["c"]
        top = con.execute(
            "SELECT fr.text_en, fr.text_hi FROM flag_reasons fr JOIN flags fl"
            " ON fl.id=fr.flag_id WHERE fl.enterprise_id=? AND fl.status='open'"
            " LIMIT 1", (e["id"],)).fetchone()
        e["top_reason"] = dict(top) if top else None
    con.close()
    rows.sort(key=lambda e: (LEVEL_RANK.get(e["risk"], 3), -e["reason_count"]))
    return rows


@app.get("/enterprises/{eid}")
def enterprise_profile(eid: int):
    con = db.connect()
    e = con.execute("SELECT * FROM enterprises WHERE id=?", (eid,)).fetchone()
    if not e:
        con.close()
        raise HTTPException(404)
    g = monthly_net(con, eid)
    history = [dict(month=str(r["month"]), income=float(r["income"]),
                    expense=float(r["expense"]),
                    savings=float(r["savings"]),
                    repayment=float(r["loan_repayment"]),
                    net=float(r["net"])) for _, r in g.iterrows()]
    fc = con.execute(
        "SELECT points_json, band_json, model_tag, generated_at FROM forecasts"
        " WHERE enterprise_id=? ORDER BY id DESC LIMIT 1", (eid,)).fetchone()
    loan = con.execute("SELECT * FROM loans WHERE enterprise_id=?", (eid,)).fetchone()
    txns = [dict(t) for t in con.execute(
        "SELECT type, amount, note, entered_at, source FROM transactions"
        " WHERE enterprise_id=? ORDER BY entered_at DESC LIMIT 30", (eid,))]
    result = {
        **dict(e), "history": history[-24:],
        "forecast": (dict(points=json.loads(fc["points_json"]),
                          band=json.loads(fc["band_json"]),
                          model_tag=fc["model_tag"],
                          generated_at=fc["generated_at"]) if fc else None),
        "loan": dict(loan) if loan else None,
        "flags": _flags_with_reasons(con, eid),
        "recent_transactions": txns,
        "interventions": [dict(i) for i in con.execute(
            "SELECT * FROM interventions WHERE enterprise_id=? ORDER BY"
            " logged_at DESC", (eid,))],
    }
    con.close()
    return result


@app.get("/risk/district/{district}")
def district_risk(district: str):
    """Cascade map payload: per-block, per-sector risk mix + active signals."""
    con = db.connect()
    blocks: dict[str, dict] = {}
    for r in con.execute("""
        SELECT e.block, e.sector,
               COALESCE((SELECT level FROM flags f WHERE f.enterprise_id=e.id
                         AND f.status='open' ORDER BY CASE level
                         WHEN 'alert' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END
                         LIMIT 1), 'healthy') risk
        FROM enterprises e WHERE e.district=?""", (district,)):
        b = blocks.setdefault(r["block"], {"levels": {}, "sectors": {}})
        b["levels"][r["risk"]] = b["levels"].get(r["risk"], 0) + 1
        b["sectors"].setdefault(r["sector"], {})
        b["sectors"][r["sector"]][r["risk"]] = \
            b["sectors"][r["sector"]].get(r["risk"], 0) + 1
    signals = [dict(s) for s in con.execute(
        "SELECT * FROM signals ORDER BY id DESC LIMIT 10")]
    kpis = con.execute("""
        SELECT COUNT(*) total,
          SUM(CASE WHEN EXISTS (SELECT 1 FROM flags f WHERE
              f.enterprise_id=e.id AND f.status='open' AND f.level='alert')
              THEN 1 ELSE 0 END) alerts,
          SUM(CASE WHEN EXISTS (SELECT 1 FROM flags f WHERE
              f.enterprise_id=e.id AND f.status='open' AND f.level='warning')
              THEN 1 ELSE 0 END) warnings
        FROM enterprises e WHERE e.district=?""", (district,)).fetchone()
    con.close()
    return {"district": district, "blocks": blocks, "signals": signals,
            "kpis": dict(kpis)}


@app.post("/transactions/batch")
def add_transactions(txns: list[TxnIn]):
    """Outbox sync endpoint for the offline PWA."""
    con = db.connect()
    con.executemany(
        "INSERT INTO transactions(enterprise_id, type, amount, note,"
        " entered_at, source) VALUES (?,?,?,?,?,?)",
        [(t.enterprise_id, t.type, t.amount, t.note, t.entered_at, t.source)
         for t in txns])
    con.commit()
    con.close()
    return {"synced": len(txns)}


@app.post("/interventions")
def log_intervention(iv: InterventionIn):
    con = db.connect()
    con.execute(
        "INSERT INTO interventions(enterprise_id, flag_id, officer_note,"
        " logged_at, outcome) VALUES (?,?,?,?,?)",
        (iv.enterprise_id, iv.flag_id, iv.officer_note,
         datetime.now().isoformat(timespec="seconds"), iv.outcome))
    if iv.flag_id:
        con.execute("UPDATE flags SET status='resolved' WHERE id=?", (iv.flag_id,))
    con.commit()
    con.close()
    return {"ok": True}


@app.post("/suggestions/{sid}/done")
def suggestion_done(sid: int):
    con = db.connect()
    con.execute("UPDATE suggestions SET action_status='done' WHERE id=?", (sid,))
    con.commit()
    con.close()
    return {"ok": True}


@app.post("/simulate/shock/{shock_key}")
def simulate_shock(shock_key: str):
    """Demo time machine: inject shock, re-run the real nightly cascade."""
    if shock_key not in SHOCKS:
        raise HTTPException(400, f"unknown shock; options: {list(SHOCKS)}")
    con = db.connect()
    result = inject(con, shock_key)
    con.close()
    return result


@app.post("/admin/reset")
def admin_reset():
    """Pristine demo state in seconds."""
    return reset_and_recascade()


@app.get("/saakh/{eid}")
def saakh_payload(eid: int):
    """Everything the SAAKH report template needs, in one call."""
    profile = enterprise_profile(eid)
    con = db.connect()
    txn_stats = con.execute("""
        SELECT COUNT(*) entries,
               MIN(entered_at) first_entry,
               COUNT(DISTINCT substr(entered_at,1,7)) active_months
        FROM transactions WHERE enterprise_id=?""", (eid,)).fetchone()
    resolved = con.execute(
        "SELECT COUNT(*) c FROM flags WHERE enterprise_id=? AND"
        " status='resolved'", (eid,)).fetchone()["c"]
    con.close()
    hist = profile["history"]
    sav_months = sum(1 for m in hist if m["savings"] > 0)
    rep_months = sum(1 for m in hist if m["repayment"] > 0)
    return {
        **profile,
        "discipline": {
            **dict(txn_stats),
            "savings_regularity_pct": round(100 * sav_months / max(1, len(hist))),
            "repayment_regularity_pct": round(100 * rep_months / max(1, len(hist))),
            "shocks_survived": resolved,
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "disclaimer_en": ("Generated at the enterprise's request. Data is "
                          "self-reported plus district market/climate series. "
                          "This is an evidence dossier, not a credit score."),
    }
