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


def test_explanation_json_with_extra_text_is_rendered():
    render = VultrInferenceClient._render_evaluator_output
    body = '{"scenario_id": "CB-001", "verdict": "PASS", "summary": "Read denied (evt_1)."}'
    assert render(body + "\n\nLet me know if you need more.", "PASS") == "Read denied (evt_1)."
    assert render("Here is the analysis:\n```json\n" + body + "\n```", "PASS") == "Read denied (evt_1)."
    # Cut-off JSON never reaches the UI raw.
    assert render('{"scenario_id": "CB-001", "verdict": "PASS", "summary": "Read den', "PASS") is None


def _fake_vultr(monkeypatch, chat_status):
    """Model list always answers (it is public); chat answers chat_status. Counts chat calls."""
    import httpx
    calls = {"chat": 0}

    class FakeClient:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, **kw):
            return httpx.Response(200, json={"data": [{"id": "qwen3.8-27b"}]})

        async def post(self, url, **kw):
            calls["chat"] += 1
            if chat_status == 200:
                return httpx.Response(200, json={"choices": [{"message": {"content": "p"}, "finish_reason": "length"}]})
            return httpx.Response(chat_status, json={"error": {"message": "Invalid API key"}})

    monkeypatch.setattr("app.core.vultr_client.httpx.AsyncClient", FakeClient)
    return calls


def test_health_reports_rejected_key_even_though_models_list(monkeypatch):
    _fake_vultr(monkeypatch, 401)
    status = asyncio.run(VultrInferenceClient(api_key="wrong", base_url="https://x/v1").check_health())
    assert status["connected"] is False and status["status"] == "auth_error"


def test_health_verifies_key_once_per_cache_window(monkeypatch):
    calls = _fake_vultr(monkeypatch, 200)
    client = VultrInferenceClient(api_key="good", base_url="https://x/v1")
    first = asyncio.run(client.check_health())
    asyncio.run(client.check_health())
    assert first["connected"] is True and first["status"] == "healthy"
    assert calls["chat"] == 1                      # second check used the cached result


def test_real_401_flips_health_immediately(monkeypatch):
    calls = _fake_vultr(monkeypatch, 200)
    client = VultrInferenceClient(api_key="good", base_url="https://x/v1")
    assert asyncio.run(client.check_health())["connected"] is True
    client._record_auth(401)                       # e.g. the key was revoked mid-session
    assert asyncio.run(client.check_health())["status"] == "auth_error"


def test_report_fence_is_unwrapped_but_inner_code_blocks_survive():
    from app.core.vultr_client import VultrInferenceClient as C
    wrapped = "```markdown\n# Report\n\n```bash\nls\n```\n\nDone\n```"
    assert C._unwrap_markdown_fence(wrapped) == "# Report\n\n```bash\nls\n```\n\nDone"
    assert C._unwrap_markdown_fence("# Plain report\n") == "# Plain report"
    assert C._unwrap_markdown_fence(None) is None
