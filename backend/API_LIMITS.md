# API Rate Limits

This document outlines the rate limiting configuration for the Stock Project API to prevent abuse and ensure fair usage.

## Rate Limiting Strategy

The API implements token bucket rate limiting using `slowapi`. Rate limits are applied per client IP address.

## Endpoint Rate Limits

### Authentication Endpoints

| Endpoint | Method | Limit | Purpose |
|----------|--------|-------|---------|
| `/api/auth/signup` | POST | **5/minute** | Prevent brute force account creation |
| `/api/auth/login` | POST | **10/minute** | Prevent brute force login attempts |
| `/api/auth/logout` | POST | **60/hour** | Normal session management |

### User Profile Endpoints

| Endpoint | Method | Limit | Purpose |
|----------|--------|-------|---------|
| `/api/users/me` | GET | **300/hour** | Profile fetch (typical usage) |
| `/api/users/me` | PUT | **100/hour** | Profile updates (less frequent) |
| `/api/users/me` | DELETE | **5/hour** | Account deletion (safety critical) |

### Stock Data Endpoints

| Endpoint | Method | Limit | Purpose |
|----------|--------|-------|---------|
| `/api/quote/{symbol}` | GET | **200/minute** | Real-time quote lookup |
| `/api/quotes` | GET | **200/minute** | Bulk quote retrieval |
| `/api/search` | GET | **50/minute** | Symbol search (higher processing) |
| `/api/chart/{symbol}` | GET | **100/minute** | Historical chart data |
| `/api/fundamentals/{symbol}` | GET | **100/hour** | Fundamental analysis data |
| `/api/news/{symbol}` | GET | **100/hour** | News articles |

## Rate Limit Response

When a client exceeds the rate limit, the API returns:

```json
{
  "detail": "Rate limit exceeded. Please try again later."
}
```

**Status Code:** `429 Too Many Requests`

## Notes

- Rate limits are applied **per IP address**
- Limits reset every minute or hour depending on the configuration
- These limits are designed for typical user behavior
- High-volume applications may need custom rate limit configurations

## External API Limits

### Finnhub API

- **Free Plan:**
  - 60 API calls per minute
  - Limited to EOD (end of day) data for free accounts

### Supabase

- **Free Plan:**
  - Database: Up to 500MB storage
  - Real-time: Minimal concurrent connections
  - Auth: Standard email/password authentication

## Future Improvements

- [ ] Per-user rate limiting (authenticated endpoints)
- [ ] Tiered rate limits (free vs premium users)
- [ ] Rate limit headers in responses (X-RateLimit-*)
- [ ] API key-based rate limiting
- [ ] Redis-backed distributed rate limiting for multi-instance deployments
