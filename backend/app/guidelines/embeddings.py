import logging
import uuid
from functools import cache

import chromadb
from sentence_transformers import SentenceTransformer


@cache
def _get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path='./chroma_db')


@cache
def _get_collection():
    return _get_chroma_client().get_or_create_collection(name='nutrition_guidelines')


@cache
def _get_embedding_model() -> SentenceTransformer:
    logging.getLogger('sentence_transformers').setLevel(logging.ERROR)
    return SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200,
) -> list[str]:
    chunks = []

    start = 0

    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap

    return chunks


async def embed_and_store_guideline(
    url: str,
    text: str,
) -> int:
    """
    1. Chunk text
    2. Generate embeddings with BGE-M3
    3. Store chunks + embeddings in ChromaDB

    Returns number of chunks stored.
    """
    chunks = chunk_text(text)
    total_chunks = len(chunks)
    if total_chunks == 0:
        return 0

    # Max allowable chunk limits per individual write operation
    BATCH_SIZE = 4000

    for i in range(0, total_chunks, BATCH_SIZE):
        batch_chunks = chunks[i : i + BATCH_SIZE]

        model = _get_embedding_model()
        embeddings = model.encode(
            batch_chunks,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()

        _get_collection().add(
            ids=[str(uuid.uuid4()) for _ in batch_chunks],
            documents=batch_chunks,
            embeddings=embeddings,
            metadatas=[
                {
                    'source': url,
                    'chunk_index': i + idx,
                }
                for idx in range(len(batch_chunks))
            ],
        )

    return total_chunks


async def retrieve_disease_context(
    disease: str, aliases: list[str] = None, n_results: int = 12
) -> str:
    """
    Retrieve guideline text relevant to a disease.
    """
    alias_str = ', '.join(aliases) if aliases else 'None'

    # Formulate as a direct retrieval instruction
    query = (
        f'Find clinical nutrition guidelines, dietary restrictions, maximum and minimum daily thresholds,interaction rules for medications, and any relevant ingredient aliases for the disease '
        f"and allowable intake values for the disease '{disease}' (also known as: {alias_str}). "
        f'Focus on metrics regarding sodium, potassium, sugar, fiber, protein, or fats.'
    )

    model = _get_embedding_model()
    query_embedding = model.encode(
        query,
        normalize_embeddings=True,
    ).tolist()

    results = _get_collection().query(
        query_embeddings=[query_embedding],
        n_results=n_results,
    )

    documents = results.get('documents', [[]])[0]

    # Deduplicate chunks
    seen = set()
    unique_docs = []

    for doc in documents:
        if doc not in seen:
            seen.add(doc)
            unique_docs.append(doc)

    return '\n\n'.join(unique_docs)
