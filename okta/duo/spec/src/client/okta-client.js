const axios = require('axios');
const rax = require('retry-axios');
const httpAdapter = require('axios/lib/adapters/http');
const CancelToken = axios.CancelToken;

class OktaClient {

  constructor(oktaUrl, apiToken) {
    this._oktaUrl = oktaUrl;
    this._apiToken = apiToken;


    this._axios = axios.create({
      baseURL: oktaUrl,
      // to avoid "Cross origin http://localhost forbidden" errors use an adapter
      adapter: httpAdapter,
      // `timeout` specifies the number of milliseconds before the request times out.
      // If the request takes longer than `timeout`, the request will be aborted.
      timeout: 5000 // default is `0` (no timeout)
    });
    this._axios.defaults.raxConfig = {
      instance: this._axios
    };
    rax.attach(this._axios);
  }

  async get(path, qs) {
    return this._request('get', path, { qs });
  }

  async post(path, data) {
    return this._request('post', path, { data });
  }

  async put(path, data) {
    return this._request('put', path, { data });
  }

  async delete(path) {
    return this._request('delete', path);
  }

  _request(method, path, { qs, data } = {}) {
    return new Promise((resolve, reject) => {
      let iteration = 1;

      const req = () => {
        if (iteration > 3) {
          return reject(new Error(`Too many retries ${iteration}`));
        }

        console.log(`Executing request to Okta ${method} ${path}, iteration ${iteration}`);
        this._axios
          .request({
            method,
            url: `${this._oktaUrl}${path}`,
            headers: {
              Authorization: `SSWS ${this._apiToken}`
            },
            params: qs,
            data,
            cancelToken: new CancelToken(function executor(cancel) {
              setTimeout(cancel, 5000);
            })
          })
          .then(res => {
            console.log(`Completed request to Okta ${method} ${path}, result ${JSON.stringify(res.status)} ${JSON.stringify(res.headers)} ${JSON.stringify(
              res.data)}`);
            resolve(res.data);
          })
          .catch(error => {
            console.log(`error, retrying ${JSON.stringify(error)}`);
            iteration += 1;
            req();
          });

      }
      req();
    });

  }
}

module.exports = OktaClient;
