"""Seed: external series -> simulator -> DB -> baseline cascade. <60s target."""
from __future__ import annotations

import time

from . import db
from .data_layer import build_history
from .engine import run_cascade
from .simulator import generate


def run(seed: int = 42) -> dict:
    t0 = time.time()
    db.reset_db()
    external = build_history(seed)
    sim = generate(external, seed)

    con = db.connect()
    for name, series in external.items():
        stype = "rainfall" if name == "rain" else "mandi_price"
        con.executemany(
            "INSERT INTO external_series(series_type, commodity, district, date,"
            " value, source) VALUES (?,?,?,?,?,?)",
            [(stype, name, "Wardha", p["date"], p["value"], p["source"])
             for p in series])
    con.executemany(
        "INSERT INTO enterprises(id, name, sector, village, block, district,"
        " members, started_at) VALUES (:id,:name,:sector,:village,:block,"
        ":district,:members,:started_at)", sim["enterprises"])
    con.executemany(
        "INSERT INTO transactions(enterprise_id, type, amount, note, entered_at,"
        " source) VALUES (:enterprise_id,:type,:amount,:note,:entered_at,:source)",
        sim["transactions"])
    con.executemany(
        "INSERT INTO loans(enterprise_id, principal, outstanding, emi, due_day,"
        " lender) VALUES (:enterprise_id,:principal,:outstanding,:emi,:due_day,"
        ":lender)", sim["loans"])
    con.commit()

    cascade = run_cascade(con)
    con.close()
    return {"seconds": round(time.time() - t0, 1),
            "enterprises": len(sim["enterprises"]),
            "transactions": len(sim["transactions"]),
            "loans": len(sim["loans"]), **cascade}


if __name__ == "__main__":
    print(run())
