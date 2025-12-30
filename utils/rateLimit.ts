interface RateLimitCheck {
  allowed: boolean;
  timeRemaining?: number;
}

const RATE_LIMIT = {
  maxRequests: 10,
  timeWindow: 60000, // 1 minute in milliseconds
};

let requestCount = 0;
let lastResetTime = Date.now();

export function checkRateLimit(): RateLimitCheck {
  const now = Date.now();
  const timeElapsed = now - lastResetTime;

  // Reset counter if time window has passed
  if (timeElapsed >= RATE_LIMIT.timeWindow) {
    requestCount = 0;
    lastResetTime = now;
  }

  // Check if rate limit is exceeded
  if (requestCount >= RATE_LIMIT.maxRequests) {
    const timeRemaining = Math.ceil((RATE_LIMIT.timeWindow - timeElapsed) / 1000);
    return {
      allowed: false,
      timeRemaining,
    };
  }

  // Increment counter and allow request
  requestCount++;
  return { allowed: true };
}