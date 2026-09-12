from fastapi import FastAPI, HTTPException, Query, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta, timezone
import finnhub
import time
from config import settings
from database import get_supabase_client
from models import UserSignup, UserLogin, UserProfile, UserUpdate, Token
from auth import get_password_hash, create_access_token, get_current_user
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

app = FastAPI()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda request, exc: JSONResponse(
    status_code=429,
    content={"detail": "Rate limit exceeded. Please try again later."},
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Finnhub client
finnhub_client = finnhub.Client(api_key=settings.FINNHUB_API_KEY)


# ---------------------------------------------------------------------------
# User Authentication Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/auth/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(request: Request, user_data: UserSignup):
    """Register a new user with email and password."""
    supabase = get_supabase_client()

    try:
        # Create user in Supabase Auth with metadata
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name
                }
            }
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )

        user_id = auth_response.user.id

        # Profile is automatically created by the database trigger
        # Wait a moment and fetch it
        time.sleep(0.5)  # Give the trigger time to execute

        profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()

        if profile_response.data:
            profile = profile_response.data[0]
        else:
            # Fallback if profile not created yet - insert it manually
            now = datetime.now(timezone.utc).isoformat()
            supabase.table("profiles").insert({
                "id": user_id,
                "email": user_data.email,
                "full_name": user_data.full_name,
                "created_at": now,
                "updated_at": now
            }).execute()
            
            profile = {
                "id": user_id,
                "email": user_data.email,
                "full_name": user_data.full_name,
                "created_at": now
            }

        # Create access token
        access_token = create_access_token(data={"sub": user_data.email})

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserProfile(
                id=user_id,
                email=user_data.email,
                full_name=profile.get("full_name"),
                created_at=profile.get("created_at")
            )
        )

    except Exception as e:
        error_message = str(e)
        if "already registered" in error_message.lower() or "already exists" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {error_message}"
        )


@app.post("/api/auth/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, user_data: UserLogin):
    """Login with email and password."""
    supabase = get_supabase_client()

    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Get user profile
        profile_response = supabase.table("profiles").select("*").eq("id", auth_response.user.id).execute()

        profile = profile_response.data[0] if profile_response.data else {}

        # Create access token
        access_token = create_access_token(data={"sub": user_data.email})

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserProfile(
                id=auth_response.user.id,
                email=user_data.email,
                full_name=profile.get("full_name"),
                created_at=profile.get("created_at")
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )


@app.post("/api/auth/logout")
@limiter.limit("60/hour")
async def logout(request: Request, current_user: str = Depends(get_current_user)):
    """Logout the current user."""
    supabase = get_supabase_client()

    try:
        supabase.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


# ---------------------------------------------------------------------------
# User Profile CRUD Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/users/me", response_model=UserProfile)
@limiter.limit("300/hour")
async def get_profile(request: Request, current_user: str = Depends(get_current_user)):
    """Get the current user's profile."""
    supabase = get_supabase_client()

    try:
        # Get user profile by email
        profile_response = supabase.table("profiles").select("*").eq("email", current_user).execute()

        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please run the backfill script or contact support."
            )

        profile = profile_response.data[0]

        return UserProfile(
            id=profile["id"],
            email=profile["email"],
            full_name=profile.get("full_name"),
            created_at=profile.get("created_at")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch profile: {str(e)}"
        )


@app.put("/api/users/me", response_model=UserProfile)
@limiter.limit("100/hour")
async def update_profile(
    request: Request,
    updates: UserUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update the current user's profile."""
    supabase = get_supabase_client()

    try:
        # Get current profile
        profile_response = supabase.table("profiles").select("*").eq("email", current_user).execute()

        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        profile = profile_response.data[0]
        user_id = profile["id"]

        # Prepare update data
        update_data = {}
        if updates.full_name is not None:
            update_data["full_name"] = updates.full_name
        if updates.email is not None:
            update_data["email"] = updates.email

        if not update_data:
            return UserProfile(
                id=profile["id"],
                email=profile["email"],
                full_name=profile.get("full_name"),
                created_at=profile.get("created_at")
            )

        # Update profile
        updated_response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()

        if not updated_response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )

        updated_profile = updated_response.data[0]

        return UserProfile(
            id=updated_profile["id"],
            email=updated_profile["email"],
            full_name=updated_profile.get("full_name"),
            created_at=updated_profile.get("created_at")
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )


@app.delete("/api/users/me")
@limiter.limit("5/hour")
async def delete_account(request: Request, current_user: str = Depends(get_current_user)):
    """Delete the current user's account."""
    supabase = get_supabase_client()

    try:
        # Get user profile
        profile_response = supabase.table("profiles").select("*").eq("email", current_user).execute()

        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        profile = profile_response.data[0]
        user_id = profile["id"]

        # Delete profile from database
        supabase.table("profiles").delete().eq("id", user_id).execute()

        # Note: Supabase Auth user deletion requires admin privileges
        # Users should be soft-deleted or handled through Supabase dashboard

        return {"message": "Account deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Stock Market Data Endpoints (Finnhub Integration)
# ---------------------------------------------------------------------------

@app.get("/api/quotes")
@limiter.limit("200/minute")
def get_bulk_quotes(request: Request, symbols: str = Query(...)):
    """Get quotes for multiple symbols."""
    result = {}
    for sym in symbols.split(","):
        sym = sym.strip().upper()
        if sym:
            try:
                result[sym] = get_quote(sym)
            except:
                result[sym] = None
    return result


@app.get("/api/search")
@limiter.limit("50/minute")
def search(request: Request, q: str = Query(..., min_length=1)):
    """Search for stock symbols."""
    try:
        search_results = finnhub_client.symbol_lookup(q)

        results = []
        if search_results and 'result' in search_results:
            for item in search_results['result'][:10]:
                results.append({
                    "symbol": item.get("symbol", ""),
                    "name": item.get("description", ""),
                    "exchange": item.get("type", "")
                })

        return results
    except Exception as e:
        # Fallback to basic filtering if Finnhub fails
        return []


@app.get("/api/quote/{symbol}")
@limiter.limit("200/minute")
def get_quote(request: Request, symbol: str):
    """Get real-time quote for a symbol."""
    symbol = symbol.upper()

    try:
        # Get quote from Finnhub
        quote_data = finnhub_client.quote(symbol)

        if not quote_data or quote_data.get('c', 0) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quote not found for symbol: {symbol}"
            )

        current_price = quote_data.get('c', 0)
        prev_close = quote_data.get('pc', current_price)
        high = quote_data.get('h', current_price)
        low = quote_data.get('l', current_price)
        open_price = quote_data.get('o', current_price)

        change = round(current_price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0

        # Calculate bid/ask spread (approximate)
        spread = round(current_price * 0.0002, 2)

        return {
            "symbol": symbol,
            "price": round(current_price, 2),
            "change": change,
            "change_pct": change_pct,
            "bid": round(current_price - spread, 2),
            "ask": round(current_price + spread, 2),
            "volume": 0,  # Finnhub doesn't provide volume in quote endpoint
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "prev_close": round(prev_close, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch quote: {str(e)}"
        )


@app.get("/api/chart/{symbol}")
@limiter.limit("100/minute")
def get_chart(request: Request, symbol: str, range_type: str = Query("1D", alias="range")):
    """Get historical price data for a symbol."""
    symbol = symbol.upper()

    try:
        # Get current quote to use as base for generating chart data
        quote_data = finnhub_client.quote(symbol)
        if not quote_data or quote_data.get('c', 0) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Symbol not found: {symbol}"
            )

        current_price = quote_data.get('c', 100)
        
        # Generate mock historical data based on current price
        now = datetime.now(timezone.utc)
        bars = []
        
        range_config = {
            "1D": {"points": 24, "interval_hours": 1},
            "7D": {"points": 7, "interval_hours": 24},
            "1M": {"points": 30, "interval_hours": 24},
            "1Y": {"points": 52, "interval_hours": 168},
        }
        
        config = range_config.get(range_type, range_config["1D"])
        num_points = config["points"]
        interval_hours = config["interval_hours"]
        
        for i in range(num_points - 1, -1, -1):
            time_offset = timedelta(hours=interval_hours * i)
            bar_time = now - time_offset
            
            # Generate realistic price variation
            price_variation = (i / num_points) * 0.1 - 0.05
            base_price = current_price * (1 + price_variation)
            
            high = base_price * 1.02
            low = base_price * 0.98
            close = base_price * (0.99 + (i % 3) * 0.01)
            open_p = base_price * (1.01 - (i % 2) * 0.01)
            
            bars.append({
                "time": bar_time.isoformat(),
                "open": round(open_p, 2),
                "high": round(high, 2),
                "low": round(low, 2),
                "close": round(close, 2),
                "volume": int(1000000 + (i * 100000) % 5000000),
            })
        
        return bars

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chart data: {str(e)}"
        )


@app.get("/api/fundamentals/{symbol}")
@limiter.limit("100/hour")
def get_fundamentals(request: Request, symbol: str):
    """Get fundamental data for a symbol."""
    # For now, return the quote data
    # You can enhance this with Finnhub's company profile endpoint
    return get_quote(symbol)


@app.get("/api/news/{symbol}")
@limiter.limit("100/hour")
def get_news(request: Request, symbol: str):
    """Get company news for a symbol."""
    symbol = symbol.upper()

    try:
        # Get news from Finnhub (last 7 days)
        from_date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        news_data = finnhub_client.company_news(symbol, _from=from_date, to=to_date)

        articles = []
        for i, item in enumerate(news_data[:8]):
            articles.append({
                "id": item.get("id", i + 1),
                "headline": item.get("headline", "No headline"),
                "source": item.get("source", "Unknown"),
                "url": item.get("url", "#"),
                "summary": item.get("summary", ""),
                "created_at": datetime.fromtimestamp(item.get("datetime", 0), tz=timezone.utc).isoformat(),
                "image": item.get("image"),
            })

        return articles

    except Exception as e:
        # Return empty list if news fetch fails
        return []


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@app.get("/")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "Hofstra Finance API",
        "version": "2.0.0"
    }
