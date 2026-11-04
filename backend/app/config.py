import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    
    # Vultr Serverless Inference
    VULTR_API_KEY: str = ""
    VULTR_INFERENCE_BASE_URL: str = "https://api.vultrinference.com/v1"
    DEFAULT_MODEL: str = "llama2-70b-chat"
    
    # Execution mode: auto, docker, simulator
    EXECUTION_MODE: str = "auto"
    DOCKER_SANDBOX_IMAGE: str = "containbench-agent-sandbox:latest"
    CONTAINER_TIMEOUT_SECONDS: int = 60
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

