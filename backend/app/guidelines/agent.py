import json

import httpx
from bs4 import BeautifulSoup
from openai import AsyncOpenAI
from app.shared.config import settings
from io import BytesIO
import certifi
from pypdf import PdfReader

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

http_client = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=30.0),verify=False)
client = AsyncOpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url='https://api.groq.com/openai/v1',
    http_client=http_client,
)

URLS: list[str] = [
    "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    "https://www.fao.org/nutrition/education/food-dietary-guidelines/regions/countries/india/en/",
    "https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease",
    "https://professional.diabetes.org/clinical-support/nutrition-wellness",
    "https://www.fao.org/food-safety/scientific-advice/jecfa/en/",
    "https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/shaking-the-salt-habit-to-lower-high-blood-pressure",
    "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/sodium-and-salt",
    "https://nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf",
    "https://iris.who.int/server/api/core/bitstreams/fe09e661-09a6-4f53-ae8a-420cbd0c6a6e/content",
    "https://www.nhlbi.nih.gov/health/dash-eating-plan",
    "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342001/all/Asthma",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342017/all/Coronary_Heart_Disease%C2%A0",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342005/all/Hyperthyroidism",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342029/all/Osteoporosis#5",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342062/all/Celiac_Disease",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342061/all/Irritable_Bowel_Syndrome",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342090/all/Iron_Deficiency_Anemia",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342007/all/Parkinson%E2%80%99s_Disease#4",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342015/all/Gastroesophageal_Reflux_Disease",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342076/all/Hypothyroidism",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342050/all/Cirrhosis",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342056/all/Migraine#4",

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
    async with httpx.AsyncClient(
        timeout=60,
        headers=HEADERS,
        follow_redirects=True,
        verify=False,
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    content_type = resp.headers.get("content-type", "").lower()

    # PDF handling
    if resp.content[:4] == b"%PDF":
        try:
            pdf_file = BytesIO(resp.content)
            reader = PdfReader(pdf_file)
            text_parts = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            return "\n".join(text_parts)
        except Exception:
            pass  # fall through to HTML handling

    # HTML handling
    soup = BeautifulSoup(resp.text, "lxml")

    for tag in soup([
        "script",
        "style",
        "nav",
        "footer",
        "header",
        "aside",
        "noscript",
        "svg",
    ]):
        tag.decompose()

    return soup.get_text(separator="\n", strip=True)


async def extract_thresholds(disease: str, context: str) -> dict:
    prompt = """You are a nutrition guideline parser. Analyze the clinical text context block provided below and extract nutritional threshold limits, structural definitions, and ingredient triggers for the following specific illness:
    
    TARGET DISEASE: {disease}
    
    CONTEXT DATA CHUNKS:
    {context} extract structured data into JSON.

    Output JSON must match this exact schema:
  
    {{
      "version": "1.0",
      "condition_thresholds": [
        {{
          "disease": "{disease}",
          "rules": [
            {{
              "nutrient": "<nutrient name, lowercase>",
              "value": <numeric threshold>,
              "operator": "<le|ge|lt|gt|eq>",
              "unit": "<g|mg|mcg|%>"
            }}
          ],
          "recommendations": ["<recommendation string>"],
          "exclusions": ["<excluded ingredient or food>"],
          "interaction_rules": [
            {{
              "medication": "<medication name>",
              "conflict": "<conflicting nutrient/food>",
              "severity": "<low|moderate|high>"
            }}
          ]
        }}
      ],
      "ingredient_aliases": {{
        "<complex ingredient name>": "<simple trigger name>"
      }}
    }}

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
    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Parse the following guideline text and return the structured JSON for target disease profile: {disease}"},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    return json.loads(response.choices[0].message.content)
