'use strict';

import TelegramBot from 'node-telegram-bot-api';
import { getTopArticles, getRecentArticles } from './core';

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

bot.on(/\/top/, (msg) => {
  const fromId = msg.from.id;

  async function top() {
    const articles = await getTopArticles();

    const articleMessage = [];
    for (const article of articles) {
      articleMessage.push(`${article.headline}\n\nReaders: ${article.visits}\nLink: https://detroitnow.io/article/${article.article_id}`);
    }

    bot.sendMessage(fromId, `Top Articles\n\n\n${articleMessage.join('\n\n')}`);
  }

  top().catch((e) => {
    bot.sendMessage(fromId, `Error in /top command: ${e}`);
  });
});

bot.on(/\/recent/, (msg) => {
  const fromId = msg.from.id;

  async function recent() {
    const articles = await getRecentArticles();

    const articleMessage = [];
    for (const article of articles) {
      if (articleMessage.length === 5) break;
      if (article.article_id === 0) continue;

      articleMessage.push(`${article.headline}\nhttps://detroitnow.io/article/${article.article_id}`);
    }
    bot.sendMessage(fromId, `Recent Articles: ${articleMessage.join('\n\n')}`);
  }

  recent().catch((e) => {
    bot.sendMessage(fromId, `Error in the /recent command: ${e}`);
  });
});
