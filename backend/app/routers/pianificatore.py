from datetime import date, datetime, timedelta
from typing import Optional
from fastapi import APIRouter

from app.database import db

router = APIRouter(prefix="/api/pianificatore", tags=["pianificatore"])


def in_range(day: date, item: dict) -> bool:
    try:
        start = datetime.fromisoformat(item.get("data_inizio", "")).date()
        end = datetime.fromisoformat(item.get("data_fine", "")).date()
        return start <= day <= end
    except Exception:
        return False


def tecnico_cap(tecnico: dict) -> str:
    return tecnico.get("cap_partenza") or (tecnico.get("sede_partenza") or {}).get("cap") or ""


def tecnico_zona(tecnico: dict) -> str:
    sede = tecnico.get("sede_partenza") or {}
    return tecnico.get("zona_preferita") or sede.get("citta") or ""


def tecnico_competenze(tecnico: dict) -> list:
    return tecnico.get("competenze") or tecnico.get("specializzazioni") or []


@router.get("/overview")
async def overview(start: Optional[str] = None, days: int = 5):
    start_day = datetime.fromisoformat(start).date() if start else date.today()
    days = max(1, min(days, 14))
    calendar_days = [start_day + timedelta(days=i) for i in range(days)]

    tecnici = await db.tecnici.find({"attivo": True}).sort("cognome", 1).to_list(500)
    vincoli = await db.vincoli.find({"attivo": True}).to_list(1000)

    rows = []
    for tecnico in tecnici:
        tecnico_id = str(tecnico["_id"])
        tecnico_vincoli = [v for v in vincoli if v.get("tecnico_id") == tecnico_id]
        stato = tecnico.get("stato", "ATTIVO")
        stato_bloccante = stato in ["IN_FERIE", "NON_DISPONIBILE"]
        cells = []
        for day in calendar_days:
            indisponibilita = [i for i in tecnico.get("indisponibilita", []) if in_range(day, i)]
            if stato_bloccante:
                indisponibilita = [{"tipo": stato, "data_inizio": day.isoformat(), "data_fine": day.isoformat(), "note": "Stato tecnico"}] + indisponibilita
            disponibile = len(indisponibilita) == 0
            cells.append({
                "date": day.isoformat(),
                "disponibile": disponibile,
                "indisponibilita": indisponibilita,
                "zona_preferita": tecnico_zona(tecnico),
                "ore_disponibili": tecnico.get("ore_giornaliere", 8) if disponibile else 0,
                "tickets": [],
            })
        rows.append({
            "tecnico": {
                "id": tecnico_id,
                "codice_tecnico": tecnico.get("codice_tecnico", ""),
                "nome": tecnico.get("nome", ""),
                "cognome": tecnico.get("cognome", ""),
                "cap_partenza": tecnico_cap(tecnico),
                "zona_preferita": tecnico_zona(tecnico),
                "competenze": tecnico_competenze(tecnico),
            },
            "vincoli_attivi": len(tecnico_vincoli),
            "days": cells,
        })

    return {
        "start": start_day.isoformat(),
        "days": [d.isoformat() for d in calendar_days],
        "rows": rows,
        "vincoli_totali": len(vincoli),
    }
