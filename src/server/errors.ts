/** An error whose message is safe and useful to show the user. Anything else gets a generic message. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}

export class NotFoundError extends UserFacingError {
  constructor(message = "We couldn't find that.") {
    super(message);
    this.name = "NotFoundError";
  }
}
