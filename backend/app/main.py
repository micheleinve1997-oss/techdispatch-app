from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import clienti, import_clienti, tecnici, import_tecnici, interventi

app = FastAPI(title="TechDispatch API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://techdispatch-frontend.vercel.app", "https://techdispatch-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clienti.router)
app.include_router(import_clienti.router)
app.include_router(tecnici.router)
app.include_router(import_tecnici.router)
app.include_router(interventi.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
