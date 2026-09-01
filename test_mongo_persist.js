const { MongoClient } = require('mongodb');
const uri = 'mongodb://admin:depnoyed@localhost:32787';
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    const db = client.db('testdb');
    const collection = db.collection('test');
    
    // Insert a document
    const insertResult = await collection.insertOne({ name: 'test', value: 123, timestamp: new Date() });
    console.log('Inserted document:', insertResult.insertedId);
    
    // Find the document
    const doc = await collection.findOne({ name: 'test' });
    console.log('Found document:', doc);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Test persistence - close and reconnect
    await client.close();
    console.log('\n--- Reconnecting ---\n');
    
    const client2 = new MongoClient(uri);
    await client2.connect();
    const db2 = client2.db('testdb');
    const collection2 = db2.collection('test');
    const doc2 = await collection2.findOne({ name: 'test' });
    console.log('After reconnect, found document:', doc2);
    
    await client2.close();
    console.log('\nPersistence test PASSED!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();