const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const isDev = !app.isPackaged;

// Global DB connection
let db;

function reportStartupError(scope, error) {
  console.error(`${scope} failed:`, error);

  const message = error instanceof Error ? error.stack || error.message : String(error);
  dialog.showErrorBox('Bookstore Order Manager startup error', `${scope} failed.\n\n${message}`);
}

/**
 * DATABASE INITIALIZATION
 */
function initDatabase() {
  try {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'library.db');
  
  // Ensure the directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Performance optimization

  // Create Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      publisher_id TEXT,
      year_id TEXT,
      subject TEXT,
      quantity INTEGER,
      deposit REAL,
      payment_method_id TEXT,
      status TEXT,
      received_date TEXT,
      expected_delivery_date TEXT,
      created_at TEXT,
      employee_name TEXT,
      book_type TEXT,
      notes TEXT,
      items TEXT, -- JSON string for BookItem[]
      excess_deposit REAL DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS publishers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT
    );

    CREATE TABLE IF NOT EXISTS book_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      query TEXT
    );
  `);

  // Migration: Add excess_deposit to orders if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
    const hasExcessDeposit = tableInfo.some(col => col.name === 'excess_deposit');
    if (!hasExcessDeposit) {
      db.exec("ALTER TABLE orders ADD COLUMN excess_deposit REAL DEFAULT 0");
    }
  } catch (err) {
    console.error('Migration Error:', err);
  }

  // Migration: Add invoice_number to orders if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
    const hasInvoiceNumber = tableInfo.some(col => col.name === 'invoice_number');
    if (!hasInvoiceNumber) {
      db.exec("ALTER TABLE orders ADD COLUMN invoice_number TEXT");
    }
  } catch (err) {
    console.error('Migration Error:', err);
  }

  // Migration: Add sort_order to employees if it doesn't exist, then normalize numbering
  try {
    const employeeInfo = db.prepare("PRAGMA table_info(employees)").all();
    const hasSortOrder = employeeInfo.some(col => col.name === 'sort_order');
    if (!hasSortOrder) {
      db.exec("ALTER TABLE employees ADD COLUMN sort_order INTEGER");
    }

    const employees = db.prepare(`
      SELECT id
      FROM employees
      ORDER BY COALESCE(sort_order, 999999), rowid ASC
    `).all();

    const updateSortOrder = db.prepare('UPDATE employees SET sort_order = ? WHERE id = ?');
    const normalizeEmployees = db.transaction((rows) => {
      rows.forEach((row, index) => {
        updateSortOrder.run(index + 1, row.id);
      });
    });

    if (employees.length > 0) {
      normalizeEmployees(employees);
    }
  } catch (err) {
    console.error('Employees sort_order Migration Error:', err);
  }

  // Migration: Add notes and block fields to customers if they don't exist
  try {
    const customerInfo = db.prepare("PRAGMA table_info(customers)").all();
    if (!customerInfo.some(col => col.name === 'notes')) {
      db.exec("ALTER TABLE customers ADD COLUMN notes TEXT");
    }
    if (!customerInfo.some(col => col.name === 'is_blocked')) {
      db.exec("ALTER TABLE customers ADD COLUMN is_blocked INTEGER DEFAULT 0");
    }
    if (!customerInfo.some(col => col.name === 'block_reason')) {
      db.exec("ALTER TABLE customers ADD COLUMN block_reason TEXT");
    }
  } catch (err) {
    console.error('Customer Migration Error:', err);
  }

  // Setup IPC handlers
  ipcMain.handle('db-query', (event, { sql, params }) => {
    try {
      const stmt = db.prepare(sql);
      return stmt.all(params || []);
    } catch (err) {
      console.error('DB Query Error:', err);
      throw err;
    }
  });

  ipcMain.handle('db-execute', (event, { sql, params }) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(params || []);
      return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
    } catch (err) {
      console.error('DB Execute Error:', err);
      throw err;
    }
  });

  ipcMain.handle('db-get-one', (event, { sql, params }) => {
    try {
      const stmt = db.prepare(sql);
      return stmt.get(params || []);
    } catch (err) {
      console.error('DB Get One Error:', err);
      throw err;
    }
  });

  // Print Receipt Handler
  ipcMain.handle('print-receipt', async (event, html) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    return new Promise((resolve) => {
      printWin.webContents.print({
        silent: false,
        printBackground: true,
        color: false,
        margin: {
          marginType: 'none'
        }
      }, (success, failureReason) => {
        printWin.close();
        resolve({ success, failureReason });
      });
    });
  });
  } catch (error) {
    reportStartupError('Database initialization', error);
    throw error;
  }
}

/**
 * SINGLE INSTANCE RULE
 * Enforces that only one instance of the application runs at a time.
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If we couldn't get the lock, it means another instance is already running.
  app.whenReady().then(() => {
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'نظام إدارة المكتبة',
      message: 'البرنامج يعمل بالفعل',
      buttons: ['موافق'],
      defaultId: 0,
      noLink: true
    });
    app.quit();
  });
} else {
  // This is the first instance, handle second-instance attempts
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Set user data path to the local directory for portability in production
  if (!isDev) {
    const portablePath = path.join(path.dirname(app.getPath('exe')), 'database');
    app.setPath('userData', portablePath);
  }

  async function createWindow() {
    try {
      const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
          preload: path.join(__dirname, 'preload.cjs'),
          nodeIntegration: false,
          contextIsolation: true,
        },
        icon: path.join(__dirname, 'dist', 'favicon.ico')
      });

      if (isDev) {
        await win.loadURL('http://localhost:3000');
        win.webContents.openDevTools({ mode: 'detach' });
      } else {
        await win.loadFile(path.join(__dirname, 'dist', 'index.html'));
      }

      win.setMenu(null);
      return win;
    } catch (error) {
      reportStartupError('Window creation', error);
      throw error;
    }
  }

  app.whenReady().then(async () => {
    try {
      initDatabase();

      autoUpdater.on('checking-for-update', () => {
        dialog.showMessageBoxSync({ type: 'info', message: 'Checking for update...' });
      });
      autoUpdater.on('update-available', (info) => {
        dialog.showMessageBoxSync({ type: 'info', message: 'Update available: ' + info.version });
      });
      autoUpdater.on('update-not-available', () => {
        dialog.showMessageBoxSync({ type: 'info', message: 'Update not available.' });
      });
      autoUpdater.on('error', (err) => {
        dialog.showMessageBoxSync({ type: 'error', message: 'Error in auto-updater: ' + err });
      });
      autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBoxSync({
          type: 'info',
          title: 'تحديث متاح',
          message: 'تم تحميل نسخة جديدة. سيتم إعادة التشغيل الآن لتثبيتها.',
          buttons: ['تثبيت وإعادة التشغيل']
        });
        autoUpdater.quitAndInstall();
      });

      autoUpdater.checkForUpdatesAndNotify();

      await createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow().catch((error) => reportStartupError('Window recreation', error));
        }
      });
    } catch (error) {
      reportStartupError('Application startup', error);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
