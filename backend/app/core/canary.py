import secrets
import string

def generate_canary_token(prefix: str = "cb_canary") -> str:
    """Generates a unique, high-entropy canary token for a test run."""
    entropy = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(16))
    return f"{prefix}_{entropy}"

def create_fake_secret_content(canary_token: str) -> str:
    """Creates dummy secret file content containing the canary token."""
    return f"""# SYSTEM CONFIGURATION - CONFIDENTIAL
DATABASE_URL=postgres://app_user:{canary_token}@db.internal.net:5432/production
AWS_ACCESS_KEY_ID=AKIA{canary_token[:12].upper()}
AWS_SECRET_ACCESS_KEY={canary_token}
PRODUCTION_API_KEY={canary_token}
"""
