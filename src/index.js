/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import mastodon from './mastodon.js';
import conversation from './conversation.js';
import notification from './notification.js';
import session from './session.js';
import webserver from './webserver.js';

await session.load();
await webserver.initialize();
await mastodon.initialize();

mastodon.onMessage = async (event, data) => {
  switch (event) {
    case "conversation":
      await conversation.add(data);
      break;

    case "notification":
      await notification.add(data);
      break;
  }
}