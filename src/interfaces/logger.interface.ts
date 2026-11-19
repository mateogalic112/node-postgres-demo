export interface LoggerService {
  log: (message: string) => void;
  error: (message: string) => void;
}
