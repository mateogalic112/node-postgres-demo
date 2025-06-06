export interface FilesService {
  uploadFile(file: { buffer: Buffer; mimetype: string }, key: string): Promise<string | null>;
}
