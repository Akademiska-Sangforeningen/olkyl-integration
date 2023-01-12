// The function's dependencies.
const fetch = require("node-fetch");

// Function starts here.
async function main(args) {
  // MongoDB client configuration.
  const token = process.env["SLACK_TOKEN"];
  const shellyUrl = process.env["SHELLY_URL"];
  const shellyDeviceId = process.env["DEVICE_ID"];
  const shellyKey = process.env["SHELLY_KEY"];

  // if (args.token !== token)
  //   return { statusCode: 401, body: { text: "Invalid token" } };

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

    console.log(formBody);
    const status = await (
      await fetch(controlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: formBody,
      })
    ).json();
    if (status.isok)
      return { body: { text: "ok", response_type: "in_channel" } };
    else return { body: { text: "misslyckades" } };
  } else {
    const statusUrl = `${shellyUrl}/device/status?id=${shellyDeviceId}&auth_key=${shellyKey}`;
    const status = await (await fetch(statusUrl)).json();

    const isOn = status?.data?.device_status?.relays[0]?.ison;
    const power = status?.data?.device_status?.meters[0]?.power;

    if (status?.data.online)
      return {
        body: {
          text: `Ölkylen är ${isOn ? "på" : "av"} och drar ${power}W`,
          response_type: "in_channel",
        },
      };
    else
      return {
        body: {
          text: "Ölkylen är inte kopplad",
          status,
        },
      };
  }
}

// IMPORTANT: Makes the function available as a module in the project.
// This is required for any functions that require external dependencies.
module.exports.main = main;
