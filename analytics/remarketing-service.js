/**
 * Funil Spy Remarketing Service
 * Advanced remarketing system with progressive discount campaigns
 */

const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const EmailTemplates = require('./email-templates');

class RemarketingService {
    constructor(dbPath = './analytics.db') {
        this.db = new sqlite3.Database(dbPath);
        this.initializeTables();
        this.setupEmailTransporter();
    }

    initializeTables() {
        this.db.serialize(() => {
            // Remarketing audiences table
            this.db.run(`CREATE TABLE IF NOT EXISTS remarketing_audiences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL,
                session_id TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                first_name TEXT,
                last_name TEXT,
                last_page_visited TEXT,
                funnel_step TEXT,
                abandonment_timestamp DATETIME,
                total_visits INTEGER DEFAULT 1,
                total_time_spent INTEGER DEFAULT 0,
                highest_intent_score INTEGER DEFAULT 0,
                utm_source TEXT,
                utm_medium TEXT,
                utm_campaign TEXT,
                device_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Remarketing campaigns table
            this.db.run(`CREATE TABLE IF NOT EXISTS remarketing_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                campaign_type TEXT NOT NULL, -- email, whatsapp, facebook, google
                trigger_event TEXT NOT NULL, -- abandonment, exit_intent, time_based
                discount_percentage INTEGER DEFAULT 0,
                offer_text TEXT,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                opened_at DATETIME,
                clicked_at DATETIME,
                converted_at DATETIME,
                conversion_value DECIMAL(10,2),
                status TEXT DEFAULT 'sent' -- sent, opened, clicked, converted, failed
            )`);

            // Remarketing sequences table
            this.db.run(`CREATE TABLE IF NOT EXISTS remarketing_sequences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                trigger_conditions TEXT, -- JSON conditions
                sequence_steps TEXT, -- JSON array of steps
                active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // User behavior scoring
            this.db.run(`CREATE TABLE IF NOT EXISTS user_behavior_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                score_points INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }

    setupEmailTransporter() {
        // Configure your email service here
        this.emailTransporter = nodemailer.createTransport({
            service: 'gmail', // or your preferred email service
            auth: {
                user: process.env.EMAIL_USER || 'your-email@gmail.com',
                pass: process.env.EMAIL_PASS || 'your-app-password'
            }
        });
    }

    // Calculate user intent score based on behavior
    calculateIntentScore(behaviors) {
        let score = 0;
        
        // Scoring matrix
        const scoreMap = {
            'page_view_report': 10,
            'scroll_50_percent': 15,
            'scroll_75_percent': 20,
            'form_started': 30,
            'form_field_completed': 25,
            'qr_code_generated': 40,
            'timer_viewed': 20,
            'checkout_button_clicked': 45,
            'order_bump_clicked': 35,
            'exit_intent_triggered': 50
        };

        behaviors.forEach(behavior => {
            score += scoreMap[behavior.event_type] || 5;
            
            // Time-based multiplier
            const hoursSinceEvent = (Date.now() - new Date(behavior.timestamp)) / (1000 * 60 * 60);
            if (hoursSinceEvent < 1) score *= 1.5; // Recent activity is more valuable
            else if (hoursSinceEvent < 24) score *= 1.2;
        });

        return Math.min(score, 100); // Cap at 100
    }

    // Track user for remarketing
    async trackUserForRemarketing(userData) {
        const {
            sessionId,
            userId,
            email,
            phone,
            firstName,
            lastName,
            lastPageVisited,
            funnelStep,
            utmParams = {},
            deviceType
        } = userData;

        return new Promise((resolve, reject) => {
            // Get user's behavior history
            this.db.all(
                'SELECT * FROM events WHERE session_id = ? ORDER BY timestamp DESC',
                [sessionId],
                (err, behaviors) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const intentScore = this.calculateIntentScore(behaviors);
                    const timeSpent = this.calculateTimeSpent(behaviors);

                    // Insert or update user in remarketing audience
                    const stmt = this.db.prepare(`INSERT OR REPLACE INTO remarketing_audiences (
                        user_id, session_id, email, phone, first_name, last_name,
                        last_page_visited, funnel_step, abandonment_timestamp,
                        total_visits, total_time_spent, highest_intent_score,
                        utm_source, utm_medium, utm_campaign, device_type,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 
                              COALESCE((SELECT total_visits FROM remarketing_audiences WHERE user_id = ?) + 1, 1),
                              ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`);

                    stmt.run([
                        userId, sessionId, email, phone, firstName, lastName,
                        lastPageVisited, funnelStep,
                        userId, // for the subquery
                        timeSpent, intentScore,
                        utmParams.utm_source, utmParams.utm_medium, utmParams.utm_campaign,
                        deviceType
                    ], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ audienceId: this.lastID, intentScore });
                        }
                    });
                }
            );
        });
    }

    calculateTimeSpent(behaviors) {
        if (behaviors.length < 2) return 0;
        
        const firstEvent = new Date(behaviors[behaviors.length - 1].timestamp);
        const lastEvent = new Date(behaviors[0].timestamp);
        
        return Math.floor((lastEvent - firstEvent) / 1000); // seconds
    }

    // Progressive discount campaign logic
    getProgressiveDiscount(userId, attemptNumber = 1) {
        const discountProgression = [
            { attempt: 1, discount: 20, delay: 15 }, // 15 minutes after abandonment
            { attempt: 2, discount: 40, delay: 120 }, // 2 hours
            { attempt: 3, discount: 50, delay: 1440 }, // 24 hours
            { attempt: 4, discount: 70, delay: 4320 } // 72 hours
        ];

        return discountProgression.find(d => d.attempt === attemptNumber) || 
               discountProgression[discountProgression.length - 1];
    }

    // Email remarketing campaign
    async sendEmailCampaign(userId, campaignType = 'abandonment') {
        return new Promise((resolve, reject) => {
            // Get user data
            this.db.get(
                'SELECT * FROM remarketing_audiences WHERE user_id = ?',
                [userId],
                async (err, user) => {
                    if (err || !user || !user.email) {
                        reject(err || new Error('User not found or no email'));
                        return;
                    }

                    // Count previous email campaigns
                    this.db.get(
                        'SELECT COUNT(*) as count FROM remarketing_campaigns WHERE user_id = ? AND campaign_type = "email"',
                        [userId],
                        async (err, result) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            const attemptNumber = (result.count || 0) + 1;
                            const discount = this.getProgressiveDiscount(userId, attemptNumber);

                            try {
                                const emailContent = await this.generateEmailContent(user, discount);

                                await this.emailTransporter.sendMail({
                                    from: process.env.EMAIL_FROM || 'noreply@funilspy.com',
                                    to: user.email,
                                    subject: emailContent.subject,
                                    html: emailContent.html
                                });

                                // Record campaign
                                this.recordCampaign(userId, 'email', 'abandonment', discount.discount, emailContent.subject);
                                resolve({ sent: true, discount: discount.discount, step: attemptNumber });
                            } catch (error) {
                                reject(error);
                            }
                        }
                    );
                }
            );
        });
    }

    generateEmailContent(user, discount) {
        // Count previous campaigns to determine which template to use
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT COUNT(*) as count FROM remarketing_campaigns WHERE user_id = ? AND campaign_type = "email"',
                [user.user_id],
                (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    const step = (result.count || 0) + 1;
                    const template = EmailTemplates.getTemplateByStep(step, user, discount);
                    resolve(template);
                }
            );
        });
    }

    recordCampaign(userId, campaignType, triggerEvent, discountPercentage, offerText) {
        const stmt = this.db.prepare(`INSERT INTO remarketing_campaigns (
            user_id, campaign_type, trigger_event, discount_percentage, offer_text
        ) VALUES (?, ?, ?, ?, ?)`);

        stmt.run([userId, campaignType, triggerEvent, discountPercentage, offerText]);
    }

    // WhatsApp remarketing (webhook integration)
    async sendWhatsAppCampaign(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM remarketing_audiences WHERE user_id = ?',
                [userId],
                async (err, user) => {
                    if (err || !user || !user.phone) {
                        reject(err || new Error('User not found or no phone'));
                        return;
                    }

                    const discount = this.getProgressiveDiscount(userId, 2); // WhatsApp is usually 2nd attempt
                    const whatsAppMessage = EmailTemplates.getWhatsAppTemplate(user, discount);

                    // Integration with WhatsApp Business API would go here
                    // For now, we'll just record the intent and log the message
                    this.recordCampaign(userId, 'whatsapp', 'time_based', discount.discount, 
                        `WhatsApp follow-up with ${discount.discount}% discount`);

                    console.log(`📱 WhatsApp campaign for ${user.phone}:`);
                    console.log(whatsAppMessage);
                    console.log('---');
                    
                    resolve({ sent: true, discount: discount.discount, message: whatsAppMessage });
                }
            );
        });
    }

    // Get remarketing stats
    async getRemarketingStats(days = 7) {
        return new Promise((resolve, reject) => {
            const queries = {
                totalAudience: `SELECT COUNT(*) as count FROM remarketing_audiences WHERE created_at >= datetime('now', '-${days} days')`,
                emailsSent: `SELECT COUNT(*) as count FROM remarketing_campaigns WHERE campaign_type = 'email' AND sent_at >= datetime('now', '-${days} days')`,
                conversions: `SELECT COUNT(*) as count FROM remarketing_campaigns WHERE converted_at IS NOT NULL AND sent_at >= datetime('now', '-${days} days')`,
                revenue: `SELECT SUM(conversion_value) as total FROM remarketing_campaigns WHERE converted_at IS NOT NULL AND sent_at >= datetime('now', '-${days} days')`
            };

            const results = {};
            let completed = 0;

            Object.keys(queries).forEach(key => {
                this.db.get(queries[key], (err, row) => {
                    if (!err) {
                        results[key] = row ? (row.count || row.total || 0) : 0;
                    }
                    completed++;
                    
                    if (completed === Object.keys(queries).length) {
                        // Calculate conversion rate
                        results.conversionRate = results.emailsSent > 0 ? 
                            ((results.conversions / results.emailsSent) * 100).toFixed(2) : 0;
                        
                        resolve(results);
                    }
                });
            });
        });
    }

    // Auto-trigger remarketing campaigns
    async processRemarketingQueue() {
        console.log('🎯 Processing remarketing queue...');

        // Get users who abandoned but haven't received recent campaigns
        const query = `
            SELECT ra.*, 
                   COALESCE(rc.last_campaign, '1970-01-01') as last_campaign_date,
                   COALESCE(rc.campaign_count, 0) as campaign_count
            FROM remarketing_audiences ra
            LEFT JOIN (
                SELECT user_id, MAX(sent_at) as last_campaign, COUNT(*) as campaign_count
                FROM remarketing_campaigns 
                GROUP BY user_id
            ) rc ON ra.user_id = rc.user_id
            WHERE ra.abandonment_timestamp IS NOT NULL
            AND ra.email IS NOT NULL
            AND datetime(ra.abandonment_timestamp) >= datetime('now', '-7 days')
            AND (rc.last_campaign IS NULL OR datetime(rc.last_campaign) <= datetime('now', '-2 hours'))
            ORDER BY ra.highest_intent_score DESC, ra.abandonment_timestamp ASC
            LIMIT 50
        `;

        this.db.all(query, async (err, users) => {
            if (err) {
                console.error('Error fetching remarketing queue:', err);
                return;
            }

            console.log(`📧 Found ${users.length} users for remarketing`);

            for (const user of users) {
                try {
                    const hoursSinceAbandonment = 
                        (Date.now() - new Date(user.abandonment_timestamp)) / (1000 * 60 * 60);
                    
                    // Determine which campaign to send based on time and previous campaigns
                    if (user.campaign_count === 0 && hoursSinceAbandonment >= 0.25) { // 15 minutes
                        await this.sendEmailCampaign(user.user_id);
                        console.log(`✅ Sent first email to ${user.email}`);
                    } else if (user.campaign_count === 1 && hoursSinceAbandonment >= 2) { // 2 hours
                        await this.sendWhatsAppCampaign(user.user_id);
                        console.log(`✅ Sent WhatsApp follow-up to ${user.phone}`);
                    }
                    
                    // Small delay to avoid overwhelming email service
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`Error sending campaign to ${user.email}:`, error);
                }
            }
        });
    }

    // Start automatic processing
    startAutomaticProcessing() {
        console.log('🚀 Starting automatic remarketing processing...');
        
        // Process queue every 5 minutes
        setInterval(() => {
            this.processRemarketingQueue();
        }, 5 * 60 * 1000);

        // Initial processing
        setTimeout(() => {
            this.processRemarketingQueue();
        }, 5000);
    }
}

module.exports = RemarketingService;