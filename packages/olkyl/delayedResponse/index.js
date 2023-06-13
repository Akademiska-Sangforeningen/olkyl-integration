async function main(args) {
  const token = process.env["SLACK_TOKEN"];

  if (args.token !== token) return { statusCode: 401, body: { text: "Invalid token" } };

  const statusText = await new Promise((res) => {
    setTimeout(async () => {
      resolve(getStatusText());
    }, 1);
  })
    
  return {body: statusText}

  const response = await fetch(args.response_url, {
      method: "POST",
      body: JSON.stringify({text: statusText}),
      headers: { "Content-Type": "application/json" }
  });
  return {body: {slack: JSON.stringify(response)}}
}

const getStatusText = async () => {
  const shellyUrl = process.env["SHELLY_URL"];
  const shellyDeviceId = process.env["DEVICE_ID"];
  const shellyKey = process.env["SHELLY_KEY"];

  const statusUrl = `${shellyUrl}/device/status?id=${shellyDeviceId}&auth_key=${shellyKey}`;
  const status = await (await fetch(statusUrl)).json();

  const isOn = status?.data?.device_status?.relays[0]?.ison;
  const power = status?.data?.device_status?.meters[0]?.power;

  if (status?.data.online) return `Ölkylen är ${isOn ? `PÅ ${power ?? `och drar ${power}W`}` : "av"}`
  else return  "Ölkylen är inte kopplad"
}
