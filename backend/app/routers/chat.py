from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group_member import GroupMember
from app.models.message import Message
from app.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])
MAX_MESSAGE_LENGTH = 1000


class MessageCreate(BaseModel):
    content: str


def _require_group_membership(db: Session, user_id: int, group_id: int) -> GroupMember:
    membership = (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == user_id,
            GroupMember.group_id == group_id,
            GroupMember.join_status == "approved",
        )
        .first()
    )
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must belong to this group to access its chat.",
        )
    return membership


def _serialize_message(message: Message, db: Session) -> dict:
    sender = db.query(User).filter(User.id == message.sender_id).first()
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "sender_name": sender.name if sender else "Unknown",
        "content": message.content,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


@router.get("/{group_id}/messages")
def get_messages(
    group_id: int,
    after_id: int | None = Query(default=None, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_group_membership(db, current_user.id, group_id)
    query = db.query(Message).filter(Message.group_id == group_id)
    if after_id is not None:
        query = query.filter(Message.id > after_id)
    messages = query.order_by(Message.created_at.asc(), Message.id.asc()).limit(limit).all()
    return [_serialize_message(message, db) for message in messages]


@router.post("/{group_id}/messages")
def send_message(
    group_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_group_membership(db, current_user.id, group_id)
    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")
    if len(content) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message is too long. Keep chat messages under {MAX_MESSAGE_LENGTH} characters.",
        )

    message = Message(
        sender_id=current_user.id,
        group_id=group_id,
        content=content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _serialize_message(message, db)
