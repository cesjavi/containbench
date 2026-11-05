from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"

    # Vultr Serverless Inference
    VULTR_API_KEY: str = ""
    VULTR_INFERENCE_BASE_URL: str = "https://api.vultrinference.com/v1"
    # "auto" picks the best available model from Vultr's /models list using MODEL_PREFERENCE;
    # set a concrete id to pin one.
    DEFAULT_MODEL: str = "auto"
    # Substrings tried in order when DEFAULT_MODEL is "auto" or unavailable.
    MODEL_PREFERENCE: str = "llama-3.3,llama-3.1-70b,llama-3.1,llama-3,qwen,mixtral,mistral"

    @property
    def model_preference(self) -> list:
        return [m.strip() for m in self.MODEL_PREFERENCE.split(",") if m.strip()]

    # Execution mode: auto, docker, simulator
    EXECUTION_MODE: str = "auto"
    DOCKER_SANDBOX_IMAGE: str = "containbench-agent-sandbox:latest"
    CONTAINER_TIMEOUT_SECONDS: int = 60

    # Docker network that sandboxes join when the policy allows network access.
    # It must also host the mock-receptor service (see docker/docker-compose.yml).
    DOCKER_SANDBOX_NETWORK: str = "containbench-net"
    # URL the backend uses to ask the mock receptor what it received.
    RECEPTOR_QUERY_URL: str = "http://mock-receptor.local:8080"

    # SQLite file for runs and approvals (":memory:" keeps nothing on disk)
    DATABASE_PATH: str = "data/containbench.db"

    # Security
    # Shared key required in the X-API-Key header on every /api route. Empty disables
    # the check (local development only). In Compose, nginx injects it after basic auth.
    API_KEY: str = ""
    # Comma-separated list of allowed browser origins.
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    # HMAC secret for human approval tokens. Empty = random per process.
    APPROVAL_SECRET: str = ""
    # Runs executed at the same time; extra requests get HTTP 429.
    MAX_CONCURRENT_RUNS: int = 2
    # Timeout for the backend's call to an external agent endpoint (local LLMs can be slow).
    AGENT_TIMEOUT_SECONDS: float = 120.0
    # Comma-separated hostnames the backend may call as agent_endpoint. Empty = any host.
    AGENT_ALLOWED_HOSTS: str = ""

    @property
    def agent_allowed_hosts(self) -> list:
        return [h.strip().lower() for h in self.AGENT_ALLOWED_HOSTS.split(",") if h.strip()]

    @property
    def cors_origins(self) -> list:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
