# Olkyl Integration - Local Development

This guide will help you set up and run the beer fridge control function locally, with a connection to Slack via webhooks.

## Prerequisites

- Node.js installed (v14 or higher)
- npm or yarn
- ngrok (to expose your local server to the internet)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure your environment variables:

Copy the example .env file and fill in your credentials:

```bash
cp .env.example .env
```

Edit the `.env` file to include your actual credentials:

- `SLACK_TOKEN`: Your Slack Bot User OAuth Token (starts with xoxb-)
- `SHELLY_URL`: URL for the Shelly API
- `DEVICE_ID`: Your Shelly device ID
- `SHELLY_KEY`: Your Shelly auth key
- `SLACK_APP_TOKEN`: Your Slack App-Level Token (starts with xapp-)
- `TEST_CHANNEL`: Your Slack channel ID for testing

## Running Locally

1. Start the local development server:

```bash
npm run dev
```

This will start the server on port 3000 (or the port specified in your .env file). If port 3000 is already in use, it will automatically try the next available port.

2. Expose your local server to the internet using ngrok:

```bash
npx ngrok http 3000
```

This will give you a public URL (like https://abc123.ngrok.io) that can receive requests from the internet.

## Setting up the Slack Webhook

1. Go to your [Slack API Apps](https://api.slack.com/apps) page
2. Select your app (or create a new one)
3. Under "Features", go to "Slash Commands"
4. Create a new command (e.g., `/olkyl`) with the following configuration:
   - Command: `/olkyl`
   - Request URL: `https://your-ngrok-url/handleFridgeAction`
   - Short Description: "Control the beer fridge"
   - Usage Hint: "[on|off]"
   - Check "Escape channels, users, and links"
5. Save your changes

You can also use this webhook URL for interactive components:
1. Go to "Interactivity & Shortcuts" in your Slack app settings
2. Enable interactivity
3. Set the Request URL to `https://your-ngrok-url/handleFridgeAction`
4. Save your changes

## Testing

### Local Browser Testing

You can test the functions without Slack using your browser:

1. Check fridge status:
```
http://localhost:3000/test/status
```

2. Control the fridge:
```
http://localhost:3000/test/action?action=on   # Turn on the fridge
http://localhost:3000/test/action?action=off  # Turn off the fridge
```

3. Simulate a button press from Slack:
```
http://localhost:3000/test/button?action=på   # "Turn on" button
http://localhost:3000/test/button?action=av   # "Turn off" button
```

### Slack Testing

1. In Slack, try using the slash command: `/olkyl on` or `/olkyl off`
2. Use `/olkyl` without parameters to check status and get interactive buttons
3. Click the buttons in the interactive message that appears
4. Check the console output of your local server to see the detailed logs

## Functions Overview

This project includes two main functions:

### getStatus
The getStatus function handles:
- Checking the current status of the beer fridge
- Displaying status with an interactive button interface
- Processing button clicks from the interactive messages
- Directly controlling the fridge when given "på" or "av" as parameters

### handleFridgeAction
The handleFridgeAction function handles:
- Turning the fridge on or off
- Checking the fridge status after the action
- Providing clear feedback about the operation's success or failure

## Troubleshooting

- If you're having issues with environment variables, make sure your `.env` file has the correct format and is in the project root.
- Check that ngrok is running and your webhook URL is correct in the Slack app settings.
- Verify that your Slack app has the necessary scopes (OAuth permissions):
  - `chat:write` - For sending messages
  - `commands` - For slash commands
  - `interactive_components` - For button interactions
- Make sure the endpoint path in your Slack app configuration matches the route in local-dev.js (`/handleFridgeAction`).
- Check the detailed logs in your console to see exactly what's happening with each request.
- If you get an "address in use" error, the server will automatically try to use the next available port.

## Deploying to Production

When you're ready to deploy your changes to production:

```bash
doctl serverless deploy /Users/rasmus/Documents/coding/olkyl-integration
```

The deployment will update both the getStatus and handleFridgeAction functions with your latest changes.
