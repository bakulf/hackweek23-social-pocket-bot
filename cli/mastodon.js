/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import inquirer from 'inquirer';

const SCOPES = 'read write push';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

async function ask(message) {
  while (true) {
    const a = await inquirer.prompt([{
      type: "input",
      name: "value",
      message
    }]);
    if (a.value) return a.value;
    console.log("Please, insert a valid value.");
  }
}

console.log("This script configures the Pocket-to-Mastodon bot service.");

const mastodonURL = await ask("Mastodon URL:");

console.log(`Creating an application on ${mastodonURL}...`);
const appFormData = new FormData();
appFormData.append('client_name', 'PocketBot');
appFormData.append('redirect_uris', REDIRECT_URI);
appFormData.append('scopes', SCOPES);
appFormData.append('website', mastodonURL);

let appData;
try {
  appData = await fetch(mastodonURL + "/api/v1/apps", {
    method: "POST",
    body: appFormData
  }).then(r => r.json());
} catch (e) {
  console.log(`Error - ${e.message}`);
  process.exit(1);
}

const authorizeURL = new URL(mastodonURL);
authorizeURL.pathname = '/oauth/authorize';
authorizeURL.searchParams.set('client_id', appData.client_id);
authorizeURL.searchParams.set('scope', SCOPES);
authorizeURL.searchParams.set('redirect_uri', REDIRECT_URI);
authorizeURL.searchParams.set('response_type', 'code');
console.log(`Open URL: ${authorizeURL.toString()}`);

const code = await ask("Code:");

console.log('Requesting the token...');
const formData = new FormData();
formData.append('client_id', appData.client_id);
formData.append('client_secret', appData.client_secret);
formData.append('redirect_uri', appData.redirect_uri);
formData.append('grant_type', 'authorization_code');
formData.append('code', code);
formData.append('scope', SCOPES);

let tokenData;
try {
  tokenData = await fetch(mastodonURL + "/oauth/token", {
    method: "POST",
    body: formData
  }).then(r => r.json());
} catch (e) {
  console.log(`Error - ${e.message}`);
  process.exit(1);
}

try {
  const verifyData = await fetch(mastodonURL + "/api/v1/apps/verify_credentials", {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`
    }
  }).then(r => r.json());
} catch (e) {
  console.log(`Error - ${e.message}`);
  process.exit(1);
}

console.log("Operation completed! Please, update the .env file with the following properties:");
console.log(`MASTODON_URL=${mastodonURL}`);
console.log(`MASTODON_KEY=${tokenData.access_token}`);