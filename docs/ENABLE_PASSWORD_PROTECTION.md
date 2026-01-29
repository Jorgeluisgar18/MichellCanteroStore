# Manual Step Required: Enable Password Security Features

## Overview
Supabase offers two password security features with different plan requirements:

### 1. Secure Password Change (FREE - Available on all plans)
Users must be recently logged in (within last 24 hours) to change their password without reauthentication. This prevents unauthorized password changes.

### 2. Prevent Use of Leaked Passwords (PRO Plan Required)
Uses the HaveIBeenPwned.org Pwned Passwords API to prevent users from using compromised passwords. **This feature requires Pro Plan or above.**

## Plan Requirement Check

> [!IMPORTANT]
> **Leaked Password Protection requires Pro Plan or above**
> 
> If your project is on the **Free Plan**, you will NOT be able to enable this feature. However, you can still:
> - Enable "Secure Password Change" (available on Free plan)
> - Implement strong password requirements (minimum length, character types)
> - Consider upgrading to Pro Plan for leaked password protection

## Steps to Enable (Pro Plan)

### Enable Leaked Password Protection

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/blvulymuoantnnwbzigs/auth/providers?provider=Email

2. **Find Password Settings**
   - In the left sidebar, click on **Authentication**
   - Click on **Providers** or **Email** provider settings
   - Scroll down to find **Password Security** or **Password Strength** section

3. **Enable Leaked Password Protection**
   - Look for the checkbox labeled **"Prevent use of leaked passwords"**
   - If you're on Pro Plan or above, you'll be able to check this box
   - If you're on Free Plan, this option will be disabled/grayed out
   - Click **Save** to apply the changes

### Enable Secure Password Change (All Plans)

1. In the same **Password Security** section
2. Find **"Secure password change"** option
3. Enable this option (available on Free plan)
4. Click **Save**

## Expected Result

**If on Pro Plan or above:**
- Leaked password protection will be enabled
- All new passwords and password changes will be checked against HaveIBeenPwned database
- Compromised passwords will be rejected

**If on Free Plan:**
- Secure password change will be enabled
- You can configure minimum password length and required character types
- Consider implementing additional client-side password validation

## Alternative Security Measures (Free Plan)

If you're on the Free Plan and cannot enable leaked password protection, implement these alternatives:

### 1. Strong Password Requirements
Configure in the same Password Security section:
- **Minimum password length**: Set to at least 12 characters (16+ recommended)
- **Required character types**: Enable all options:
  - ✅ Digits (0-9)
  - ✅ Lowercase letters (a-z)
  - ✅ Uppercase letters (A-Z)
  - ✅ Symbols (!@#$%^&*()_+-=[]{}|;':",.<>?/`~)

### 2. Client-Side Password Validation
Add additional validation in your application:
```typescript
// Example: Check against common passwords list
const commonPasswords = ['password', '123456', 'qwerty', /* ... */];

function isPasswordSecure(password: string): boolean {
  // Check minimum length
  if (password.length < 12) return false;
  
  // Check for common passwords
  if (commonPasswords.includes(password.toLowerCase())) return false;
  
  // Check complexity
  const hasDigit = /\d/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/`~]/.test(password);
  
  return hasDigit && hasLower && hasUpper && hasSymbol;
}
```

### 3. Multi-Factor Authentication (MFA)
Enable MFA for additional security layer (available on all plans):
- Navigate to Authentication → Providers
- Enable MFA options (TOTP, SMS, etc.)

## Verification

After enabling features:

1. **Re-run Security Advisors**
   ```bash
   npx supabase inspect db lint
   ```
   - If on Pro Plan with leaked password protection enabled: The warning should disappear
   - If on Free Plan: The warning will remain (expected)

2. **Test Password Security**
   - Try registering with a weak password (e.g., "password123")
   - **Pro Plan**: Should be rejected if leaked password protection is enabled
   - **Free Plan**: Should be rejected if minimum requirements are configured

## Cost Consideration

**Pro Plan Benefits:**
- Leaked password protection
- Additional compute resources
- Point-in-time recovery
- Daily backups
- And more...

**Pricing:** Check current pricing at https://supabase.com/pricing

## Summary

| Feature | Free Plan | Pro Plan |
|---------|-----------|----------|
| Secure Password Change | ✅ Available | ✅ Available |
| Leaked Password Protection | ❌ Not Available | ✅ Available |
| Password Strength Requirements | ✅ Available | ✅ Available |
| Multi-Factor Authentication | ✅ Available | ✅ Available |

> [!NOTE]
> Even without leaked password protection, implementing strong password requirements and MFA provides good security for most applications. Leaked password protection is an additional layer of defense.
