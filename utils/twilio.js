const twilio = require('twilio');
const Store = require('electron-store');
const store = new Store();

// Assume Twilio creds are stored in local config
const accountSid = store.get('twilioAccountSid');
const authToken = store.get('twilioAuthToken');
const from = store.get('twilioFrom');

const client = twilio(accountSid, authToken);

async function sendMessages(toList, body) {
  const results = {};

  for (const number of toList) {
    try {
      const res = await client.messages.create({
        to: number,
        from: from,
        body
      });
      results[number] = '✅ Sent';
    } catch (err) {
      results[number] = `❌ ${err.message}`;
    }
  }

  return results;
}

module.exports = { sendMessages };
