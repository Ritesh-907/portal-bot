const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

// The n8n workflow manually read `Set-Cookie` from each response and passed
// the cookie string forward through every node. A cookie jar does that
// automatically for the lifetime of this client: whatever `sendOtp()` sets,
// `login()` sends back; whatever `login()` sets, every scrape call after it
// sends back too.
function createClient() {
  const jar = new CookieJar();
  return wrapper(
    axios.create({
      jar,
      withCredentials: true,
      validateStatus: () => true, // we check status ourselves so we can surface portal errors clearly
    })
  );
}

module.exports = { createClient };
