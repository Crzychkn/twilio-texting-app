// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path for the SQLite database file
const dbPath = path.join(__dirname, 'messages.db');

// Create and open the database (it will create the file if it doesn't exist)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening the database:', err);
  } else {
    console.log('Database opened successfully');
  }
});

// Function to create the table if it doesn't already exist
const createTable = () => {
  const query = `
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            send_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending',
            recipient_count INTEGER DEFAULT 0
        );
    `;
  db.run(query, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Messages table created (or already exists)');
    }
  });
};

// Create the table
createTable();

// Export the database object for use in other parts of the app
module.exports = db;
