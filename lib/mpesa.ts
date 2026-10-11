import "server-only";

// Safaricom Daraja API, SANDBOX only (no real money moves). Flow:
// 1. getAccessToken(): swap our consumer key + secret for a token (valid 1 hour).
// 2. stkPush(): ask Safaricom to show the M-Pesa PIN prompt on the patient's phone.
// 3. Safaricom later POSTs the result to our callback URL (app/api/payments/callback).
// 4. queryStkPush(): ask Safaricom directly, in case the callback never arrives.

const BASE_URL = "https://sandbox.safaricom.co.ke";

function config() {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL, MPESA_CALLBACK_SECRET } =
    process.env;
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || !MPESA_SHORTCODE || !MPESA_PASSKEY || !MPESA_CALLBACK_URL || !MPESA_CALLBACK_SECRET) {
    throw new Error("M-Pesa settings are missing from .env.local");
  }
  return {
    consumerKey: MPESA_CONSUMER_KEY,
    consumerSecret: MPESA_CONSUMER_SECRET,
    shortcode: MPESA_SHORTCODE,
    passkey: MPESA_PASSKEY,
    // The secret makes the URL unguessable, so only Safaricom can report results.
    callbackUrl: `${MPESA_CALLBACK_URL}?secret=${MPESA_CALLBACK_SECRET}`,
  };
}

async function getAccessToken() {
  const { consumerKey, consumerSecret } = config();
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// Daraja wants the time as YYYYMMDDHHmmss in Kenyan time (UTC+3).
function timestamp() {
  const nairobi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return nairobi.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

// The "password" is base64(shortcode + passkey + timestamp).
function password(shortcode: string, passkey: string, time: string) {
  return Buffer.from(shortcode + passkey + time).toString("base64");
}

async function darajaPost<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Daraja ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  return data as T;
}

export type StkPushResult = { merchantRequestId: string; checkoutRequestId: string };

// Sends the PIN prompt. `phone` must be 2547XXXXXXXX / 2541XXXXXXXX.
export async function stkPush({ phone, amount, reference }: { phone: string; amount: number; reference: string }): Promise<StkPushResult> {
  const { shortcode, passkey, callbackUrl } = config();
  const time = timestamp();
  const data = await darajaPost<{ MerchantRequestID: string; CheckoutRequestID: string; ResponseCode: string; ResponseDescription: string }>(
    "/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: shortcode,
      Password: password(shortcode, passkey, time),
      Timestamp: time,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: reference.slice(0, 12), // shown on the prompt, max 12 characters
      TransactionDesc: "Consultation",
    },
  );
  if (data.ResponseCode !== "0") throw new Error(`STK push rejected: ${data.ResponseDescription}`);
  return { merchantRequestId: data.MerchantRequestID, checkoutRequestId: data.CheckoutRequestID };
}

// Asks Safaricom what happened to an STK push. ResultCode "0" = paid.
// While the patient hasn't answered yet, Daraja returns an error, which we
// report as "pending".
export async function queryStkPush(checkoutRequestId: string): Promise<{ status: "success" | "failed" | "pending"; resultCode?: number; resultDesc?: string }> {
  const { shortcode, passkey } = config();
  const time = timestamp();
  try {
    const data = await darajaPost<{ ResultCode?: string; ResultDesc?: string }>("/mpesa/stkpushquery/v1/query", {
      BusinessShortCode: shortcode,
      Password: password(shortcode, passkey, time),
      Timestamp: time,
      CheckoutRequestID: checkoutRequestId,
    });
    if (data.ResultCode === undefined) return { status: "pending" };
    const resultCode = Number(data.ResultCode);
    // 4999 = "The transaction is still under processing": not an answer yet.
    if (resultCode === 4999 || /under processing|being processed/i.test(data.ResultDesc ?? "")) {
      return { status: "pending" };
    }
    return { status: resultCode === 0 ? "success" : "failed", resultCode, resultDesc: data.ResultDesc };
  } catch (error) {
    console.error("STK query:", error);
    return { status: "pending" };
  }
}
