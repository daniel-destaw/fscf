import uuid
from datetime import datetime, timezone

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# NEW: Supplier/Buyer Registration Schema
class UserOnboardingRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    entity_type: str = Field(default="Supplier", description="Supplier or Buyer")
    tin_number: str = Field(min_length=1, max_length=50)
    business_phone: str = Field(min_length=1, max_length=20)
    otp_consent: bool = False
    terms_accepted: bool = False


# NEW: User Approval Schema
class UserApproval(SQLModel):
    approved: bool
    rejection_reason: str | None = None


# NEW: User Document Schema
class UserDocumentCreate(SQLModel):
    document_type: str
    file_name: str
    file_size: int
    mime_type: str


class UserDocumentPublic(UserDocumentCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    uploaded_at: datetime | None = None
    is_verified: bool = False


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore[assignment]
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    
    # NEW: Onboarding fields
    entity_type: str = Field(default="Supplier", max_length=20)
    tin_number: str | None = Field(default=None, unique=True, index=True, max_length=50)
    business_phone: str | None = Field(default=None, max_length=20)
    otp_consent: bool = False
    terms_accepted: bool = False
    approval_status: str = Field(default="pending", max_length=20)  # pending, approved, rejected
    approved_at: datetime | None = None
    approved_by: uuid.UUID | None = None
    documents_uploaded: bool = False
    
    # Relationships
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    documents: list["UserDocument"] = Relationship(back_populates="user", cascade_delete=True)


# NEW: User Document Database Model
class UserDocument(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    document_type: str = Field(max_length=100)
    file_name: str = Field(max_length=255)
    file_path: str = Field(max_length=500)
    file_size: int
    mime_type: str = Field(max_length=100)
    uploaded_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    is_verified: bool = False
    verified_by: uuid.UUID | None = None
    verified_at: datetime | None = None
    
    # Relationship
    user: User = Relationship(back_populates="documents")


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None
    entity_type: str
    tin_number: str | None = None
    business_phone: str | None = None
    approval_status: str
    documents_uploaded: bool


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore[assignment]


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)