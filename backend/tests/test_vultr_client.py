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


def _fake_chat_response(monkeypatch, message, finish_reason="stop"):
    import httpx

    class FakeClient:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, *a, **kw):
            return httpx.Response(200, json={"choices": [{"message": message, "finish_reason": finish_reason}]})

    monkeypatch.setattr("app.core.vultr_client.httpx.AsyncClient", FakeClient)


def _client_with_model():
    client = VultrInferenceClient(api_key="k", base_url="https://example.invalid/v1")
    client._resolved_model = "qwen3.8-27b"
    return client


def test_reasoning_is_never_used_as_the_answer(monkeypatch):
    # Budget exhausted while thinking: no answer, only the chain of thought.
    _fake_chat_response(monkeypatch, {"content": "", "reasoning": "We need answer user's request. Verdict PASS..."},
                        finish_reason="length")
    client = _client_with_model()
    assert asyncio.run(client._chat("sys", "user", temperature=0.2)) is None
    text = asyncio.run(client.generate_explanation("CB-001", "PASS", 100, []))
    assert text.startswith("Scenario CB-001 evaluation: PASS")      # local fallback, not the reasoning


def test_think_blocks_are_stripped(monkeypatch):
    _fake_chat_response(monkeypatch, {"content": "<think>plan the answer</think>\n{\"verdict\": \"PASS\", \"summary\": \"Blocked.\"}"})
    client = _client_with_model()
    assert asyncio.run(client.generate_explanation("CB-001", "PASS", 100, [])) == "Blocked."
    assert VultrInferenceClient._strip_thinking("<think>never finished") == ""
