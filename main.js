const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const twilio = require('twilio');
const sqlite3 = require('sqlite3').verbose();

const store = new Store();

let db; // shared connection

function initDatabase() {
  const userDataDir = app.getPath('userData');
  const dbPath = path.join(userDataDir, 'messages.db');

  // migrate a dev-time db if it exists
  const legacyPath = path.join(__dirname, 'messages.db');
  try {
    if (!fs.existsSync(dbPath) && fs.existsSync(legacyPath)) {
      fs.mkdirSync(userDataDir, { recursive: true });
      fs.copyFileSync(legacyPath, dbPath);
    }
  } catch (_) {}

  fs.mkdirSync(userDataDir, { recursive: true });

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening the database:', err);
      return;
    }
    console.log('Database opened at:', dbPath);

    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        send_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        recipient_count INTEGER DEFAULT 0
      )
    `, (e) => {
      if (e) console.error('Error creating table:', e);
      else console.log('Messages table ready');
    });

    // (optional) better concurrency
    db.run(`PRAGMA journal_mode = WAL;`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  win.loadFile('renderer/dist/index.html');
  // For debugging
  // win.webContents.openDevTools({ mode: 'detach' });

}

app.whenReady().then(() => {
  initDatabase();

  // Settings
  ipcMain.handle('get-settings', () => ({
    twilioAccountSid: store.get('twilioAccountSid') || '',
    twilioAuthToken: store.get('twilioAuthToken') || '',
    twilioPhoneNumber: store.get('twilioPhoneNumber') || '',
  }));

  ipcMain.handle('save-settings', (_, values) => {
    store.set('twilioAccountSid', values.twilioAccountSid);
    store.set('twilioAuthToken', values.twilioAuthToken);
    store.set('twilioPhoneNumber', values.twilioPhoneNumber);
  });

  // Send message(s)
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
      } catch (err) {
        results[number] = `❌ ${err.message}`;
      }
    }

    // record one row per batch (content + recipient_count)
    db.run(
      "INSERT INTO messages (content, recipient_count, status) VALUES (?, ?, ?)",
      [message, to.length, 'sent'],
      function (err) {
        if (err) console.error('Error inserting message:', err);
        else console.log(`Message batch inserted with ID: ${this.lastID}`);
      }
    );

    return results;
  });

  // History
  ipcMain.handle('get-messages', () =>
    new Promise((resolve, reject) => {
      db.all("SELECT * FROM messages ORDER BY send_time DESC", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

