import imageCompression from "browser-image-compression";

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

async function compressImage(file: File): Promise<File> {
  // If file is small enough, don't compress
  if (file.size < 2 * 1024 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 2.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(
      `Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
    );
    return compressedFile;
  } catch (error) {
    console.error("Compression failed, using original:", error);
    return file;
  }
}

export async function uploadToGitHub(
  file: File,
  fileName: string,
  folder = "models",
): Promise<UploadResult> {
  try {
    // Compress image if it's too large
    const processedFile = file.type.startsWith("image/")
      ? await compressImage(file)
      : file;

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
      reader.readAsDataURL(processedFile);
    });

    // Chunk size: 3MB (Vercel limit is 4.5MB, leaving 1.5MB for metadata)
    const CHUNK_SIZE = 3 * 1024 * 1024;
    const chunks: string[] = [];

    for (let i = 0; i < base64Content.length; i += CHUNK_SIZE) {
      chunks.push(base64Content.substring(i, i + CHUNK_SIZE));
    }

    // Call server-side API route with chunks
    const response = await fetch("/api/upload-github", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chunks,
        fileName,
        folder,
        totalChunks: chunks.length,
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
