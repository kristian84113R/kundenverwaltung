/**
 * preload.js - Electron Preload Script
 * Exposes secure Electron APIs to the renderer process via contextBridge
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadCustomers: () => ipcRenderer.invoke('load-customers'),
    getCustomer: (id) => ipcRenderer.invoke('get-customer', id),
    saveCustomer: (data) => ipcRenderer.invoke('save-customer', data),
    deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),
    saveFile: (fileData) => ipcRenderer.invoke('save-file', fileData),
    openFile: (url) => ipcRenderer.invoke('open-file', url),
    // PDF Import
    selectPdfFiles: () => ipcRenderer.invoke('select-pdf-files'),
    parseInvoicePdf: (filePath) => ipcRenderer.invoke('parse-invoice-pdf', filePath),
    copyPdfToStorage: (data) => ipcRenderer.invoke('copy-pdf-to-storage', data),
});
