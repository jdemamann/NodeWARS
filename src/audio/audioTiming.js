export function getMonotonicAudioNowMs() {
  return (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();
}

export function canTriggerAudioEvent(cooldownMap, eventKey, cooldownsMs, nowMs = getMonotonicAudioNowMs()) {
  const cooldownMs = cooldownsMs[eventKey] || 0;
  const nextAllowedAtMs = cooldownMap.get(eventKey) || 0;
  return nowMs >= nextAllowedAtMs || cooldownMs <= 0;
}

export function recordAudioEventCooldown(cooldownMap, eventKey, cooldownsMs, nowMs = getMonotonicAudioNowMs()) {
  const cooldownMs = cooldownsMs[eventKey] || 0;
  if (cooldownMs > 0) cooldownMap.set(eventKey, nowMs + cooldownMs);
}

export function runAudioEventWithCooldown(cooldownMap, eventKey, cooldownsMs, playback) {
  const nowMs = getMonotonicAudioNowMs();
  if (!canTriggerAudioEvent(cooldownMap, eventKey, cooldownsMs, nowMs)) return false;
  recordAudioEventCooldown(cooldownMap, eventKey, cooldownsMs, nowMs);
  playback();
  return true;
}
