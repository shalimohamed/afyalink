// Turns 0712 345 678, +254 712 345 678 or 254712345678 into 254712345678,
// the format M-Pesa expects. Returns null if it isn't a Kenyan mobile number.
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "").replace(/^\+/, "");

  let local: string;
  if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^[17]\d{8}$/.test(digits)) local = digits;
  else return null;

  return "254" + local;
}
