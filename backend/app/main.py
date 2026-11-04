from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router
from app.config import settings

app = FastAPI(
    title="ContainBench API",
    description="Crash-test your AI agent before production. Built for Vultr: Agent Rush Hackathon.",
    version="0.1.0"
)

# CORS: only the configured origins (settings.CORS_ORIGINS), never "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# Router
app.include_router(router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "containbench-control-api",
        "execution_mode": settings.EXECUTION_MODE,
        "vultr_inference_url": settings.VULTR_INFERENCE_BASE_URL
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to ContainBench API",
        "tagline": "Crash-test your AI agent before production",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

