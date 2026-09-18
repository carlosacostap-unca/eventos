export class DomainError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "CLOSED"
      | "FULL"
      | "DUPLICATE"
      | "INVALID"
      | "UNAUTHORIZED"
      | "NOT_ELIGIBLE"
      | "NOT_CONFIGURED"
      | "CONFIRMATION_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
