import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  const filename = searchParams.get("filename") || "attachment";

  if (!rawUrl) {
    return NextResponse.json({ message: "File URL is required." }, { status: 400 });
  }

  let targetUrl: string = rawUrl;
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    const backendRoot = (process.env.NEXT_PUBLIC_API_ENDPOINT || "http://127.0.0.1:8001")
      .replace(/\/api\/?$/, "")
      .replace(/\/+$/, "");
    targetUrl = `${backendRoot}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
  }

  try {
    const response = await fetch(targetUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Failed to fetch remote file (${response.status})` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const fileBytes = await response.arrayBuffer();

    const sanitizedFilename = filename.replace(/["\r\n]/g, "");

    return new NextResponse(fileBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(sanitizedFilename)}"; filename*=UTF-8''${encodeURIComponent(sanitizedFilename)}`,
        "Cache-Control": "public, max-age=86400",
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
