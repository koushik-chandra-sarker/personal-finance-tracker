export function isRecoveryBackdoorEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.ENABLE_RECOVERY_BACKDOOR === 'true';
}

export function assertRecoveryBackdoorEnabled() {
  if (!isRecoveryBackdoorEnabled()) {
    throw new Error('Recovery mode is disabled.');
  }
}
