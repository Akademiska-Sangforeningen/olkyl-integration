const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const crypto = require('crypto');
const cron = require('node-cron');
const { main } = require('./packages/olkyl/handleFridgeAction');
const { main: checkFridgeStatus } = require('./packages/olkyl/checkFridgeStatus');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

// Create raw body buffer for signature verification
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(bodyParser.urlencoded({ 
  extended: true,
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Middleware to verify Slack requests
const verifySlackRequest = (req, res, next) => {
  if (!SLACK_SIGNING_SECRET) {
    console.warn('SLACK_SIGNING_SECRET is not set. Skipping verification.');
    return res.status(501).send('Verification failed: Server setup incomplete');
  }

  // Get Slack signature and timestamp from headers
  const slackSignature = req.headers['x-slack-signature'];
  const slackTimestamp = req.headers['x-slack-request-timestamp'];

  // Check if we have the necessary headers
  if (!slackSignature || !slackTimestamp) {
    console.error('Missing Slack signature headers');
    return res.status(400).send('Verification failed');
  }

  // Prevent replay attacks - reject requests older than 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - slackTimestamp) > 300) {
    console.error('Request timestamp is too old');
    return res.status(400).send('Verification failed');
  }

  // Create the signature base string
  const baseString = 'v0:' + slackTimestamp + ':' + req.rawBody;
  
  // Create our own signature
  const hmac = crypto.createHmac('sha256', SLACK_SIGNING_SECRET);
  const ourSignature = 'v0=' + hmac.update(baseString).digest('hex');
  
  // Compare signatures using timing-safe comparison
  if (crypto.timingSafeEqual(Buffer.from(ourSignature), Buffer.from(slackSignature))) {
    return next();
  } else {
    console.error('Slack signature verification failed');
    return res.status(401).send('Verification failed');
  }
};

// Webhook endpoint for Slack with verification
app.post('/handleFridgeAction', verifySlackRequest, (req, res) => {
  // For Slack slash commands, the data comes as form data
  let data = req.body;
  
  // If text is provided as form data, parse it properly
  console.log('Received webhook from Slack. Request body format:', typeof data);
  
  // Process the webhook asynchronously
  main(data, res)
    .then(result => {
      console.log('Function execution completed:', result);
    })
    .catch(error => {
      console.error('Error executing function:', error.message);
      console.error('Error stack:', error.stack);
    });
});

// For testing purposes - bypass verification
app.get('/test/status', async (req, res) => {
  console.log('Testing status endpoint');
  res.send(await checkFridgeStatus());
});

cronSchedule = '0 * * * *'; // Every hour
console.log('Cron job scheduled: Checking fridge status with schedule: ', cronSchedule);
cron.schedule(cronSchedule, async () => {
  try {
    console.log('Running scheduled fridge status check...');
    
    // Execute the main function
    const result = await checkFridgeStatus();
    console.log('Scheduled fridge status check completed:', result);
  } catch (error) {
    console.error('Error in scheduled fridge status check:', error.message);
    console.error('Error stack:', error.stack);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/handleFridgeAction`);
  console.log(`Test URLs:`);
  console.log(`- Status: http://localhost:${PORT}/test/status`);
  console.log(`- Action: http://localhost:${PORT}/test/action?action=on|off`);
  console.log('Use ngrok or similar to expose this to the internet for Slack');
});
