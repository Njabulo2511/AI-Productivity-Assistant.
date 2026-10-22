import {
  GatewayError,
  PaymentRequiredError,
  RateLimitError,
  ConfigurationError,
  AuthenticationError,
} from "@lovable.dev/ai-gateway";

export function friendlyAiError(err: unknown): string {
  console.error("AI error", err);
  if (err instanceof ConfigurationError || err instanceof AuthenticationError)
    return "The AI service isn't configured correctly on the server (missing or invalid AI key).";
  if (err instanceof PaymentRequiredError)
    return "AI credits have run out for this workspace. Top up credits to continue.";
  if (err instanceof RateLimitError) return "Too many requests right now. Please wait a moment and try again.";
  if (err instanceof GatewayError) return "The AI service couldn't complete this request. Please try again.";
  return "Something went wrong while contacting the AI. Please try again.";
}
