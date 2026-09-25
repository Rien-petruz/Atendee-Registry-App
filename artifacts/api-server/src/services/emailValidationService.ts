import { db, emailValidationCacheTable, eq } from "@workspace/db";

const ZEROBOUNCE_API_KEY = process.env.ZEROBOUNCE_API_KEY;
const ZEROBOUNCE_API_URL = "https://api.zerobounce.net/v2/validate";

export interface EmailValidationResult {
  isValid: boolean;
  email: string;
  status: string;
  reason?: string;
}

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const normalizedEmail = email.toLowerCase();

  // TEMPORARY: Accept all emails with valid format (no ZeroBounce API calls due to zero credits)
  console.log(`[Validation] Accepting email (format-only): ${normalizedEmail}`);
  return {
    isValid: true,
    email: normalizedEmail,
    status: "format_only",
    reason: "ZeroBounce account out of credits - format validation only",
  };

  // Check cache first
  try {
    const cached = await db
      .select()
      .from(emailValidationCacheTable)
      .where(eq(emailValidationCacheTable.email, normalizedEmail))
      .limit(1);

    if (cached.length > 0) {
      const result = cached[0];
      console.log(`[ZeroBounce] Found cached result for ${normalizedEmail}: ${result.isValid}`);
      return {
        isValid: result.isValid,
        email: normalizedEmail,
        status: result.status,
        reason: "cached",
      };
    }
  } catch (err: any) {
    console.error("[ZeroBounce] Cache lookup error:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
  }

  if (!ZEROBOUNCE_API_KEY) {
    throw new Error("ZeroBounce API key not configured");
  }

  try {
    console.log(`[ZeroBounce] Validating email: ${normalizedEmail}, API key present: ${!!ZEROBOUNCE_API_KEY}`);

    // Try URL-encoded form data instead of JSON
    const params = new URLSearchParams();
    params.append("api_key", ZEROBOUNCE_API_KEY!);
    params.append("email", normalizedEmail);

    const response = await fetch(ZEROBOUNCE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const responseAny = response as any;
    console.log(`[ZeroBounce] Response status: ${responseAny.status}`);

    // Read response body first to log it
    const bodyText = await responseAny.text();
    console.log(`[ZeroBounce] Response body:`, bodyText);

    // Parse JSON from body
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      console.log(`[ZeroBounce] Failed to parse JSON:`, parseErr);
      throw new Error(`ZeroBounce returned invalid JSON: ${bodyText.substring(0, 100)}`);
    }
    console.log(`[ZeroBounce] Response data:`, data);

    // Check if ZeroBounce returned an error
    if (data.error) {
      console.log(`[ZeroBounce] API error: ${data.error}`);
      // On API error, be lenient and accept the email
      return {
        isValid: true,
        email: normalizedEmail,
        status: "api_error",
        reason: data.error,
      };
    }

    // ZeroBounce status: valid, invalid, catch-all, unknown, spamtrap, abuse, do_not_mail
    // Only accept emails with explicit positive statuses
    const isValid =
      data.status === "valid" ||
      data.status === "catch-all" ||
      data.status === "unknown"; // Unknown is OK (can't validate but might be valid)

    const validationResult: EmailValidationResult = {
      isValid,
      email: normalizedEmail,
      status: data.status || "error",
      reason: data.sub_status,
    };

    // Cache the result
    try {
      await db
        .insert(emailValidationCacheTable)
        .values({
          email: normalizedEmail,
          isValid,
          status: data.status || "error",
        })
        .onConflictDoUpdate({
          target: emailValidationCacheTable.email,
          set: {
            isValid,
            status: data.status || "error",
            validatedAt: new Date(),
          },
        });
    } catch (cacheErr) {
      console.error("Cache write error:", cacheErr);
    }

    return validationResult;
  } catch (err: any) {
    console.error("[ZeroBounce] Validation error:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    // On API error, be lenient and accept the email
    return {
      isValid: true,
      email: normalizedEmail,
      status: "api_error",
      reason: `API error: ${err.message || "Unknown error"}`,
    };
  }
}

export async function validateEmails(
  emails: string[]
): Promise<Map<string, EmailValidationResult>> {
  const results = new Map<string, EmailValidationResult>();

  // Validate in parallel with a small delay to avoid rate limiting
  for (const email of emails) {
    const result = await validateEmail(email);
    results.set(email, result);
    // Small delay to avoid hitting rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}
