class CooldownManager {
  constructor(cooldownMs) {
    this.cooldownMs = cooldownMs;
    this.lastTriggeredAtByType = {};
  }

  isAllowed(type, now = Date.now()) {
    const last = this.lastTriggeredAtByType[type];
    if (!last) return true;
    return now - last >= this.cooldownMs;
  }

  markTriggered(type, now = Date.now()) {
    this.lastTriggeredAtByType[type] = now;
  }
}

module.exports = CooldownManager;

