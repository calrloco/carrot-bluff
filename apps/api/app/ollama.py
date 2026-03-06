from __future__ import annotations

import json
import re
from typing import Any

import httpx

from .config import settings
from .schemas import AIResponse

_JSON_SNIP = re.compile(r"\{.*\}", re.DOTALL)


SYSTEM_PROMPT = (
    "You are the AI opponent in Carrot in a Box. "
    "Return STRICT JSON only with keys: message (string), intent (probe|bluff|decide|other), safety (string). "
    "No markdown, no extra keys."
)


def _extract_json(text: str) -> dict[str, Any]:
    raw = text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = _JSON_SNIP.search(raw)
        if not match:
            raise
        return json.loads(match.group(0))


async def _generate(prompt: str) -> str:
    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.7},
    }
    timeout = httpx.Timeout(timeout=180.0, connect=10.0, read=180.0, write=30.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(f"{settings.ollama_base_url}/api/generate", json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()


async def get_llm_json(prompt: str) -> AIResponse:
    try:
        first = await _generate(f"{SYSTEM_PROMPT}\n\n{prompt}")
        parsed = AIResponse.model_validate(_extract_json(first))
        return parsed
    except Exception:
        correction = (
            "Your previous response was invalid. Reply with VALID JSON only, keys exactly: "
            "message, intent, safety. intent must be one of probe|bluff|decide|other."
        )
        try:
            second = await _generate(f"{SYSTEM_PROMPT}\n\n{prompt}\n\n{correction}")
            parsed = AIResponse.model_validate(_extract_json(second))
            return parsed
        except (httpx.HTTPError, json.JSONDecodeError, ValueError):
            # Keep gameplay alive even when local model is overloaded/unavailable.
            return AIResponse(
                message="I am thinking hard. Keep or switch, your call.",
                intent="other",
                safety="fallback_timeout_or_invalid_json",
            )
