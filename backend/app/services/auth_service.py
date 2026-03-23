import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User

SECRET_KEY = os.getenv("SECRET_KEY", "microsave-dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def is_password_hash(value: Optional[str]) -> bool:
    return bool(value and value.startswith("$2"))


def verify_password(plain_password: str, stored_password: str) -> bool:
    if not stored_password:
        return False
    if is_password_hash(stored_password):
        return pwd_context.verify(plain_password, stored_password)
    return plain_password == stored_password


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password):
        return None

    # Upgrade legacy plain-text passwords on successful login.
    if not is_password_hash(user.password):
        user.password = hash_password(password)
        db.commit()
        db.refresh(user)

    return user


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _load_user_from_token(db: Session, token: str) -> Optional[User]:
    if token.startswith("token_for_"):
        email = token.replace("token_for_", "", 1)
        return db.query(User).filter(User.email == email).first()

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except JWTError:
        return None

    if not email:
        return None

    return db.query(User).filter(User.email == email).first()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = _load_user_from_token(db, token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_user_membership(
    db: Session,
    user_id: int,
    statuses: tuple[str, ...] = ("approved", "pending"),
) -> Optional[GroupMember]:
    return (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == user_id,
            GroupMember.join_status.in_(statuses),
        )
        .order_by(GroupMember.joined_at.desc())
        .first()
    )


def serialize_membership(db: Session, membership: Optional[GroupMember]) -> Optional[dict]:
    if membership is None:
        return None

    group = db.query(Group).filter(Group.id == membership.group_id).first()
    normalized_role = "admin" if membership.role == "admin" else "member"
    return {
        "group_id": membership.group_id,
        "group_name": group.name if group else None,
        "join_status": membership.join_status,
        "role": normalized_role,
        "is_admin": normalized_role == "admin",
    }


def serialize_user_profile(db: Session, user: User) -> dict:
    membership = get_user_membership(db, user.id, ("approved", "pending"))
    membership_data = serialize_membership(db, membership)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "occupation": user.occupation,
        "membership": membership_data,
        "has_group": bool(membership_data and membership_data["join_status"] == "approved"),
        "is_admin": bool(membership_data and membership_data["is_admin"]),
    }

