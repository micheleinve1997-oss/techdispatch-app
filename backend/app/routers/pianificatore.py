from datetime import date, datetime, timedelta
from typing import Optional
from fastapi import APIRouter

from app.database import db

router = APIRouter(prefix="/api/pianificatore", tags=["pianificatore"])

PRIORITA_SCORE = {"URGENTE": 0, "ALTA": 1, "MEDIA": 2, "BASSA": 3}


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


def parse_iso_date(value):
    if not value:
        return None
    try:
        if isinstance(value, datetime):
            return value.date()
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except Exception:
        return None


def normalizza_cap(value) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())[:5]


def normalizza_zona(value) -> str:
    return str(value or "").strip().upper()


def zona_intervento(intervento: dict) -> str:
    if intervento.get("citta"):
        return normalizza_zona(intervento["citta"])
    cap = normalizza_cap(intervento.get("cap"))
    if cap:
        return cap[:2]
    return "SENZA_ZONA"


def location_intervento(intervento: dict) -> dict:
    zona = zona_intervento(intervento)
    return {"cap": normalizza_cap(intervento.get("cap")), "zona": zona}


def stima_viaggio_ore(origine: dict | None, destinazione: dict | None) -> tuple[float, str]:
    origine = origine or {}
    destinazione = destinazione or {}
    from_cap = normalizza_cap(origine.get("cap"))
    to_cap = normalizza_cap(destinazione.get("cap"))
    from_zona = normalizza_zona(origine.get("zona"))
    to_zona = normalizza_zona(destinazione.get("zona"))

    if not any([from_cap, to_cap, from_zona, to_zona]):
        return 0.25, "viaggio minimo stimato, dati sede/cliente mancanti"
    if from_cap and to_cap and from_cap == to_cap:
        return 0.15, "stesso CAP"
    if from_zona and to_zona and from_zona == to_zona:
        return 0.33, "stessa citta/zona"
    if from_cap and to_cap and from_cap[:2] == to_cap[:2]:
        return 0.5, "area CAP compatibile"
    if from_zona and to_zona and from_zona != to_zona:
        return 0.75, "zona diversa"
    return 0.5, "viaggio medio stimato"


def durata_intervento(intervento: dict) -> float:
    if intervento.get("durata_stimata"):
        try:
            return max(0.25, float(intervento["durata_stimata"]))
        except Exception:
            pass
    if intervento.get("priorita") == "URGENTE":
        return 2.0
    if intervento.get("origine") == "MANUTENZIONE":
        return 2.0
    if intervento.get("origine") == "PREVENTIVO_ACCETTATO":
        return 1.5
    return 1.5


def intervento_sort_key(intervento: dict):
    score = PRIORITA_SCORE.get(intervento.get("priorita", "MEDIA"), 2)
    scadenza = parse_iso_date(intervento.get("data_pianificata")) or date.max
    manutenzione_penalty = 1 if intervento.get("origine") == "MANUTENZIONE" else 0
    return (score, scadenza, manutenzione_penalty, str(intervento.get("created_at", "")))


def tecnico_matches_intervento(tecnico: dict, intervento: dict) -> tuple[bool, str]:
    raw = " ".join([
        str(intervento.get("titolo") or ""),
        str(intervento.get("descrizione") or ""),
        str(intervento.get("origine") or ""),
    ]).lower()
    richieste = [kw for kw in ["calda", "clima", "elettr", "ascensor", "carrell", "idr", "antincendio"] if kw in raw]
    if not richieste:
        return True, "nessuna competenza specifica richiesta"
    competenze = " ".join(tecnico_competenze(tecnico)).lower()
    if any(r in competenze for r in richieste):
        return True, "competenza compatibile"
    return False, "competenza non compatibile"


def vincolo_blocca(vincoli: list[dict], tecnico_id: str, cliente_id: str | None) -> bool:
    if not cliente_id:
        return False
    return any(
        v.get("tipo") == "BLOCCO" and v.get("tecnico_id") == tecnico_id and v.get("cliente_id") == cliente_id
        for v in vincoli
    )


async def build_overview(start_day: date, days: int):
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
    return calendar_days, rows, len(vincoli), tecnici, vincoli


@router.get("/overview")
async def overview(start: Optional[str] = None, days: int = 5):
    start_day = datetime.fromisoformat(start).date() if start else date.today()
    days = max(1, min(days, 14))
    calendar_days, rows, vincoli_totali, _, _ = await build_overview(start_day, days)
    return {"start": start_day.isoformat(), "days": [d.isoformat() for d in calendar_days], "rows": rows, "vincoli_totali": vincoli_totali}


@router.post("/genera")
async def genera_proposta(start: Optional[str] = None, days: int = 5):
    start_day = datetime.fromisoformat(start).date() if start else date.today()
    days = max(1, min(days, 14))
    calendar_days, _, _, tecnici, vincoli = await build_overview(start_day, days)

    interventi = await db.interventi.find({"attivo": True, "stato": {"$in": ["APERTO", "DA_PIANIFICARE"]}}).to_list(2000)
    proposta = {str(t["_id"]): {d.isoformat(): [] for d in calendar_days} for t in tecnici}
    capacity = {str(t["_id"]): {} for t in tecnici}
    zone_giorno = {str(t["_id"]): {d.isoformat(): None for d in calendar_days} for t in tecnici}
    last_location = {str(t["_id"]): {d.isoformat(): {"cap": tecnico_cap(t), "zona": tecnico_zona(t)} for d in calendar_days} for t in tecnici}
    travel_totals = {str(t["_id"]): {d.isoformat(): 0.0 for d in calendar_days} for t in tecnici}
    warnings = []
    non_pianificati = []

    for tecnico in tecnici:
        tid = str(tecnico["_id"])
        stato_bloccante = tecnico.get("stato") in ["IN_FERIE", "NON_DISPONIBILE"]
        for day in calendar_days:
            blocchi = [i for i in tecnico.get("indisponibilita", []) if in_range(day, i)]
            capacity[tid][day.isoformat()] = 0 if stato_bloccante or blocchi else float(tecnico.get("ore_giornaliere", 8) or 8)

    for intervento in sorted(interventi, key=intervento_sort_key):
        durata = durata_intervento(intervento)
        destinazione = location_intervento(intervento)
        zona = destinazione["zona"]
        scadenza = parse_iso_date(intervento.get("data_pianificata"))
        explicit_tecnico = intervento.get("tecnico_id")
        assigned = False
        motivazioni_scarto = []

        for day in calendar_days:
            if scadenza and day > scadenza:
                continue
            day_key = day.isoformat()
            candidate_tecnici = [t for t in tecnici if not explicit_tecnico or str(t["_id"]) == explicit_tecnico]
            ranked = []
            for tecnico in candidate_tecnici:
                tid = str(tecnico["_id"])
                nome = f"{tecnico.get('nome', '')} {tecnico.get('cognome', '')}".strip()
                viaggio, viaggio_reason = stima_viaggio_ore(last_location[tid][day_key], destinazione)
                tempo_totale = durata + viaggio
                if capacity[tid][day_key] < tempo_totale:
                    motivazioni_scarto.append(f"{nome}: ore insufficienti incl. viaggio ({tempo_totale:.1f}h)")
                    continue
                if vincolo_blocca(vincoli, tid, intervento.get("cliente_id")):
                    motivazioni_scarto.append(f"{nome}: vincolo cliente")
                    continue
                ok_comp, reason_comp = tecnico_matches_intervento(tecnico, intervento)
                if not ok_comp:
                    motivazioni_scarto.append(f"{nome}: {reason_comp}")
                    continue
                zona_attuale = zone_giorno[tid][day_key]
                zona_penalty = 0 if zona_attuale in [None, zona] else 10
                preferred_penalty = 0 if normalizza_zona(tecnico_zona(tecnico)) in [zona, ""] else 2
                ranked.append((zona_penalty + preferred_penalty, viaggio, -capacity[tid][day_key], tecnico, viaggio_reason))

            ranked.sort(key=lambda x: x[0:3])
            if not ranked:
                continue

            _, viaggio, _, tecnico, viaggio_reason = ranked[0]
            tid = str(tecnico["_id"])
            zona_attuale = zone_giorno[tid][day_key]
            tempo_totale = durata + viaggio
            if zona_attuale and zona_attuale != zona:
                warnings.append({"tipo": "ZONA_MISTA", "messaggio": f"Giornata con zona mista: {zona_attuale} + {zona}", "tecnico_id": tid, "date": day_key})
            zone_giorno[tid][day_key] = zona_attuale or zona
            capacity[tid][day_key] -= tempo_totale
            travel_totals[tid][day_key] += viaggio
            last_location[tid][day_key] = destinazione
            proposta[tid][day_key].append({
                "id": str(intervento["_id"]),
                "codice_intervento": intervento.get("codice_intervento"),
                "titolo": intervento.get("titolo"),
                "cliente_nome": intervento.get("cliente_nome"),
                "cliente_id": intervento.get("cliente_id"),
                "priorita": intervento.get("priorita"),
                "origine": intervento.get("origine"),
                "zona": zona,
                "durata_stimata": round(durata, 2),
                "viaggio_stimato": round(viaggio, 2),
                "tempo_totale": round(tempo_totale, 2),
                "motivazione": f"zona {zona}, lavoro {durata:.1f}h, viaggio {viaggio:.1f}h ({viaggio_reason}), residuo {capacity[tid][day_key]:.1f}h",
            })
            assigned = True
            break

        if not assigned:
            non_pianificati.append({
                "id": str(intervento["_id"]),
                "codice_intervento": intervento.get("codice_intervento"),
                "titolo": intervento.get("titolo"),
                "cliente_nome": intervento.get("cliente_nome"),
                "priorita": intervento.get("priorita"),
                "zona": zona,
                "durata_stimata": round(durata, 2),
                "viaggio_stimato": 0,
                "tempo_totale": round(durata, 2),
                "motivo": "; ".join(motivazioni_scarto[-5:]) or "nessuno slot compatibile entro finestra",
            })

    rows = []
    for tecnico in tecnici:
        tid = str(tecnico["_id"])
        rows.append({
            "tecnico": {"id": tid, "codice_tecnico": tecnico.get("codice_tecnico", ""), "nome": tecnico.get("nome", ""), "cognome": tecnico.get("cognome", ""), "cap_partenza": tecnico_cap(tecnico), "zona_preferita": tecnico_zona(tecnico)},
            "days": [{"date": d.isoformat(), "zona_dominante": zone_giorno[tid][d.isoformat()], "ore_residue": round(capacity[tid][d.isoformat()], 2), "viaggio_totale": round(travel_totals[tid][d.isoformat()], 2), "interventi": proposta[tid][d.isoformat()]} for d in calendar_days],
        })

    viaggio_stimato_totale = round(sum(sum(days_map.values()) for days_map in travel_totals.values()), 2)
    return {
        "start": start_day.isoformat(),
        "days": [d.isoformat() for d in calendar_days],
        "rows": rows,
        "non_pianificati": non_pianificati,
        "warnings": warnings,
        "totali": {"interventi_pool": len(interventi), "pianificati": len(interventi) - len(non_pianificati), "non_pianificati": len(non_pianificati), "warnings": len(warnings), "viaggio_stimato_totale": viaggio_stimato_totale},
    }
