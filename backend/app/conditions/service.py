import re

import httpx

from app.shared.who_icd import get_valid_who_token

WHO_SEARCH_URL = "https://id.who.int/icd/release/11/2024-01/mms/search"


async def search_conditions(query: str) -> list[dict]:
    if not query or not query.strip():
        return []

    token = await get_valid_who_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "API-Version": "v2",
        "Accept-Language": "en",
        "Accept": "application/json",
    }
    params = {"q": query.strip()}

    async with httpx.AsyncClient() as client:
        response = await client.get(WHO_SEARCH_URL, headers=headers, params=params)
        if response.status_code != 200:
            return [{"id": "UNKNOWN", "name": query.strip()}]

        entities = response.json().get("destinationEntities", [])
        if not entities:
            return [{"id": "UNKNOWN", "name": query.strip()}]

        results = []
        for entity in entities[:10]:
            raw_title = entity.get("title", query)
            clean_title = re.sub(r"<[^>]+>", "", raw_title)
            code = entity.get("theCode", "UNKNOWN")
            results.append({"id": code, "name": clean_title})

        return results
