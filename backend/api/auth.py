from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from backend.services import web_api

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(body: LoginRequest, request: Request):
    email = body.email.strip()
    password = body.password
    if not email or not password:
        raise HTTPException(status_code=400, detail="Thieu tai khoan hoac mat khau")

    token = web_api.login(email, password)
    if token is None:
        raise HTTPException(status_code=401, detail="Sai tai khoan hoac mat khau")

    request.session["user"] = email
    request.session["token"] = token
    return {"email": email}


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.get("/whoami")
def whoami(request: Request):
    email = request.session.get("user")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"email": email}
