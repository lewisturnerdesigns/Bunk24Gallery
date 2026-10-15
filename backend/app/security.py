import os
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

ALGORITHM = "HS256"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_admin_password(password: str) -> bool:
    email = os.getenv("ADMIN_EMAIL", "")
    password_hash = os.getenv("ADMIN_PASSWORD_HASH", "")
    if not email or not password_hash:
        return False
    try:
        return passwords.verify(password, password_hash)
    except (ValueError, TypeError):
        return False

def create_access_token(subject: str) -> str:
    if len(SECRET_KEY) < 32:
        raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters.")
    expires = datetime.now(timezone.utc) + timedelta(minutes=int(os.getenv("JWT_EXPIRE_MINUTES", "60")))
    return jwt.encode({"sub": subject, "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)

def require_admin(token: str = Depends(oauth2_scheme)) -> str:
    if len(SECRET_KEY) < 32:
        raise HTTPException(status_code=503, detail="Authentication is not configured.")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        if subject != os.getenv("ADMIN_EMAIL"):
            raise ValueError("Unexpected token subject")
        return subject
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired credentials", headers={"WWW-Authenticate": "Bearer"})
