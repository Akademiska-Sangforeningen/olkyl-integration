const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { main } = require('./packages/olkyl/handleFridgeAction');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON and url-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Server is running');
});

  
// Webhook endpoint for Slack
app.post('/handleFridgeAction', (req, res) => {
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/handleFridgeAction`);
  console.log(`Test URL: http://localhost:${PORT}/test?action=on|off|status`);
  console.log('Use ngrok or similar to expose this to the internet for Slack');
});
