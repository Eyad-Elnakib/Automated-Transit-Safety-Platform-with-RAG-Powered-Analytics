"""
config.py — Centralised configuration for the Bus Monitoring RAG system.

Reads all values from environment variables (via .env file).
Import `settings` from this module everywhere else.
"""

import os
import ssl
import logging
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

# ---------------------------------------------------------------------------
# Logging — configure once here so every module inherits the same format
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def _require(key: str) -> str:
    """Return env var value or raise a descriptive error."""
    value = os.getenv(key)
    if not value:
        raise EnvironmentError(
            f"Required environment variable '{key}' is not set. "
            "Copy .env.example to .env and fill in your credentials."
        )
    return value


@dataclass(frozen=True)
class Settings:
    # MongoDB
    mongodb_uri: str = field(default_factory=lambda: _require("MONGODB_URI"))
    mongodb_database: str = field(
        default_factory=lambda: os.getenv("MONGODB_DATABASE", "driver-monitoring")
    )
    mongodb_collection: str = field(
        default_factory=lambda: os.getenv("MONGODB_COLLECTION", "trips")
    )

    # Groq
    groq_api_key: str = field(default_factory=lambda: _require("GROQ_API_KEY"))
    groq_model: str = field(
        default_factory=lambda: os.getenv("GROQ_MODEL", "llama3-8b-8192")
    )

    # Embeddings
    embedding_model: str = field(
        default_factory=lambda: os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    )
    embedding_dim: int = 384  # matches all-MiniLM-L6-v2 output dimension

    # Vector search
    vector_index_name: str = field(
        default_factory=lambda: os.getenv("VECTOR_INDEX_NAME", "trip_vector_index")
    )
    top_k: int = field(
        default_factory=lambda: int(os.getenv("TOP_K", "5"))
    )

    # Generation
    max_tokens: int = 1024
    temperature: float = 0.2   # low temperature → factual, grounded answers


# Singleton — import this everywhere
settings = Settings()


def get_mongo_client() -> MongoClient:
    """
    Return a MongoClient with TLS settings that work on Linux servers
    where the default OpenSSL may trigger TLSV1_ALERT_INTERNAL_ERROR.
    """
    return MongoClient(
        settings.mongodb_uri,
        tls=True,
        tlsAllowInvalidCertificates=True,   # bypasses cert hostname check on strict OpenSSL
        serverSelectionTimeoutMS=30_000,
        connectTimeoutMS=20_000,
        socketTimeoutMS=20_000,
    )
