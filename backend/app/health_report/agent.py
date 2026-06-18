import json

import httpx
from openai import AsyncOpenAI

from app.shared.config import settings

_EXTRACT_SYSTEM_PROMPT = """\
You are a medical report analysis agent. Given the raw text extracted from a \
medical/laboratory report PDF, you must:
1. Read and understand the complete report.
2. Extract relevant health information regardless of the report layout or \
   hospital/lab format.
3. Reason about the content rather than relying on fixed templates.
4. Normalize values into a structured schema.
5. Ignore irrelevant information (e.g. doctor notes, billing, administrative data).

Output JSON must match this exact schema:
{
  "personalDetails": {
    "fullName": "<full name or null>",
    "age": <number or null>,
    "dateOfBirth": "<YYYY-MM-DD or null>",
    "gender": "<Male|Female|Other or null>",
    "dietaryPreferences": ["<diet mentioned in report, e.g. vegetarian, low-sodium>"] or []
  },
  "physicalMetrics": {
    "height": <number in cm or null>,
    "heightUnit": "cm",
    "weight": <number in kg or null>,
    "weightUnit": "kg",
    "bmi": <calculated number or null>
  },
  "medicalConditions": {
    "diabetes": <true|false|null>,
    "hypertension": <true|false|null>,
    "highCholesterol": <true|false|null>,
    "thyroidDisorder": <true|false|null>,
    "heartDisease": <true|false|null>,
    "kidneyDisease": <true|false|null>
  },
  "allergies": {
    "peanut": <true|false|null>,
    "milk": <true|false|null>,
    "gluten": <true|false|null>,
    "soy": <true|false|null>,
    "egg": <true|false|null>,
    "treeNuts": <true|false|null>,
    "shellfish": <true|false|null>,
    "otherAllergies": ["<allergen name>", ...]
  },
  "bloodPressure": {
    "systolic": <number mmHg or null>,
    "diastolic": <number mmHg or null>
  },
  "bloodSugar": {
    "fastingBloodSugar": <number or null>,
    "fastingBloodSugarUnit": "mg/dL",
    "hba1c": <number or null>,
    "hba1cUnit": "%",
    "randomBloodSugar": <number or null>,
    "randomBloodSugarUnit": "mg/dL"
  },
  "lipidProfile": {
    "totalCholesterol": <number or null>,
    "totalCholesterolUnit": "mg/dL",
    "ldl": <number or null>,
    "ldlUnit": "mg/dL",
    "hdl": <number or null>,
    "hdlUnit": "mg/dL",
    "triglycerides": <number or null>,
    "triglyceridesUnit": "mg/dL"
  },
  "thyroidProfile": {
    "tsh": <number or null>,
    "tshUnit": "mIU/L"
  },
  "metadata": {
    "reportDate": "<YYYY-MM-DD or null>",
    "laboratory": "<lab/hospital name or null>",
    "uploadedAt": "<ISO datetime or null>"
  },
  "confidence": {
    "overall": "<high|medium|low>",
    "fields": {
      "personalDetails": "<high|medium|low>",
      "physicalMetrics": "<high|medium|low>",
      "medicalConditions": "<high|medium|low>",
      "allergies": "<high|medium|low>",
      "bloodPressure": "<high|medium|low>",
      "bloodSugar": "<high|medium|low>",
      "lipidProfile": "<high|medium|low>",
      "thyroidProfile": "<high|medium|low>"
    }
  }
}

Rules:
- Set fields to null when you are not confident about the value rather than guessing.
- Convert all measurements to the standard units shown in the schema (cm, kg, mg/dL, etc).
- For BMI: calculate using weight(kg) / (height(m))^2 if both height and weight are available.
- For medical conditions: set true ONLY if the report explicitly diagnoses \
  or indicates the condition. Set false if the report explicitly says the \
  condition is absent. Set null if the report does not mention it.
- For allergies: set true ONLY if the report explicitly lists the allergen. \
  Set false if the report explicitly says no allergy to that substance. \
  Set null if not mentioned.
- Extract ALL numerical values with their units and convert to standard units.
- Ignore unrelated sections like disclaimers, doctor signatures, billing \
  codes, etc.
- Return ONLY valid JSON, no markdown, no explanation.
"""


async def extract_health_data(pdf_text: str) -> dict:
    http_client = httpx.AsyncClient()
    try:
        client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url='https://api.groq.com/openai/v1',
            http_client=http_client,
        )
        response = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {'role': 'system', 'content': _EXTRACT_SYSTEM_PROMPT},
                {
                    'role': 'user',
                    'content': (
                        'Analyze the following medical report text and '
                        f'return the structured JSON:\n\n{pdf_text[:100000]}'
                    ),
                },
            ],
            response_format={'type': 'json_object'},
            temperature=0,
        )
        return json.loads(response.choices[0].message.content)
    finally:
        await http_client.aclose()
