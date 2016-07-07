'use strict';

import request from 'request';

export function getTopArticles() {
  return new Promise((resolve, reject) => {
    request('https://api.michigan.com/v1/snapshot/toppages/', (err, resp, body) => {
      if (err) reject(err);
      try {
        const articles = JSON.parse(body).articles;
        resolve(articles);
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function getRecentArticles(limit = 10) {
  return new Promise((resolve, reject) => {
    request(`https://api.michigan.com/v1/news/?limit=${limit}`, (err, resp, body) => {
      if (err) reject(err);
      try {
        const articles = JSON.parse(body).articles;
        resolve(articles);
      } catch (e) {
        reject(e);
      }
    });
  });
}
