const { WebClient } = require('@slack/web-api');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const { setOff, getHoursTimeOn, getHoursSinceReminder, setReminderTime } = require('./helpers');

// Load environment variables from .env file
dotenv.config();

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  
  return parts.join(' and ') || 'less than a minute';
}

const slackToken = process.env["SLACK_APP_TOKEN"];
const shellyUrl = process.env["SHELLY_URL"];
const shellyDeviceId = process.env["DEVICE_ID"];
const shellyKey = process.env["SHELLY_KEY"];
const slackChannel = process.env["SLACK_CHANNEL"] || "#testkanal";

async function main(args) {
  const statusUrl = `${shellyUrl}/device/status?id=${shellyDeviceId}&auth_key=${shellyKey}`;
  const status = await (await fetch(statusUrl)).json();

  const deviceStatus = status?.data?.device_status;
  const isOn = deviceStatus?.relays[0]?.ison;
  const power = deviceStatus?.meters[0]?.power;
  const totalEnergy = deviceStatus?.meters[0]?.total;
  
  // Calculate hours with 1 decimal place
  const { timeOn: hours, latestEnergy } = getHoursTimeOn();
  const hoursSinceReminder = getHoursSinceReminder();
  
  const newEnergy = (totalEnergy - latestEnergy) / 1000 / 60;
  
  console.log('Fridge status:', 
    {
      isOn,
      power,
      totalEnergy,
      newEnergy,
      hours, hoursSinceReminder
    }
  );
  
  if (!isOn) {
    setOff(totalEnergy);
    console.log(`The fridge has been OFF`);
    return;
  }
  

  if (isOn && hours >= 18 && hoursSinceReminder >= 18) {
    const messageBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Kylen har varit på i ungefär ${hours.toFixed(2)} timmar och förbrukat ${newEnergy.toFixed(0)} KWh. Stäng av?`
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Stäng av",
              emoji: true
            },
            style: "danger",
            value: "av",
            action_id: "av"
          }
        ]
      }
    ];

    const slackClient = new WebClient(slackToken);
    await slackClient.chat.postMessage({
      channel: slackChannel,
      blocks: messageBlocks,
      text: `Kylen har varit på i ungefär ${hours} timmar. Stäng av?` // Fallback text
    });
    setReminderTime();
    console.log("Reminder sent to Slack");
  } 

  return;
}

// Convert from ES Module export to CommonJS
module.exports = { main, formatDuration };
