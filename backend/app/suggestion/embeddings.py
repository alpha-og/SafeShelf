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
    
    # Fetch category/description safely (checking dynamic attrs or relationships)
    category = getattr(product, "category", "") or ""
    if not category:
        categories_list = getattr(product, "categories", [])
        if categories_list:
            category = ", ".join([c.name for c in categories_list])
            
    description = getattr(product, "description", "") or ""
    
    return f"Product Name: {name}, Brand: {brand}, Category: {category}, Description: {description}"

async def upsert_product_embedding(product: Product):
    doc_str = _get_document_string(product)
    model = _get_embedding_model()
    
    # Generate embedding
    embedding = model.encode(
        doc_str,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).tolist()
    
    # Store/upsert in ChromaDB with barcode as vector ID
    _get_collection().upsert(
        ids=[product.barcode],
        documents=[doc_str],
        embeddings=[embedding],
    )

async def query_similar_products(product: Product, n_results: int = 10) -> list[str]:
    doc_str = _get_document_string(product)
    model = _get_embedding_model()
    
    query_embedding = model.encode(
        doc_str,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).tolist()
    
    results = _get_collection().query(
        query_embeddings=[query_embedding],
        n_results=n_results,
    )
    
    # Chroma returns ids, which are barcodes
    ids = results.get("ids", [[]])[0]
    return [b for b in ids if b != product.barcode]
