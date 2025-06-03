export interface FilesService {
  uploadFile(file: Express.Multer.File, key: string): Promise<string | null>;
}
