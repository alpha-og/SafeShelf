import re
from datetime import UTC, datetime

import kagglehub
import pandas as pd
from sqlmodel import SQLModel, select

from app.recipes.models import Recipe
from scripts.lib.logger import info, success, warn
from scripts.lib.seed import _make_session_maker

_DEFAULT_LIMIT = 50_000
_BATCH_SIZE = 500
_ISO_RE = re.compile(r'(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)M)?', re.IGNORECASE)
_URL_RE = re.compile(r'https?://[^\s"\')\]]+')


def _parse_iso8601_minutes(value: object) -> int | None:
    if pd.isna(value) or not isinstance(value, str) or not value.strip():
        return None
    m = _ISO_RE.search(value.strip())
    if not m:
        return None
    days = int(m.group(1)) if m.group(1) else 0
    hours = int(m.group(2)) if m.group(2) else 0
    minutes = int(m.group(3)) if m.group(3) else 0
    return days * 1440 + hours * 60 + minutes


def _parse_r_vector(value: object) -> list[str]:
    """Parse R-style c("a", "b") vectors; falls back to comma-split for plain strings."""
    if pd.isna(value) or not isinstance(value, str):
        return []
    raw = value.strip()
    if not raw or raw == 'character(0)':
        return []
    if raw.startswith('c(') and raw.endswith(')'):
        inner = raw[2:-1]
        parts = re.findall(r'"([^"]*)"', inner)
        return [p.strip() for p in parts if p.strip()]
    return [p.strip().strip('"') for p in raw.split(',') if p.strip()]


def _parse_image_url(value: object) -> str | None:
    if pd.isna(value):
        return None
    raw = str(value).strip().strip('"')
    if not raw or raw in ('character(0)', ''):
        return None
    urls = _URL_RE.findall(raw)
    return urls[0] if urls else None


def _parse_int(value: object) -> int | None:
    if pd.isna(value):
        return None
    try:
        return int(float(str(value)))
    except (ValueError, TypeError):
        return None


def _parse_float(value: object) -> float | None:
    if pd.isna(value):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _load_dataframe(csv_path: str | None, limit: int) -> pd.DataFrame:
    if csv_path:
        info(f'Reading CSV from {csv_path}')
        df = pd.read_csv(csv_path)
    else:
        info('Downloading dataset from Kaggle (irkaal/foodcom-recipes-and-reviews) ...')
        import ssl
        import urllib3.util.ssl_
        import urllib3.connection
        _orig_create_context = urllib3.util.ssl_.create_urllib3_context
        def _unverified_context(*args, **kwargs):
            kwargs['cert_reqs'] = ssl.CERT_NONE
            return _orig_create_context(*args, **kwargs)
        _orig_ssl_wrap = urllib3.util.ssl_.ssl_wrap_socket
        def _unverified_wrap(sock, server_hostname=None, ssl_context=None, **kwargs):
            if ssl_context:
                ssl_context.verify_mode = ssl.CERT_NONE
                ssl_context.check_hostname = False
            return _orig_ssl_wrap(sock, server_hostname=server_hostname, ssl_context=ssl_context, **kwargs)
        urllib3.util.ssl_.create_urllib3_context = _unverified_context
        urllib3.connection.create_urllib3_context = _unverified_context
        urllib3.util.ssl_.ssl_wrap_socket = _unverified_wrap
        urllib3.connection.ssl_wrap_socket = _unverified_wrap
        path = kagglehub.dataset_download('irkaal/foodcom-recipes-and-reviews')
        recipes_path = f'{path}/recipes.csv'
        info(f'Loading CSV from {recipes_path}')
        df = pd.read_csv(recipes_path)

    info(f'Loaded {len(df)} rows')
    df = df.drop_duplicates(subset=['RecipeId'])
    df = df.dropna(subset=['RecipeId', 'Name'])

    if 'AggregatedRating' in df.columns:
        df = df.sort_values('AggregatedRating', ascending=False)

    df = df.head(limit)
    info(f'Using top {len(df)} recipes by rating')
    return df


def _row_to_recipe(row: dict) -> Recipe:
    ingredients = [i.capitalize() for i in _parse_r_vector(row.get('RecipeIngredientParts'))]
    measurements = _parse_r_vector(row.get('RecipeIngredientQuantities'))
    tags = [t.lower() for t in _parse_r_vector(row.get('Keywords'))]
    instructions = '\n\n'.join(
        s.capitalize() for s in _parse_r_vector(row.get('RecipeInstructions'))
    )

    recipe = Recipe(
        source='foodcom',
        source_id=str(int(row['RecipeId'])) if pd.notna(row.get('RecipeId')) else '0',
        name=str(row.get('Name', '')).strip().title(),
        category=(
            str(row.get('RecipeCategory', '')).strip().lower()
            if pd.notna(row.get('RecipeCategory'))
            else None
        ),
        cuisine=None,
        ingredients=ingredients,
        measurements=measurements,
        instructions=instructions,
        image_url=_parse_image_url(row.get('Images')),
        tags=tags,
        prep_time_minutes=_parse_iso8601_minutes(row.get('PrepTime')),
        cook_time_minutes=_parse_iso8601_minutes(row.get('CookTime')),
        total_time_minutes=_parse_iso8601_minutes(row.get('TotalTime')),
        aggregate_rating=_parse_float(row.get('AggregatedRating')),
        review_count=_parse_int(row.get('ReviewCount')),
        servings=_parse_int(row.get('RecipeServings')),
        description=(
            str(row.get('Description', '')).strip() if pd.notna(row.get('Description')) else None
        ),
        author_name=(
            str(row.get('AuthorName', '')).strip() if pd.notna(row.get('AuthorName')) else None
        ),
        calories=_parse_float(row.get('Calories')),
        fat_content=_parse_float(row.get('FatContent')),
        saturated_fat_content=_parse_float(row.get('SaturatedFatContent')),
        cholesterol_content=_parse_float(row.get('CholesterolContent')),
        sodium_content=_parse_float(row.get('SodiumContent')),
        carbohydrate_content=_parse_float(row.get('CarbohydrateContent')),
        fiber_content=_parse_float(row.get('FiberContent')),
        sugar_content=_parse_float(row.get('SugarContent')),
        protein_content=_parse_float(row.get('ProteinContent')),
        date_published=(
            pd.to_datetime(row['DatePublished']).to_pydatetime().replace(tzinfo=None)
            if pd.notna(row.get('DatePublished'))
            else None
        ),
        created_at=datetime.now(),
    )
    return recipe


async def run_seed_recipes(
    csv_path: str | None = None, limit: int = _DEFAULT_LIMIT, db_url: str | None = None
) -> None:
    _engine, session_maker = _make_session_maker(db_url)

    info('Initializing database tables...')
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    df = _load_dataframe(csv_path, limit)

    async with session_maker() as session:
        existing_result = await session.exec(
            select(Recipe.source_id).where(Recipe.source == 'foodcom')
        )
        existing_ids: set[str] = set(existing_result.all())

        if existing_ids:
            warn(f'{len(existing_ids)} recipes already seeded, skipping duplicates')

        new_records: list[Recipe] = []
        skipped = 0
        for _, row in df.iterrows():
            source_id = str(int(row['RecipeId'])) if pd.notna(row.get('RecipeId')) else None
            if source_id is None or source_id in existing_ids:
                skipped += 1
                continue
            new_records.append(_row_to_recipe(dict(row)))

        if not new_records:
            success('No new recipes to seed')
            return

        info(f'Seeding {len(new_records)} recipes in batches of {_BATCH_SIZE}...')

        for i in range(0, len(new_records), _BATCH_SIZE):
            batch = new_records[i : i + _BATCH_SIZE]
            session.add_all(batch)
            await session.commit()
            # Detach all from session to avoid memory bloat
            for r in batch:
                await session.refresh(r)

        success(f'Seeded {len(new_records)} recipes')

    if db_url:
        await _engine.dispose()
