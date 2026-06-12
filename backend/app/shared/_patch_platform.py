import platform

# WMI query in platform.machine() can hang on some Windows configurations.
# Replace with a stub so the registry fallback is used instead.
def _noop_wmi_query(table: str, *keys: str) -> tuple[str, ...]:
    raise OSError("not supported")

if hasattr(platform, "_wmi_query"):
    platform._wmi_query = _noop_wmi_query
