import { pingMongo } from './backend/mongo';

pingMongo().then((r) => {
  console.log('ok=' + r.ok + ' ms=' + r.ms + ' host=' + (r.host || 'n/a'));
  process.exit(r.ok === 1 ? 0 : 1);
}).catch((e) => {
  console.error('PING FAIL:', e.message);
  process.exit(1);
});