interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadToGitHub(
  file: File,
  fileName: string,
  folder = "models",
): Promise<UploadResult> {
  try {
    // Use FileReader to avoid stack overflow
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:*/*;base64,)
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    // Call server-side API route
    const response = await fetch("/api/upload-github", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Content,
        fileName,
        folder,
      }),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        return { success: false, error: errorData.error || "Upload failed" };
      } catch {
        return {
          success: false,
          error: `Upload failed: ${response.status} ${response.statusText}`,
        };
      }
    }

    const data = await response.json();
    return { success: true, url: data.url };
  } catch (error) {
    console.error("GitHub upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
