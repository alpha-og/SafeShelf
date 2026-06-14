from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.shared.who_icd import fetch_icd11_code, get_valid_who_token
from app.guidelines.agent import URLS, extract_thresholds, scrape_guidelines
from app.guidelines.models import ConditionThreshold, IngredientAlias
from app.guidelines.schemas import sanitize_rules


async def import_guidelines(session: AsyncSession) -> dict:
    imported = []
    who_token = await get_valid_who_token()
    for url in URLS:
        raw_text = await scrape_guidelines(url)
        bootstrap = await extract_thresholds(raw_text)

        for ct in bootstrap.get("condition_thresholds", []):
            disease = ct["disease"]
            icd = await fetch_icd11_code(disease, who_token)
            standard_name = icd.get("standard_name", disease)
            icd_code = icd.get("icd11_code", "UNKNOWN")
            entry = {
                "rules": sanitize_rules(ct.get("rules", [])),
                "recommendations": ct.get("recommendations", []),
                "exclusions": ct.get("exclusions", []),
                "interaction_rules": ct.get("interaction_rules", []),
                "source": url,
            }

            row = None
            if icd_code != "UNKNOWN":
                existing = await session.exec(
                    select(ConditionThreshold).where(
                        ConditionThreshold.code == icd_code
                    )
                )
                row = existing.first()

            if row is None:
                existing = await session.exec(
                    select(ConditionThreshold).where(
                        ConditionThreshold.disease == standard_name
                    )
                )
                row = existing.first()

            if row is None:
                row = ConditionThreshold(
                    disease=standard_name,
                    code=icd_code,
                    entries=[entry],
                    version=bootstrap.get("version", "1.0"),
                )
            else:
                if row.code == "UNKNOWN" and icd_code != "UNKNOWN":
                    row.code = icd_code
                row.entries = [*(row.entries or []), entry]

            session.add(row)
            imported.append(standard_name)

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


async def get_guideline_by_code(code: str, session: AsyncSession) -> ConditionThreshold:
    result = await session.exec(
        select(ConditionThreshold).where(ConditionThreshold.code == code)
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=404, detail=f"Guideline for code '{code}' not found"
        )
    return row


async def get_aliases(session: AsyncSession) -> dict[str, str]:
    result = await session.exec(select(IngredientAlias))
    return {a.alias: a.trigger for a in result.all()}


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
                "code": c.code,
                "entries": c.entries,
                "version": c.version,
                "created_at": c.created_at,
            }
            for c in conditions.all()
        ],
        "ingredient_aliases": {a.alias: a.trigger for a in aliases.all()},
    }
