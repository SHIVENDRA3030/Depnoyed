import { indexesReadyPromise } from './backend/db';
indexesReadyPromise.then(() => { 
  console.log('MongoDB indexes ensured'); 
  process.exit(0) 
}).catch((e) => { 
  console.error('Index creation failed:', e.message); 
  process.exit(1) 
});
