export interface FilesService {
  uploadFile(file: Express.Multer.File, key: string): Promise<boolean>;
}
