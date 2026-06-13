import chromadb
from chromadb.utils import embedding_functions

CHROMA_DIR = "./chroma_db"
COLLECTION_NAME = "guidelines"


def _get_collection():
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    ef = embedding_functions.SentenceTransformerEmbeddingFunction()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
    )


def store_embeddings(text: str, disease: str, source: str) -> None:
    collection = _get_collection()
    chunks = [p.strip() for p in text.split("\n\n") if p.strip()]
    ids = [f"{disease}-{i}" for i in range(len(chunks))]
    metadatas = [{"disease": disease, "source": source, "chunk": i} for i, _ in enumerate(chunks)]
    collection.add(documents=chunks, ids=ids, metadatas=metadatas)


def search_similar(query: str, n: int = 5) -> list[dict]:
    collection = _get_collection()
    results = collection.query(query_texts=[query], n_results=n)
    items = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        items.append({"disease": meta["disease"], "source": meta.get("source", ""), "text": doc})
    return items
