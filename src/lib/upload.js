import { fileURLToPath } from "url";

import multer from "multer";

import { v2 as cloudinary } from "cloudinary";

import { CloudinaryStorage } from "multer-storage-cloudinary";

const { CLOUDINARY_URL } = process.env;

cloudinary.config({
  cloudinary_url: CLOUDINARY_URL,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "WhatsApp",
    allowedFormats: ["jpeg", "png", "jpg"],
  },
});
export const cloudinaryUpload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "WhatsApp/images",
      allowedFormats: ["jpeg", "png", "jpg"],
    },
  }),
}).single("avatar");

const __filename = fileURLToPath(import.meta.url);

export const parseFile = multer({ storage });
