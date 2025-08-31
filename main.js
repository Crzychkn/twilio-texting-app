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

    db.run(`
        CREATE TABLE IF NOT EXISTS scheduled_meta (
            sid TEXT PRIMARY KEY,
            send_at_iso TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (e) => {
      if (e) console.error('Error creating scheduled_meta table:', e);
      else console.log('scheduled_meta table ready');
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

  // Create scheduled messages for a list of recipients
  ipcMain.handle('twilio-schedule-create', async (_e, { recipients, content, mediaUrl, sendAtISO }) => {
    const sid = store.get('twilioAccountSid');
    const token = store.get('twilioAuthToken');
    const from = store.get('twilioFrom'); // must be MG...
    if (!sid || !token || !from) return { ok: false, error: 'Missing Twilio settings' };
    if (!from.startsWith('MG')) return { ok: false, error: 'Scheduling requires a Messaging Service SID (starts with MG).' };

    const client = twilio(sid, token);

    const results = [];
    for (const to of recipients || []) {
      try {
        const params = {
          to,
          body: (content || '').trim(),
          messagingServiceSid: from,             // REQUIRED for scheduling
          scheduleType: 'fixed',
          sendAt: new Date(sendAtISO).toISOString(), // RFC3339/ISO8601
        };
        if (mediaUrl) params.mediaUrl = [mediaUrl];

        const msg = await client.messages.create(params);
        // msg.status will be "scheduled"; keep SID so we can cancel later
        results.push({ to, sid: msg.sid, status: msg.status });

        db.run(
          `INSERT OR REPLACE INTO scheduled_meta (sid, send_at_iso, created_at) VALUES (?, ?, ?)`,
          [msg.sid, sendAtISO, new Date().toISOString()],
        );
      } catch (err) {
        console.error('schedule create error:', { to, message: err?.message, code: err?.code });
        results.push({ to, error: err?.message || 'Failed to schedule' });
      }
    }

    return {
      ok: results.every(r => r.sid),
      results,
    };
  });

// List scheduled messages (paginated lightly)
  ipcMain.handle('twilio-schedule-list', async (_e, { pageSize = 50 }) => {
    const sid = store.get('twilioAccountSid');
    const token = store.get('twilioAuthToken');
    if (!sid || !token) return [];

    const client = twilio(sid, token);
    // Filter by scheduled status
    const items = await client.messages.list({ status: 'scheduled', limit: pageSize });
    // Load all meta once and map by SID
    const meta = await new Promise((resolve) => {
      db.all(`SELECT sid, send_at_iso FROM scheduled_meta`, [], (err, rows) => {
        if (err) { console.error('meta load error:', err); return resolve([]); }
        resolve(rows || []);
      });
    });
    const metaMap = new Map(meta.map(r => [r.sid, r.send_at_iso]));
    // Return minimal fields we need
    return items.map(m => ({
      sid: m.sid,
      to: m.to,
      status: m.status,          // 'scheduled'
      dateCreated: m.dateCreated,
      messagingServiceSid: m.messagingServiceSid,
      bodyPreview: (m.body || '').slice(0, 120),
      numMedia: m.numMedia,
      sendAtISO: metaMap.get(m.sid) || null,
    }));
  });

// Cancel a scheduled message by SID
  ipcMain.handle('twilio-schedule-cancel', async (_e, { sid }) => {
    const a = store.get('twilioAccountSid');
    const t = store.get('twilioAuthToken');
    if (!a || !t) return { ok: false, error: 'Missing Twilio settings' };

    const client = twilio(a, t);
    try {
      const updated = await client.messages(sid).update({ status: 'canceled' });
      return { ok: updated.status === 'canceled' };
    } catch (err) {
      console.error('cancel error:', { sid, message: err?.message, code: err?.code });
      return { ok: false, error: err?.message || 'Failed to cancel' };
    }
  });


  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

