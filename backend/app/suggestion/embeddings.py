import logging
from functools import cache

import chromadb
from sentence_transformers import SentenceTransformer

from app.products.models import Product


@cache
def _get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path="./chroma_db")

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

async def upsert_products_batch(products: list[Product]):
    if not products:
        return

    ids = []
    documents = []
    metadatas = []

    for p in products:
        doc_str = _get_document_string(p)
        ids.append(p.barcode)
        documents.append(doc_str)
        metadatas.append({})

    model = _get_embedding_model()
    embeddings = model.encode(
        documents,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).tolist()

    _get_collection().upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )

async def query_similar_products(product: Product, n_results: int = 10) -> list[str]:
    # 1. Lightweight lookup for pre-existing embedding
    res = _get_collection().get(ids=[product.barcode], include=["embeddings"])
    embeddings = res.get("embeddings")

    if embeddings and len(embeddings) > 0 and embeddings[0] is not None:
        query_embedding = embeddings[0]
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
            embeddings=[query_embedding],
            metadatas=[{}]
        )

    # 3. Query similarity
    results = _get_collection().query(
        query_embeddings=[query_embedding],
        n_results=n_results+1,
    )

    # Chroma returns ids, which are barcodes
    ids = results.get("ids", [[]])[0]
    return [b for b in ids if b != product.barcode]
