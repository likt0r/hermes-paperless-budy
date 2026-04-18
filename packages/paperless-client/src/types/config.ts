export interface ClientConfig {
  /** Base URL of the Paperless-NGX instance, e.g. "https://paperless.example.com" */
  baseUrl: string
  /** API token used as "Authorization: Token {token}" */
  token: string
}
