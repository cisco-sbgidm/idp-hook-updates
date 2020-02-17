import { AxiosError } from 'axios';

export enum UserStatus {
  ACTIVE,
  DISABLED,
}

export interface Profile {
  email?: string;
  firstname?: string;
  lastname?: string;
  middlename?: string;
  status?: UserStatus;
  alias?: string;
}

export class Helper {

  static logError(error: AxiosError): void {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(error.response.data);
      console.error(error.response.status);
      console.error(error.response.headers);
    }
    throw error;
  }

  static isHttpCodeSuccess(code: number): boolean {
    return code >= 200 && code < 300;
  }
}
