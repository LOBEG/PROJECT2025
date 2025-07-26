const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*'
  };

  // Initialize Upstash Redis with error handling
  let redis;
  try {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.error("Redis initialization failed:", err);
  }
};

module.exports = { handler };