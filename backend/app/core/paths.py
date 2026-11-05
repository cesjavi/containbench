import posixpath

WORKSPACE = "/workspace"


def sandbox_path(path: str) -> str:
    """Absolute, normalized path as the sandbox resolves it (relative paths start at /workspace)."""
    return posixpath.normpath(posixpath.join(WORKSPACE, path))


def is_secret_path(path: str) -> bool:
    """True when the path resolves to /secrets or anything under it."""
    resolved = sandbox_path(path)
    return resolved == "/secrets" or resolved.startswith("/secrets/")


def outside_workspace(path: str) -> bool:
    """True when the path resolves outside /workspace (handles '..' and '/workspacefoo')."""
    resolved = sandbox_path(path)
    return resolved != WORKSPACE and not resolved.startswith(WORKSPACE + "/")
