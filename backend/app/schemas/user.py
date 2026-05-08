import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, model_validator
import re

ROLE_VALUES = ("admin", "supervisor", "cashier")


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=10, max_length=72)
    role: str = Field(pattern="^(admin|supervisor|cashier)$")

    @model_validator(mode="after")
    def validate_password_strength(self) -> "UserCreate":
        p = self.password
        if not re.search(r"[A-Z]", p):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", p):
            raise ValueError("Password must contain at least one digit")
        return self


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, pattern="^(admin|supervisor|cashier)$")
    is_active: Optional[bool] = None
    theme_preference: Optional[str] = Field(None, pattern="^(light|dark|system)$")


class UserRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    must_change_password: bool
    theme_preference: str
    language: str
    last_login_at: Optional[datetime]
    created_at: datetime


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
