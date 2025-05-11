const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Function starts here.
async function main(args) {
  // MongoDB client configuration.
  const token = process.env["SLACK_TOKEN"];
  const shellyUrl = process.env["SHELLY_URL"];
  const shellyDeviceId = process.env["DEVICE_ID"];
  const shellyKey = process.env["SHELLY_KEY"];

  if (args.token !== token)
    return { statusCode: 401, body: { text: "Invalid token" } };

  if (args.text === "på" || args.text === "av") {
    const controlUrl = `${shellyUrl}/device/relay/control`;
    var details = {
      channel: 0,
      turn: args.text === "på" ? "on" : "off",
      id: shellyDeviceId,
      auth_key: shellyKey,
    };

    var formBodyParts = [];

    for (var property in details) {
      var encodedKey = encodeURIComponent(property);
      var encodedValue = encodeURIComponent(details[property]);
      formBodyParts.push(encodedKey + "=" + encodedValue);
    }

    const formBody = formBodyParts.join("&");

    const status = await (
      await fetch(controlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: formBody,
      })
    ).json();

    if (status.isok) {
      const text = await new Promise((resolve) => setTimeout(() => resolve(getStatusText()), 1000))
      return { body: { text, response_type: "in_channel" } };
    }
    else return { body: { text: "misslyckades" } };
  } else {
    return {
      body: {
        text: await getStatusText(),
        response_type: "in_channel",
      },
    };
  }
}


const getStatusText = async () => {
  const shellyUrl = process.env["SHELLY_URL"];
  const shellyDeviceId = process.env["DEVICE_ID"];
  const shellyKey = process.env["SHELLY_KEY"];

  const statusUrl = `${shellyUrl}/device/status?id=${shellyDeviceId}&auth_key=${shellyKey}`;
  const status = await (await fetch(statusUrl)).json();

  const isOn = status?.data?.device_status?.relays[0]?.ison;
  const power = status?.data?.device_status?.meters[0]?.power;

  if (status?.data.online) return `Ölkylen är ${isOn ? `PÅ och drar ${power}W` : "av"}`
  else return  "Ölkylen är inte kopplad"
}

// IMPORTANT: Makes the function available as a module in the project.
// This is required for any functions that require external dependencies.
module.exports = { main, getStatusText };
