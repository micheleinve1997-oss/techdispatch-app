from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MetodoPagamento(str, Enum):
    riba = "RiBa"
    sdd = "SDD"
    bonifico = "Bonifico"
    contanti = "Contanti"


class CondizioniPagamento(str, Enum):
    trenta_fm = "30gg FM"
    sessanta_fm = "60gg FM"
    novanta_fm = "90gg FM"
    immediato = "Immediato"


class StatoCliente(str, Enum):
    bozza = "BOZZA"
    incompleto = "INCOMPLETO"
    completo = "COMPLETO"


class SedeLegale(BaseModel):
    indirizzo: str
    cap: str
    citta: str
    provincia: str
    telefono: str
    email: str
    pec: Optional[str] = None


class FatturazioneElettronica(BaseModel):
    codice_sdi: Optional[str] = None
    pec_fe: Optional[str] = None


class Contatto(BaseModel):
    ruolo: str  # manutenzione | acquisti | amministrativo | legale
    nome: str
    telefono: Optional[str] = None
    email: Optional[str] = None


class Pagamento(BaseModel):
    metodo: Optional[MetodoPagamento] = None
    condizioni: Optional[CondizioniPagamento] = None
    istituto: Optional[str] = None
    abi: Optional[str] = None
    cab: Optional[str] = None
    cc: Optional[str] = None
    iban: Optional[str] = None


class ClienteCreate(BaseModel):
    ragione_sociale: str
    codice_fiscale: Optional[str] = None
    partita_iva: Optional[str] = None
    sede_legale: Optional[SedeLegale] = None
    fatturazione_elettronica: Optional[FatturazioneElettronica] = None
    contatti: Optional[List[Contatto]] = []
    pagamento: Optional[Pagamento] = None
    note: Optional[str] = None


class ClienteUpdate(ClienteCreate):
    ragione_sociale: Optional[str] = None


class ClienteResponse(ClienteCreate):
    id: str
    codice_cliente: str
    stato: StatoCliente
    attivo: bool
    created_at: datetime
    updated_at: datetime
