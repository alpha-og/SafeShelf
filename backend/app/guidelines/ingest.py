import asyncio

from app.guidelines.service import import_guidelines
from app.shared.db import async_session


async def main() -> None:
    async with async_session() as session:
        result = await import_guidelines(session)
    print(f'Imported {result["count"]} guideline entries')
    print(f'Diseases: {", ".join(result["imported"])}')


if __name__ == '__main__':
    asyncio.run(main())
