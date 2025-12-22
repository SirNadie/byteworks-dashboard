"""
Security utilities for authentication.
Handles password hashing and JWT token creation/validation.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from .config import settings


# Password hashing with Argon2 (more secure than bcrypt)
ph = PasswordHasher()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except VerifyMismatchError:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using Argon2."""
    return ph.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode in the token
        expires_delta: Optional expiration time delta
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.secret_key, 
        algorithm=settings.algorithm
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload dict or None if invalid
    """
    try:
        payload = jwt.decode(
            token, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
        )
        return payload
    except JWTError:
        return None


# ==================== URL SIGNING ====================

import hmac
import hashlib

def create_signed_query_params(path: str, valid_for_minutes: int = 1440 * 7) -> str:
    """
    Create signed query parameters (expires and signature) for a path.
    Default validity: 7 days.
    """
    # Expiration timestamp
    expires = int((datetime.now(timezone.utc) + timedelta(minutes=valid_for_minutes)).timestamp())
    
    # Create signature
    # Message = "path:expires" (e.g., "/public/quote/123/pdf:1700000000")
    message = f"{path}:{expires}".encode()
    signature = hmac.new(
        settings.secret_key.encode(),
        message,
        hashlib.sha256
    ).hexdigest()
    
    return f"expires={expires}&signature={signature}"


def verify_url_signature(path: str, expires: int, signature: str) -> bool:
    """
    Verify the signature and expiration check of a signed URL.
    """
    # 1. Check expiration
    now = int(datetime.now(timezone.utc).timestamp())
    if now > expires:
        return False
    
    # 2. Re-create expected signature
    message = f"{path}:{expires}".encode()
    expected_signature = hmac.new(
        settings.secret_key.encode(),
        message,
        hashlib.sha256
    ).hexdigest()
    
    # Compare securely
    return hmac.compare_digest(signature, expected_signature)
