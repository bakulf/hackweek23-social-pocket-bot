/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Koa from 'koa';
import Router from 'koa-router';
import inquirer from 'inquirer';

const POCKET_URL = 'https://getpocket.com';

async function ask(message) {
  while (true) {
    const a = await inquirer.prompt([{
      type: 'input',
      name: 'value',
      message
    }]);
    if (a.value) return a.value;
    console.log('Please, insert a valid value.');
  }
}

class WebServer {
  initialize() {
    const PORT = 8000;

    this._promise = new Promise(r => {
      const app = new Koa();

      const router = new Router();
      router.get('/', ctx => {
        r();
        ctx.status = 200;
        ctx.body = 'Nothing to see here!';
      });
      app.use(router.routes());

      this._server = app.listen(PORT);
    });

    return `http://localhost:${PORT}`;
  }

  shutdown() {
    this._server.close();
  }

  async waitForCall() {
    return this._promise;
  }
};

console.log('This script configures the Pocket-to-Mastodon bot service.');

const ws = new WebServer();
const redirectUri = ws.initialize();

console.log('Create a new pocket app. See https://getpocket.com/developer/apps/new');
const pocketToken = await ask('Pocket token:');

console.log('Creating an application on Pocket...');
const appFormData = new FormData();
appFormData.append('consumer_key', pocketToken);
appFormData.append('redirect_uri', redirectUri);

let appData;
try {
  appData = await fetch(POCKET_URL + '/v3/oauth/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: pocketToken,
      redirect_uri: 'http://localhost:8000',
    }),
  }).then(r => r.json());
} catch (e) {
  console.log(`Error - ${e.message}`);
  process.exit(1);
}

const authorizeURL = new URL(POCKET_URL);
authorizeURL.pathname = '/auth/authorize';
authorizeURL.searchParams.set('request_token', appData.code);
authorizeURL.searchParams.set('redirect_uri', redirectUri);

console.log(`Open URL: ${authorizeURL.toString()}`);

await ws.waitForCall();
ws.shutdown();

try {
  appData = await fetch(POCKET_URL + '/v3/oauth/authorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: pocketToken,
      code: appData.code,
    }),
  }).then(r => r.json());
} catch (e) {
  console.log(`Error - ${e.message}`);
  process.exit(1);
}

console.log('Operation completed! Please, update the .env file with the following properties:');
console.log(`POCKET_APP_TOKEN=${pocketToken}`);
console.log(`POCKET_ACCESS_TOKEN=${appData.access_token}`);
process.exit(0);