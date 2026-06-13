from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.guidelines.agent import URLS, extract_thresholds, scrape_guidelines
from app.guidelines.embeddings import store_embeddings
from app.guidelines.models import ConditionThreshold, IngredientAlias


async def import_guidelines(session: AsyncSession) -> dict:
    imported = []
    for url in URLS:
        raw_text = await scrape_guidelines(url)
        bootstrap = await extract_thresholds(raw_text)

        for ct in bootstrap["condition_thresholds"]:
            disease = ct["disease"]
            existing = await session.exec(
                select(ConditionThreshold).where(ConditionThreshold.disease == disease)
            )
            row = existing.first()
            if row:
                row.rules = ct.get("rules", [])
                row.recommendations = ct.get("recommendations", [])
                row.exclusions = ct.get("exclusions", [])
                row.interaction_rules = ct.get("interaction_rules", [])
                row.source = url
                row.version = bootstrap.get("version", "1.0")
            else:
                row = ConditionThreshold(
                    disease=disease,
                    rules=ct.get("rules", []),
                    recommendations=ct.get("recommendations", []),
                    exclusions=ct.get("exclusions", []),
                    interaction_rules=ct.get("interaction_rules", []),
                    source=url,
                    version=bootstrap.get("version", "1.0"),
                )
            session.add(row)
            imported.append(disease)

       # await store_embeddings(raw_text, disease=ct["disease"], source=url)

        for alias, trigger in bootstrap.get("ingredient_aliases", {}).items():
            existing = await session.exec(
                select(IngredientAlias).where(IngredientAlias.alias == alias)
            )
            row = existing.first()
            if row:
                row.trigger = trigger
            else:
                session.add(IngredientAlias(alias=alias, trigger=trigger))

    await session.commit()
    return {"imported": imported, "count": len(imported)}


async def get_guideline(disease: str, session: AsyncSession) -> ConditionThreshold:
    result = await session.exec(
        select(ConditionThreshold).where(ConditionThreshold.disease == disease)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Guideline for '{disease}' not found")
    return row


async def list_guidelines(session: AsyncSession) -> dict:
    result = await session.exec(select(ConditionThreshold))
    rows = result.all()
    return {"guidelines": list(rows), "count": len(rows)}


async def get_bootstrap(session: AsyncSession) -> dict:
    conditions = await session.exec(select(ConditionThreshold))
    aliases = await session.exec(select(IngredientAlias))
    return {
        "version": "1.0",
        "condition_thresholds": [
            {
                "disease": c.disease,
                "rules": c.rules,
                "recommendations": c.recommendations,
                "exclusions": c.exclusions,
                "interaction_rules": c.interaction_rules,
            }
            for c in conditions.all()
        ],
        "ingredient_aliases": {a.alias: a.trigger for a in aliases.all()},
    }
