from fastapi import APIRouter, HTTPException, status
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from pydantic import BaseModel
from enum import Enum

from app.database import db

router = APIRouter(prefix="/api/tecnici", tags=["tecnici"])


class StatoTecnico(str, Enum):
    attivo = "ATTIVO"
    non_disponibile = "NON_DISPONIBILE"
    in_ferie = "IN_FERIE"


class TipoPartenza(str, Enum):
    casa = "casa"
    ditta = "ditta"


SPECIALIZZAZIONI_VALIDE = [
    "Caldaie e riscaldamento",
    "Climatizzatori e pompe di calore",
    "Impianti idrici e termoidraulica",
    "Elettrico e domotica",
    "Energie rinnovabili",
    "Antincendio e sicurezza",
    "Ventilazione e UTA",
    "Ascensori e montacarichi",
]


class SedePartenza(BaseModel):
    tipo: TipoPartenza = TipoPartenza.ditta
    indirizzo: Optional[str] = None
    cap: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class TecnicoCreate(BaseModel):
    nome: str
    cognome: str
    telefono: Optional[str] = None
    email: Optional[str] = None
    specializzazioni: List[str] = []
    sede_partenza: Optional[SedePartenza] = None
    patente: bool = True
    mezzo_proprio: bool = False
    stato: StatoTecnico = StatoTecnico.attivo
    note: Optional[str] = None


class TecnicoUpdate(TecnicoCreate):
    nome: Optional[str] = None
    cognome: Optional[str] = None


class TecnicoResponse(TecnicoCreate):
    id: str
    codice_tecnico: str
    created_at: datetime
    updated_at: datetime


def serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def genera_codice_tecnico() -> str:
    ultimo = await db.tecnici.find_one(
        {"codice_tecnico": {"$exists": True}},
        sort=[("codice_tecnico", -1)]
    )
    if not ultimo:
        return "TEC-001"
    try:
        n = int(ultimo["codice_tecnico"].split("-")[1])
        return f"TEC-{(n + 1):03d}"
    except Exception:
        count = await db.tecnici.count_documents({"attivo": True})
        return f"TEC-{(count + 1):03d}"


@router.get("/specializzazioni")
def lista_specializzazioni():
    return SPECIALIZZAZIONI_VALIDE


@router.get("/", response_model=List[TecnicoResponse])
async def lista_tecnici(stato: Optional[str] = None):
    filtro: dict = {"attivo": True}
    if stato:
        filtro["stato"] = stato
    tecnici = await db.tecnici.find(filtro).sort("cognome", 1).to_list(500)
    return [serialize(t) for t in tecnici]


@router.get("/{tecnico_id}", response_model=TecnicoResponse)
async def get_tecnico(tecnico_id: str):
    doc = await db.tecnici.find_one({"_id": ObjectId(tecnico_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Tecnico non trovato")
    return serialize(doc)


@router.post("/", response_model=TecnicoResponse, status_code=status.HTTP_201_CREATED)
async def crea_tecnico(tecnico: TecnicoCreate):
    now = datetime.now(timezone.utc)
    data = tecnico.model_dump()
    data["codice_tecnico"] = await genera_codice_tecnico()
    data["attivo"] = True
    data["created_at"] = now
    data["updated_at"] = now
    result = await db.tecnici.insert_one(data)
    doc = await db.tecnici.find_one({"_id": result.inserted_id})
    return serialize(doc)


@router.put("/{tecnico_id}", response_model=TecnicoResponse)
async def aggiorna_tecnico(tecnico_id: str, tecnico: TecnicoUpdate):
    doc = await db.tecnici.find_one({"_id": ObjectId(tecnico_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Tecnico non trovato")
    aggiornamenti = {k: v for k, v in tecnico.model_dump().items() if v is not None}
    aggiornamenti["updated_at"] = datetime.now(timezone.utc)
    await db.tecnici.update_one({"_id": ObjectId(tecnico_id)}, {"$set": aggiornamenti})
    doc = await db.tecnici.find_one({"_id": ObjectId(tecnico_id)})
    return serialize(doc)


@router.patch("/{tecnico_id}/stato")
async def aggiorna_stato(tecnico_id: str, body: dict):
    stato = body.get("stato")
    if stato not in [s.value for s in StatoTecnico]:
        raise HTTPException(status_code=400, detail="Stato non valido")
    await db.tecnici.update_one(
        {"_id": ObjectId(tecnico_id)},
        {"$set": {"stato": stato, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True}


@router.patch("/{tecnico_id}/geo")
async def salva_geo(tecnico_id: str, body: dict):
    lat = body.get("lat")
    lng = body.get("lng")
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="lat e lng obbligatori")
    await db.tecnici.update_one(
        {"_id": ObjectId(tecnico_id)},
        {"$set": {"sede_partenza.lat": lat, "sede_partenza.lng": lng, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True}


@router.delete("/{tecnico_id}", status_code=status.HTTP_204_NO_CONTENT)
async def elimina_tecnico(tecnico_id: str):
    doc = await db.tecnici.find_one({"_id": ObjectId(tecnico_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Tecnico non trovato")
    await db.tecnici.update_one(
        {"_id": ObjectId(tecnico_id)},
        {"$set": {"attivo": False, "updated_at": datetime.now(timezone.utc)}}
    )
