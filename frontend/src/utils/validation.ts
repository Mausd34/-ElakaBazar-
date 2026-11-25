/* ------------------------------------------------------------------ */
/*  Client-side validation helpers                                    */
/* ------------------------------------------------------------------ */

/** Bangladeshi mobile number: 01XXXXXXXXX (11 digits, starts with 01) */
export function isValidBangladeshiPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return /^01[3-9]\d{9}$/.test(digits)
}

export function phoneErrorMessage(value: string): string | null {
  if (!value.trim()) return 'মোবাইল নম্বর প্রয়োজন।'
  if (!isValidBangladeshiPhone(value)) return 'একটি বৈধ বাংলাদেশি মোবাইল নম্বর দিন (উদ: 017XXXXXXXX)।'
  return null
}

/** Password strength: at least 8 chars, one letter, one digit */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 8) errors.push('কমপক্ষে ৮ অক্ষর হতে হবে')
  if (!/[A-Za-z]/.test(password)) errors.push('কমপক্ষে একটি வர미ণ{(অক্ষর) রাখুন')
  if (!/\d/.test(password)) errors.push('কমপক্ষে একটি সংখ্যা রাখুন')
  if (/[\s]/.test(password)) errors.push('স্পেস রাখতে হবে না')
  return { valid: errors.length === 0, errors }
}

export function passwordStrengthScore(password: string): number {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return Math.min(score, 5)
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function emailErrorMessage(value: string): string | null {
  if (!value.trim()) return 'ইমেইল প্রয়োজন।'
  if (!isValidEmail(value)) return 'একটি বৈধ ইমেইল ঠিকানা দিন।'
  return null
}

/** Sanitize user input before rendering to prevent XSS */
export function sanitizeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Trim whitespace from all string fields of an object */
export function trimObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === 'string' ? value.trim() : value
  }
  return result as T
}