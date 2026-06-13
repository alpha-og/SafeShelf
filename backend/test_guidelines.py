import asyncio
import json

from app.guidelines.agent import URLS, extract_thresholds, scrape_guidelines
from app.shared.who_icd import fetch_icd11_code, get_valid_who_token


async def main() -> int:
    print(f"Testing {len(URLS)} guideline URLs\n")

    try:
        who_token = await get_valid_who_token()
        print("✓ WHO token obtained\n")
    except Exception as exc:
        print(f"✗ WHO token fetch failed: {exc}")
        return 1

    imported_count = 0

    for index, url in enumerate(URLS, start=1):
        print("=" * 80)
        print(f"[{index}/{len(URLS)}] {url}")
        print("=" * 80)

        try:
            # same as import_guidelines()
            raw_text = await scrape_guidelines(url)

            print(f"Scraped {len(raw_text)} chars")

            bootstrap = await extract_thresholds(raw_text)

            print(
                f"version={bootstrap.get('version')} "
                f"conditions={len(bootstrap.get('condition_thresholds', []))} "
                f"aliases={len(bootstrap.get('ingredient_aliases', {}))}"
            )

            for ct in bootstrap.get("condition_thresholds", []):

                disease = ct["disease"]

                print(f"\nDisease: {disease}")

                # same as import_guidelines()
                icd = await fetch_icd11_code(
                    disease,
                    who_token,
                )

                standard_name = icd.get(
                    "standard_name",
                    disease,
                )

                icd_code = icd.get(
                    "icd11_code",
                    "UNKNOWN",
                )

                print(f"ICD Code      : {icd_code}")
                print(f"Standard Name : {standard_name}")

                entry = {
                    "rules": ct.get("rules", []),
                    "recommendations": ct.get(
                        "recommendations",
                        [],
                    ),
                    "exclusions": ct.get(
                        "exclusions",
                        [],
                    ),
                    "interaction_rules": ct.get(
                        "interaction_rules",
                        [],
                    ),
                    "source": url,
                }

                print(
                    f"Rules={len(entry['rules'])} "
                    f"Recommendations={len(entry['recommendations'])} "
                    f"Exclusions={len(entry['exclusions'])} "
                    f"Interactions={len(entry['interaction_rules'])}"
                )

                if entry["rules"]:
                    print("\nSample Rules:")

                    for rule in entry["rules"][:5]:
                        print(
                            json.dumps(
                                rule,
                                indent=2,
                            )
                        )

                imported_count += 1

            aliases = bootstrap.get(
                "ingredient_aliases",
                {},
            )

            if aliases:
                print("\nIngredient Aliases:")

                for alias, trigger in list(
                    aliases.items()
                )[:10]:
                    print(
                        f"  {alias} -> {trigger}"
                    )

            print()

        except Exception as exc:
            print(f"\nFAILED: {exc}\n")

    print("=" * 80)
    print(
        f"Finished. Would import {imported_count} condition entries."
    )
    print("=" * 80)

    return 0


if __name__ == "__main__":
    raise SystemExit(
        asyncio.run(main())
    )