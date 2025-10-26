const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database connection
const dbPath = path.join(__dirname, 'dialer.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('✅ Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('✅ Users table ready');
      createDefaultUser();
    }
  });

  // Call logs table (optional - for future features)
  db.run(`
    CREATE TABLE IF NOT EXISTS call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      phone_number TEXT,
      duration INTEGER,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      sip_username TEXT,
      sip_password TEXT,
      sip_realm TEXT,
      openai_key TEXT,
      settings_json TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

// Create default admin user (username: admin, password: admin123)
function createDefaultUser() {
  const username = 'admin';
  const email = 'admin@dialer.local';
  const password = 'admin123';

  // Check if admin already exists
  db.get('SELECT id FROM users WHERE username = ?', [username], async (err, row) => {
    if (!row) {
      // Create admin user
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        (err) => {
          if (err) {
            console.error('Error creating default user:', err);
          } else {
            console.log('✅ Default admin user created (username: admin, password: admin123)');
          }
        }
      );
    }
  });
}

// User authentication functions
const userDB = {
  // Register new user
  register: async (username, email, password) => {
    return new Promise(async (resolve, reject) => {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword],
          function (err) {
            if (err) {
              if (err.message.includes('UNIQUE')) {
                reject(new Error('Username or email already exists'));
              } else {
                reject(err);
              }
            } else {
              resolve({ id: this.lastID, username, email });
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  },

  // Login user
  login: async (username, password) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, username],
        async (err, user) => {
          if (err) {
            reject(err);
          } else if (!user) {
            reject(new Error('Invalid username or password'));
          } else {
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid) {
              // Update last login
              db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
              resolve({
                id: user.id,
                username: user.username,
                email: user.email
              });
            } else {
              reject(new Error('Invalid username or password'));
            }
          }
        }
      );
    });
  },

  // Get user by ID
  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, username, email FROM users WHERE id = ?', [id], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
  },

  // Get user settings
  getUserSettings: (userId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM user_settings WHERE user_id = ?', [userId], (err, settings) => {
        if (err) reject(err);
        else resolve(settings);
      });
    });
  },

  // Save user settings
  saveUserSettings: (userId, settings) => {
    return new Promise((resolve, reject) => {
      const { sip_username, sip_password, sip_realm, openai_key, settings_json } = settings;
      db.run(
        `INSERT INTO user_settings (user_id, sip_username, sip_password, sip_realm, openai_key, settings_json)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           sip_username = ?,
           sip_password = ?,
           sip_realm = ?,
           openai_key = ?,
           settings_json = ?`,
        [userId, sip_username, sip_password, sip_realm, openai_key, settings_json,
          sip_username, sip_password, sip_realm, openai_key, settings_json],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
};

module.exports = { db, userDB };
