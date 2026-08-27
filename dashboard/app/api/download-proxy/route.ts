import { NextResponse } from "next/server";

const LIVE_ORIGIN = "https://attendance.nextgenapplication.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "download";

  if (!rawUrl) {
    return NextResponse.json({ message: "File URL is required." }, { status: 400 });
  }

  const reqOrigin = new URL(request.url).origin;
  const envEndpoint = (
    process.env.NEXT_PUBLIC_API_ENDPOINT ||
    process.env.API_ENDPOINT ||
    ""
  )
    .replace(/\/api\/?$/, "")
    .replace(/\/+$/, "");

  // Determine the effective backend base
  let backendBase = envEndpoint;
  if (!backendBase) {
    if (reqOrigin.includes("localhost:3000") || reqOrigin.includes("127.0.0.1:3000")) {
      backendBase = reqOrigin.replace(":3000", ":8000");
    } else if (reqOrigin.includes("attendance.nextgenapplication.com")) {
      backendBase = LIVE_ORIGIN;
    } else {
      backendBase = reqOrigin || LIVE_ORIGIN;
    }
  }

  let targetUrl = rawUrl.trim();

  // If URL is relative (/media/...), prepend backendBase
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    const cleanPath = targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`;
    targetUrl = `${backendBase}${cleanPath}`;
  } else {
    // If running in live production and URL has localhost / 127.0.0.1 from dev DB records,
    // rewrite it to LIVE_ORIGIN
    if (
      !reqOrigin.includes("localhost") &&
      !reqOrigin.includes("127.0.0.1") &&
      (targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1"))
    ) {
      try {
        const parsed = new URL(targetUrl);
        targetUrl = `${LIVE_ORIGIN}${parsed.pathname}${parsed.search}`;
      } catch {
        // ignore
      }
    } else if (
      (reqOrigin.includes("localhost:3000") || reqOrigin.includes("127.0.0.1:3000")) &&
      (targetUrl.startsWith("http://localhost:3000/") || targetUrl.startsWith("http://127.0.0.1:3000/"))
    ) {
      // If URL mistakenly has frontend port 3000 in local dev, rewrite to backend port 8000
      try {
        const parsed = new URL(targetUrl);
        if (parsed.pathname.startsWith("/media/") || parsed.pathname.startsWith("/static/")) {
          targetUrl = `${backendBase}${parsed.pathname}${parsed.search}`;
        }
      } catch {
        // ignore
      }
    }
  }

  try {
    let response = await fetch(targetUrl, {
      cache: "no-store",
    });

    // If initial fetch failed, try fallback against backendBase directly
    if (!response.ok) {
      try {
        const parsed = new URL(targetUrl);
        const fallbackUrl = `${backendBase}${parsed.pathname}${parsed.search}`;
        if (fallbackUrl !== targetUrl) {
          const fallbackRes = await fetch(fallbackUrl, { cache: "no-store" });
          if (fallbackRes.ok) {
            response = fallbackRes;
          }
        }
      } catch {
        // fallback failed
      }
    }

    if (!response.ok) {
      console.error(`Download proxy could not fetch file at '${targetUrl}', status: ${response.status}`);
      return NextResponse.json(
        { message: `Failed to fetch file (${response.status})` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const fileBytes = await response.arrayBuffer();

    const cleanFilename =
      filename
        .replace(/[/\\?%*:|"<>]/g, "_")
        .replace(/\s+/g, " ")
        .trim() || "download";

    return new NextResponse(fileBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error proxying download file:", error);
    return NextResponse.json(
      { message: "Could not stream download file." },
      { status: 502 }
    );
  }
}
