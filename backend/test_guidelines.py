import asyncio
import json

from app.guidelines.agent import URLS, extract_thresholds, scrape_guidelines


async def main():
    url = URLS[0]
    print(f"Scraping: {url}")
    text = await scrape_guidelines(url)
    print(f"Scraped {len(text)} chars\n")

    print("Sending to LLM...")
    result = await extract_thresholds(text)
    print("Done\n")

    assert "version" in result, "Missing version"
    assert "condition_thresholds" in result, "Missing condition_thresholds"
    assert "ingredient_aliases" in result, "Missing ingredient_aliases"

    conditions = result["condition_thresholds"]
    print(f"Conditions found: {len(conditions)}")
    for ct in conditions:
        print(f"  - {ct['disease']}: {len(ct['rules'])} rules, "
              f"{len(ct['recommendations'])} recommendations, "
              f"{len(ct['exclusions'])} exclusions")

    aliases = result["ingredient_aliases"]
    print(f"\nIngredient aliases: {len(aliases)}")
    for alias, trigger in aliases.items():
        print(f"  {alias} -> {trigger}")

    print("\nFull JSON:\n")
    print(json.dumps(result, indent=2, ensure_ascii=False))


asyncio.run(main())
