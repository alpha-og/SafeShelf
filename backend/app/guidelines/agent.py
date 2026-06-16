import json

import httpx
from bs4 import BeautifulSoup
from openai import AsyncOpenAI

from app.shared.config import settings

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/137.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/',
}

http_client = httpx.AsyncClient()
client = AsyncOpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url='https://api.groq.com/openai/v1',
    http_client=http_client,
)

URLS: list[str] = [
    'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    'https://www.fao.org/nutrition/education/food-dietary-guidelines/regions/countries/india/en/',
    'https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease',
    'https://professional.diabetes.org/clinical-support/nutrition-wellness',
    'https://www.fao.org/food-safety/scientific-advice/jecfa/en/',
    'https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/shaking-the-salt-habit-to-lower-high-blood-pressure',
    'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/sodium-and-salt',
]

_EXTRACT_SYSTEM_PROMPT = """You are a nutrition guideline parser. Given raw text from medical/nutrition guidelines, extract structured data into JSON.

Output JSON must match this exact schema:
{
  "version": "<version string>",
  "condition_thresholds": [
    {
      "disease": "<disease/condition name, lowercase>",
      "rules": [
        {
          "nutrient": "<nutrient name, lowercase>",
          "value": <numeric threshold>,
          "operator": "<le|ge|lt|gt|eq>",
          "unit": "<g|mg|mcg|%>"
        }
      ],
      "recommendations": ["<recommendation string>"],
      "exclusions": ["<excluded ingredient or food>"],
      "interaction_rules": [
        {
          "medication": "<medication name>",
          "conflict": "<conflicting nutrient/food>",
          "severity": "<low|moderate|high>"
        }
      ]
    }
  ],
  "ingredient_aliases": {
    "<complex ingredient name>": "<simple trigger name>"
  }
}

Rules:
- operator: "le" = <=, "ge" = >=, "lt" = <, "gt" = >, "eq" = exactly
- Only extract thresholds explicitly mentioned in the text. Do not guess.
- Create one entry per disease or condition mentioned. If none is specified, use "general".

IMPORTANT — Output per-serving thresholds, NOT daily values:
- If a guideline says "30g fiber per day", convert to per-serving: divide by 3 (≈10g per serving).
  WRONG: {"nutrient": "fiber", "value": 30, "operator": "ge", "unit": "g"}
  CORRECT: {"nutrient": "fiber", "value": 10, "operator": "ge", "unit": "g"}
- For "limit" guidelines (e.g., "≤ 2000mg sodium/day"), divide by 3 and use operator "le".
- For "recommend" guidelines (e.g., "≥ 25g fiber/day"), divide by 3 and use operator "ge".
- If a value looks like a daily total and you are unsure how to convert, estimate by dividing by 3.

- Return ONLY valid JSON, no markdown, no explanation."""


async def scrape_guidelines(url: str) -> str:
    async with httpx.AsyncClient(timeout=30, headers=HEADERS, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'lxml')
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'svg']):
        tag.decompose()
    return soup.get_text(separator='\n', strip=True)


async def extract_thresholds(text: str) -> dict:
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {'role': 'system', 'content': _EXTRACT_SYSTEM_PROMPT},
            {
                'role': 'user',
                'content': f'Parse the following guideline text and return the structured JSON:\n\n{text[:100000]}',
            },
        ],
        response_format={'type': 'json_object'},
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)
