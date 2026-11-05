"""
Which models in the inference catalog can act as the agent under test, and who made them.

Used to offer a model picker (with Chinese LLMs grouped) for the built-in LLM agent. The
catalog comes from the provider's /models endpoint; nothing here calls the network.
"""
from typing import Any, Dict, List, Optional

from app.core.vultr_client import VultrInferenceClient

# (substring of the model id or Hugging Face id, lab). Checked in order, lowercase.
CHINESE_LABS = (
    ("deepseek", "DeepSeek"),
    ("qwen", "Alibaba Qwen"),
    ("qwq", "Alibaba Qwen"),
    ("glm", "Zhipu AI (GLM)"),
    ("zai-org", "Zhipu AI (GLM)"),
    ("mimo", "Xiaomi MiMo"),
    ("minimax", "MiniMax"),
    ("kimi", "Moonshot AI (Kimi)"),
    ("moonshot", "Moonshot AI (Kimi)"),
    ("hunyuan", "Tencent Hunyuan"),
    ("ernie", "Baidu ERNIE"),
    ("doubao", "ByteDance Doubao"),
    ("seed-oss", "ByteDance Seed"),
    ("baichuan", "Baichuan"),
    ("01-ai", "01.AI (Yi)"),
    ("stepfun", "StepFun"),
    ("internlm", "Shanghai AI Lab (InternLM)"),
    ("longcat", "Meituan LongCat"),
    ("ling-", "Ant Group (Ling)"),
)


def chinese_lab(model_id: str, hf_id: Optional[str] = None) -> Optional[str]:
    """The Chinese lab behind a model, or None when it is not a known Chinese model."""
    haystack = f"{model_id} {hf_id or ''}".lower()
    for term, lab in CHINESE_LABS:
        if term in haystack:
            return lab
    return None


def _is_text_model(entry: Dict[str, Any]) -> bool:
    model_id = entry.get("id") or ""
    if not model_id or not VultrInferenceClient.is_chat_model(model_id):
        return False
    outputs = entry.get("output_modalities")
    if isinstance(outputs, list) and outputs:
        return any(isinstance(o, dict) and o.get("type") == "text" for o in outputs)
    return True


def agent_models(catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Text models that can drive the agent, Chinese ones first, each with its display name
    and lab. `catalog` is the "data" list of an OpenAI-compatible /models response.
    """
    models = []
    for entry in catalog or []:
        if not isinstance(entry, dict) or not _is_text_model(entry):
            continue
        lab = chinese_lab(entry["id"], entry.get("hugging_face_id"))
        models.append({
            "id": entry["id"],
            "name": entry.get("name") or entry["id"],
            "lab": lab,
            "chinese": lab is not None,
        })
    return sorted(models, key=lambda m: (not m["chinese"], m["lab"] or "", m["id"]))
