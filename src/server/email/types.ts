export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Machine-readable tag, e.g. "verify-email". Used by tests to find messages. */
  tag: string;
};

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
