const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const twilio = require('twilio');
const sqlite3 = require('sqlite3').verbose();  // Import sqlite3
const store = new Store();

// Set up SQLite database
const dbPath = path.join(__dirname, 'messages.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening the database:', err);
  } else {
    console.log('Database opened successfully');
  }
});

// Create the messages table if it doesn't exist
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

// Initialize the table
createTable();

function createWindow () {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  win.loadFile('renderer/dist/index.html');
}

app.whenReady().then(() => {
  // IPC handler to get settings
  ipcMain.handle('get-settings', () => {
    return {
      twilioAccountSid: store.get('twilioAccountSid') || '',
      twilioAuthToken: store.get('twilioAuthToken') || '',
      twilioPhoneNumber: store.get('twilioPhoneNumber') || '',
    };
  });

  // IPC handler to save settings
  ipcMain.handle('save-settings', (_, values) => {
    store.set('twilioAccountSid', values.twilioAccountSid);
    store.set('twilioAuthToken', values.twilioAuthToken);
    store.set('twilioPhoneNumber', values.twilioPhoneNumber);
  });

  // IPC handler to send messages
  ipcMain.handle('send-message', async (_, { to, message, mediaUrl }) => {
    const sid = store.get('twilioAccountSid');
    const token = store.get('twilioAuthToken');
    const from = store.get('twilioPhoneNumber');

    if (!sid || !token || !from) {
      return Object.fromEntries(to.map(num => [num, '❌ Missing Twilio settings']));
    }

    const client = twilio(sid, token);
    const results = {};

    for (const number of to) {
      try {
        const options = { to: number, from, body: message };
        if (mediaUrl) options.mediaUrl = [mediaUrl];
        await client.messages.create(options);
        results[number] = '✅ Sent';

        // Store the message in the database
        const stmt = db.prepare("INSERT INTO messages (content, recipient_count) VALUES (?, ?)");
        stmt.run(message, to.length, function (err) {
          if (err) {
            console.error('Error inserting message:', err);
          } else {
            console.log(`Message inserted with ID: ${this.lastID}`);
          }
        });
        stmt.finalize();
      } catch (err) {
        results[number] = `❌ ${err.message}`;
      }
    }

    return results;
  });

  // IPC handler to retrieve messages
  ipcMain.handle('get-messages', (event) => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM messages ORDER BY send_time DESC", [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
