/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import fs from 'fs';

import env from './env.js';

class Session {
  contructor() {
    this._sessions = {}
  }

  load() {
    try {
      this._sessions = JSON.parse(fs.readFileSync(env.SESSION_FILE).toString());
    } catch (e) {
      console.log("Something went wrong reading the session file. Let's create a new one.");
      this._sessions = {};
      this._sync();
    }
  }

  exists(username) {
    return (username in this._sessions);
  }

  accessToken(username) {
    return this._sessions[username];
  }

  add(username, accessToken) {
    this._sessions[username] = accessToken;
    this._sync();
  }

  forget(username) {
    delete this._sessions[username];
    this._sync();
  }

  _sync() {
    fs.writeFileSync(env.SESSION_FILE, JSON.stringify(this._sessions));
  }
}

const i = new Session();
export default i;