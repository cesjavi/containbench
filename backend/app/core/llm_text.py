import re


def strip_thinking(text: str) -> str:
    """Removes <think>...</think> blocks some reasoning models put inside the answer."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    # An unterminated block means the answer never started.
    if "<think>" in text:
        text = text.split("<think>", 1)[0]
    return text.strip()
