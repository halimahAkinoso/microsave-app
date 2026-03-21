from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.message import Message
from app.models.user import User

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageCreate(BaseModel):
    sender_id: int
    content: str


@router.get("/{group_id}/messages")
def get_messages(group_id: int, db: Session = Depends(get_db)):
    messages = db.query(Message).filter(
        Message.group_id == group_id
    ).order_by(Message.created_at.asc()).all()

    result = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        result.append({
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": sender.name if sender else "Unknown",
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return result


@router.post("/{group_id}/messages")
def send_message(group_id: int, data: MessageCreate, db: Session = Depends(get_db)):
    msg = Message(
        sender_id=data.sender_id,
        group_id=group_id,
        content=data.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    sender = db.query(User).filter(User.id == msg.sender_id).first()
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_name": sender.name if sender else "Unknown",
        "content": msg.content,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }
