import multer from "multer";
import { BadRequestError } from "api/api.errors";

const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Configure multer for memory storage
export const fileMiddleware = (limitMB: number) => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
      const hasValidMimeType = SUPPORTED_MIME_TYPES.includes(file.mimetype);
      if (!hasValidMimeType) {
        return cb(new BadRequestError("Invalid file format"));
      }
      cb(null, true);
    },
    limits: {
      fileSize: limitMB * 1024 * 1024
    }
  });
};
