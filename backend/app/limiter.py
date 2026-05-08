from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared rate-limiter instance — imported by main.py (wired to app) and routers (decorators)
limiter = Limiter(key_func=get_remote_address)
