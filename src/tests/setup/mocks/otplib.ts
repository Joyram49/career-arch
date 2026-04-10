export function generateSecret(): string {
  return 'TEST_2FA_SECRET';
}

export function generateURI(): string {
  return 'otpauth://totp/CareerArch:test@example.com?secret=TEST_2FA_SECRET';
}

export function verifySync(): { valid: boolean } {
  return { valid: true };
}
