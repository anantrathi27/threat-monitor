from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user
)
from app.core.redis_client import redis_client
from app.core.rate_limit import make_limiter
from app.models.user import User
from app.schemas import UserRegister, UserLogin, TokenResponse, RefreshRequest, UserOut

router = APIRouter()
strict_limiter = make_limiter(5, 60)  # 5 auth attempts per minute


@router.post("/register", response_model=TokenResponse)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
        role="viewer",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    user.last_login = datetime.now(timezone.utc)

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id), "role": user.role}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
        user=UserOut.model_validate(user),
    )


@router.post("/refresh")
async def refresh(data: RefreshRequest):
    payload = await decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    new_access = create_access_token({"sub": payload["sub"], "role": payload.get("role", "viewer")})
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    # In production: blacklist the token in Redis
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
async def me(current_user=Depends(get_current_user)):
    return current_user
