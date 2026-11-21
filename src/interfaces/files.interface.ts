export interface UploadPayload {
  file: { buffer: Buffer; mimetype: string; originalname: string } | undefined;
  key: string;
}

export interface FilesService {
  uploadFile(payload: UploadPayload): Promise<string | null>;
}
