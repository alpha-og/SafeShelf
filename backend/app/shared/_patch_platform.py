import os
import platform
import ssl

import httpx._transports.default as _httpx_default


# WMI query in platform.machine() can hang on some Windows configurations.
# Replace with a stub so the registry fallback is used instead.
def _noop_wmi_query(table: str, *keys: str) -> tuple[str, ...]:
    raise OSError('not supported')


if hasattr(platform, '_wmi_query'):
    platform._wmi_query = _noop_wmi_query


# httpx 0.28.1 hardcodes cafile=certifi.where() as the default SSL context,
# which breaks on Windows when a corporate proxy (e.g. Zscaler) uses its own
# root CA — certifi doesn't include it, but the Windows system cert store does.
# Patch to use the system cert store instead.
_original_create_ssl_context = _httpx_default.create_ssl_context


def _create_ssl_context(
    verify: bool | ssl.SSLContext | str = True,
    cert: str | tuple[str, str] | tuple[str, str, str] | None = None,
    trust_env: bool = True,
) -> ssl.SSLContext:
    if verify is True:
        has_cafile = trust_env and os.environ.get('SSL_CERT_FILE')
        has_capath = trust_env and os.environ.get('SSL_CERT_DIR')
        if not has_cafile and not has_capath:
            ctx = ssl.create_default_context()
            if cert is not None:
                if isinstance(cert, str):
                    ctx.load_cert_chain(cert)
                else:
                    ctx.load_cert_chain(*cert)
            return ctx
    return _original_create_ssl_context(verify, cert, trust_env)


_httpx_default.create_ssl_context = _create_ssl_context
