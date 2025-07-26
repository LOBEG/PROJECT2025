const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*'
  };

  // Try Redis if available and no cookie session
  if (!sessionData && UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN && (sessionId || email)) {
    try {
      const { Redis } = require('@upstash/redis');
      const redis = new Redis({
        url: UPSTASH_REDIS_REST_URL,
        token: UPSTASH_REDIS_REST_TOKEN,
      });
    } catch (err) {
      console.error("Redis initialization failed:", err);
    }
  }
};

module.exports = { handler };