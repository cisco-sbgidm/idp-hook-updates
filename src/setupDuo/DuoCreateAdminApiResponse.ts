/**
 * Describes create admin api response
 */

export class DuoCreateAdminApiResponse {
  integrationKey: string;
  name: string;
  secretKey: string;
  constructor(readonly ikey: string, readonly skey: string, readonly adminName: string) {
    this.integrationKey = ikey;
    this.secretKey = skey;
    this.name = adminName;
  }
}