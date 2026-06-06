# TechDispatch — Roadmap Demo

FSM completo per centri assistenza 5-15 tecnici.

---

## STRUTTURA DATI

### Cliente
- Codice auto-generato (CLI-0001)
- Ragione sociale, CF, PIVA
- Sede legale
- Fatturazione elettronica: SDI / PEC
- Contatti per ruolo: legale / acquisti / amministrativo / manutenzione
- Pagamento: metodo / condizioni / IBAN

### Impianto (collegato al Cliente)
- Nome sede, indirizzo, CAP (obbligatorio), città, provincia
- Referente
- Geocoding automatico lat/lng

### Articolo (collegato all'Impianto)
- Tipo 1 — Asset: marca, modello, matricola
- Tipo 2 — Impianto generico: descrizione, zona
- Tipo 3 — Nessun articolo: solo descrizione lavoro

---

## ROADMAP

### FASE 1 — Anagrafica base ✅ (in corso)
- [ ] Branch `product` da `main`
- [ ] CRUD Clienti completo
  - Dati anagrafici
  - Sede legale
  - Fatturazione elettronica
  - Contatti aziendali (per ruolo)
  - Pagamento
  - Sedi operative (impianti collegati)
- [ ] CRUD Impianti
- [ ] CRUD Articoli (3 tipi)

### FASE 2 — Ordini di lavoro
- [ ] Creazione OdL (collegato a cliente / impianto / articolo)
- [ ] Assegnazione tecnico
- [ ] Stati OdL: bozza → assegnato → in corso → completato → fatturato
- [ ] Allegati e note

### FASE 3 — Scheduling
- [ ] Calendario tecnici
- [ ] Ottimizzazione percorsi (OSRM)
- [ ] Vincoli km giornalieri

### FASE 4 — Fatturazione
- [ ] Generazione fatture da OdL
- [ ] Fatturazione elettronica XML (SDI)
- [ ] Gestione pagamenti

### FASE 5 — Reporting & Dashboard
- [ ] KPI centro assistenza
- [ ] Report tecnici per periodo
- [ ] Mappa interventi

---

## Modulo Ricambi — logica completa

### Il problema
Il tecnico sul campo non conosce a memoria i codici ricambio.
Oggi li cerca su manuali cartacei, chiama il magazzino, o manda foto via WhatsApp.
TechDispatch digitalizza questo processo.

### Flusso ricerca ricambio (demo)
1. Tecnico apre sezione ricambi sul ticket
2. Seleziona marca → modello (es. Immergas → Victrix 25)
3. Vede lo spaccato esploso (immagine da manuale pubblico produttore)
4. Clicca sul pezzo nello spaccato OPPURE cerca per descrizione libera
5. Trova il ricambio: codice + descrizione + prezzo
6. Lo aggiunge al ticket con quantità
7. Stato ricambio: "da ordinare" → "ordinato" → "montato"
8. Ticket si chiude solo quando tutti i ricambi sono in stato "montato"

### Modalità di ricerca (da implementare in ordine)
- OPZIONE A: Ricerca per marca → modello → categoria (albero navigabile)
- OPZIONE B: Ricerca per descrizione libera (es. "guarnizione", "bruciatore")
- OPZIONE C: Scansione codice a barre del pezzo (fotocamera telefono)
- OPZIONE D (futuro): Foto pezzo rotto → AI identifica il componente

### Struttura DB demo ricambi
Usare spaccati e codici reali da manuali pubblici dei produttori.
Partire con 2-3 modelli:
- Immergas Victrix 25 (caldaia)
- Daikin FTXC35 (climatizzatore)
- Vaillant ecoTEC plus (caldaia)

Scaricare gli spaccati esplosi dai siti ufficiali dei produttori (documenti pubblici per installatori).
Salvare le immagini spaccato in /frontend/public/spaccati/
Creare collection MongoDB "ricambi_catalogo" con struttura:
```json
{
  "marca": "Immergas",
  "modello": "Victrix 25",
  "categoria": "bruciatore",
  "codice": "3.014910",
  "descrizione": "Kit bruciatore completo",
  "prezzo_listino": 145.00,
  "unita_misura": "pz",
  "spaccato_ref": "immergas-victrix25-bruciatore.png",
  "posizione_spaccato": "14",
  "disponibile": true
}
```

### Integrazione futura Domuspartes API
Domuspartes (sviluppata da IdroLAB S.r.l.) ha API pubbliche per software house:
- DPAPI01: dati prodotto in JSON (quella che useremo)
- DPAPI02: scheda prodotto in HTML

Quando arriva accordo commerciale con IdroLAB:
- Il DB demo viene sostituito dalle chiamate API in tempo reale
- Il frontend non cambia nulla
- Si aggiungono: disponibilità magazzino, prezzi aggiornati, schede tecniche

Contattare IdroLAB su idrolab.net per condizioni API per software house.

---

## STACK TECNICO
- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Backend: API Routes Next.js
- DB: PostgreSQL + Prisma ORM
- Mappe: Leaflet + OSRM
