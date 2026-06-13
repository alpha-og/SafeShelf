import json
import urllib3
import httpx
from bs4 import BeautifulSoup
from openai import AsyncOpenAI

from app.shared.config import settings

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

http_client = httpx.AsyncClient(verify=False)
client = AsyncOpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
    http_client=http_client,
)

URLS: list[str] = [
    "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    "https://www.fao.org/nutrition/education/food-dietary-guidelines",
    "https://ods.od.nih.gov/HealthInformation/Dietary_Reference_Intakes.aspx",
    "https://www.fao.org/fao-who-codexalimentarius",
    "https://www.fao.org/food-safety/scientific-advice/jecfa/en/",
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
- Return ONLY valid JSON, no markdown, no explanation."""


async def scrape_guidelines(url: str) -> str:
    async with httpx.AsyncClient(timeout=30,verify=False) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


async def extract_thresholds(text: str) -> dict:
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": _EXTRACT_SYSTEM_PROMPT},
            {"role": "user", "content": f"Parse the following guideline text and return the structured JSON:\n\n{text[:100000]}"},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)
