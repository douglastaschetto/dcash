const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'Md@31130790',
  database: 'app_database',
});

(async () => {
  await client.connect();
  const hash = await bcrypt.hash('Douglas123!', 12);
  console.log('hash:', hash);
  await client.query(
    'UPDATE db_dtasc.users SET password = $1 WHERE email = $2',
    [hash, 'douglastaschetto@gmail.com']
  );
  await client.query(
    'UPDATE db_dtasc.users SET password = $1 WHERE email = $2',
    [hash, 'ssilvamonalisa@gmail.com']
  );
  console.log('Updated both users. Password: Douglas123!');
  await client.end();
})().catch(console.error);
