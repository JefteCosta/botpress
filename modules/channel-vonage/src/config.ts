export interface Config {
  /**
   * Enable or disable this channel for this bot
   * @default false
   */
  enabled: boolean
  /**
   * Use Vonage sandbox to test the Messages API.
   * Testing endpoint is: https://messages-sandbox.nexmo.com/v0.1/messages.
   * Production endpoint is: https://api.nexmo.com/v0.1/messages.
   * @default false
   */
  useTestingApi: boolean
  /**
   * Use Vonage templates when sending single choice and carousel.
   * Currently only work with the sandbox (useTestingApi = true)
   * @default false
   */
  useTemplates: boolean
  /**
   * The Vonage API key which you can obtain from your Dashboard. (https://dashboard.nexmo.com/).
   * @default "your api key here"
   */
  apiKey: string
  /**
   * The Vonage API secret which you can obtain from your Dashboard. (https://dashboard.nexmo.com/).
   * @default "your app secret here"
   */
  apiSecret: string
  /**
   * The Vonage Application ID for your Vonage Application which can be obtained from your Dashboard. (https://dashboard.nexmo.com/).
   * @default "your application ID here"
   */
  applicationId: string
  /**
   * The content of the private.key file that was generated when you created your Vonage Application. (https://dashboard.nexmo.com/).
   * _Note: You must replace all line breaks with the character `\n`_.
   * @default "your private key here"
   */
  privateKey: string
}
