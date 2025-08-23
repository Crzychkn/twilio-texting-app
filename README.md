# Twilio Texting App

Send SMS/MMS from a fast, cross-platform desktop app. 
Built with **Electron**, packaged with **Electron Forge**, and released via **GitHub Actions** for **macOS**, **Windows**, and **Linux**.

## ✨ Features
- CSV import for contacts (via PapaParse)
- Bulk sending (SMS + optional MMS media URL)
- Message history stored locally in **SQLite**
- Twilio credentials saved securely via **electron-store**
- Cross-platform installers built in CI (DMG / EXE / DEB / RPM)

---

⚠️ 10DLC Registration Required (U.S. SMS)
Important: To send messages to U.S. mobile numbers, this app requires a registered A2P 10DLC Campaign through Twilio.
Without 10DLC, carriers will block or severely limit delivery.
You must:
Register a Brand and Campaign in Twilio
Link them to a Messaging Service with your Twilio number(s)
Configure this app to use that Messaging Service SID
👉 Twilio A2P 10DLC Setup Guide

---

## 📥 Download
Head to **Releases** and grab the latest installers:  
`Releases → <your tag> → Assets` (DMG/ZIP for macOS, EXE for Windows, DEB/RPM for Linux).

> If you don’t see a published release yet, push a version tag (see **Release** below).

---

## 💻 Install

### macOS
- **DMG**: open → drag the app into **Applications**  
- **ZIP**: unzip → drag into **Applications**  
> Unsigned builds: right-click the app → **Open** → **Open** (bypasses Gatekeeper).

### Windows
- **EXE (Squirrel)**: run the installer  
> SmartScreen warning: **More info → Run anyway** (unsigned build).

### Linux
- **DEB** (Debian/Ubuntu): `sudo apt install ./Twilio-Texting-App_x.y.z_amd64.deb`  
- **RPM** (Fedora/RHEL/CentOS): `sudo rpm -i Twilio-Texting-App-x.y.z.x86_64.rpm`

---

## 🚀 First-Run Setup
1. Open the app → go to **Settings**.
2. Enter your **Twilio Account SID**, **Auth Token**, and **From** phone number.
3. Save. You’re ready to send!

**Where your data lives**
- **macOS**: `~/Library/Application Support/twilio-texting-app/`
- **Windows**: `%APPDATA%\twilio-texting-app\`
- **Linux**: `~/.config/twilio-texting-app/`

Files of note:
- `messages.db` — SQLite message history
- `config.json` — app settings (from electron-store)

---

## 📄 CSV Format (example)
```csv
phone,name
+15551112222,Ada Lovelace
+15553334444,Alan Turing
```

---

## 🧭 Usage
1. **Import contacts** (optional) or paste numbers.
2. Type a **message**; optionally add a **Media URL** for MMS.
3. Click **Send**.  
4. Check **History** to see what was sent (content, time, recipients).

---

## 🛠 Development

### Prereqs
- Node.js **20 LTS** (recommended)
- npm (comes with Node)

```bash
# clone & install
git clone https://github.com/<you>/twilio-texting-app.git
cd twilio-texting-app
npm install

# run in dev (with Forge)
npm run start:forge
```

### Build locally
```bash
# all platforms (runs Forge "make")
npm run make

# macOS ZIP only (handy if DMG deps cause local build noise)
npx electron-forge make --targets @electron-forge/maker-zip
```

---

## 🧰 Project Structure
- `main.js` — Electron main process (IPC, Twilio, SQLite)
- `preload.js` — secure bridge to renderer
- `renderer/` — UI build output
- `forge.config.js` — makers & packager config
- `.github/workflows/release.yml` — CI build & draft release

---

## 📦 Release (tag-based)
This repo builds installers only when you **push a tag** that starts with `v`.

```bash
# bump version in package.json (optional)
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

GitHub Actions will:
- Build installers on macOS, Windows, Linux
- Upload artifacts to a **draft GitHub Release**
- You can then add notes and **Publish** the release

> You can also run the workflow manually: **Actions → Build and Release → Run workflow**.

---

## 🐞 Troubleshooting
- **macOS “Cannot find module 'appdmg'”** → build ZIP locally, let CI do DMG.
- **Windows SmartScreen** → “More info → Run anyway” (unsigned build).
- **Linux executable not found** → ensure `packagerConfig.executableName = "twilio-texting-app"`.

---

## 🔐 Privacy
- Twilio credentials stored locally via `electron-store`.
- Message history stays on your machine.
- No telemetry.

---

## 🤝 Contributing
PRs welcome!  
- Keep code style consistent.  
- Test with `npm run make`.  
- For prerelease, tag like `v1.0.0-rc.1`.

---

## 📜 License
MIT 
