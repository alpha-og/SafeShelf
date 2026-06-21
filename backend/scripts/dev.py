import argparse
import asyncio
import sys

from scripts.lib.logger import header
from scripts.lib.seed import run_seed
from scripts.lib.seed_recipes import run_seed_recipes
from scripts.lib.generate_ingredient_seed import run_generate


def cmd_seed(
    stores: bool,
    inventory: bool,
    recipes: bool,
    csv_path: str | None,
    limit: int,
) -> None:
    do_stores = stores
    do_inventory = inventory
    do_recipes = recipes

    if not any([stores, inventory, recipes]):
        do_stores = True
        do_inventory = True
        do_recipes = True

    if do_stores or do_inventory:
        header('Seeding Database')
        asyncio.run(run_seed(stores_only=not do_inventory, inventory_only=not do_stores))

    if do_recipes:
        header('Seeding Recipes from Food.com Dataset')
        asyncio.run(run_seed_recipes(csv_path=csv_path, limit=limit))


def cmd_generate_ingredients(
    top_n: int,
    skip_usda: bool,
    dry_run: bool,
) -> None:
    header('Generating Ingredient Seed Data')
    asyncio.run(run_generate(top_n=top_n, skip_usda=skip_usda, dry_run=dry_run))


def main() -> None:
    parser = argparse.ArgumentParser(description='SafeShelf Backend Dev Script')
    sub = parser.add_subparsers(dest='command', required=True)

    seed = sub.add_parser('seed', help='Seed database with stores, inventory, and recipes')
    seed.add_argument('--stores', action='store_true', help='Seed stores')
    seed.add_argument('--inventory', action='store_true', help='Seed inventory')
    seed.add_argument('--recipes', action='store_true', help='Seed recipes from Food.com')
    seed.add_argument('--csv-path', type=str, default=None,
                      help='Path to recipes.csv (downloads via kagglehub if omitted)')
    seed.add_argument('--limit', type=int, default=50_000,
                      help='Max recipes to seed (default: 50,000)')

    gen = sub.add_parser('seed-ingredients',
                         help='Generate ingredient seed JSON files from recipe analysis + USDA')
    gen.add_argument('--top-n', type=int, default=200,
                     help='Number of top ingredients to process (default: 200)')
    gen.add_argument('--skip-usda', action='store_true',
                     help='Skip USDA API lookup (use empty nutrients)')
    gen.add_argument('--dry-run', action='store_true',
                     help='Extract + normalize only, do not write seed files')

    args = parser.parse_args()

    if args.command == 'seed':
        cmd_seed(
            stores=args.stores,
            inventory=args.inventory,
            recipes=args.recipes,
            csv_path=args.csv_path,
            limit=args.limit,
        )
    elif args.command == 'seed-ingredients':
        cmd_generate_ingredients(
            top_n=args.top_n,
            skip_usda=args.skip_usda,
            dry_run=args.dry_run,
        )


if __name__ == '__main__':
    sys.argv = [a for a in sys.argv if a != '--']
    main()
