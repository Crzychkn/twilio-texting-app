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
        recipient_count INTEGER DEFAULT 0,
        error_message TEXT
      )
    `, (e) => {
      if (e) console.error('Error creating table:', e);
      else console.log('Messages table ready');
    });

    // (optional) better concurrency
    db.run(`PRAGMA journal_mode = WAL;`);
  });
}

const isProd = app.isPackaged || process.env.NODE_ENV === 'production';

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: !isProd,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      sandbox: true,
      nativeWindowOpen: true,
    }
  });

  win.loadFile('renderer/dist/index.html');
}

app.whenReady().then(() => {
  initDatabase();

  // Settings
  ipcMain.handle('get-settings', () => ({
    twilioAccountSid: store.get('twilioAccountSid') || '',
    twilioAuthToken: store.get('twilioAuthToken') || '',
    twilioFrom: store.get('twilioFrom') || '',
  }));

  ipcMain.handle('save-settings', (_, values) => {
    store.set('twilioAccountSid', values.twilioAccountSid);
    store.set('twilioAuthToken', values.twilioAuthToken);
    store.set('twilioFrom', values.twilioFrom);
  });

  // Send message(s)
  ipcMain.handle('send-message', async (_, { to, message, mediaUrl }) => {
    const sid = store.get('twilioAccountSid');
    const token = store.get('twilioAuthToken');
    const from = store.get('twilioFrom');

    if (!sid || !token || !from) {
      return Object.fromEntries(to.map(num => [num, '❌ Missing Twilio settings']));
    }

    const client = twilio(sid, token);
    const results = {};
    let ok = 0, fail = 0;

    const fromOptions = from.startsWith('MG') ? { messagingServiceSid: from } : { from };

    for (const number of to) {
      try {
        const options = { to: number, body: message, ...fromOptions };
        if (mediaUrl) options.mediaUrl = [mediaUrl];
        await client.messages.create(options);
        results[number] = '✅ Sent';
        ok++;
      } catch (err) {
        results[number] = `❌ ${err.message || 'Send failed'}`;
        fail++;
      }
    }

    return { results, ok, fail };
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

  // Store messages
  ipcMain.handle('store-message', async (_event, { content, recipientCount, status = 'sent', errorMessage = null }) => {
    return new Promise((resolve) => {
      db.run(
        "INSERT INTO messages (content, recipient_count, status, error_message) VALUES (?, ?, ?, ?)",
        [content, recipientCount ?? 0, status, errorMessage],
        function (err) {
          if (err) {
            console.error('Error inserting message:', err);
            return resolve({ ok: false, error: String(err) });
          }
          console.log(`Message batch inserted with ID: ${this.lastID}`);
          return resolve({ ok: true, id: this.lastID });
        }
      );
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

