/**
 * Setup Script for Funil Spy Analytics System
 * Initializes database and creates initial configuration
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🚀 Setting up Funil Spy Analytics System...\n');

// Create database and tables
const dbPath = path.join(__dirname, 'analytics.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('📁 Creating database tables...');
    
    // Events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        properties TEXT,
        page_url TEXT,
        page_title TEXT,
        user_agent TEXT,
        screen_width INTEGER,
        screen_height INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Sessions table
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        src TEXT,
        sck TEXT,
        first_page TEXT,
        last_page TEXT,
        page_views INTEGER DEFAULT 0,
        session_duration INTEGER DEFAULT 0,
        device_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Conversions table
    db.run(`CREATE TABLE IF NOT EXISTS conversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        conversion_type TEXT NOT NULL,
        value REAL,
        order_bump BOOLEAN DEFAULT 0,
        special_offer BOOLEAN DEFAULT 0,
        customer_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES sessions(session_id)
    )`);

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_conversions_session_id ON conversions(session_id)`);
    
    console.log('✅ Database tables created successfully!');
    
    // Insert some sample data for testing
    console.log('🔧 Inserting sample data for testing...');
    
    const sampleSessionId = 'sample-session-123';
    
    db.run(`INSERT OR IGNORE INTO sessions (
        session_id, utm_source, utm_medium, utm_campaign, 
        first_page, device_type, page_views
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [sampleSessionId, 'facebook', 'cpc', 'whatsapp-spy', '/relatorio/', 'mobile', 5]);
    
    db.run(`INSERT OR IGNORE INTO events (
        session_id, event_name, properties, page_url
    ) VALUES (?, ?, ?, ?)`, 
    [sampleSessionId, 'page_view_report', '{"pageType":"report"}', '/relatorio/']);
    
    console.log('✅ Sample data inserted!');
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the analytics server: npm start');
    console.log('2. Open the dashboard: http://localhost:3001/dashboard.html');
    console.log('3. Start your funnel server: python -m http.server 8000');
    console.log('4. Visit your funnel pages to see analytics in action!');
    console.log('\n💡 The analytics system is now ready to track your mobile funnel performance.');
    
    db.close();
});