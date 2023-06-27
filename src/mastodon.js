/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import fs from 'fs';
import Mastodon from 'mastodon-api';
import parse from 'parse-link-header';
import {
  URL
} from 'node:url';
import {
  strict as assert
} from 'node:assert';
import https from 'https';

import env from './env.js';

class Masto {
  constructor() {
    this._mastodon = new Mastodon({
      access_token: env.MASTODON_KEY,
      timeout_ms: env.MASTODON_TIMEOUT_MS,
      api_url: env.MASTODON_URL,
    })

    this.onMessage = () => {};
  }

  async initialize() {
    // This request is just to see if we are able to talk with mastodon.
    const data = await this._mastodon.get("/api/v2/instance");
    assert(!!data.data);

    // In theory the mastodon module has support for the stream API, but it's
    // not so great.
    this._streams('/api/v1/streaming/direct');
    this._streams('/api/v1/streaming/user/notification');
  }

  async post(obj) {
    await this._mastodon.post('/api/v1/statuses', obj);
  }

  _streams(path) {
    https.get(env.MASTODON_URL + path, {
      headers: {
        Authorization: `Bearer ${env.MASTODON_KEY}`
      }
    }, res => {

      let lastEvent = null;
      let buffer = [];
      res.on('data', chunk => {
        buffer = buffer.concat([...chunk.toString().split("")]);

        while (buffer.includes('\n')) {
          const line = buffer.splice(0, buffer.indexOf('\n') + 1).join("");
          if (line[0] === ':') continue;

          if (line.startsWith('event:')) {
            lastEvent = line.substr(7);
            continue;
          }

          if (line.startsWith('data:')) {
            const data = line.substr(6);
            this.onMessage(lastEvent.trim(), JSON.parse(data));
          }
        }
      });
    }).on('error', err => {
      console.log('Error: ', err.message);
    });
  }
}

const i = new Masto();
export default i;