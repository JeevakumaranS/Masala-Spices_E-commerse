from __future__ import annotations

from pathlib import Path

from app.main import sample_categories, sample_products, sample_recipes

output = Path(__file__).resolve().parent.parent / 'seed_data.json'

payload = {
    'categories': sample_categories,
    'products': sample_products,
    'recipes': sample_recipes,
}

output.write_text(__import__('json').dumps(payload, indent=2), encoding='utf-8')
print(f'Seed data written to {output}')
