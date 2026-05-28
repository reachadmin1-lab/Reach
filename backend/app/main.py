from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, brand, chat, creators, dashboard, notifications, onboarding, orders, packages, portfolio

app = FastAPI(
    title="Reach API",
    description="Escrow-secured influencer marketplace API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(packages.router)
app.include_router(portfolio.router)
app.include_router(creators.router)
app.include_router(orders.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(brand.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
