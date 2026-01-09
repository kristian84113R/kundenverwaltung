/**
 * main-electron.js - Electron Main Process
 * Handles window creation, IPC communication, and file system operations
 */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Define paths for data storage
const DATA_FILE = path.join(app.getPath('userData'), 'customers.json');
const FILES_DIR = path.join(app.getPath('userData'), 'customer_files');

// Ensure files directory exists
if (!fs.existsSync(FILES_DIR)) {
    fs.mkdirSync(FILES_DIR, { recursive: true });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true, // Hide menu bar for cleaner look
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false, // Security best practice
        },
    });

    // Remove menu bar completely
    win.setMenu(null);

    win.loadFile('index.html');
    // win.webContents.openDevTools(); // Uncomment for debugging
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- IPC Handlers (The "Bridge" Logic) ---

// 1. Load Customers
ipcMain.handle('load-customers', async () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return []; // No data yet
        }
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading customers:', error);
        return [];
    }
});

// 2. Save Customer (Add or Update)
ipcMain.handle('save-customer', async (event, customerData) => {
    try {
        let customers = [];
        if (fs.existsSync(DATA_FILE)) {
            customers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        }

        const existingIndex = customers.findIndex((c) => c.id === customerData.id);

        if (existingIndex >= 0) {
            // Update existing
            customers[existingIndex] = { ...customers[existingIndex], ...customerData };
        } else {
            // Add new
            customers.push(customerData);
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(customers, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Error saving customer:', error);
        return { success: false, error: error.message };
    }
});

// 3. Delete Customer
ipcMain.handle('delete-customer', async (event, customerId) => {
    try {
        if (!fs.existsSync(DATA_FILE)) return { success: false, error: 'No data file' };

        let customers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        const newCustomers = customers.filter(c => c.id !== customerId);

        fs.writeFileSync(DATA_FILE, JSON.stringify(newCustomers, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Error deleting customer:', error);
        return { success: false, error: error.message };
    }
});

// 4. Save File (Photo or PDF)
ipcMain.handle('save-file', async (event, { name, buffer }) => {
    try {
        // Create a unique filename
        const timestamp = Date.now();
        const safeName = name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const fileName = `${timestamp}_${safeName}`;
        const filePath = path.join(FILES_DIR, fileName);

        // Write file to disk
        fs.writeFileSync(filePath, Buffer.from(buffer));

        // Return the absolute path to be stored in the JSON
        // Note: In production, we might want to store relative paths or use a custom protocol
        // But for a simple local app, absolute path or file:// URL works
        return `file://${filePath.replace(/\\/g, '/')}`;
    } catch (error) {
        console.error('Error saving file:', error);
        throw error;
    }
});

// 5. Get Customer (Single)
ipcMain.handle('get-customer', async (event, id) => {
    try {
        if (!fs.existsSync(DATA_FILE)) return null;
        const customers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        return customers.find(c => c.id === id) || null;
    } catch (error) {
        return null;
    }
});

// 6. Open File (Native)
ipcMain.handle('open-file', async (event, fileUrl) => {
    try {
        // Strip file:// protocol if present to get raw path
        let filePath = fileUrl;
        if (filePath.startsWith('file://')) {
            filePath = filePath.slice(7);
        }
        // Decode URI components (e.g. %20 -> space)
        filePath = decodeURIComponent(filePath);

        // shell.openPath returns a Promise<string>. The string is the error message, or empty if success.
        const errorMessage = await shell.openPath(filePath);

        if (errorMessage) {
            console.error('shell.openPath error:', errorMessage);
            return { success: false, error: errorMessage };
        }

        return { success: true };
    } catch (error) {
        console.error('Error opening file:', error);
        return { success: false, error: error.message };
    }
});

// 7. Select PDF Files (for invoice import)
ipcMain.handle('select-pdf-files', async () => {
    try {
        const result = await dialog.showOpenDialog({
            title: 'Rechnungen auswählen',
            filters: [{ name: 'PDF Dateien', extensions: ['pdf'] }],
            properties: ['openFile', 'multiSelections']
        });

        if (result.canceled) {
            return { success: true, files: [] };
        }

        return { success: true, files: result.filePaths };
    } catch (error) {
        console.error('Error selecting PDF files:', error);
        return { success: false, error: error.message };
    }
});

// 8. Parse Invoice PDF (extract customer data from invoice)
// Using CLI because pdf-parse ESM doesn't work well in Electron's CommonJS context
ipcMain.handle('parse-invoice-pdf', async (event, filePath) => {
    try {
        const { execSync } = require('child_process');

        // Use npx pdf-parse CLI which works reliably
        const text = execSync(`npx pdf-parse text "${filePath}"`, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large PDFs
            timeout: 30000 // 30 second timeout
        });

        // Parse customer data from the recipient block
        const customerData = parseCustomerFromInvoice(text);

        // Parse job data (invoice number, date, price)
        const jobData = parseJobFromInvoice(text);

        return {
            success: true,
            customer: customerData,
            job: jobData,
            rawText: text,
            fileName: path.basename(filePath),
            filePath: filePath
        };
    } catch (error) {
        console.error('Error parsing invoice PDF:', error);
        return { success: false, error: error.message };
    }
});

// 9. Copy PDF to customer files storage
ipcMain.handle('copy-pdf-to-storage', async (event, { sourcePath, fileName }) => {
    try {
        // Create a unique filename
        const timestamp = Date.now();
        const safeName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const destFileName = `${timestamp}_${safeName}`;
        const destPath = path.join(FILES_DIR, destFileName);

        // Copy file
        fs.copyFileSync(sourcePath, destPath);

        // Return file URL
        return {
            success: true,
            url: `file://${destPath.replace(/\\/g, '/')}`,
            name: fileName
        };
    } catch (error) {
        console.error('Error copying PDF to storage:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Parse customer data from invoice text
 * 
 * ACTUAL PDF structure from sample:
 * 1. SENDER: KD Garten, address, Tel, Email, IBAN, Steuernummer
 * 2. INVOICE BODY: "Sehr geehrte...", line items, Zwischensumme, MwSt, Gesamtbetrag
 * 3. RECIPIENT (customer): Company, Street, PLZ City, Ansprechpartner
 * 4. FOOTER: KD Garten (sender info repeated), "Rechnung Nr:", etc.
 * 
 * Strategy: Find recipient block AFTER "Gesamtbetrag" and BEFORE footer "KD Garten"
 */
function parseCustomerFromInvoice(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let name = '';
    let location = '';
    let phone = '';
    let email = '';

    // Find "Gesamtbetrag" - recipient block starts after this
    let gesamtbetragIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Gesamtbetrag')) {
            gesamtbetragIndex = i;
            break;
        }
    }

    if (gesamtbetragIndex < 0) {
        // Fallback: Try after MwSt
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('MwSt')) {
                gesamtbetragIndex = i;
                break;
            }
        }
    }

    // Find where recipient block ends (at footer "KD Garten" or "Rechnung Nr")
    let recipientEndIndex = lines.length;
    for (let i = gesamtbetragIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('KD Garten') ||
            line.includes('Inh.:') ||
            line.includes('Rechnung Nr') ||
            line.includes('Rechnung\n')) {
            recipientEndIndex = i;
            break;
        }
    }

    // Extract recipient lines
    let recipientLines = [];
    let ansprechpartner = '';

    for (let i = gesamtbetragIndex + 1; i < recipientEndIndex; i++) {
        const line = lines[i];

        // Skip price/euro lines that might bleed over
        if (line.match(/^\d+[\.,]?\d*\s*€/) || line.match(/^€/)) {
            continue;
        }

        // Extract customer phone
        if (line.match(/^(Tel|Telefon|Mobil)[:.]?\s*/i)) {
            phone = line.replace(/^(Tel|Telefon|Mobil)[:.]?\s*/i, '').trim();
            continue;
        }

        // Extract customer email
        if (line.match(/^(E-?Mail)[:.]?\s*/i)) {
            email = line.replace(/^(E-?Mail)[:.]?\s*/i, '').trim();
            continue;
        }

        // Extract Ansprechpartner
        if (line.match(/^Ansprechpartner[:.]?\s*/i)) {
            ansprechpartner = line.replace(/^Ansprechpartner[:.]?\s*/i, '').trim();
            continue;
        }

        // Collect address lines (max 4)
        if (recipientLines.length < 4) {
            recipientLines.push(line);
        }

        // PLZ pattern marks end of core address
        if (line.match(/^\d{5}\s+\w+/)) {
            // Don't break - still need to check for Ansprechpartner after
        }
    }

    // Parse collected lines
    if (recipientLines.length >= 1) {
        name = recipientLines[0];
    }

    // Combine remaining as location
    const locationParts = recipientLines.slice(1);
    location = locationParts.join(', ');

    // Add Ansprechpartner to name
    if (ansprechpartner) {
        name = `${name} (${ansprechpartner})`;
    }

    return {
        name: name || '',
        location: location || '',
        phone: phone || '',
        email: email || ''
    };
}

/**
 * Parse job data from invoice text
 * Extracts: invoice number, date, total price, and line item descriptions
 */
function parseJobFromInvoice(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let invoiceNumber = '';
    let invoiceDate = '';
    let totalPrice = null;
    let lineItems = [];
    let inLineItems = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Extract invoice number: "Rechnung Nr.:260109-01" or similar
        const invoiceMatch = line.match(/Rechnung\s*Nr\.?:?\s*([^\s]+)/i);
        if (invoiceMatch) {
            invoiceNumber = invoiceMatch[1];
        }

        // Extract date: "Datum:09.01.2026" or similar
        const dateMatch = line.match(/Datum:?\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);
        if (dateMatch) {
            const parts = dateMatch[1].split('.');
            if (parts.length === 3) {
                invoiceDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }

        // Extract total price: "Gesamtbetrag 15255,80 €" or similar
        const priceMatch = line.match(/Gesamtbetrag\s*([\d.,]+)\s*€/i);
        if (priceMatch) {
            const priceStr = priceMatch[1].replace(/\./g, '').replace(',', '.');
            totalPrice = parseFloat(priceStr);
        }

        // Line items start after "Pos Bezeichnung"
        if (line.includes('Pos Bezeichnung') || (line.includes('Pos.') && line.includes('Bezeichnung'))) {
            inLineItems = true;
            continue;
        }

        // Line items end at Zwischensumme or totals
        if (inLineItems && (line.includes('Zwischensumme') || line.includes('MwSt') || line.includes('Gesamtbetrag'))) {
            inLineItems = false;
            continue;
        }

        // Collect line item descriptions
        if (inLineItems) {
            if (line.match(/^\d+\.$/)) continue;
            if (line.match(/^Ca\.\s+\d+/)) continue;
            if (line.match(/^\d+[\.,]\d+\s*€/)) continue;
            if (line.match(/^[\d.,]+\s*€$/)) continue;
            if (line.length > 2) {
                lineItems.push(line);
            }
        }
    }

    // Create description from line items or invoice number
    let description = '';
    if (lineItems.length > 0) {
        description = lineItems.join('\n');
    } else if (invoiceNumber) {
        description = 'Rechnung ' + invoiceNumber;
    } else {
        description = 'Importierte Rechnung';
    }

    return {
        invoiceNumber: invoiceNumber || '',
        date: invoiceDate || '',
        price: totalPrice,
        description: description
    };
}
