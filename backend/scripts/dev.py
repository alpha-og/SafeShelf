import argparse
import asyncio

from scripts.lib.logger import header
from scripts.lib.seed import run_seed


def cmd_seed(stores_only: bool, inventory_only: bool) -> None:
    header('Seeding Database')
    asyncio.run(run_seed(stores_only=stores_only, inventory_only=inventory_only))


def main() -> None:
    parser = argparse.ArgumentParser(description='SafeShelf Backend Dev Script')
    sub = parser.add_subparsers(dest='command', required=True)

    seed = sub.add_parser('seed', help='Seed database with stores and inventory')
    seed.add_argument('--stores-only', action='store_true', help='Only seed stores')
    seed.add_argument('--inventory-only', action='store_true', help='Only seed inventory')

    args = parser.parse_args()

    if args.command == 'seed':
        cmd_seed(args.stores_only, args.inventory_only)


if __name__ == '__main__':
    main()
