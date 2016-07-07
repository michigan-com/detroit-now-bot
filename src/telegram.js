'use strict';

import TelegramBot from 'node-telegram-bot-api';
import debug from 'debug';
import io from 'socket.io-client';

import { getTopArticles, getRecentArticles } from './core';
import dbConnect from './db';

if (!process.env.MONGO_URI) throw new Error('set MONGO_URI env variable');
if (!process.env.SOCKET_URL) throw new Error('Set SOCKET_URL env variable');
const logger = debug('app:telegram');
const HELP = `
Thanks for using the DetroitNow bot.

Here are the commands you can use:
/top        get the current top read articles
/recent     get the most recent articles
/alertson   turn breaking news alerts on
/alertsoff  turn breaking news alerts off
/help       what you're currently reading
`.trim();

async function ingestBreakingNews(db, articles) {
  const col = db.collection('BreakingNewsAlert');
  const toSend = [];
  for (const article of articles) {
    const articleId = article.article_id;

    const breakingNewsObj = await col.find({ articleId }).limit(1).next();
    if (breakingNewsObj == null) {
      await col.insertOne({
        createdAt: new Date(),
        articleId,
      });

      toSend.push(article);
    }
  }
  return toSend;
}

async function setUpDatabase(db) {
  const breakingNewsCollection = db.collection('BreakingNewsAlert');
  await breakingNewsCollection.ensureIndex('createdAt', {
    expireAfterSeconds: 60 * 60 * 24, // 1 day
    background: true,
  });
  return;
}


async function init() {
  const db = await dbConnect(process.env.MONGO_URI);
  await setUpDatabase(db);
  const BreakingNewsChatIds = db.collection('BreakingNewsChatIds');
  const socket = io(process.env.SOCKET_URL, { transports: ['websocket', 'xhr-polling'] });
  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
  process.on('SIGTERM', () => { db.close(); });

  logger('Bot created');

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, HELP);
  });

  bot.onText(/\/top/, (msg) => {
    const chatId = msg.chat.id;

    async function top() {
      const articles = await getTopArticles();

      const articleMessage = [];
      for (const article of articles) {
        if (articleMessage.length === 5) break;
        articleMessage.push(`${article.headline}\nReaders: ${article.visits}\nhttps://detroitnow.io/article/${article.article_id}/`);
      }

      bot.sendMessage(chatId, `Top Articles\n\n${articleMessage.join('\n\n')}`, {
        disable_web_page_preview: true,
      });
    }

    top().catch((e) => {
      bot.sendMessage(chatId, `Error in /top command: ${e}`);
    });
  });

  bot.onText(/\/recent/, (msg) => {
    const chatId = msg.chat.id;

    async function recent() {
      const articles = await getRecentArticles();

      const articleMessage = [];
      for (const article of articles) {
        if (articleMessage.length === 5) break;
        if (article.article_id === 0) continue;

        articleMessage.push(`${article.headline}\nhttps://detroitnow.io/article/${article.article_id}/`);
      }
      bot.sendMessage(chatId, `Recent Articles:\n\n${articleMessage.join('\n\n')}`, {
        disable_web_page_preview: true,
      });
    }

    recent().catch((e) => {
      bot.sendMessage(chatId, `Error in the /recent command: ${e}`);
    });
  });

  bot.onText(/\/alertsoff/, (msg) => {
    logger('alertsoff');
    const chatId = msg.chat.id;
    async function alertsOff() {
      await BreakingNewsChatIds.remove({ chatId });
      bot.sendMessage(
        chatId,
        'You have turned off breaking news alerts.\n\nTo turn them back on, use /alertson'
      );
    }
    alertsOff().catch((e) => { console.error(e); });
  });

  bot.onText(/\/alertson/, (msg) => {
    logger('alertson');
    const chatId = msg.chat.id;
    async function alertsOn() {
      await BreakingNewsChatIds.updateOne({ chatId }, { chatId }, { upsert: true });
      bot.sendMessage(
        chatId,
        'Breaking news alerts are now on.'
      );
    }

    alertsOn().catch((e) => { console.error(e); });
  });

  async function sendBreakingNewsMessage(article) {
    BreakingNewsChatIds.find().forEach((doc) => {
      const chatId = doc.chatId;
      bot.sendMessage(
        chatId,
        `BREAKING:\n\n${article.headline}\nhttps://detroitnow.io/article/${article.article_id}/`
      );
    });
  }

  /** socket stuff */
  socket.emit('get_breaking_news');
  socket.on('got_breaking_news', async (data) => {
    const articles = data.snapshot.articles;
    const articlesToSend = await ingestBreakingNews(db, articles);
    for (const article of articlesToSend) {
      sendBreakingNewsMessage(article);
    }
  });
}

init().catch((e) => {
  console.error(e);
  console.error(e.stack);
});
