"""
llm_config.py
Centralized LLM initialization for the multi-agent system.

Uses Groq's free API with llama-3.3-70b-versatile for fast,
reliable structured reasoning across all agents.
"""

from __future__ import annotations

import os
import logging
from pathlib import Path

from dotenv import load_dotenv

log = logging.getLogger("nerve.llm")

# ── Load .env from the backend directory ────────────────────────
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

# ── Singleton LLM instance ──────────────────────────────────────
_llm_instance = None
_llm_available = False

MODEL_ID = "llama-3.3-70b-versatile"


def get_llm():
    """
    Return a shared ChatGroq instance.
    Returns None if the API key is missing or initialization fails.
    """
    global _llm_instance, _llm_available

    if _llm_instance is not None:
        return _llm_instance

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        log.warning("GROQ_API_KEY not found in environment. LLM agents disabled.")
        _llm_available = False
        return None

    try:
        from langchain_groq import ChatGroq

        _llm_instance = ChatGroq(
            model=MODEL_ID,
            api_key=api_key,
            temperature=0.1,        # Deterministic for reliability
            max_tokens=2048,
            request_timeout=30,     # Don't block scan loop too long
        )
        _llm_available = True
        log.info("LLM initialized: %s via Groq", MODEL_ID)
        return _llm_instance

    except Exception as e:
        log.error("Failed to initialize LLM: %s", e)
        _llm_available = False
        return None


def is_llm_available() -> bool:
    """Check if the LLM is available (key present + init succeeded)."""
    if _llm_instance is not None:
        return True
    # Try to initialize
    get_llm()
    return _llm_available
