/**
 * Webhook Twilio Status (story 6.3).
 *
 * Twilio appelle ce endpoint à chaque changement d'état d'un SMS envoyé. Le
 * payload (form-urlencoded) contient le `MessageSid`, le `MessageStatus` et —
 * une fois la livraison effectuée — le `Price` (négatif chez Twilio) et le
 * `PriceUnit` (devise ISO).
 *
 * Ce handler met à jour `MessageLog.cost` / `costUnit` pour permettre le suivi
 * budgétaire SMS via `SUM(cost)`.
 *
 * Authentification (double barrière) :
 *   - secret partagé en query string `?secret=<TWILIO_STATUS_WEBHOOK_SECRET>`
 *   - signature HMAC native Twilio (`X-Twilio-Signature`) validée via
 *     `twilio.validateRequest` dès que `TWILIO_AUTH_TOKEN` est configuré.
 *     Un secret qui fuiterait (access logs, Referer, proxy) ne suffit donc
 *     plus à injecter de faux coûts/statuts (QA SEC-001).
 *
 * @module app/api/webhooks/twilio/status/route
 */

import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import type { MessageStatus } from "@/lib/generated/prisma/client";

function mapTwilioStatus(twilioStatus: string): MessageStatus | null {
  switch (twilioStatus) {
    case "delivered":
    case "sent":
      return "SENT";
    case "failed":
    case "undelivered":
      return "FAILED";
    default:
      return null; // queued, sending, etc. → pas de mise à jour du statut
  }
}

export async function POST(request: Request) {
  // 1. Auth — secret partagé en query string
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.TWILIO_STATUS_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse du body form-urlencoded
  let params: URLSearchParams;
  try {
    const text = await request.text();
    params = new URLSearchParams(text);
  } catch (err) {
    console.error("[twilio:status] body parse failed:", err);
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  // 3. Signature HMAC native Twilio — défense en profondeur (QA SEC-001).
  //    Active uniquement si TWILIO_AUTH_TOKEN est configuré (i.e. en prod ou
  //    dès que le module SMS est réellement provisionné).
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    const signature = request.headers.get("x-twilio-signature") ?? "";
    // L'URL signée par Twilio = le statusCallback configuré (APP_URL + path +
    // query), pas l'URL interne vue par le runtime (proxy Vercel).
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const signedUrl = appUrl ? `${appUrl}${url.pathname}${url.search}` : request.url;
    const paramsObj = Object.fromEntries(params.entries());
    if (!twilio.validateRequest(authToken, signature, signedUrl, paramsObj)) {
      return Response.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  const messageSid = params.get("MessageSid");
  if (!messageSid) {
    return Response.json({ error: "Missing MessageSid" }, { status: 400 });
  }

  const twilioStatus = params.get("MessageStatus") ?? "";
  const priceRaw = params.get("Price");
  const priceUnit = params.get("PriceUnit");

  // 4. Construction du delta — n'écraser que les champs présents
  const data: {
    status?: MessageStatus;
    cost?: number;
    costUnit?: string;
  } = {};

  const mappedStatus = mapTwilioStatus(twilioStatus);
  if (mappedStatus) data.status = mappedStatus;

  if (priceRaw) {
    const parsed = Number.parseFloat(priceRaw);
    if (Number.isFinite(parsed)) data.cost = Math.abs(parsed);
  }
  if (priceUnit) data.costUnit = priceUnit;

  if (Object.keys(data).length === 0) {
    return new Response("OK", { status: 200 });
  }

  try {
    // `providerMessageId` est désormais @unique (QA SCHEMA-001) → au plus 1
    // ligne mise à jour. On conserve `updateMany` (et non `update`) pour rester
    // idempotent quand aucun log n'existe pour ce SID (count: 0, pas de P2025) —
    // évite des retries Twilio inutiles.
    await prisma.messageLog.updateMany({
      where: { providerMessageId: messageSid },
      data,
    });
  } catch (err) {
    console.error("[twilio:status] DB update failed:", err);
    return Response.json({ error: "Internal" }, { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
