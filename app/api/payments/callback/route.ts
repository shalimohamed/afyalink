import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { recordPaymentResult } from "@/lib/payments";

// Safaricom calls this URL after the patient answers (or ignores) the M-Pesa
// prompt. It's public, so we only trust a request that carries our secret
// (which only Safaricom knows, because it's in the callback URL we gave them)
// and that matches a payment we started ourselves.

type CallbackItem = { Name: string; Value?: string | number };
type StkCallback = {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: { Item: CallbackItem[] };
};

function hasValidSecret(request: NextRequest) {
  const given = Buffer.from(request.nextUrl.searchParams.get("secret") ?? "");
  const expected = Buffer.from(process.env.MPESA_CALLBACK_SECRET ?? "");
  // timingSafeEqual compares in constant time, so the secret can't be guessed
  // one character at a time by measuring response times.
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: NextRequest) {
  if (!hasValidSecret(request)) {
    return Response.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { Body?: { stkCallback?: StkCallback } } | null;
  const callback = body?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) {
    return Response.json({ ResultCode: 1, ResultDesc: "Bad request" }, { status: 400 });
  }

  const items = callback.CallbackMetadata?.Item ?? [];
  const value = (name: string) => items.find((item) => item.Name === name)?.Value;

  await recordPaymentResult({
    checkoutRequestId: callback.CheckoutRequestID,
    success: callback.ResultCode === 0,
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
    receipt: value("MpesaReceiptNumber")?.toString(),
    amount: value("Amount") !== undefined ? Number(value("Amount")) : undefined,
  });

  // Tell Safaricom we received it.
  return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
