export interface FilesService {
  uploadFile(
    file: { buffer: Buffer; mimetype: string; originalname: string },
    key: string
  ): Promise<string | null>;
}
