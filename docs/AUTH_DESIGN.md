# 🔐 Auth System Design — CareerArch

---

## Token Strategy

| Token                | Type                   | Expiry                          | Storage                  |
| -------------------- | ---------------------- | ------------------------------- | ------------------------ |
| Access Token         | JWT (signed HS256)     | 15 minutes                      | Memory / HttpOnly Cookie |
| Refresh Token        | UUID (hashed in DB)    | 7 days (30 days if Remember Me) | HttpOnly Cookie + DB     |
| Email Verify Token   | Crypto random (hashed) | 24 hours                        | DB                       |
| Password Reset Token | Crypto random (hashed) | 1 hour                          | DB                       |
| 2FA Secret           | TOTP base32            | Never expires                   | DB (encrypted)           |

---

## JWT Payload Structure

```typescript
// Access Token
interface JWTPayload {
  sub: string; // user/org/admin ID
  role: "USER" | "ORGANIZATION" | "ADMIN";
  email: string;
  plan?: "FREE" | "BASIC" | "PREMIUM"; // only for USER
  iat: number;
  exp: number;
}
```

---

## Registration Flow

```
POST /auth/user/register
{
  email, password, firstName, lastName
}
        │
        ▼
Validate with Zod schema
        │
        ▼
Check email uniqueness
        │
        ▼
Hash password (bcrypt, 12 rounds)
        │
        ▼
Create User + UserProfile (transaction)
        │
        ▼
Assign FREE Subscription
        │
        ▼
Generate emailVerifyToken (crypto.randomBytes(32))
Store hashed version in DB with 24h expiry
        │
        ▼
Queue verification email
        │
        ▼
Return 201 { message: "Check your email to verify your account" }
```

---

## Login Flow (with 2FA support)

```
POST /auth/user/login
{ email, password, rememberMe?: true }
        │
        ▼
Find user by email
        │
        ▼
Compare bcrypt password
        │
        ▼
Is email verified? → No → 403 "Please verify your email"
        │
        ▼
Is 2FA enabled?
  ├── YES → Return { requires2FA: true, tempToken: "short-lived JWT" }
  │           (Client stores tempToken, shows OTP input)
  │           POST /auth/user/2fa/validate { tempToken, otp }
  │           Validate TOTP code
  │           ↓ (continue below)
  └── NO  → (continue below)
        │
        ▼
Generate Access Token (15m)
Generate Refresh Token (7d or 30d if rememberMe)
Store hashed refresh token in DB
        │
        ▼
Set HttpOnly cookies:
  - access_token (15m)
  - refresh_token (7d/30d)
        │
        ▼
Return { user: {...}, accessToken }
```

---

## Token Refresh Flow

```
POST /auth/user/refresh-token
(reads refresh_token from HttpOnly cookie)
        │
        ▼
Extract refresh token from cookie
Find in DB, check isRevoked = false and not expired
        │
        ▼
Verify belongs to correct user
        │
        ▼
Rotate: revoke old, create new refresh token
        │
        ▼
Generate new Access Token
        │
        ▼
Set new cookies, return new accessToken
```

---

## Forgot Password Flow

```
POST /auth/user/forgot-password
{ email }
        │
        ▼
Find user (silently succeed if not found — prevent enumeration)
        │
        ▼
Generate resetToken = crypto.randomBytes(32).toString('hex')
Store hash in DB with 1h expiry
        │
        ▼
Send reset email:
  Link: https://CareerArch.com/reset-password?token=RAW_TOKEN
        │
        ▼
Return 200 { message: "If email exists, reset link sent" }
```

---

## Reset Password Flow

```
POST /auth/user/reset-password
{ token, newPassword, confirmPassword }
        │
        ▼
Hash token, find user with matching token & valid expiry
        │
        ▼
Validate newPassword strength (min 8, uppercase, number, symbol)
        │
        ▼
Hash new password (bcrypt, 12 rounds)
Update user.password
Clear passwordResetToken + passwordResetExpiry
        │
        ▼
Revoke ALL existing refresh tokens for this user
        │
        ▼
Send "Password changed" confirmation email
        │
        ▼
Return 200 { message: "Password reset successful. Please log in." }
```

---

## 2FA Setup Flow

```
POST /auth/user/2fa/setup   (user must be logged in)
        │
        ▼
Generate TOTP secret (speakeasy.generateSecret)
Store secret temporarily (not yet enabled)
        │
        ▼
Generate QR code URL
(otpauth://totp/CareerArch:[email]?secret=XXX&issuer=CareerArch)
        │
        ▼
Return { qrCode: base64PNG, manualKey: secret }

User scans QR with Google Authenticator / Authy
        │
        ▼
POST /auth/user/2fa/verify
{ otp: "123456" }
        │
        ▼
Verify TOTP (speakeasy.totp.verify)
If valid → set twoFactorEnabled = true, save secret
        │
        ▼
Return backup codes (one-time use)
```

---

## Middleware Stack

```typescript
// middlewares/auth.ts

export const authenticate = async (req, res, next) => {
  // 1. Extract token from Authorization header or cookie
  // 2. Verify JWT signature
  // 3. Check if token is blacklisted in Redis (logout)
  // 4. Attach req.user = decoded payload
  // 5. next()
};

export const authorize =
  (...roles: Role[]) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  };

export const requireSubscription =
  (minPlan: SubscriptionPlan) => async (req, res, next) => {
    const sub = await getActiveSubscription(req.user.sub);
    const hierarchy = { FREE: 0, BASIC: 1, PREMIUM: 2 };
    if (hierarchy[sub.plan] < hierarchy[minPlan]) {
      return res.status(403).json({
        success: false,
        message: `Requires ${minPlan} plan`,
        upgradeUrl: "/subscription/plans",
      });
    }
    next();
  };
```

---

## Security Measures

| Attack              | Mitigation                                   |
| ------------------- | -------------------------------------------- |
| Brute force login   | Rate limit: 5 attempts / 15 min per IP       |
| Token theft         | Short-lived access tokens (15m)              |
| CSRF                | SameSite=Strict cookies + CSRF token         |
| SQL injection       | Prisma parameterized queries                 |
| XSS                 | HttpOnly cookies, Content-Security-Policy    |
| Email enumeration   | Generic messages on forgot password          |
| Password stuffing   | bcrypt 12 rounds + breach detection          |
| Refresh token theft | Rotation + revocation on suspicious activity |

---

## .env.example (Auth-related)

```env
# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFRESH_EXPIRY_REMEMBER_ME=30d

# Bcrypt
BCRYPT_ROUNDS=12

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://api.CareerArch.com/api/v1/auth/google/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx

# Redis (for token blacklist & rate limiting)
REDIS_URL=redis://localhost:6379

# App
FRONTEND_URL=https://CareerArch.com
API_URL=https://api.CareerArch.com/api/v1
```
