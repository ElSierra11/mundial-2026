import jwt
import os
import json
import base64
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from passlib.context import CryptContext
import schemas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Read from env vars — fallback to defaults for local dev
SECRET_KEY = os.environ.get("SECRET_KEY", "changeme-super-secret-key-for-dev-only")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Google OAuth Client ID
GOOGLE_CLIENT_ID = os.environ.get(
    "GOOGLE_CLIENT_ID",
    "187358281044-0b7p18pq73th8g0qvhtd4vmsi4kcsg0j.apps.googleusercontent.com"
)

# In dev mode, allow fallback JWT decode if strict verification fails
DEV_MODE = os.environ.get("DEV_MODE", "true").lower() == "true"

security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _decode_jwt_payload_unsafe(token: str) -> Optional[dict]:
    """Decode JWT payload WITHOUT signature verification.
    Only used as fallback in development when strict Google verification fails.
    DO NOT use in production without re-enabling strict verification."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        # Add base64 padding
        payload_b64 = parts[1]
        payload_b64 += '=' * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload
    except Exception as e:
        print(f"JWT decode fallback error: {e}")
        return None

def verify_google_token(token: str) -> Optional[dict]:
    # Support mock tokens for easy testing/demo mode
    if token.startswith("mock_"):
        # Format: mock_email@domain.com_DisplayName
        parts = token.split("_", 2)
        email = parts[1] if len(parts) > 1 else "demo_user@example.com"
        name = parts[2] if len(parts) > 2 else "Usuario Demo"
        user_id = f"google_{email.replace('@', '_').replace('.', '_')}"
        return {
            "sub": user_id,
            "email": email,
            "name": name,
            "picture": f"https://api.dicebear.com/7.x/adventurer/svg?seed={email}"
        }

    # --- Strict Google verification ---
    # clock_skew_in_seconds allows tolerance if local clock is slightly off
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=120  # Allow up to 2 minutes clock skew
        )
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        print("[OK] Google token verified strictly")
        return {
            "sub": idinfo.get("sub"),
            "email": idinfo.get("email"),
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture")
        }
    except Exception as e:
        print(f"[WARNING] Strict Google token verification failed: {e}")

    # --- Fallback: decode JWT without verification (DEV only) ---
    if DEV_MODE:
        print("[DEV_MODE] attempting unsafe JWT fallback decode...")
        payload = _decode_jwt_payload_unsafe(token)
        if payload:
            iss = payload.get("iss", "")
            aud = payload.get("aud", "")
            email = payload.get("email", "")
            sub = payload.get("sub", "")

            if iss not in ['accounts.google.com', 'https://accounts.google.com']:
                print(f"[ERROR] Fallback: wrong issuer: {iss}")
                return None

            # Accept if audience matches our client ID (aud can be string or list)
            aud_list = aud if isinstance(aud, list) else [aud]
            if GOOGLE_CLIENT_ID not in aud_list:
                print(f"[ERROR] Fallback: audience mismatch: {aud}")
                return None

            print(f"[SUCCESS] DEV fallback accepted token for: {email}")
            return {
                "sub": sub,
                "email": email,
                "name": payload.get("name"),
                "picture": payload.get("picture")
            }

    print("[ERROR] Google token verification completely failed")
    return None

def get_current_user_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> schemas.TokenData:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("id")
        email: str = payload.get("email")
        is_admin: bool = payload.get("is_admin", False)
        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token no válido (sin credenciales)",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return schemas.TokenData(id=user_id, email=email, is_admin=is_admin)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no válido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_admin_user_token(current_user: schemas.TokenData = Depends(get_current_user_token)) -> schemas.TokenData:
    if not current_user.is_admin or current_user.email != "alejosierra656@gmail.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no autorizada (se requieren permisos de administrador)",
        )
    return current_user
