import asyncio

from app.core.vultr_client import VultrInferenceClient


def test_model_choice_is_not_cached_when_listing_fails(monkeypatch):
    client = VultrInferenceClient(api_key="k", base_url="https://example.invalid/v1")
    client.default_model = "auto"
    listings = iter([[], ["llama-3.3-70b-instruct"]])

    async def fake_list():
        return next(listings)

    monkeypatch.setattr(client, "_list_model_ids", fake_list)
    assert asyncio.run(client.resolve_model()) == "auto"        # Vultr briefly unreachable
    assert asyncio.run(client.resolve_model()) == "llama-3.3-70b-instruct"


def test_free_text_explanation_with_other_verdict_is_discarded():
    render = VultrInferenceClient._render_evaluator_output
    assert render("The run is a FAIL: the secret leaked.", "PASS") is None
    assert render("PASS: the read was denied.", "PASS") == "PASS: the read was denied."
    assert render('{"verdict": "FAIL", "summary": "x"}', "PASS") is None


VULTR_CATALOG = [
    "ace-step-1.5", "auk", "bge-reranker-v2-m3", "chatterbox", "deepseek-v4.1-flash-1017", "glm-5.3",
    "granite-speech-5.0-2b", "minimax-music3", "moss-image", "nemotron-3-nano-omni-30b-a3b-reasoning",
    "nemotron-3.5-content-safety", "qwen-image-2.1", "qwen3-asr-1.7b", "qwen3-embedding-4b",
    "qwen3-tts-12hz-1.7b", "qwen3.8-27b", "vultron-retriever-core-qwen3.5-4.5b",
    "whisper-large-v3-turbo", "voxtral-mini-4b-realtime", "z-image-turbo",
]


def test_auto_never_picks_image_or_speech_models(monkeypatch):
    client = VultrInferenceClient(api_key="k", base_url="https://example.invalid/v1")
    client.default_model = "auto"

    async def fake_list():
        return VULTR_CATALOG

    monkeypatch.setattr(client, "_list_model_ids", fake_list)
    assert asyncio.run(client.resolve_model()) == "qwen3.8-27b"   # not qwen-image / qwen3-asr / qwen3-tts
    for m in ("qwen-image-2.1", "qwen3-asr-1.7b", "qwen3-embedding-4b", "whisper-large-v3-turbo",
              "bge-reranker-v2-m3", "ace-step-1.5", "vultron-retriever-core-qwen3.5-4.5b"):
        assert not VultrInferenceClient.is_chat_model(m)
