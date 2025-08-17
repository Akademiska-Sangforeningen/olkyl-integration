# Olkyl Integration

Minimal guide for running the app locally and on a Raspberry Pi with dynamic DNS and port forwarding (no serverless).

## Local development

1. Install and configure:

- npm install
- cp .env.example .env
- Fill Slack tokens and Shelly credentials in .env

2. Run:

- npm run dev
- Posts to the Slack channel “testkanal”
- For full Slack round‑trip from your machine, forward the NAS’s incoming requests to your local port

## Slack setup (production)

- Create a slash command and enable interactivity in your Slack app
- Point both to your public DNS from the NAS, e.g.:
  - https://rasmus.dy.fi/handleFridgeAction
- Ensure required scopes and tokens are present in .env

## Network setup

Nas has a reverse proxy under Login portal/Advanced/Reverse Proxy. Change the ip it points to if needed.

## Raspberry Pi deployment

### Update

```
ssh homebridge
cd olkyl-integration/
git pull
sudo systemctl restart olkyl-integration
sudo journalctl -u olkyl-integration.service
```

### Logs

```
sudo journalctl -fu olkyl-integration.service
```

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
