import sys

_COLORS = {
    'header': '\033[95m',
    'info': '\033[94m',
    'success': '\033[92m',
    'warn': '\033[93m',
    'error': '\033[91m',
    'bold': '\033[1m',
    'dim': '\033[2m',
    'reset': '\033[0m',
}

def _color(code: str, text: str) -> str:
    if not sys.stdout.isatty() or 'NO_COLOR' in __import__('os').environ:
        return text
    return f'{_COLORS[code]}{text}{_COLORS["reset"]}'

def header(text: str) -> None:
    print(f'\n{_color("bold", _color("header", f"═══ {text} ═══"))}\n')

def info(text: str) -> None:
    print(_color('info', f'  → {text}'))

def success(text: str) -> None:
    print(_color('success', f'  ✓ {text}'))

def warn(text: str) -> None:
    print(_color('warn', f'  ⚠ {text}'))

def error(text: str) -> None:
    print(_color('error', f'  ✗ {text}'))

def divider() -> None:
    print(_color('dim', '  ─────────────────────────────'))
