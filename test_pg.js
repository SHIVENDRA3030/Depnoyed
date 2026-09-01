const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 32788,
  user: 'postgres',
  password: 'depnoyed',
  database: 'postgres'
});
async function run() {
  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log('Connected successfully:', result.rows[0].version);
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables:', tables.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}
run();