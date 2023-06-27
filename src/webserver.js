/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Koa from 'koa';
import Router from 'koa-router';

import env from './env.js';

class WebServer {
  constructor() {
    this._observers = {};
  }

  initialize() {
    const app = new Koa();

    const router = new Router();
    router.get('/:username', ctx => {
      if (ctx.params.username in this._observers) {
        this._observers[ctx.params.username]();
        delete this._observers[ctx.params.username];
      }

      ctx.status = 200;
      ctx.body = 'Nothing go see here! Go back to mozilla.social!';
    });
    app.use(router.routes());

    this._server = app.listen(env.HTTP_AUTH_PORT);
  }

  observe(username, callback) {
    this._observers[username] = callback;
  }
};

const i = new WebServer();
export default i;