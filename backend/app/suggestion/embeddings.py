import logging
from functools import cache

import chromadb
from sentence_transformers import SentenceTransformer

from app.products.models import Product
from app.shared.config import settings


@cache
def _get_chroma_client() -> chromadb.PersistentClient:
    path = settings.CHROMA_PERSIST_DIR or './chroma_db'
    return chromadb.PersistentClient(path=path)

@cache
def _get_embedding_model() -> SentenceTransformer:
    logging.getLogger('sentence_transformers').setLevel(logging.ERROR)
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

@cache
def _get_collection():
    return _get_chroma_client().get_or_create_collection(
        name="product_suggestions"
    )

def _get_document_string(product: Product) -> str:
    name = product.product_name or ""
    brand = product.brand or ""

    # Cleaned up to match your many-to-many relationship array parameter
    categories_list = getattr(product, "categories", []) or []
    category_str = ", ".join([c.name for c in categories_list if hasattr(c, "name")])

    return (
        f"Product Name: {name}, Brand: {brand}, "
        f"Category: {category_str}"
    )

async def upsert_product_embedding(product: Product):
    await upsert_products_batch([product])

async def upsert_products_batch(products: list[Product], chunk_size: int = 5000):
    if not products:
        return


    model = _get_embedding_model()
    collection = _get_collection()

    # Process in chunks to stay under ChromaDB's max batch size of 5461
    for i in range(0, len(products), chunk_size):
        chunk = products[i:i + chunk_size]
        ids = []
        documents = []

        for p in chunk:
            doc_str = _get_document_string(p)
            ids.append(p.barcode)
            documents.append(doc_str)

        embeddings = model.encode(
            documents,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()

        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings
        )

async def query_similar_products(product: Product, n_results: int = 10) -> list[str]:
    # 1. Lightweight lookup for pre-existing embedding
    res = _get_collection().get(ids=[product.barcode], include=["embeddings"])
    embeddings = res.get("embeddings")

    if embeddings is not None and len(embeddings) > 0 and embeddings[0] is not None:
        query_embedding = embeddings[0]
        if hasattr(query_embedding, "tolist"):
            query_embedding = query_embedding.tolist()
    else:
        # 2. Safety Net Fallback: Compute and cache embedding dynamically if missing
        doc_str = _get_document_string(product)
        model = _get_embedding_model()
        query_embedding = model.encode(
            doc_str,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).tolist()

        _get_collection().upsert(
            ids=[product.barcode],
            documents=[doc_str],
            embeddings=[query_embedding]
        )

    # 3. Query similarity
    collection = _get_collection()
    count = collection.count()
    actual_n_results = min(n_results + 1, count)

    if actual_n_results == 0:
        return []

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=actual_n_results,
    )

    # Chroma returns ids, which are barcodes
    ids = results.get("ids", [[]])[0]
    return [b for b in ids if b != product.barcode]


async def query_similar_to_text(text: str, n_results: int = 20) -> list[str]:
    collection = _get_collection()

    count = collection.count()
    actual_n_results = min(n_results, count)
    if actual_n_results == 0:
        return []

    model = _get_embedding_model()
    query_embedding = model.encode(
        text,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=actual_n_results,
    )

    return results.get("ids", [[]])[0]


async def batch_query_similar_to_text(texts: list[str], n_results: int = 20) -> list[list[str]]:
    """Encode multiple texts in a single model call, query ChromaDB for each, return barcodes."""
    collection = _get_collection()
    count = collection.count()
    actual_n_results = min(n_results, count)
    if actual_n_results == 0 or not texts:
        return [[] for _ in texts]

    model = _get_embedding_model()
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).tolist()

    results = []
    for emb in embeddings:
        res = collection.query(
            query_embeddings=[emb],
            n_results=actual_n_results,
        )
        results.append(res.get("ids", [[]])[0])

    return results
