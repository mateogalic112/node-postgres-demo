export interface PaymentsService {
  createCustomer: (email: string) => Promise<string | null>;
}
