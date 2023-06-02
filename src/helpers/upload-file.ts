import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

export function handleUpload(
  file: string,
  folder: string,
  filename_override?: string
) {
  return cloudinary.uploader.upload(file, {
    resource_type: "auto",
    folder,
    unique_filename: !filename_override,
    use_filename: !!filename_override,
    filename_override,
  });
}
