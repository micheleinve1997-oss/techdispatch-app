from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId

from app.database import db

router = APIRouter(prefix="/api/vincoli", tags=["vincoli"])


class VincoloCreate(BaseModel):
    tecnico_id: str
    cliente_id: str
    tipo: str = "BLOCCO"
    motivo: Optional[str] = ""


class VincoloUpdate(BaseModel):
    tipo: Optional[str] = None
    motivo: Optional[str] = None
    attivo: Optional[bool] = None


def serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


async def enrich(doc: dict) -> dict:
    tecnico = await db.tecnici.find_one({"_id": ObjectId(doc["tecnico_id"])}) if doc.get("tecnico_id") else None
    cliente = await db.clienti.find_one({"_id": ObjectId(doc["cliente_id"])}) if doc.get("cliente_id") else None
    data = serialize(doc)
    data["tecnico"] = {
        "id": str(tecnico["_id"]),
        "codice_tecnico": tecnico.get("codice_tecnico", ""),
        "nome": tecnico.get("nome", ""),
        "cognome": tecnico.get("cognome", ""),
    } if tecnico else None
    data["cliente"] = {
        "id": str(cliente["_id"]),
        "codice_cliente": cliente.get("codice_cliente", ""),
        "ragione_sociale": cliente.get("ragione_sociale", ""),
        "partita_iva": cliente.get("partita_iva", ""),
        "codice_fiscale": cliente.get("codice_fiscale", ""),
    } if cliente else None
    return data


@router.get("/")
async def lista_vincoli(attivo: bool = True):
    docs = await db.vincoli.find({"attivo": attivo}).sort("created_at", -1).to_list(1000)
    return [await enrich(d) for d in docs]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def crea_vincolo(vincolo: VincoloCreate):
    tecnico = await db.tecnici.find_one({"_id": ObjectId(vincolo.tecnico_id), "attivo": True})
    cliente = await db.clienti.find_one({"_id": ObjectId(vincolo.cliente_id), "attivo": True})
    if not tecnico:
        raise HTTPException(status_code=404, detail="Tecnico non trovato")
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")

    existing = await db.vincoli.find_one({
        "tecnico_id": vincolo.tecnico_id,
        "cliente_id": vincolo.cliente_id,
        "tipo": vincolo.tipo,
        "attivo": True,
    })
    if existing:
        raise HTTPException(status_code=409, detail="Vincolo già presente")

    now = datetime.now(timezone.utc)
    data = vincolo.model_dump()
    data["cliente_snapshot"] = {
        "ragione_sociale": cliente.get("ragione_sociale", ""),
        "partita_iva": cliente.get("partita_iva", ""),
        "codice_fiscale": cliente.get("codice_fiscale", ""),
    }
    data["tecnico_snapshot"] = {
        "nome": tecnico.get("nome", ""),
        "cognome": tecnico.get("cognome", ""),
        "codice_tecnico": tecnico.get("codice_tecnico", ""),
    }
    data["attivo"] = True
    data["created_at"] = now
    data["updated_at"] = now
    result = await db.vincoli.insert_one(data)
    doc = await db.vincoli.find_one({"_id": result.inserted_id})
    return await enrich(doc)


@router.put("/{vincolo_id}")
async def aggiorna_vincolo(vincolo_id: str, vincolo: VincoloUpdate):
    doc = await db.vincoli.find_one({"_id": ObjectId(vincolo_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Vincolo non trovato")
    data = {k: v for k, v in vincolo.model_dump().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc)
    await db.vincoli.update_one({"_id": ObjectId(vincolo_id)}, {"$set": data})
    doc = await db.vincoli.find_one({"_id": ObjectId(vincolo_id)})
    return await enrich(doc)


@router.delete("/{vincolo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def elimina_vincolo(vincolo_id: str):
    doc = await db.vincoli.find_one({"_id": ObjectId(vincolo_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Vincolo non trovato")
    await db.vincoli.update_one(
        {"_id": ObjectId(vincolo_id)},
        {"$set": {"attivo": False, "updated_at": datetime.now(timezone.utc)}}
    )
