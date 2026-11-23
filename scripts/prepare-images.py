from pathlib import Path
from PIL import Image

root = Path(__file__).parent.parent
source_dir = root / 'src' / 'shared' / 'assets'
target = source_dir / 'optimized'
target.mkdir(parents=True, exist_ok=True)
for source in source_dir.glob('*.png'):
    with Image.open(source) as image:
        image.convert('RGB').save(target / (source.stem + '.webp'), 'WEBP', quality=91, method=6)
        if source.stem in ('hero-process', 'engineering-materials', 'engineering-desk'):
            image.thumbnail((1000, 750))
            image.convert('RGB').save(target / (source.stem + '-small.webp'), 'WEBP', quality=88, method=6)
        print(source.name, source.size if hasattr(source, 'size') else '')
