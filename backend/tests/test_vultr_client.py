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
