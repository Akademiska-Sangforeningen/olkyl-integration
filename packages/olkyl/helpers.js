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
  try {
    const latestOffPath = path.join(__dirname, 'latestOff.json');
    const data = JSON.parse(fs.readFileSync(latestOffPath, 'utf8'));
    if (!data.latestOff) throw new Error('latestOff not found in latestOff.json');
    return Math.floor((Date.now() - data.latestOff) / 1000) / 3600;
  }
  catch (error) {
    console.error('Error reading latestOff.json:', error.message);
    setOff();
    return null;
  }
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
  try {
    const reminderPath = path.join(__dirname, 'reminderTime.json');
    const data = JSON.parse(fs.readFileSync(reminderPath, 'utf8'));
    if (!data.reminder) throw new Error('reminder not found in reminderTime.json');
    return Math.floor((Date.now() - data.reminder) / 1000) / 3600;
  } catch (error) {
    console.error('Error reading reminder time:', error.message);
    setReminderTime();
    return null;
  }
}

module.exports = {
  setOff,
  getHoursTimeOn,
  setReminderTime,
  getHoursSinceReminder
};
