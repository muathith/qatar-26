import { NextRequest, NextResponse } from "next/server";

const HUKOOMI_BASE = "https://services.hukoomi.gov.qa";
const HUKOOMI_API = HUKOOMI_BASE + "/eservices/api/v1hc/";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";

async function getSessionCookies(): Promise<string> {
  const res = await fetch(
    HUKOOMI_BASE + "/en/e-services/renew-health-card",
    {
      headers: { "User-Agent": UA },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to get session cookies: ${res.status}`);
  }
  const setCookies = res.headers.getSetCookie?.() || [];
  const cookies = setCookies.map((c) => c.split(";")[0]).join("; ");
  return cookies;
}

async function hukoomiPost(endpoint: string, body: any, cookies: string) {
  return fetch(HUKOOMI_API + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Origin: HUKOOMI_BASE,
      Referer: HUKOOMI_BASE + "/en/e-services/renew-health-card",
      "User-Agent": UA,
      Cookie: cookies,
    },
    body: JSON.stringify(body),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const qid = body.qid;

    if (!qid || typeof qid !== "string" || !/^\d{11}$/.test(qid)) {
      return NextResponse.json(
        { error: "QID must be exactly 11 digits" },
        { status: 400 }
      );
    }

    const cookies = await getSessionCookies();

    const response = await hukoomiPost(
      "application/retrieve/basic/info",
      {
        cardHolderQID: qid,
        renewFlag: "true",
        expiryFlag: "false",
      },
      cookies
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { error: "Hukoomi service returned an error", details: text },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid response from Hukoomi service" },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Proxy Error]", error);
    return NextResponse.json(
      {
        error: "Failed to reach the Hukoomi service",
        details: error.message,
      },
      { status: 502 }
    );
  }
}
