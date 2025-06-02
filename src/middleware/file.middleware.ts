import multer from "multer";

interface Args {
  limitMB: number;
  allowedFormats: string;
}

// Configure multer for memory storage
export const fileMiddleware = ({ limitMB, allowedFormats }: Args) =>
  multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
      if (!allowedFormats) return cb(null, true);

      if (!file.originalname.match(new RegExp(allowedFormats))) {
        return cb(new Error(`Only ${allowedFormats} files are allowed!`));
      }

      cb(null, true);
    },
    limits: {
      fileSize: limitMB * 1024 * 1024
    }
  });
