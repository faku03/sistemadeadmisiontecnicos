const crypto = require('crypto');
const os = require('os');

function getMachineId() {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.userInfo().username,
    process.env.COMPUTERNAME || ''
  ].join('|');

  return crypto
    .createHash('sha256')
    .update(raw)
    .digest('hex')
    .slice(0, 32);
}

module.exports = {
  getMachineId
};
