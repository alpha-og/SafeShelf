import json

from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.recipes.models import Recipe
from app.shared.config import settings
from app.shared.timing import log_duration


class GeneratedRecipeFormat(BaseModel):
    name: str = Field(description="The name of the generated recipe.")
    category: str = Field(description="TheMealDB category this best fits (e.g., Beef, Chicken, Vegan, Dessert).")
    cuisine: str = Field(description="The cuisine area (e.g., American, Italian, Indian).")
    ingredients: list[str] = Field(description="List of raw ingredient names (e.g., 'Chicken Breast', 'Olive Oil').")
    measurements: list[str] = Field(description="List of measurements corresponding exactly to the ingredients list by index (e.g., '500g', '2 tbsp').")
    instructions: str = Field(description="Step-by-step cooking instructions. Use \r\n to separate steps.")
    prep_time_minutes: int = Field(description="Estimated preparation time in minutes.")
    cook_time_minutes: int = Field(description="Estimated cooking time in minutes.")
    servings: int = Field(description="Number of servings.")




GENERATION_PROMPT = """\
 You are an expert culinary AI. Your task is to generate a single, highly personalized \
 recipe based on the user's specific request and dietary constraints.

You will be provided with:
1. The user's query / request.
2. The user's specific dietary preferences, health conditions, and allergens.
3. A list of relevant reference recipes retrieved from our database.

Instructions:
- Use the reference recipes as inspiration for flavor profiles, techniques, and typical ingredient ratios.
- You MUST rigidly adhere to the user's dietary preferences, conditions, and allergens. \
For example, if they are vegan, ensure NO animal products are used. If they have a nut allergy, use NO nuts.
- The recipe should be practical, delicious, and easy to follow.
- For the 'category' field, you MUST use ONLY one of these exact values: \
Beef, Breakfast, Chicken, Dessert, Goat, Lamb, Miscellaneous, Pasta, Pork, Seafood, Side, Starter, Vegan, Vegetarian.
- For the 'ingredients' list, use standard English ingredient names (e.g. 'Basmati Rice', not 'Bsimati Rize').
- For the 'instructions' field, output all steps as a single plain string, each step on its own line.

{format_instructions}
"""

_llm: ChatOpenAI | None = None

def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model=settings.GROQ_MODEL,
            api_key=settings.GROQ_API_KEY,
            base_url='https://api.groq.com/openai/v1',
            temperature=0.7, 
        )
    return _llm

async def generate_personalized_recipe(
    query: str,
    dietary_preferences: list[str],
    conditions: list[str],
    allergens: list[str],
    reference_recipes: list[Recipe],
) -> GeneratedRecipeFormat:
    from langchain_core.output_parsers import JsonOutputParser
    parser = JsonOutputParser(pydantic_object=GeneratedRecipeFormat)
    
    context_str = "Reference Recipes:\n"
    for idx, r in enumerate(reference_recipes):
        ings = ", ".join([f"{m} {i}" for m, i in zip(r.measurements or [], r.ingredients) if m and i])
        context_str += f"{idx+1}. {r.name} ({r.category}, {r.cuisine})\nIngredients: {ings}\nInstructions: {r.instructions[:200]}...\n\n"

    constraints_str = (
        f"Dietary Preferences: {', '.join(dietary_preferences) if dietary_preferences else 'None'}\n"
        f"Health Conditions: {', '.join(conditions) if conditions else 'None'}\n"
        f"Allergens: {', '.join(allergens) if allergens else 'None'}\n"
    )

    user_message = f"User Request: {query}\n\nConstraints:\n{constraints_str}\n\n{context_str}"

    messages = [
        SystemMessage(content=GENERATION_PROMPT.format(format_instructions=parser.get_format_instructions())),
        ("human", "{user_message}")
    ]
    prompt = ChatPromptTemplate.from_messages(messages)
    
    # We ask for raw JSON and parse it ourselves to handle Groq's inconsistent wrapping
    from langchain_core.output_parsers import StrOutputParser
    llm = _get_llm().bind(response_format={"type": "json_object"})
    chain = prompt | llm | StrOutputParser()
    
    async with log_duration('llm.generate_recipe'):
        result_str = await chain.ainvoke({'user_message': user_message})
        try:
            data = json.loads(result_str)
            # If the LLM wrapped it in a "recipe" key, unwrap it
            if "recipe" in data and isinstance(data["recipe"], dict):
                data = data["recipe"]
            
            return GeneratedRecipeFormat(**data)
        except Exception as e:
            import logging
            logging.error(f"Failed to parse LLM JSON: {result_str}")
            raise e
