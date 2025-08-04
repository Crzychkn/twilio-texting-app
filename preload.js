const { contextBridge, ipcRenderer } = require('electron');

// Expose Twilio and SQLite-related functionality to the renderer process
contextBridge.exposeInMainWorld('twilioAPI', {
  // Send a message via Twilio
  sendMessage: (data) => ipcRenderer.invoke('send-message', data),

  // Get the Twilio settings
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // Save the Twilio settings
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Get the stored messages from the database
  getMessages: () => ipcRenderer.invoke('get-messages')
});
