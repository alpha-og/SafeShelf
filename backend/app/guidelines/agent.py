import json

import httpx
from bs4 import BeautifulSoup
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from app.shared.config import settings
from io import BytesIO
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


llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model=settings.GROQ_MODEL,  # llama-3.3-70b-versatile
    temperature=0.1,
)


URLS: list[str] = [
    # "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    # "https://www.fao.org/nutrition/education/food-dietary-guidelines/regions/countries/india/en/",
    # "https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease",
    # "https://professional.diabetes.org/clinical-support/nutrition-wellness",
    # "https://www.fao.org/food-safety/scientific-advice/jecfa/en/",
    # "https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/shaking-the-salt-habit-to-lower-high-blood-pressure",
    # "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/sodium-and-salt",
    # "https://nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf",
    # "https://iris.who.int/server/api/core/bitstreams/fe09e661-09a6-4f53-ae8a-420cbd0c6a6e/content",
    # "https://www.nhlbi.nih.gov/health/dash-eating-plan",
    # "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
    # "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342001/all/Asthma",
    # "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342017/all/Coronary_Heart_Disease%C2%A0",
    # "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342005/all/Hyperthyroidism",
    # "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342029/all/Osteoporosis#5",
    # "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342062/all/Celiac_Disease",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342061/all/Irritable_Bowel_Syndrome",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342090/all/Iron_Deficiency_Anemia",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342007/all/Parkinson%E2%80%99s_Disease#4",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342015/all/Gastroesophageal_Reflux_Disease",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342076/all/Hypothyroidism",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342050/all/Cirrhosis",
    "https://nutritionguide.pcrm.org/nutritionguide/view/Nutrition_Guide_for_Clinicians/1342056/all/Migraine#4",

 ]
    


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
    prompt = """
    You are a nutrition guideline parser.

    Analyze the provided clinical nutrition guideline text and extract structured nutrition rules, recommendations, exclusions, medication-food interactions, and ingredient aliases.

    Output JSON must match this exact schema:

    {
      "version": "1.0",
      "condition_thresholds": [
        {
          "disease": "<disease name>",
          "rules": [
            {
              "nutrient": "<nutrient name, lowercase>",
              "value": <numeric threshold>,
              "operator": "<le|ge|lt|gt|eq>",
              "unit": "<g|mg|mcg|%|kcal|kJ>"
            }
          ],
          "recommendations": [
            "<recommendation string>"
          ],
          "exclusions": [
            "<excluded ingredient or food>"
          ],
          "interaction_rules": [
            {
              "medication": "<medication name>",
              "conflict": "<conflicting nutrient or food>",
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
    - Return ONLY valid JSON.
    - Do not include markdown, code fences, or explanations.
    - Extract only information explicitly stated in the guideline text.
    - Do not invent nutrients, thresholds, recommendations, exclusions, interactions, or aliases.
    - Use lowercase nutrient names.
    - operator meanings:
      - le = <=
      - ge = >=
      - lt = <
      - gt = >
      - eq = exactly

    Threshold conversion:
    - Output per-serving values, not daily values.
    - Assume 3 eating occasions per day.
    - Convert daily recommendations and limits to per-serving values by dividing by 3.
    - Example:
      - 30 g fiber/day → 10 g fiber per serving (operator ge)
      - 2000 mg sodium/day → 667 mg sodium per serving (operator le)
      - 25 g protein/day → 8.3 g protein per serving (operator ge)

    Disease handling:
    - Use the target disease supplied by the user whenever possible.
    - If multiple diseases are explicitly discussed, create separate condition_threshold entries.
    - If no disease is identifiable, use "general".

    Recommendations:
    - Include dietary advice and positive guidance.
    - Keep recommendations concise.

    Exclusions:
    - Include foods, ingredients, or dietary patterns explicitly advised against.

    Interaction rules:
    - Include only explicit medication-food or medication-nutrient interactions.
    - Severity must be one of: low, moderate, high.

    Ingredient aliases:
    - Include only aliases explicitly supported by the guideline text.
    - Do not create aliases from assumptions.

    Return only the JSON object.
    """
    response = await llm.ainvoke(
        [
            SystemMessage(content=prompt),
            HumanMessage(
                content=f"""TARGET DISEASE: {disease}   CONTEXT:{context}"""
            ),
        ]
    )
    content = response.content.strip()

    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]
    try:
      return json.loads(content)
    except json.JSONDecodeError:
      print(content)
      raise