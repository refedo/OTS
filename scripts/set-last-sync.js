const mysql = require('mysql2/promise');

async function setLastSync() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Refe@2808',
    database: 'mrp'
  });

  try {
    const now = new Date().toISOString();
    await connection.query(
      "INSERT INTO fin_config (config_key, config_value) VALUES ('last_full_sync', ?) ON DUPLICATE KEY UPDATE config_value = ?",
      [now, now]
    );
    console.log('Set last_full_sync to:', now);
  } finally {
    await connection.end();
  }
}

setLastSync();
