const axios = require('axios');
const rax = require('retry-axios');

class OktaClient {

  constructor(oktaUrl, apiToken) {
    this._oktaUrl = oktaUrl;
    this._apiToken = apiToken;


    this._axios = axios.create({
      baseURL: oktaUrl,
      // `timeout` specifies the number of milliseconds before the request times out.
      // If the request takes longer than `timeout`, the request will be aborted.
      timeout: 3000 // default is `0` (no timeout)
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

  async _request(method, path, { qs, data } = {}) {
    console.log(`Executing request to Okta ${method} ${path}`);
    const resp = await this._axios.request({
      method,
      url: `${this._oktaUrl}${path}`,
      headers: {
        Authorization: `SSWS ${this._apiToken}`
      },
      params: qs,
      data
    });
    return resp.data;
  }

}

module.exports = OktaClient;
