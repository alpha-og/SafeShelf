import logging
from functools import cache

import chromadb
from sentence_transformers import SentenceTransformer

from app.recipes.models import Recipe


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
        name="recipes"
    )

def _get_document_string(recipe: Recipe) -> str:
    name = recipe.name or ""
    category = recipe.category or ""
    cuisine = recipe.cuisine or ""
    ingredients_str = ", ".join(recipe.ingredients) if recipe.ingredients else ""

    return (
        f"Recipe Name: {name}, Category: {category}, "
        f"Cuisine: {cuisine}, Ingredients: {ingredients_str}"
    )

async def upsert_recipes_batch(recipes: list[Recipe], chunk_size: int = 5000):
    if not recipes:
        return

    model = _get_embedding_model()
    collection = _get_collection()

    for i in range(0, len(recipes), chunk_size):
        chunk = recipes[i:i + chunk_size]
        ids = []
        documents = []

        for r in chunk:
            doc_str = _get_document_string(r)
            ids.append(str(r.id))
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

async def query_similar_recipes(text: str, n_results: int = 5) -> list[int]:
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

    ids = results.get("ids", [[]])[0]
    return [int(id_str) for id_str in ids]
