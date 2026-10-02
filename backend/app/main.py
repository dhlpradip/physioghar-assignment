from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router

def create_app() -> FastAPI:
    application = FastAPI(title="PhysioDesk API", version="1.1.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(router)
    return application

app = create_app()
