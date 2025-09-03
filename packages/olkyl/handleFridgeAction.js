// The function's dependencies
const fetch = require("node-fetch");
const { WebClient } = require("@slack/web-api");
const { text } = require("body-parser");

// Function starts here - converted to async/await
async function main(args, res) {
  console.log("handleFridgeAction function called with args:");

  let payload;
  if (typeof args.payload === "string") {
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

  // Configuration
  const token = process.env["SLACK_APP_TOKEN"];
  const shellyUrl = process.env["SHELLY_URL"];
  const shellyDeviceId = process.env["DEVICE_ID"];
  const shellyKey = process.env["SHELLY_KEY"];
  const slackClient = new WebClient(token);
  const slackChannel = process.env["SLACK_CHANNEL"] || "#testkanal";

  console.log("Environment variables loaded");

  let action = payload.actions ? payload.actions[0].value : payload.text;
  console.log("Action requested:", action);
  console.log("channel_id: ", payload.channel_id);

  channelId =
    payload.channel_id || payload.container.channel_id || slackChannel;

  // Standardize action format
  if (action === "på" || action === "on") {
    action = "on";
  } else if (action === "av" || action === "off") {
    action = "off";
  } else {
    // Default to status check if no valid action
    console.log("No valid action provided, defaulting to status check");
    return await getStatus(
      res,
      slackClient,
      channelId,
      shellyUrl,
      shellyDeviceId,
      shellyKey,
      action === "debug"
    );
  }

  res.status(200).send();

  try {
    // Check if this is an interactive message with a response_url
    const responseUrl = payload.response_url;

    if (responseUrl) {
      //Payload.message only exists on button clicks
      const blocksWithoutActions = payload.message?.blocks.filter(
        (block) => block.type !== "actions"
      );

      await fetch(responseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          replace_original: true,
          blocks: blocksWithoutActions,
        }),
      });

      console.log("Removed button");
    }

    const updatedBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            action === "on" ? "Sätter på ölkylen..." : "Stänger av ölkylen...",
        },
      },
    ];

    const updatingMessage = await slackClient.chat.postMessage({
      channel: channelId,
      blocks: updatedBlocks,
      text: action === "on" ? "Lägger på ölkylen..." : "Stänger av ölkylen...",
    });

    console.log("Sent initial notification to Slack");

    // Control the fridge
    let result = await controlFridge(
      shellyUrl,
      shellyDeviceId,
      shellyKey,
      action
    );
    console.log("Control fridge result:", result);

    shouldBeOn = action === "on";
    let status = null;

    if (result.isok) {
      // Wait for the device to update
      console.log("Device control successful, waiting for device to update");
      let retries = 0;
      let hasStatusUpdated = false;
      while (!hasStatusUpdated && retries < 15) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        status = await getFridgeStatus(shellyUrl, shellyDeviceId, shellyKey);
        hasStatusUpdated =
          status?.data?.device_status?.relays[0]?.ison === shouldBeOn &&
          (status?.data?.device_status?.meters[0]?.power > 0 || !shouldBeOn);
        retries++;
        console.log(
          "Fridge status:",
          status?.data?.device_status?.relays[0]?.ison,
          "waiting 1000ms",
          hasStatusUpdated
        );
      }
    } else {
      throw new Error(`Failed to control device: ${result}`);
    }

    const isOn = status?.data?.device_status?.relays[0]?.ison;
    const power = status?.data?.device_status?.meters[0]?.power;

    console.log("Fridge is on:", isOn, "Power:", power);

    // If this was a button click with a response_url, update the message again
    if (responseUrl) {
      let finalText = "";
      let finalBlocks = [];
      const userId = payload.user_id;

      if (!userId) {
        console.error("User ID is missing");
        console.log("Payload:", payload);
      }

      if (action === "on" && !isOn) {
        // Failed to turn on
        finalText = "Kunde inte sätta på ölkylen, den är fortfarande avstängd.";
      } else if (action === "off" && isOn) {
        // Failed to turn off
        finalText = "Kunde inte stänga av ölkylen, den är fortfarande på.";
      } else if (isOn) {
        // Successfully turned on
        if (userId)
          finalText = `🍺 <@${userId}> lade på ölkylen och den och drar ${power}W! 🍺`;
        else finalText = `Ölkylen är nu påslagen och drar ${power}W! 🍺`;
      } else {
        // Successfully turned off
        if (userId) finalText = `<@${userId}> stängde av ölkylen ☠️`;
        else finalText = "Ölkylen är nu avstängd! ☠️";
      }

      // Create updated blocks with the opposite action button
      finalBlocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: finalText,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: isOn ? "Stäng av" : "Lägg på",
                emoji: true,
              },
              style: isOn ? "danger" : "primary",
              value: isOn ? "off" : "on",
              action_id: isOn ? "off" : "on",
            },
          ],
        },
      ];

      // Update the message
      await slackClient.chat.update({
        channel: updatingMessage.channel,
        ts: updatingMessage.ts,
        blocks: finalBlocks,
        text: finalText,
      });

      console.log("Updated original message with final state");
    } else {
      // For non-interactive messages, send a new message
      if (action === "on" && !isOn) {
        // Failed to turn on
        console.log("Failed to turn on fridge");
        await slackClient.chat.postMessage({
          channel: channelId,
          text: "Kunde inte sätta på ölkylen, den är fortfarande avstängd.",
        });
      } else if (action === "off" && isOn) {
        // Failed to turn off
        console.log("Failed to turn off fridge");
        await slackClient.chat.postMessage({
          channel: channelId,
          text: "Kunde inte stänga av ölkylen, den är fortfarande på.",
        });
      } else if (isOn) {
        // Successfully turned on
        console.log("Successfully turned on fridge");
        await slackClient.chat.postMessage({
          channel: channelId,
          text: `Ölkylen är nu påslagen och drar ${power}W! 🍺`,
        });
      } else {
        // Successfully turned off
        console.log("Successfully turned off fridge");
        await slackClient.chat.postMessage({
          channel: channelId,
          text: "Ölkylen är nu avstängd! ☠️",
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
          text: `Ett fel uppstod: ${error.message}`,
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

async function getStatus(
  res,
  slackClient,
  channelId,
  shellyUrl,
  deviceId,
  authKey,
  debug = false
) {
  console.log("getStatus called for channel:", channelId);

  try {
    // Get current status
    const status = await getFridgeStatus(shellyUrl, deviceId, authKey);
    console.log("Status received:", status);

    const isOn = status?.data?.device_status?.relays[0]?.ison;
    const power = status?.data?.device_status?.meters[0]?.power;
    const totalEnergy = status?.data?.device_status?.meters[0]?.total;

    const hours = (totalEnergy / 270 / 60).toFixed(1);

    // Create status message
    let statusText = "Kunde inte hämta status för ölkylen";
    if (status?.data?.online) {
      statusText = `Ölkylen ${
        isOn
          ? `har varit på i ungefär ${hours} timmar och drar ${power}W`
          : "är avstängd"
      }`;
    }

    if (debug) {
      statusText += `\nDebug info: ${JSON.stringify(status, null, 2)}`;
    }

    console.log("Status text:", statusText);

    // Create blocks with appropriate action button
    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: statusText,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: isOn ? "Stäng av" : "Lägg på",
              emoji: true,
            },
            style: isOn ? "danger" : "primary",
            value: isOn ? "off" : "on",
            action_id: isOn ? "off" : "on",
          },
        ],
      },
    ];

    // Send message with status and action button
    console.log("Sending status message to Slack with blocks");
    res.json({
      channel: channelId,
      text: statusText,
      blocks: blocks,
      response_type: "in_channel",
    });
    console.log("Status message sent successfully");
  } catch (error) {
    console.error("Error getting status:", error);

    try {
      await slackClient.chat.postMessage({
        channel: channelId,
        text: `Fel vid hämtning av status: ${error.message}`,
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
