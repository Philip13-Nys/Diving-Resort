const CLOUDINARY_CLOUD_NAME = "vw7ntuy4";
const CLOUDINARY_UPLOAD_PRESET = "resort_Image_upload";

export async function uploadToCloudinary(file: File): Promise<string> {
  if (!file) {
    throw new Error("No image selected.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5MB.");
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Cloudinary error:", result);
    throw new Error(
      result?.error?.message || "Failed to upload image to Cloudinary.",
    );
  }

  return result.secure_url;
}
