const ZEROBOUNCE_API_KEY = process.env.ZEROBOUNCE_API_KEY;
const ZEROBOUNCE_API_URL = "https://api.zerobounce.net/v2/validate";

export interface EmailValidationResult {
  isValid: boolean;
  email: string;
  status: string;
  reason?: string;
}

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  if (!ZEROBOUNCE_API_KEY) {
    throw new Error("ZeroBounce API key not configured");
  }

  try {
    const response = await fetch(
      `${ZEROBOUNCE_API_URL}?api_key=${ZEROBOUNCE_API_KEY}&email=${encodeURIComponent(email)}`,
      { method: "GET" }
    );

    const data = await response.json() as any;

    // ZeroBounce status: valid, invalid, catch-all, unknown, spamtrap, abuse, do_not_mail
    const isValid =
      data.status === "valid" ||
      data.status === "catch-all" ||
      data.status === "unknown"; // Accept unknown to be lenient

    return {
      isValid,
      email,
      status: data.status || "error",
      reason: data.sub_status,
    };
  } catch (err: any) {
    console.error("ZeroBounce validation error:", err.message);
    // On API error, be lenient and accept the email
    return {
      isValid: true,
      email,
      status: "api_error",
      reason: err.message,
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
