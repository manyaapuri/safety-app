
require("dotenv").config();

const twilio = require("twilio");

async function main() {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const message = await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to: process.env.TEST_RECIPIENT_NUMBER,
    body: "Urban Guardian SMS integration test."
  });

  console.log("Message SID:", message.sid);
  console.log("Initial status:", message.status);
}

main().catch((error) => {
  console.error("Twilio test failed:", error.message);
  process.exitCode = 1;
});
