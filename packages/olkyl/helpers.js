const fs = require('fs');
const path = require('path');

/**
 * Writes the current timestamp to latestOff.json
 */
function setOff() {
  const latestOffPath = path.join(__dirname, 'latestOff.json');
  const timestamp = Date.now();
  fs.writeFileSync(latestOffPath, JSON.stringify({ latestOff: timestamp }, null, 2));
}

/**
 * Returns the number of seconds since the timestamp in latestOff.json
 * If file does not exist, returns null
 */
function getHoursTimeOn() {
  const latestOffPath = path.join(__dirname, 'latestOff.json');
  if (!fs.existsSync(latestOffPath)) return null;
  const data = JSON.parse(fs.readFileSync(latestOffPath, 'utf8'));
  if (!data.latestOff) return null;
  return Math.floor((Date.now() - data.latestOff) / 1000) / 3600;
}

/**
 * Writes the current timestamp to reminder.json
 */
function setReminderTime() {
  const reminderPath = path.join(__dirname, 'reminderTime.json');
  const timestamp = Date.now();
  fs.writeFileSync(reminderPath, JSON.stringify({ reminder: timestamp }, null, 2));
}

/**
 * Returns the number of seconds since the timestamp in reminderTime.json
 * If file does not exist, returns null
 */
function getHoursSinceReminder() {
  const reminderPath = path.join(__dirname, 'reminderTime.json');
  if (!fs.existsSync(reminderPath)) return null;
  const data = JSON.parse(fs.readFileSync(reminderPath, 'utf8'));
  if (!data.reminder) return null;
  return Math.floor((Date.now() - data.reminder) / 1000) / 3600;
}

module.exports = {
  setOff,
  getHoursTimeOn,
  setReminderTime,
  getHoursSinceReminder
};
