"""Package only the runtime, always replacing private settings with the empty example."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

project = Path(__file__).resolve().parents[1]
workspace = project.parents[2]
public = project / 'public'
destination = workspace / 'POLYD-premium-update-2026-11-23.zip'
safe_config = project / 'config/mail/config.example.php'
with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
    for source in sorted(public.rglob('*')):
        if source.is_file():
            relative = source.relative_to(public).as_posix()
            archive.write(safe_config if relative == 'forms/private/config.php' else source, relative)
with ZipFile(destination) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    assert names.count('index.html') == 1
    assert '.htaccess' in names and 'forms/private/attachments.php' in names
    assert archive.read('forms/private/config.php') == safe_config.read_bytes()
    assert not any(name.startswith(('qa/', 'src/', 'docs/', 'config/')) for name in names)
report = {'file': str(destination), 'entries': len(names), 'bytes': destination.stat().st_size,
          'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'privateConfig': 'empty example only'}
(project / 'qa/release-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
