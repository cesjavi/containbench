from app.agents.model_catalog import agent_models, chinese_lab

CATALOG = [
    {"id": "deepseek-v4.1-flash-1017", "name": "DeepSeek V4.1 Flash", "output_modalities": [{"type": "text"}]},
    {"id": "glm-5.3", "name": "GLM 5.3", "hugging_face_id": "RadixArk/GLM-5.3-NVFP4", "output_modalities": [{"type": "text"}]},
    {"id": "mimo-v2.6-pro", "name": "MiMo V2.6 Pro", "output_modalities": [{"type": "text"}]},
    {"id": "muse-glimmer-30b", "name": "Muse Glimmer 30B", "output_modalities": [{"type": "text"}]},
    {"id": "qwen-image-2.1", "name": "Qwen-Image", "output_modalities": [{"type": "image"}]},
    {"id": "qwen3-embedding-4b", "name": "Qwen Embedding", "output_modalities": [{"type": "embeddings"}]},
    {"id": "minimax-music3", "name": "MiniMax Music", "output_modalities": [{"type": "audio"}]},
]


def test_chinese_labs_are_recognized():
    assert chinese_lab("deepseek-v4.1-flash-1017") == "DeepSeek"
    assert chinese_lab("qwen3.8-flash-next", "nvidia/Qwen3.8-Flash-Next-NVFP4") == "Alibaba Qwen"
    assert chinese_lab("glm-5.3") == "Zhipu AI (GLM)"
    assert chinese_lab("mimo-v2.6-flash") == "Xiaomi MiMo"
    assert chinese_lab("minimax-m3.1-flash") == "MiniMax"
    assert chinese_lab("muse-glimmer-30b", "nvidia/Muse-Glimmer-30B-NVFP4") is None


def test_agent_models_keeps_text_models_with_chinese_first():
    models = agent_models(CATALOG)
    ids = [m["id"] for m in models]
    # Image, embedding and music models cannot drive the agent, even from Chinese labs.
    assert "qwen-image-2.1" not in ids and "qwen3-embedding-4b" not in ids and "minimax-music3" not in ids
    assert ids[-1] == "muse-glimmer-30b"
    assert all(m["chinese"] for m in models[:-1])
    assert agent_models([]) == []
