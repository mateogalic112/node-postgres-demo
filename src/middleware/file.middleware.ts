import multer from "multer";
import { EXTENSION_TO_MIME } from "api/api.validations";

interface Args {
  limitMB: number;
  allowedFormats: string;
}

// Configure multer for memory storage
export const fileMiddleware = ({ limitMB, allowedFormats }: Args) => {
  const allowedExtensions = allowedFormats.split("|");
  const allowedMimeTypes = allowedExtensions.map((ext) => EXTENSION_TO_MIME[ext]).filter(Boolean);

  return multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
      if (!allowedFormats) return cb(null, true);

      const hasValidExtension = allowedExtensions.some((ext) =>
        file.originalname.toLowerCase().endsWith(ext)
      );
      const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);

      if (!hasValidExtension || !hasValidMimeType) {
        return cb(new Error(`Only ${allowedFormats} files are allowed!`));
      }

      cb(null, true);
    },
    limits: {
      fileSize: limitMB * 1024 * 1024
    }
  });
};
