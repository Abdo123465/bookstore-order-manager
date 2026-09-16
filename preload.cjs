const { contextBridge, ipcRenderer } = require('electron');

// Expose minimal API if needed, or just leave it for future use
contextBridge.exposeInMainWorld('electron', {
  db: {
    query: (sql, params) => ipcRenderer.invoke('db-query', { sql, params }),
    execute: (sql, params) => ipcRenderer.invoke('db-execute', { sql, params }),
    getOne: (sql, params) => ipcRenderer.invoke('db-get-one', { sql, params })
  },
  printReceipt: (html) => ipcRenderer.invoke('print-receipt', html)
});
