import type { SupabaseClient } from "@supabase/supabase-js";

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

// 254712345678 → 0712345678, for filling in a form.
export function localPhone(phone: string | null | undefined) {
  return phone ? "0" + phone.slice(3) : "";
}

// Phone numbers by user ID. They can't be read from profiles directly (since
// migration 0010), only through get_phones(), which returns your own number
// and, for admins, anyone's. Other IDs are simply missing from the result.
export async function loadPhones(supabase: SupabaseClient, userIds: string[]) {
  const phones = new Map<string, string>();
  if (userIds.length === 0) return phones;
  const { data, error } = await supabase.rpc("get_phones", { p_user_ids: userIds });
  if (error) console.error("Loading phone numbers failed (run migration 0010?):", error.message);
  for (const row of (data ?? []) as { id: string; phone: string | null }[]) {
    if (row.phone) phones.set(row.id, row.phone);
  }
  return phones;
}
