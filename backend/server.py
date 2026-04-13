from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import string
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Game Middleware imports
from middleware.game_middleware_manager import GameMiddlewareManager
from middleware.sugar_sweeps_bridge import SugarSweepsBridge

# Services
from services.email_service import email_service
from services.bonus_service import BonusService
from services.currency_service import CurrencyService

# Currency models and config
from models.currency_models import PurchaseType, BonusGrantType
from config.currency_config import (
    AMOE_DAILY_CREDITS,
    MIN_REDEMPTION_CREDITS,
    CREDITS_TO_USD_RATIO,
    calculate_redemption_usd
)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Initialize Game Middleware Manager
middleware_manager = None

# Initialize Sugar Sweeps Bridge (Master Tank for P2P)
sugar_sweeps_bridge = None

# Initialize Bonus Service
bonus_service = None

# Initialize Currency Service
currency_service = None

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Token Management
def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Auth Helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    age_verified: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    sugar_tokens: int = 0  # Purchased product
    game_credits: int = 0  # Sweepstakes entries (redeemable)
    credits: float = 0.0  # DEPRECATED: Keep for backward compatibility
    age_verified: bool = False
    game_accounts: Optional[Dict[str, dict]] = None
    game_password: Optional[str] = None
    last_amoe_claim: Optional[str] = None
    created_at: str

class UserUpdate(BaseModel):
    game_accounts: Optional[Dict[str, dict]] = None
    game_password: Optional[str] = None

class GameCreate(BaseModel):
    name: str
    logo_url: str
    game_url: str
    description: Optional[str] = ""
    is_active: bool = True
    accent_color: str = "#ff00ff"

class GameUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    game_url: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    accent_color: Optional[str] = None

class GameResponse(BaseModel):
    id: str
    name: str
    logo_url: str
    game_url: str
    description: str
    is_active: bool
    accent_color: str
    created_at: str

class PaymentPackage(BaseModel):
    id: str
    name: str
    amount: float
    credits: float
    description: str

class CheckoutRequest(BaseModel):
    amount: float  # Custom amount (min $1)
    game_id: str
    account_name: str
    origin_url: str
    payment_method: str = "stripe"

class ManualPaymentRequest(BaseModel):
    user_id: str
    amount: float
    credits: float
    game_id: str
    account_name: str
    payment_method: str
    notes: Optional[str] = ""

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    amount: float
    credits: float
    game_id: str
    game_name: str
    account_name: str
    payment_method: str
    status: str
    session_id: Optional[str] = None
    created_at: str
    updated_at: str

# Minimum deposit amount
MIN_DEPOSIT = 1.00

# Quick deposit suggestions (not packages, just suggestions)
DEPOSIT_SUGGESTIONS = [10, 20, 50, 100, 200]

# WALA MAGIC: Auto-generate game credentials
def generate_game_username(user_id: str) -> str:
    """Generate unique game username: WM{first 8 chars of user ID}"""
    return f"WM{user_id[:8].upper()}"

def generate_game_password() -> str:
    """Generate secure random 12-character password"""
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(12))

# Auth Endpoints
@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if not data.age_verified:
        raise HTTPException(status_code=400, detail="You must verify you are 18 or older")
    
    # Create user first to get ID
    temp_user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "user",
        "sugar_tokens": 0,
        "game_credits": 0,
        "credits": 0.0,
        "age_verified": data.age_verified,
        "game_accounts": {},
        "game_username": "",
        "game_password": "",
        "last_amoe_claim": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(temp_user_doc)
    user_id = str(result.inserted_id)
    
    # WALA MAGIC: Auto-generate game credentials
    game_username = generate_game_username(user_id)
    game_password = generate_game_password()
    
    # Update user with game credentials
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "game_username": game_username,
            "game_password": game_password
        }}
    )
    
    logger.info(f"🎮 Generated game credentials for {email}: {game_username}")
    
    # Send welcome email
    try:
        email_service.send_welcome_email(email, data.name)
    except Exception as e:
        logger.warning(f"Failed to send welcome email: {str(e)}")
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": email,
        "name": data.name,
        "role": "user",
        "credits": 0.0,
        "age_verified": data.age_verified,
        "game_username": game_username,
        "game_password": game_password,
        "message": "🎮 SAVE THESE CREDENTIALS! Use them to sign up on ALL game platforms."
    }

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response, request: Request):
    email = data.email.lower()
    identifier = f"{request.client.host}:{email}"
    
    # Check brute force
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_time = attempt.get("locked_until")
        if lockout_time and datetime.fromisoformat(lockout_time) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear failed attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "user"),
        "credits": user.get("credits", 0.0),
        "game_username": user.get("game_username", ""),
        "game_password": user.get("game_password", "")
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============================================
# AMOE (Alternate Method of Entry) - Legal Requirement
# ============================================

class AMOEClaimRequest(BaseModel):
    """Request to claim daily free credits (No Purchase Necessary)"""
    pass

@api_router.post("/amoe/claim-daily")
async def claim_daily_free_credits(request: Request):
    """
    AMOE - Alternate Method of Entry
    
    Legal Requirement: Users must be able to get sweepstakes entries WITHOUT purchasing.
    This endpoint grants free Game Credits every 24 hours.
    """
    user = await get_current_user(request)
    
    if not currency_service:
        raise HTTPException(status_code=503, detail="Currency service not initialized")
    
    success, message = await currency_service.claim_amoe_daily(
        user_id=user["id"],
        user_email=user["email"]
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # Get updated balance
    balance = await currency_service.get_user_balance(user["id"])
    
    return {
        "success": True,
        "message": message,
        "credits_granted": AMOE_DAILY_CREDITS,
        "new_balance": balance
    }

@api_router.get("/amoe/status")
async def get_amoe_status(request: Request):
    """Check AMOE claim eligibility"""
    user = await get_current_user(request)
    
    last_claim = user.get("last_amoe_claim")
    
    if not last_claim:
        return {
            "eligible": True,
            "message": "Claim your free credits!",
            "next_eligible": None
        }
    
    from datetime import timedelta
    from config.currency_config import AMOE_COOLDOWN_HOURS
    
    last_claim_time = datetime.fromisoformat(last_claim)
    next_eligible = last_claim_time + timedelta(hours=AMOE_COOLDOWN_HOURS)
    eligible = datetime.now(timezone.utc) >= next_eligible
    
    return {
        "eligible": eligible,
        "last_claim": last_claim,
        "next_eligible": next_eligible.isoformat(),
        "hours_remaining": max(0, int((next_eligible - datetime.now(timezone.utc)).total_seconds() / 3600))
    }

# ============================================
# Redemption Endpoints
# ============================================

class RedemptionRequestModel(BaseModel):
    game_credits: int
    btc_address: str

@api_router.post("/redemption/request")
async def create_redemption_request(data: RedemptionRequestModel, request: Request):
    """
    Request to redeem Game Credits for Bitcoin.
    
    Only GAME CREDITS can be redeemed (not Sugar Tokens).
    Minimum: 5,000 credits ($50)
    KYC required for amounts >= $500
    """
    user = await get_current_user(request)
    
    if not currency_service:
        raise HTTPException(status_code=503, detail="Currency service not initialized")
    
    success, message, redemption_id = await currency_service.create_redemption_request(
        user_id=user["id"],
        user_email=user["email"],
        game_credits=data.game_credits,
        btc_address=data.btc_address
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success": True,
        "message": message,
        "redemption_id": redemption_id,
        "amount_usd": calculate_redemption_usd(data.game_credits)
    }

@api_router.get("/redemption/history")
async def get_redemption_history(request: Request):
    """Get user's redemption history"""
    user = await get_current_user(request)
    
    redemptions = await db.redemption_requests.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return redemptions

@api_router.get("/currency/balance")
async def get_currency_balance(request: Request):
    """Get user's dual-currency balance"""
    user = await get_current_user(request)
    
    if not currency_service:
        raise HTTPException(status_code=503, detail="Currency service not initialized")
    
    balance = await currency_service.get_user_balance(user["id"])
    
    if not balance:
        raise HTTPException(status_code=404, detail="User not found")
    
    return balance

# ============================================
# Games Endpoints
# ============================================
@api_router.get("/games")
async def get_games():
    games = await db.games.find({"is_active": True}, {"_id": 1, "name": 1, "logo_url": 1, "game_url": 1, "description": 1, "accent_color": 1, "is_active": 1, "created_at": 1}).to_list(100)
    return [{"id": str(g["_id"]), **{k: v for k, v in g.items() if k != "_id"}} for g in games]

@api_router.get("/games/all")
async def get_all_games(request: Request):
    await get_admin_user(request)
    games = await db.games.find({}, {"_id": 1, "name": 1, "logo_url": 1, "game_url": 1, "description": 1, "accent_color": 1, "is_active": 1, "created_at": 1}).to_list(100)
    return [{"id": str(g["_id"]), **{k: v for k, v in g.items() if k != "_id"}} for g in games]

@api_router.post("/games")
async def create_game(data: GameCreate, request: Request):
    await get_admin_user(request)
    game_doc = {
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.games.insert_one(game_doc)
    return {"id": str(result.inserted_id), **game_doc}

@api_router.put("/games/{game_id}")
async def update_game(game_id: str, data: GameUpdate, request: Request):
    await get_admin_user(request)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    await db.games.update_one({"_id": ObjectId(game_id)}, {"$set": update_data})
    game = await db.games.find_one({"_id": ObjectId(game_id)})
    return {"id": str(game["_id"]), **{k: v for k, v in game.items() if k != "_id"}}

@api_router.delete("/games/{game_id}")
async def delete_game(game_id: str, request: Request):
    await get_admin_user(request)
    await db.games.delete_one({"_id": ObjectId(game_id)})
    return {"message": "Game deleted"}

# Payment Info
@api_router.get("/packages")
async def get_deposit_info():
    return {
        "min_deposit": MIN_DEPOSIT,
        "suggestions": DEPOSIT_SUGGESTIONS,
        "rate": "1:1"  # Dollar for dollar
    }

# Stripe Checkout
@api_router.post("/checkout/create")
async def create_checkout(data: CheckoutRequest, request: Request):
    user = await get_current_user(request)
    
    # Validate amount (min $1)
    if data.amount < MIN_DEPOSIT:
        raise HTTPException(status_code=400, detail=f"Minimum deposit is ${MIN_DEPOSIT}")
    
    # Dollar for dollar - credits equal amount
    credits = data.amount
    
    game = await db.games.find_one({"_id": ObjectId(data.game_id)})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Create Stripe checkout
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/payment/cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=data.amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "user_email": user["email"],
            "amount": str(data.amount),
            "game_id": data.game_id,
            "game_name": game["name"],
            "account_name": data.account_name,
            "credits": str(credits)
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create transaction record
    transaction = {
        "user_id": user["id"],
        "user_email": user["email"],
        "amount": data.amount,
        "credits": credits,
        "game_id": data.game_id,
        "game_name": game["name"],
        "account_name": data.account_name,
        "payment_method": "stripe",
        "status": "pending",
        "payment_status": "initiated",
        "session_id": session.session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    user = await get_current_user(request)
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if transaction and transaction.get("payment_status") != "paid":
        new_status = "completed" if status.payment_status == "paid" else ("failed" if status.status == "expired" else "pending")
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": new_status, "payment_status": status.payment_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Add credits if paid
        if status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            await db.users.update_one(
                {"_id": ObjectId(transaction["user_id"])},
                {"$inc": {"credits": transaction["credits"]}}
            )
    
    game = await db.games.find_one({"_id": ObjectId(transaction["game_id"])}) if transaction else None
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total / 100,
        "game_url": game["game_url"] if game else None,
        "game_name": game["name"] if game else None,
        "account_name": transaction["account_name"] if transaction else None
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if transaction and transaction.get("payment_status") != "paid":
                # Update transaction status
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"status": "completed", "payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                # DUAL-CURRENCY FLOW: Create Sugar Token purchase + Grant bonus Game Credits
                if currency_service:
                    try:
                        success, msg, purchase_id, bonus_id = await currency_service.process_purchase_with_bonus(
                            user_id=transaction["user_id"],
                            user_email=transaction["user_email"],
                            amount_usd=transaction["amount"],
                            purchase_type=PurchaseType.STRIPE_CARD,
                            payment_reference=webhook_response.session_id
                        )
                        
                        if success:
                            logger.info(f"✅ Dual-currency grant: {transaction['user_email']} - {msg}")
                        else:
                            logger.error(f"❌ Dual-currency grant failed: {msg}")
                    except Exception as e:
                        logger.error(f"Dual-currency processing error: {str(e)}")
                
                # BACKWARD COMPATIBILITY: Also update old credits field
                await db.users.update_one(
                    {"_id": ObjectId(transaction["user_id"])},
                    {"$inc": {"credits": transaction["credits"]}}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        return {"status": "error"}

# Manual Payment (Admin creates for Cash App, Chime, Crypto)
@api_router.post("/admin/payments/manual")
async def create_manual_payment(data: ManualPaymentRequest, request: Request):
    await get_admin_user(request)
    
    user = await db.users.find_one({"_id": ObjectId(data.user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    game = await db.games.find_one({"_id": ObjectId(data.game_id)})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    transaction = {
        "user_id": data.user_id,
        "user_email": user["email"],
        "amount": data.amount,
        "credits": data.credits,
        "game_id": data.game_id,
        "game_name": game["name"],
        "account_name": data.account_name,
        "payment_method": data.payment_method,
        "status": "completed",
        "payment_status": "paid",
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.payment_transactions.insert_one(transaction)
    
    # DUAL-CURRENCY FLOW: Create Sugar Token purchase + Grant bonus Game Credits
    if currency_service:
        try:
            success, msg, purchase_id, bonus_id = await currency_service.process_purchase_with_bonus(
                user_id=data.user_id,
                user_email=user["email"],
                amount_usd=data.amount,
                purchase_type=PurchaseType.MANUAL_ADMIN,
                payment_reference=f"manual_{data.payment_method}"
            )
            
            if success:
                logger.info(f"✅ Admin manual payment: {user['email']} - {msg}")
            else:
                logger.error(f"❌ Admin manual payment failed: {msg}")
        except Exception as e:
            logger.error(f"Admin payment dual-currency error: {str(e)}")
    
    # BACKWARD COMPATIBILITY: Also update old credits field
    await db.users.update_one(
        {"_id": ObjectId(data.user_id)},
        {"$inc": {"credits": data.credits}}
    )
    
    return {"id": str(result.inserted_id), "message": "Payment recorded and credits added"}

# Admin Endpoints
@api_router.get("/admin/users")
async def get_all_users(request: Request):
    await get_admin_user(request)
    users = await db.users.find({}, {"_id": 1, "email": 1, "name": 1, "role": 1, "credits": 1, "age_verified": 1, "game_accounts": 1, "game_password": 1, "created_at": 1}).to_list(1000)
    return [{"id": str(u["_id"]), **{k: v for k, v in u.items() if k != "_id"}} for u in users]

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, request: Request):
    await get_admin_user(request)
    update_data = {}
    if data.game_accounts is not None:
        update_data["game_accounts"] = data.game_accounts
    if data.game_password is not None:
        update_data["game_password"] = data.game_password
    
    if update_data:
        await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return {"id": str(user["_id"]), **{k: v for k, v in user.items() if k not in ["_id", "password_hash"]}}

@api_router.get("/admin/transactions")
async def get_all_transactions(request: Request):
    await get_admin_user(request)
    transactions = await db.payment_transactions.find({}).sort("created_at", -1).to_list(1000)
    return [{"id": str(t["_id"]), **{k: v for k, v in t.items() if k != "_id"}} for t in transactions]

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    await get_admin_user(request)
    
    total_users = await db.users.count_documents({})
    total_transactions = await db.payment_transactions.count_documents({})
    completed_transactions = await db.payment_transactions.count_documents({"status": "completed"})
    
    # Calculate total revenue
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue_result = await db.payment_transactions.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "total_users": total_users,
        "total_transactions": total_transactions,
        "completed_transactions": completed_transactions,
        "total_revenue": total_revenue
    }

@api_router.put("/admin/users/{user_id}/credits")
async def update_user_credits(user_id: str, credits: float, request: Request):
    await get_admin_user(request)
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"credits": credits}})
    return {"message": "Credits updated"}

# Payment Info Endpoints
@api_router.get("/payment/crypto-info")
async def get_crypto_info():
    return {
        "btc_address": os.environ.get("CRYPTO_WALLET_ADDRESS", ""),
        "lightning_address": os.environ.get("LIGHTNING_ADDRESS", ""),
        "instructions": "Send payment via Bitcoin or Lightning Network and contact support with transaction ID"
    }

@api_router.get("/payment/card-info")
async def get_card_info():
    return {
        "tag": os.environ.get("CARD_PAYMENT_TAG", "$SugarCitySweeps"),
        "instructions": "Send payment via Cash App or Chime and include your game tag in the note"
    }

# User Transactions
@api_router.get("/user/transactions")
async def get_user_transactions(request: Request):
    user = await get_current_user(request)
    transactions = await db.payment_transactions.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [{"id": str(t["_id"]), **{k: v for k, v in t.items() if k != "_id"}} for t in transactions]

# Root
@api_router.get("/")
async def root():
    return {"message": "Sugar City Sweeps API"}

# ============ GAME MIDDLEWARE ENDPOINTS ============

# Bitcoin Webhook Handler
@api_router.post("/webhooks/bitcoin")
async def bitcoin_webhook(request: Request):
    """Handle incoming Bitcoin payment webhooks from BTCPay/CoinGate"""
    try:
        payload = await request.json()
        
        if not middleware_manager or not middleware_manager.webhook_handler:
            raise HTTPException(status_code=503, detail="Middleware not initialized")
        
        success, msg = await middleware_manager.webhook_handler.handle_webhook(request, payload)
        
        if success:
            return {"status": "success", "message": msg}
        else:
            raise HTTPException(status_code=400, detail=msg)
    
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Withdrawal Request
class WithdrawalRequest(BaseModel):
    game_id: str
    amount_usd: float
    btc_address: str

@api_router.post("/withdraw/request")
async def request_withdrawal(withdrawal: WithdrawalRequest, request: Request):
    """Request a Bitcoin withdrawal"""
    try:
        user = await get_current_user(request)
        
        if not middleware_manager or not middleware_manager.payout_engine:
            raise HTTPException(status_code=503, detail="Withdrawal system not available")
        
        # Get game and platform info
        game = await db.games.find_one({"id": withdrawal.game_id}, {"_id": 0})
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        
        platform_id = game.get("platform_id", "unknown")
        
        # Get user's game account
        game_accounts = user.get("game_accounts", {})
        game_account = game_accounts.get(withdrawal.game_id, {})
        player_id = game_account.get("username", "")
        
        if not player_id:
            raise HTTPException(
                status_code=400,
                detail=f"No game account configured for {game['name']}. Contact admin to set up your account."
            )
        
        # Calculate credits (1:1 ratio)
        credits = withdrawal.amount_usd
        
        # Process withdrawal
        success, msg, payout_id = await middleware_manager.process_withdrawal(
            user_id=user["id"],
            game_id=withdrawal.game_id,
            platform_id=platform_id,
            player_id=player_id,
            amount_usd=withdrawal.amount_usd,
            credits=credits,
            btc_address=withdrawal.btc_address,
            user_email=user["email"]
        )
        
        if success:
            return {
                "status": "success",
                "message": msg,
                "payout_id": payout_id
            }
        else:
            raise HTTPException(status_code=400, detail=msg)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Withdrawal request error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Get Pending Payouts (Admin Only)
@api_router.get("/admin/payouts/pending")
async def get_pending_payouts(request: Request):
    """Get all payouts awaiting approval"""
    await get_admin_user(request)
    
    if not middleware_manager or not middleware_manager.payout_engine:
        return []
    
    payouts = await middleware_manager.payout_engine.get_pending_payouts()
    return payouts

# Approve Payout (Admin Only)
@api_router.post("/admin/payouts/{payout_id}/approve")
async def approve_payout(payout_id: str, request: Request):
    """Approve a pending payout"""
    admin = await get_admin_user(request)
    
    if not middleware_manager or not middleware_manager.payout_engine:
        raise HTTPException(status_code=503, detail="Payout system not available")
    
    success, msg = await middleware_manager.payout_engine.approve_payout(
        payout_id=payout_id,
        admin_user_id=admin["id"]
    )
    
    if success:
        return {"status": "success", "message": msg}
    else:
        raise HTTPException(status_code=400, detail=msg)

# Reject Payout (Admin Only)
class RejectPayoutRequest(BaseModel):
    reason: str

@api_router.post("/admin/payouts/{payout_id}/reject")
async def reject_payout(payout_id: str, rejection: RejectPayoutRequest, request: Request):
    """Reject a pending payout"""
    admin = await get_admin_user(request)
    
    if not middleware_manager or not middleware_manager.payout_engine:
        raise HTTPException(status_code=503, detail="Payout system not available")
    
    success, msg = await middleware_manager.payout_engine.reject_payout(
        payout_id=payout_id,
        admin_user_id=admin["id"],
        reason=rejection.reason
    )
    
    if success:
        return {"status": "success", "message": msg}
    else:
        raise HTTPException(status_code=400, detail=msg)

# Get Middleware System Status (Admin Only)
@api_router.get("/admin/middleware/status")
async def get_middleware_status(request: Request):
    """Get status of game middleware systems"""
    await get_admin_user(request)
    
    if not middleware_manager:
        return {"status": "not_initialized"}
    
    status = await middleware_manager.get_system_status()
    
    # Add Firebase status if available
    try:
        from services.firebase_secrets import firebase_secrets
        firebase_status = firebase_secrets.verify_connection()
        status["firebase_secrets"] = firebase_status
    except:
        status["firebase_secrets"] = {"firebase_enabled": False, "credentials_source": "Environment Variables"}
    
    return status

# Sugar Sweeps P2P Transfer (New Master Tank Strategy)
class P2PTransferRequest(BaseModel):
    user_id: str
    platform_id: str  # e.g., "fire_kirin", "juwa", "orion_stars"
    player_id: str    # User's game account ID
    amount: float     # Credits to transfer

@api_router.post("/admin/p2p-transfer")
async def initiate_p2p_transfer(transfer: P2PTransferRequest, request: Request):
    """
    Initiate P2P credit transfer using Sugar Sweeps Master Tank
    
    Admin endpoint to transfer Game Credits to user's platform account via Sugar Sweeps hub.
    This uses the unified "Master Tank" strategy instead of individual platform bots.
    """
    await get_admin_user(request)
    
    if not sugar_sweeps_bridge:
        raise HTTPException(
            status_code=503, 
            detail="Sugar Sweeps Bridge not available. P2P automation disabled."
        )
    
    if not sugar_sweeps_bridge.is_authenticated:
        # Try to reconnect
        success, msg = await sugar_sweeps_bridge.initialize()
        if not success:
            raise HTTPException(status_code=503, detail=f"Sugar Sweeps offline: {msg}")
    
    try:
        # Get user to verify they have enough credits
        user = await db.users.find_one({"_id": ObjectId(transfer.user_id)}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.get("game_credits", 0) < transfer.amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient credits. User has {user.get('game_credits', 0)}, needs {transfer.amount}"
            )
        
        # Execute P2P transfer via Sugar Sweeps
        success, msg, tx_id = await sugar_sweeps_bridge.transfer_credits(
            platform_id=transfer.platform_id,
            player_id=transfer.player_id,
            amount=transfer.amount
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=msg)
        
        # Deduct credits from user's account
        await db.users.update_one(
            {"_id": ObjectId(transfer.user_id)},
            {"$inc": {"game_credits": -transfer.amount}}
        )
        
        # Log transfer in database
        await db.p2p_transfers.insert_one({
            "user_id": transfer.user_id,
            "user_email": user["email"],
            "platform_id": transfer.platform_id,
            "player_id": transfer.player_id,
            "amount": transfer.amount,
            "transaction_id": tx_id,
            "status": "completed",
            "timestamp": datetime.now(timezone.utc)
        })
        
        logger.info(f"🎮 P2P Transfer: {transfer.amount} credits → {transfer.player_id} on {transfer.platform_id}")
        
        return {
            "success": True,
            "message": msg,
            "transaction_id": tx_id,
            "remaining_credits": user.get("game_credits", 0) - transfer.amount
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"P2P transfer error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transfer failed: {str(e)}")

@api_router.post("/admin/middleware/inject")
async def manual_credit_injection(request: Request, data: dict):
    """
    Manual credit injection via Playwright (Admin override)
    
    Boss Control: Manually inject credits to a player without waiting for payment
    """
    await get_admin_user(request)
    
    if not middleware_manager:
        raise HTTPException(status_code=503, detail="Middleware not initialized")
    
    platform_id = data.get("platform_id")
    user_id = data.get("user_id")
    player_id = data.get("player_id")
    game_id = data.get("game_id")
    credits = data.get("credits")
    reason = data.get("reason", "Manual admin injection")
    
    if not all([platform_id, user_id, player_id, credits]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    try:
        # Get user info
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Allocate credits via Playwright
        success, msg = await middleware_manager.allocate_credits(
            user_id=user_id,
            game_id=game_id or platform_id,
            platform_id=platform_id,
            player_id=player_id,
            amount_usd=credits  # 1:1 ratio for manual injections
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=msg)
        
        # Create manual grant record for audit trail
        if currency_service:
            await currency_service.grant_bonus_credits(
                user_id=user_id,
                user_email=user["email"],
                game_credits=int(credits),
                grant_type=BonusGrantType.ADMIN_GRANT,
                metadata={
                    "platform_id": platform_id,
                    "player_id": player_id,
                    "reason": reason,
                    "manual_injection": True
                }
            )
        
        logger.info(f"👑 ADMIN MANUAL INJECTION: {player_id} received {credits} credits on {platform_id}")
        
        return {
            "success": True,
            "message": f"Injected {credits} credits to {player_id}",
            "platform": platform_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual injection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Injection failed: {str(e)}")

@api_router.post("/admin/middleware/restart/{platform_id}")
async def restart_platform_bot(platform_id: str, request: Request):
    """Restart Playwright bot for a specific platform"""
    await get_admin_user(request)
    
    if not middleware_manager:
        raise HTTPException(status_code=503, detail="Middleware not initialized")
    
    try:
        bridge = middleware_manager.get_bridge(platform_id)
        
        if not bridge:
            raise HTTPException(status_code=404, detail=f"No bridge found for platform: {platform_id}")
        
        # Close existing session
        await bridge.close()
        
        # Reinitialize
        success, msg = await bridge.initialize()
        
        if not success:
            raise HTTPException(status_code=500, detail=f"Restart failed: {msg}")
        
        logger.info(f"🔄 Platform bot restarted: {platform_id}")
        
        return {
            "success": True,
            "message": f"Bot restarted for {platform_id}",
            "status": msg
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Restart error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Restart failed: {str(e)}")



# ============ LEGAL PAGES ============

from fastapi.responses import HTMLResponse
from pathlib import Path

@api_router.get("/legal/terms", response_class=HTMLResponse)
async def terms_of_service():
    """Serve Terms of Service page"""
    try:
        with open(Path(__file__).parent / "static" / "terms.html", "r") as f:
            return f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Terms of Service page not found")

@api_router.get("/legal/privacy", response_class=HTMLResponse)
async def privacy_policy():
    """Serve Privacy Policy page"""
    try:
        with open(Path(__file__).parent / "static" / "privacy.html", "r") as f:
            return f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Privacy Policy page not found")

@api_router.get("/legal/responsible-gaming", response_class=HTMLResponse)
async def responsible_gaming():
    """Serve Responsible Gaming page"""
    try:
        with open(Path(__file__).parent / "static" / "responsible-gaming.html", "r") as f:
            return f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Responsible Gaming page not found")

app.include_router(api_router)

# CORS Configuration - use specific origins (not wildcard) when credentials=True
cors_origins_str = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Background task for Sugar Sweeps Bridge initialization
async def initialize_sugar_sweeps_bridge():
    """Initialize Sugar Sweeps Bridge in background to not block startup"""
    global sugar_sweeps_bridge
    try:
        if sugar_sweeps_bridge:
            success, msg = await sugar_sweeps_bridge.initialize()
            if success:
                logger.info(f"🍬 Sugar Sweeps Bridge ONLINE: {msg}")
            else:
                logger.warning(f"⚠️  Sugar Sweeps Bridge failed: {msg}")
    except Exception as e:
        logger.error(f"Sugar Sweeps Bridge initialization error: {str(e)}")

# Seed data on startup
@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@sugarcitysweeps.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "SugarCity2024!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "credits": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    
    # Seed default games
    games_count = await db.games.count_documents({})
    if games_count == 0:
        default_games = [
            {
                "id": "fire_kirin",
                "name": "Fire Kirin",
                "platform_id": "fire_kirin",
                "logo_url": "https://customer-assets.emergentagent.com/job_project-build-52/artifacts/yy7vuitz_download%20%285%29.jpeg",
                "game_url": "https://firekirin.xyz/download",
                "description": "Underwater adventure fishing game",
                "is_active": True,
                "accent_color": "#00ff00"
            },
            {
                "id": "juwa",
                "name": "Juwa",
                "platform_id": "juwa",
                "logo_url": "https://customer-assets.emergentagent.com/job_project-build-52/artifacts/zca7nng8_juwa.jpeg",
                "game_url": "https://dl.juwa777.com/",
                "description": "Classic casino slots experience",
                "is_active": True,
                "accent_color": "#ffd700"
            },
            {
                "id": "juwa2",
                "name": "Juwa 2",
                "platform_id": "juwa2",
                "logo_url": "https://customer-assets.emergentagent.com/job_project-build-52/artifacts/yfu87og5_download%20%283%29.jpeg",
                "game_url": "https://m.juwa2.com/",
                "description": "Next generation slots",
                "is_active": True,
                "accent_color": "#ff4444"
            },
            {
                "id": "ultra_panda",
                "name": "Ultra Panda",
                "platform_id": "ultra_panda",
                "logo_url": "https://customer-assets.emergentagent.com/job_project-build-52/artifacts/npa0nxre_download%20%284%29.jpeg",
                "game_url": "https://www.ultrapanda.mobi/",
                "description": "Premium panda slots",
                "is_active": True,
                "accent_color": "#00ff00"
            },
            {
                "id": "panda_master",
                "name": "Panda Master",
                "platform_id": "panda_master",
                "logo_url": "https://images.unsplash.com/photo-1726004592905-dc5cd794bda6?w=400&h=400&fit=crop&crop=center&q=80",
                "game_url": "https://pandamaster.vip/download",
                "description": "Panda themed sweepstakes",
                "is_active": True,
                "accent_color": "#00d4ff"
            },
            {
                "id": "orion_stars",
                "name": "Orion Stars",
                "platform_id": "orion_stars",
                "logo_url": "https://images.pexels.com/photos/12877878/pexels-photo-12877878.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop",
                "game_url": "https://orionstars.vip/download",
                "description": "Space-themed sweepstakes",
                "is_active": True,
                "accent_color": "#4444ff"
            },
            {
                "id": "game_vault",
                "name": "Game Vault",
                "platform_id": "game_vault",
                "logo_url": "https://images.unsplash.com/photo-1695189623052-b25432fd9886?w=400&h=400&fit=crop&crop=center&q=80",
                "game_url": "https://gamevault999.com/download",
                "description": "Premium game collection",
                "is_active": True,
                "accent_color": "#44ff44"
            },
        ]
        for game in default_games:
            game["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.games.insert_many(default_games)
        logger.info("Default games seeded")
    
    # Initialize Game Middleware Manager
    global middleware_manager
    global bonus_service
    
    try:
        config_path = os.path.join(ROOT_DIR, "config", "platforms.json")
        middleware_manager = GameMiddlewareManager(config_path, db)
        
        # Initialize in background
        import asyncio
        asyncio.create_task(middleware_manager.initialize())
        
        logger.info("Game Middleware Manager initialization started")
    except Exception as e:
        logger.error(f"Failed to start middleware manager: {str(e)}")
    
    # Initialize Bonus Service
    try:
        bonus_service = BonusService(db)
        logger.info("Bonus Service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize bonus service: {str(e)}")
    
    # Initialize Currency Service
    global currency_service
    try:
        currency_service = CurrencyService(db)
        logger.info("Currency Service initialized (Dual-currency sweepstakes compliance)")
    except Exception as e:
        logger.error(f"Failed to initialize currency service: {str(e)}")
    
    # Initialize Sugar Sweeps Bridge (Master Tank for P2P automation)
    global sugar_sweeps_bridge
    try:
        sugar_sweeps_bridge = SugarSweepsBridge()
        asyncio.create_task(initialize_sugar_sweeps_bridge())
        logger.info("Sugar Sweeps Bridge initialization started in background")
    except Exception as e:
        logger.warning(f"Sugar Sweeps Bridge not available: {str(e)}")
        sugar_sweeps_bridge = None
    
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin User\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write("- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/logout\n")
        f.write("- GET /api/auth/me\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    if middleware_manager and middleware_manager.initialized:
        await middleware_manager.shutdown()
    client.close()
