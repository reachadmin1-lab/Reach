from typing import Optional
from pydantic import BaseModel


class ProfilePatch(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    location: Optional[str] = None


class PlatformsPatch(BaseModel):
    platforms: dict[str, str] = {}


class LanguagesPatch(BaseModel):
    languages: list[str] = []


class GenresPatch(BaseModel):
    genres: list[str] = []


class OnboardingProgressResponse(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    location: Optional[str] = None
    platforms: dict[str, str] = {}
    languages: list[str] = []
    genres: list[str] = []
    status: str = "draft"

    model_config = {"from_attributes": True}
