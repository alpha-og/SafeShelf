import re
import time

import httpx
from fastapi import HTTPException

from app.shared.config import settings

# Global memory cache tracking state across your entire backend instance
_cached_who_token: str = None
_token_expires_at: float = 0.0


async def get_valid_who_token() -> str:
    global _cached_who_token, _token_expires_at
    current_time = time.time()

    if _cached_who_token and current_time < (_token_expires_at - 30):
        return _cached_who_token

    WHO_TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token'
    data = {
        'grant_type': 'client_credentials',
        'scope': 'icdapi_access',
    }

    if not settings.WHO_CLIENT_ID or not settings.WHO_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail='WHO client credentials are missing. Set WHO_CLIENT_ID and WHO_CLIENT_SECRET.',
        )

    async with httpx.AsyncClient(timeout=20.0, verify=False) as client:
        response = await client.post(
            WHO_TOKEN_URL,
            data=data,
            auth=(settings.WHO_CLIENT_ID, settings.WHO_CLIENT_SECRET),
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail='Failed to retrieve WHO API session token')

        payload = response.json()
        _cached_who_token = payload['access_token']
        _token_expires_at = current_time + float(payload.get('expires_in', 3600))
        return _cached_who_token


async def fetch_icd11_code(disease_name: str, token: str) -> dict[str, str]:
    WHO_SEARCH_URL = 'https://id.who.int/icd/release/11/2024-01/mms/search'
    headers = {
        'Authorization': f'Bearer {token}',
        'API-Version': 'v2',
        'Accept-Language': 'en',
        'Accept': 'application/json',
    }
    params = {
        'q': disease_name,
        # "flatResults": "true",
    }
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.get(WHO_SEARCH_URL, headers=headers, params=params)
        if response.status_code != 200:
            return {'icd11_code': 'UNKNOWN', 'standard_name': disease_name, 'aliases': []}

        entities = response.json().get('destinationEntities', [])
        if not entities:
            return {'icd11_code': 'UNKNOWN', 'standard_name': disease_name, 'aliases': []}
        top_match = entities[0]
        raw_title = top_match.get('title', disease_name)
        clean_title = re.sub(r'<[^>]+>', '', raw_title)
        aliases = []
        for term in top_match.get('matchingTags', []):
            clean_term = re.sub(r'<[^>]+>', '', term)
            if clean_term and clean_term not in aliases:
                aliases.append(clean_term)
        return {
            'icd11_code': top_match.get('theCode', 'UNKNOWN'),
            'standard_name': clean_title,
            'aliases': aliases,
        }
