/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import mastodon from './mastodon.js';

class Notification {
  async add(data) {
    const visibility = data.status?.visibility;
    if (visibility === 'public' || visibility === 'unlisted') {
      await mastodon.post({
        in_reply_to_id: data.status?.id,
        status: `Sorry @${data.account?.username}, I can interact with you only via private/direct messages. You know, privacy is important...`,
        visibility: "direct",
      });
    }
  }
}

const i = new Notification();
export default i;