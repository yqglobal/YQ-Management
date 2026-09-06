export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public path?: string,
    public details?: AnyFixMe,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
