// The function's dependencies
const fetch = require("node-fetch");
const { WebClient } = require('@slack/web-api');


// Function starts here - converted to async/await
async function main(args, res) {
  console.log("handleFridgeAction function called with args:");

  let payload;
  if (typeof args.payload === 'string') {
    try {
      payload = JSON.parse(args.payload);
      console.log("Successfully parsed JSON payload");
    } catch (error) {
      console.error("Failed to parse payload:", error);
      payload = args;
    }
  } else {
    payload = args.payload || args;
  }
  // console.log(payload);
  // console.log(payload.actions);
  
  // Configuration
  const token = process.env["SLACK_APP_TOKEN"];
  const shellyUrl = process.env["SHELLY_URL"];
  const shellyDeviceId = process.env["DEVICE_ID"];
  const shellyKey = process.env["SHELLY_KEY"];
  const slackClient = new WebClient(token);
  
  console.log("Environment variables loaded");

  let action = payload.actions ? payload.actions[0].value : payload.text;
  console.log("Action requested:", action);
  console.log("channel_id: ", payload.channel_id)

  channelId = payload.channel_id || payload.container.channel_id
  
  // Standardize action format
  if (action === "på" || action === "on") {
    action = "on";
  } else if (action === "av" || action === "off") {
    action = "off";
  } else {
    // Default to status check if no valid action
    console.log("No valid action provided, defaulting to status check");
    return await getStatus(res, slackClient, channelId, shellyUrl, shellyDeviceId, shellyKey);
  }

  try {
    // Check if this is an interactive message with a response_url
    const responseUrl = payload.response_url;
    
    if (responseUrl) {
      res.status(200).send()

      console.log('Interactive click, sending new buttons')

      // This is a button click from an interactive message
      // Update the original message to show action in progress
      const updatedBlocks = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": action === "on" ? "Sätter på ölkylen..." : "Stänger av ölkylen..."
          }
        }
      ];
      
      // Send the update to the original message
      await fetch(responseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          replace_original: true,
          blocks: updatedBlocks,
          text: action === "on" ? "Sätter på ölkylen..." : "Stänger av ölkylen..."
        })
      });
      
      console.log("Updated original message with loading state");
    } else {
      // Send immediate response for slash commands
      res.status(200).json({
        text: action === "on" ? "Lägger på ölkylen..." : "Stänger av ölkylen...",
        response_type: "in_channel",
      });
    }
    
    console.log("Sent initial notification to Slack");
    
    // Control the fridge
    let result = await controlFridge(shellyUrl, shellyDeviceId, shellyKey, action);
    console.log("Control fridge result:", result);
    
    if (result.isok) {
      // Wait for the device to update
      console.log("Device control successful, waiting for device to update");
      await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
      throw new Error(`Failed to control device: ${result}`);
    }
    
    // Get updated status
    console.log("Getting updated fridge status");
    const status = await getFridgeStatus(shellyUrl, shellyDeviceId, shellyKey);
    // console.log("Fridge status:", status);
    
    const isOn = status?.data?.device_status?.relays[0]?.ison;
    const power = status?.data?.device_status?.meters[0]?.power;
    
    console.log("Fridge is on:", isOn, "Power:", power);
    
    // If this was a button click with a response_url, update the message again
    if (responseUrl) {
      let finalText = '';
      let finalBlocks = [];
      
      if (action === "on" && !isOn) {
        // Failed to turn on
        finalText = "Kunde inte sätta på ölkylen, den är fortfarande avstängd.";
      } else if (action === "off" && isOn) {
        // Failed to turn off
        finalText = "Kunde inte stänga av ölkylen, den är fortfarande på.";
      } else if (isOn) {
        // Successfully turned on
        finalText = `Ölkylen är nu påslagen och drar ${power}W! 🍺`;
      } else {
        // Successfully turned off
        finalText = "Ölkylen är nu avstängd! ☠️";
      }
      
      // Create updated blocks with the opposite action button
      finalBlocks = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": finalText
          }
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": isOn ? "Stäng av" : "Lägg på",
                "emoji": true
              },
              "style": isOn ? "danger" : "primary",
              "value": isOn ? "off" : "on",
              "action_id": isOn ? "off" : "on"
            }
          ]
        }
      ];
      
      // Update the message
      await fetch(responseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          replace_original: true,
          blocks: finalBlocks,
          text: finalText
        })
      });
      
      console.log("Updated original message with final state");
    } else {
      // For non-interactive messages, send a new message
      if (action === "on" && !isOn) {
        // Failed to turn on
        console.log("Failed to turn on fridge");
        await slackClient.chat.postMessage({
          channel: channelId,
          text: "Kunde inte sätta på ölkylen, den är fortfarande avstängd."
        });
      } else if (action === "off" && isOn) {
        // Failed to turn off
        console.log("Failed to turn off fridge");
        await slackClient.chat.postMessage({
          channel: channelId,
          text: "Kunde inte stänga av ölkylen, den är fortfarande på."
        });
      } else if (isOn) {
        // Successfully turned on
        console.log("Successfully turned on fridge");
        await slackClient.chat.postMessage({
          channel: channelId,
          text: `Ölkylen är nu påslagen och drar ${power}W! 🍺`
        });
      } else {
        // Successfully turned off
        console.log("Successfully turned off fridge");
        await slackClient.chat.postMessage({
          channel: channelId,
          text: "Ölkylen är nu avstängd! ☠️"
        });
      }
    }
    
    console.log("Operation completed successfully");
    return { body: {} };
  } catch (error) {
    console.error("Error:", error);
    
    // Send error message if we have a channel ID
    if (channelId) {
      try {
        await slackClient.chat.postMessage({
          channel: channelId,
          text: `Ett fel uppstod: ${error.message}`
        });
        console.log("Error notification sent to Slack");
      } catch (slackError) {
        console.error("Failed to send error to Slack:", slackError);
      }
    }
    
    console.log("Returning empty response after error");
    return { body: {} };
  }
}

async function getStatus(res, slackClient, channelId, shellyUrl, deviceId, authKey) {
  console.log("getStatus called for channel:", channelId);
  
  try {
    // Get current status
    const status = await getFridgeStatus(shellyUrl, deviceId, authKey);
    console.log("Status received:", status);
    
    const isOn = status?.data?.device_status?.relays[0]?.ison;
    const power = status?.data?.device_status?.meters[0]?.power;
    
    // Create status message
    let statusText = "Kunde inte hämta status för ölkylen";
    if (status?.data?.online) {
      statusText = `Ölkylen är ${isOn ? `PÅ och drar ${power}W` : "avstängd"}`;
    }
    
    console.log("Status text:", statusText);
    
    // Create blocks with appropriate action button
    const blocks = [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": statusText
        }
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": isOn ? "Stäng av" : "Lägg på",
              "emoji": true
            },
            "style": isOn ? "danger" : "primary",
            "value": isOn ? "off" : "on",
            "action_id": isOn ? "off" : "on"
          }
        ]
      }
    ];
    
    // Send message with status and action button
    console.log("Sending status message to Slack with blocks");
    res.json({
      channel: channelId,
      text: statusText,
      blocks: blocks
    });
    console.log("Status message sent successfully");
  } catch (error) {
    console.error("Error getting status:", error);
    
    try {
      await slackClient.chat.postMessage({
        channel: channelId,
        text: `Fel vid hämtning av status: ${error.message}`
      });
      console.log("Error notification sent to user");
    } catch (slackError) {
      console.error("Failed to send error message to Slack:", slackError);
    }
    
    return { body: {} };
  }
}

async function controlFridge(shellyUrl, deviceId, authKey, action) {
  console.log(`Controlling fridge: ${action}`);
  const controlUrl = `${shellyUrl}/device/relay/control`;
  const details = {
    channel: 0,
    turn: action, // 'on' or 'off'
    id: deviceId,
    auth_key: authKey,
  };

  const formBodyParts = [];
  for (const property in details) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(details[property]);
    formBodyParts.push(encodedKey + "=" + encodedValue);
  }
  const formBody = formBodyParts.join("&");

  console.log(`Sending request to: ${controlUrl}`);
  const response = await fetch(controlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: formBody,
  });
  
  console.log(`Control API response status: ${response.status}`);
  return await response.json();
}

async function getFridgeStatus(shellyUrl, deviceId, authKey) {
  const statusUrl = `${shellyUrl}/device/status?id=${deviceId}&auth_key=${authKey}`;
  console.log(`Getting fridge status from: ${statusUrl}`);
  
  const response = await fetch(statusUrl);
  console.log(`Status API response status: ${response.status}`);
  return await response.json();
}

// Makes the function available as a module in the project
module.exports.main = main;
