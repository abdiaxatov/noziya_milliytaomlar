import { NextRequest, NextResponse } from "next/server";

export const config = {
  maxDuration: 300,
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      chunks?: string[];
      base64Content?: string;
      fileName: string;
      folder?: string;
      totalChunks?: number;
    };

    let { base64Content, fileName, folder = "models" } = body;

    // Combine chunks if sent separately
    if (body.chunks && body.chunks.length > 0) {
      base64Content = body.chunks.join("");
    }

    if (!base64Content) {
      return NextResponse.json(
        { success: false, error: "No content provided" },
        { status: 400 },
      );
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || "abdiaxatov";
    const repo = process.env.GITHUB_REPO || "3d_menyu";
    const branch = "main";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "GitHub token not configured on server" },
        { status: 500 },
      );
    }

    const path = `${folder}/${fileName}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Add ${folder}: ${fileName}`,
        content: base64Content,
        branch: branch,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData.message || "Upload failed" },
        { status: response.status },
      );
    }

    const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    return NextResponse.json({ success: true, url: downloadUrl });
  } catch (error) {
    console.error("GitHub upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
