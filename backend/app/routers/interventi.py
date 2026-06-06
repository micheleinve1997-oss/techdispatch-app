from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from bson import ObjectId, errors as bson_errors
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict

from app.database import db

router = APIRouter(prefix="/api/interventi", tags=["interventi"])


class OrigineIntervento(str, Enum):
    ticket = "TICKET"
    manutenzione = "MANUTENZIONE"
    preventivo = "PREVENTIVO_ACCETTATO"
    manuale = "MANUALE"


class StatoIntervento(str, Enum):
    aperto = "APERTO"
    da_pianificare = "DA_PIANIFICARE"
    pianificato = "PIANIFICATO"
    in_corso = "IN_CORSO"
    completato = "COMPLETATO"
    annullato = "ANNULLATO"


class PrioritaIntervento(str, Enum):
    bassa = "BASSA"
    media = "MEDIA"
    alta = "ALTA"
    urgente = "URGENTE"


class InterventoCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    titolo: str
    descrizione: Optional[str] = None
    origine: OrigineIntervento = OrigineIntervento.manuale
    stato: StatoIntervento = StatoIntervento.aperto
    priorita: PrioritaIntervento = PrioritaIntervento.media
    cliente_id: Optional[str] = None
    cliente_nome: Optional[str] = None
    tecnico_id: Optional[str] = None
    tecnico_nome: Optional[str] = None
    indirizzo: Optional[str] = None
    cap: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    data_richiesta: Optional[datetime] = None
    data_pianificata: Optional[datetime] = None
    riferimento_esterno: Optional[str] = None
    note: Optional[str] = None


class InterventoUpdate(InterventoCreate):
    titolo: Optional[str] = None


class InterventoResponse(InterventoCreate):
    id: str
    codice_intervento: str
    attivo: bool
    created_at: datetime
    updated_at: datetime


async def genera_codice_intervento() -> str:
    ultimo = await db.interventi.find_one(
        {"codice_intervento": {"$exists": True}},
        sort=[("codice_intervento", -1)]
    )
    if not ultimo:
        return "INT-0001"
    try:
        n = int(ultimo["codice_intervento"].split("-")[1])
        return f"INT-{(n + 1):04d}"
    except Exception:
        count = await db.interventi.count_documents({})
        return f"INT-{(count + 1):04d}"


def serialize(doc: dict) -> dict:
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    return d


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (bson_errors.InvalidId, Exception):
        raise HTTPException(status_code=404, detail="Intervento non trovato")


@router.get("/", response_model=List[InterventoResponse])
async def lista_interventi(
    stato: Optional[str] = None,
    origine: Optional[str] = None,
    attivo: bool = True,
    limit: int = Query(default=1000, ge=1, le=2000),
):
    filtro: dict = {"attivo": attivo}
    if stato:
        filtro["stato"] = stato
    if origine:
        filtro["origine"] = origine
    interventi = await db.interventi.find(filtro).sort("created_at", -1).to_list(limit)
    return [serialize(i) for i in interventi]


@router.get("/{intervento_id}", response_model=InterventoResponse)
async def get_intervento(intervento_id: str):
    doc = await db.interventi.find_one({"_id": to_object_id(intervento_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Intervento non trovato")
    return serialize(doc)


@router.post("/", response_model=InterventoResponse, status_code=status.HTTP_201_CREATED)
async def crea_intervento(intervento: InterventoCreate):
    now = datetime.now(timezone.utc)
    data = intervento.model_dump(mode="json")
    data["codice_intervento"] = await genera_codice_intervento()
    data["attivo"] = True
    data["created_at"] = now
    data["updated_at"] = now
    result = await db.interventi.insert_one(data)
    doc = await db.interventi.find_one({"_id": result.inserted_id})
    return serialize(doc)


@router.put("/{intervento_id}", response_model=InterventoResponse)
async def aggiorna_intervento(intervento_id: str, intervento: InterventoUpdate):
    oid = to_object_id(intervento_id)
    doc = await db.interventi.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Intervento non trovato")
    aggiornamenti = {k: v for k, v in intervento.model_dump(mode="json").items() if v is not None}
    aggiornamenti["updated_at"] = datetime.now(timezone.utc)
    await db.interventi.update_one({"_id": oid}, {"$set": aggiornamenti})
    doc = await db.interventi.find_one({"_id": oid})
    return serialize(doc)


@router.patch("/{intervento_id}/stato")
async def aggiorna_stato(intervento_id: str, body: dict):
    stato = body.get("stato")
    if stato not in [s.value for s in StatoIntervento]:
        raise HTTPException(status_code=400, detail="Stato non valido")
    await db.interventi.update_one(
        {"_id": to_object_id(intervento_id)},
        {"$set": {"stato": stato, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True}


@router.delete("/{intervento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def elimina_intervento(intervento_id: str):
    oid = to_object_id(intervento_id)
    doc = await db.interventi.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Intervento non trovato")
    await db.interventi.update_one(
        {"_id": oid},
        {"$set": {"attivo": False, "updated_at": datetime.now(timezone.utc)}}
    )
