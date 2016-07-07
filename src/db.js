'use strict';

import { MongoClient as mongoClient } from 'mongodb';

export default function dbConnect(mongoUri) {
  return new Promise((resolve, reject) => {
    mongoClient.connect(mongoUri, (err, db) => {
      if (err) reject(err);
      resolve(db);
    });
  });
}
