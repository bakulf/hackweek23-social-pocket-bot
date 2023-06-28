/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  stripHtml
} from "string-strip-html";
import fetch from 'node-fetch';

import env from './env.js';
import session from './session.js';
import mastodon from './mastodon.js';
import webserver from './webserver.js';

const commands = {
  "logout": async (msg, status) => {
    if (!session.exists(status.account.username)) {
      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `@${status.account.username}, you are not logged in.`,
        visibility: "direct",
      });
    }

    session.forget(status.account.username);
    return await mastodon.post({
      in_reply_to_id: status.id,
      status: `@${status.account.username} done! See you soon!`,
      visibility: "direct",
    });
  },

  "login": async (msg, status) => {
    if (session.exists(status.account.username)) {
      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `@${status.account.username}, you are already logged in.`,
        visibility: "direct",
      });
    }

    console.log(`The user ${status.account.username} requires a new login session`);

    const redirectURL = new URL(env.HTTP_AUTH_URL);
    redirectURL.pathname = '/' + status.account.username;

    let appData;
    try {
      appData = await fetch(env.POCKET_URL + '/v3/oauth/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Accept': 'application/json',
        },
        body: JSON.stringify({
          consumer_key: env.POCKET_APP_TOKEN,
          redirect_uri: redirectURL.toString(),
        }),
      }).then(r => r.json());
    } catch (e) {
      console.log(`Error - ${e.message}`);
      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `Sorry @${status.account.username}, something went wrong.`,
        visibility: "direct",
      });
    }

    const authorizeURL = new URL(env.POCKET_URL);
    authorizeURL.pathname = '/auth/authorize';
    authorizeURL.searchParams.set('request_token', appData.code);
    authorizeURL.searchParams.set('redirect_uri', redirectURL);

    webserver.observe(status.account.username, async () => {
      let data;
      try {
        data = await fetch(env.POCKET_URL + '/v3/oauth/authorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Accept': 'application/json',
          },
          body: JSON.stringify({
            consumer_key: env.POCKET_APP_TOKEN,
            code: appData.code,
          }, null, 3),
        }).then(r => r.json());
      } catch (e) {
        console.log(`Error - ${e.message}`);
        return await mastodon.post({
          in_reply_to_id: status.id,
          status: `Sorry @${status.account.username}, something went wrong.`,
          visibility: "direct",
        });
      }

      session.add(status.account.username, data.access_token);

      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `Great @${status.account.username}! You are now authenticated!!`,
        visibility: "direct",
      });
    });

    return await mastodon.post({
      in_reply_to_id: status.id,
      status: `Sure @${status.account.username}! Can you please open this link: ${authorizeURL} ? See you soon!`,
      visibility: "direct",
    });
  },

  "show": async (msg, status) => {
    let data;
    try {
      data = await fetch(env.CLIENT_POCKET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-Type": "GraphQL",
        },
        body: JSON.stringify({
          query: `query ($page: Int, $per_page: Int) {
                    getCollections(page: $page, perPage: $per_page) {
                      collections {
                        slug
                        title
                        shortUrl
                        intro
                      }
                    }
                  }`,
          variables: {
            page: 1,
            perPage: parseInt(msg[1], 10) || 3,
          },
        }),
      }).then(r => r.json());
    } catch (e) {
      console.log(`Error - ${e.message}`);
      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `Sorry @${status.account.username}, something went wrong.`,
        visibility: "direct",
      });
    }

    for (let collection of data.data.getCollections.collections) {
      await mastodon.post({
        in_reply_to_id: status.id,
        status: `@${status.account.username} - Title: ${collection.title}\nURL: ${collection.shortUrl}`,
        visibility: "direct",
      });
    }
  },

  "add": async (msg, status) => {
    if (!session.exists(status.account.username)) {
      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `Sorry @${status.account.username}, you are not logged in yet.`,
        visibility: "direct",
      });
    }

    if (!msg[1]) {
      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `Please @${status.account.username}, provide a URL`,
        visibility: "direct",
      });
    }

    let appData;
    try {
      appData = await fetch(env.POCKET_URL + '/v3/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Accept': 'application/json',
        },
        body: JSON.stringify({
          url: msg[1],
          consumer_key: env.POCKET_APP_TOKEN,
          access_token: session.accessToken(status.account.username),
        }),
      }).then(r => r.json());
    } catch (e) {
      console.log(`Error - ${e.message}`);
      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `Sorry @${status.account.username}, something went wrong.`,
        visibility: "direct",
      });
    }

    return await mastodon.post({
      in_reply_to_id: status.id,
      status: `Ok @${status.account.username}! Done.`,
      visibility: "direct",
    });
  },

  "get": async (msg, status) => {
    if (!session.exists(status.account.username)) {
      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `Sorry @${status.account.username}, you are not logged in yet.`,
        visibility: "direct",
      });
    }

    const count = parseInt(msg[1], 10) || 10;

    let appData;
    try {
      appData = await fetch(env.POCKET_URL + '/v3/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Accept': 'application/json',
        },
        body: JSON.stringify({
          count,
          consumer_key: env.POCKET_APP_TOKEN,
          access_token: session.accessToken(status.account.username),
        }),
      }).then(r => r.json());
    } catch (e) {
      console.log(`Error - ${e.message}`);
      return await mastodon.post({
        in_reply_to_id: status.id,
        status: `Sorry @${status.account.username}, something went wrong.`,
        visibility: "direct",
      });
    }

    for (let id of Object.keys(appData.list)) {
      const content = `@${status.account.username} - URL: ${appData.list[id].resolved_url}\nTitle: ${appData.list[id].excerpt}`;

      await mastodon.post({
        in_reply_to_id: status.id,
        status: content,
        visibility: "direct",
      });
    }
  },

  "help": async (msg, status) => {
    return await mastodon.post({
      in_reply_to_id: status.id,
      status: `@${status.account.username}, the supported commands are: ${Object.keys(commands).join(', ')}`,
      visibility: "direct",
    });
  },
};

class Conversation {
  async add(data) {
    if (!data.last_status || !data.last_status.account || (data.last_status.application && data.last_status.application.name === 'PocketBot')) return;

    // First message.
    if (!data.last_status.in_reply_to_id) {
      const status = `Ciao @${data.last_status.account.username}! How can I help you? Please, reply to this message with one of the following commands: ${Object.keys(commands).join(', ')}`;

      return await mastodon.post({
        in_reply_to_id: data.last_status.id,
        status,
        visibility: "direct",
      });
    }

    const msg = stripHtml(data.last_status.content || data.last_status.text).result.trim().split(' ');
    if (msg[0]?.startsWith('@')) {
      msg.splice(0, 1);
    }

    if (msg[0] in commands) {
      return await commands[msg[0]](msg, data.last_status);
    }

    const status = `Sorry. I don't understand. The supported commands are: ${Object.keys(commands).join(', ')}`;
    return await mastodon.post({
      in_reply_to_id: data.last_status.id,
      status,
      visibility: "direct",
    });
  }
}

const i = new Conversation();
export default i;