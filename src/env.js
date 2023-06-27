/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as dotenv from "dotenv";
import {
  resolve
} from "path";
import {
  dirname
} from 'desm';

const __dirname = dirname(import.meta.url);
dotenv.config({
  path: resolve(__dirname, "../.env")
});

const ENVIRONMENT_VARIABLES = [
  // Mastodon
  "MASTODON_URL",
  "MASTODON_KEY",

  // Pocket
  "POCKET_URL",
  "POCKET_APP_TOKEN",
  "CLIENT_POCKET_URL",

  // Authentication server
  "HTTP_AUTH_URL",
  "HTTP_AUTH_PORT",

  // Session file (instead of a DB because I'm lazy...)
  "SESSION_FILE",
];

const config = {};

for (const v of ENVIRONMENT_VARIABLES) {
  if (!(v in process.env)) {
    throw new Error(`Required environment variable was not set: ${v}`);
  }

  config[v] = process.env[v];
}

Object.freeze(config);
export default config;