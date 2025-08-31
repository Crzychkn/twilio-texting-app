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
  getMessages: () => ipcRenderer.invoke('get-messages'),

  // Store a message in the database
  storeMessage: (content, recipientCount, status = 'sent', errorMessage = null) =>
    ipcRenderer.invoke('store-message', { content, recipientCount, status, errorMessage }),

  scheduleCreate: (payload) => ipcRenderer.invoke('twilio-schedule-create', payload),
  scheduleList:   (opts)    => ipcRenderer.invoke('twilio-schedule-list', opts || {}),
  scheduleCancel: (sid)     => ipcRenderer.invoke('twilio-schedule-cancel', { sid }),
});
