import multer from "multer";

// Configure multer for memory storage
export const fileMiddleware = (limitMB: number, formats: string) =>
  multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
      if (!formats) return cb(null, true);

      if (!file.originalname.match(new RegExp(formats))) {
        return cb(new Error(`Only ${formats} files are allowed!`));
      }

      cb(null, true);
    },
    limits: {
      fileSize: limitMB * 1024 * 1024
    }
  });
