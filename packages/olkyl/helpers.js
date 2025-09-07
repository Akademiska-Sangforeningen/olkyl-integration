const fs = require("fs");
const path = require("path");

/**
 * Writes the current timestamp to latestOff.json
 */
function setOff(latestEnergy = 0) {
  const latestOffPath = path.join(__dirname, "latestOff.json");
  const timestamp = Date.now();
  fs.writeFileSync(
    latestOffPath,
    JSON.stringify({ latestOff: timestamp, energy: latestEnergy }, null, 2)
  );
}

/**
 * Returns the number of seconds since the timestamp in latestOff.json
 * If file does not exist, returns null
 */
function getHoursTimeOn() {
  try {
    const latestOffPath = path.join(__dirname, "latestOff.json");
    const data = JSON.parse(fs.readFileSync(latestOffPath, "utf8"));
    if (!data.latestOff)
      throw new Error("latestOff not found in latestOff.json");
    timeOn = Math.floor((Date.now() - data.latestOff) / 1000) / 3600;
    latestEnergy = data.energy || 0;
    return { timeOn, latestEnergy };
  } catch (error) {
    console.error("Error reading latestOff.json:", error.message);
    setOff();
    return null;
  }
}

/**
 * Writes the current timestamp to reminder.json
 */
function setReminderTime() {
  const reminderPath = path.join(__dirname, "reminderTime.json");
  const timestamp = Date.now();
  fs.writeFileSync(
    reminderPath,
    JSON.stringify({ reminder: timestamp }, null, 2)
  );
}

/**
 * Returns the number of seconds since the timestamp in reminderTime.json
 * If file does not exist, returns null
 */
function getHoursSinceReminder() {
  try {
    const reminderPath = path.join(__dirname, "reminderTime.json");
    const data = JSON.parse(fs.readFileSync(reminderPath, "utf8"));
    if (!data.reminder)
      throw new Error("reminder not found in reminderTime.json");
    return Math.floor((Date.now() - data.reminder) / 1000) / 3600;
  } catch (error) {
    console.error("Error reading reminder time:", error.message);
    setReminderTime();
    return null;
  }
}

/**
 * Auto-off timer helpers
 */
function getAutoOffTimestamp() {
  try {
    const autoOffPath = path.join(__dirname, "autoOff.json");
    const data = JSON.parse(fs.readFileSync(autoOffPath, "utf8"));
    const ts = data.autoOffAt || null;
    if (!ts) return null;
    return ts;
  } catch (e) {
    // File missing or invalid
    return null;
  }
}

function setAutoOffInDays(days) {
  const ms = Number(days) * 24 * 60 * 60 * 1000;
  const autoOffAt = Date.now() + ms;
  const autoOffPath = path.join(__dirname, "autoOff.json");
  fs.writeFileSync(autoOffPath, JSON.stringify({ autoOffAt }, null, 2));
  return autoOffAt;
}

function clearAutoOff() {
  try {
    const autoOffPath = path.join(__dirname, "autoOff.json");
    if (fs.existsSync(autoOffPath)) fs.unlinkSync(autoOffPath);
  } catch (e) {
    // ignore
  }
}

module.exports = {
  setOff,
  getHoursTimeOn,
  setReminderTime,
  getHoursSinceReminder,
  getAutoOffTimestamp,
  setAutoOffInDays,
  clearAutoOff,
};
