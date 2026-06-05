from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId

from app.database import db
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse, StatoCliente

router = APIRouter(prefix="/api/clienti", tags=["clienti"])


def calcola_stato(cliente: dict) -> StatoCliente:
    sl = cliente.get("sede_legale") or {}
    fe = cliente.get("fatturazione_elettronica") or {}
    pag = cliente.get("pagamento") or {}

    campi_obbligatori = [
        cliente.get("ragione_sociale"),
        cliente.get("partita_iva"),
        cliente.get("codice_fiscale"),
        sl.get("indirizzo"),
        sl.get("cap"),
        sl.get("citta"),
        sl.get("provincia"),
        fe.get("codice_sdi") or fe.get("pec_fe"),
        pag.get("metodo"),
        pag.get("condizioni"),
    ]
    if all(campi_obbligatori):
        return StatoCliente.completo
    if cliente.get("ragione_sociale") and (sl.get("cap") or sl.get("citta")):
        return StatoCliente.incompleto
    return StatoCliente.bozza


async def genera_codice_cliente() -> str:
    count = await db.clienti.count_documents({})
    return f"CLI-{str(count + 1).zfill(4)}"


def serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/", response_model=List[ClienteResponse])
async def lista_clienti(stato: Optional[str] = None, attivo: bool = True):
    filtro = {"attivo": attivo, "ragione_sociale": {"$exists": True}}
    if stato:
        filtro["stato"] = stato
    clienti = await db.clienti.find(filtro).sort("ragione_sociale", 1).to_list(1000)
    result = []
    for c in clienti:
        try:
            result.append(serialize(c))
        except Exception:
            pass
    return result


@router.get("/{cliente_id}", response_model=ClienteResponse)
async def get_cliente(cliente_id: str):
    doc = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return serialize(doc)


@router.get("/check-duplicato")
async def check_duplicato(partita_iva: Optional[str] = None, codice_fiscale: Optional[str] = None, escludi_id: Optional[str] = None):
    """Controlla se esiste già un cliente con la stessa P.IVA o CF."""
    if not partita_iva and not codice_fiscale:
        return {"duplicato": False}
    filtro: dict = {"attivo": True}
    condizioni = []
    if partita_iva and partita_iva.strip():
        condizioni.append({"partita_iva": partita_iva.strip()})
    if codice_fiscale and codice_fiscale.strip():
        condizioni.append({"codice_fiscale": codice_fiscale.strip()})
    if not condizioni:
        return {"duplicato": False}
    filtro["$or"] = condizioni
    doc = await db.clienti.find_one(filtro)
    if not doc:
        return {"duplicato": False}
    if escludi_id and str(doc["_id"]) == escludi_id:
        return {"duplicato": False}
    return {
        "duplicato": True,
        "cliente": {
            "id": str(doc["_id"]),
            "codice_cliente": doc.get("codice_cliente", ""),
            "ragione_sociale": doc.get("ragione_sociale", ""),
        }
    }


@router.post("/", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
async def crea_cliente(cliente: ClienteCreate):
    now = datetime.now(timezone.utc)
    data = cliente.model_dump()
    data["codice_cliente"] = await genera_codice_cliente()
    data["stato"] = calcola_stato(data)
    data["attivo"] = True
    data["created_at"] = now
    data["updated_at"] = now
    result = await db.clienti.insert_one(data)
    doc = await db.clienti.find_one({"_id": result.inserted_id})
    return serialize(doc)


@router.put("/{cliente_id}", response_model=ClienteResponse)
async def aggiorna_cliente(cliente_id: str, cliente: ClienteUpdate):
    doc = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    aggiornamenti = {k: v for k, v in cliente.model_dump().items() if v is not None}
    merged = {**doc, **aggiornamenti}
    aggiornamenti["stato"] = calcola_stato(merged)
    aggiornamenti["updated_at"] = datetime.now(timezone.utc)
    await db.clienti.update_one({"_id": ObjectId(cliente_id)}, {"$set": aggiornamenti})
    doc = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
    return serialize(doc)


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
async def elimina_cliente(cliente_id: str):
    doc = await db.clienti.find_one({"_id": ObjectId(cliente_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    await db.clienti.update_one(
        {"_id": ObjectId(cliente_id)},
        {"$set": {"attivo": False, "updated_at": datetime.now(timezone.utc)}}
    )
