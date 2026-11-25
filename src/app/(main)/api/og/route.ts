import { NextRequest, NextResponse } from "next/server";
import { extractPreview } from "@/lib/og";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const { thumbnail, caption } = await extractPreview(url);
  return NextResponse.json({ thumbnail, caption });
}
