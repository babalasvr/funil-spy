/**
 * Simple File-Based Database for Quick Deployment
 * Alternative to SQLite3 when native compilation fails
 */

const fs = require('fs').promises;
const path = require('path');

class SimpleDB {
    constructor(dbPath = './simple-analytics.json') {
        this.dbPath = dbPath;
        this.data = {
            events: [],
            sessions: [],
            conversions: [],
            remarketing_users: [],
            remarketing_campaigns: []
        };
        this.init();
    }

    async init() {
        try {
            const data = await fs.readFile(this.dbPath, 'utf8');
            this.data = JSON.parse(data);
            console.log('✅ Database loaded from file');
        } catch (error) {
            console.log('📝 Creating new database file');
            await this.save();
        }
    }

    async save() {
        try {
            await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }

    // Insert methods
    async insertEvent(eventData) {
        const event = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            ...eventData
        };
        this.data.events.push(event);
        await this.save();
        return event;
    }

    async insertSession(sessionData) {
        const session = {
            id: Date.now() + Math.random(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...sessionData
        };
        this.data.sessions.push(session);
        await this.save();
        return session;
    }

    async insertConversion(conversionData) {
        const conversion = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            ...conversionData
        };
        this.data.conversions.push(conversion);
        await this.save();
        return conversion;
    }

    // Query methods
    async getEvents(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return this.data.events.filter(event => 
            new Date(event.timestamp) >= cutoff
        );
    }

    async getSessions(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return this.data.sessions.filter(session => 
            new Date(session.created_at) >= cutoff
        );
    }

    async getConversions(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return this.data.conversions.filter(conversion => 
            new Date(conversion.timestamp) >= cutoff
        );
    }

    // Analytics queries
    async getOverviewStats(days = 7) {
        const sessions = await this.getSessions(days);
        const conversions = await this.getConversions(days);
        const events = await this.getEvents(days);
        
        const totalRevenue = conversions.reduce((sum, conv) => sum + (conv.value || 0), 0);
        const conversionRate = sessions.length > 0 ? (conversions.length / sessions.length * 100) : 0;
        
        // Active users (last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeUsers = events.filter(event => 
            new Date(event.timestamp) >= fiveMinutesAgo
        ).length;

        return {
            totalSessions: sessions.length,
            totalConversions: conversions.length,
            totalRevenue: totalRevenue,
            conversionRate: conversionRate.toFixed(1),
            activeUsers: activeUsers
        };
    }

    async getFunnelData(days = 7) {
        const events = await this.getEvents(days);
        const conversions = await this.getConversions(days);
        
        const funnelSteps = [
            { step: 'Relatório', count: events.filter(e => e.event_name?.includes('page_view_report')).length },
            { step: 'Checkout', count: events.filter(e => e.event_name?.includes('page_view_checkout')).length },
            { step: 'Formulário', count: events.filter(e => e.event_name?.includes('form_started')).length },
            { step: 'QR Code', count: events.filter(e => e.event_name?.includes('qr_code_generated')).length },
            { step: 'Conversão', count: conversions.length }
        ];

        // Calculate conversion rates
        const reportCount = funnelSteps[0].count || 1;
        return funnelSteps.map(step => ({
            ...step,
            conversionRate: step.step === 'Relatório' ? 100 : 
                ((step.count / reportCount) * 100).toFixed(1)
        }));
    }

    // Update methods
    async updateSession(sessionId, updates) {
        const sessionIndex = this.data.sessions.findIndex(s => s.session_id === sessionId);
        if (sessionIndex !== -1) {
            this.data.sessions[sessionIndex] = {
                ...this.data.sessions[sessionIndex],
                ...updates,
                updated_at: new Date().toISOString()
            };
            await this.save();
        }
    }

    // Remarketing methods
    async insertRemarketingUser(userData) {
        const user = {
            id: Date.now() + Math.random(),
            created_at: new Date().toISOString(),
            ...userData
        };
        this.data.remarketing_users.push(user);
        await this.save();
        return user;
    }

    async getRemarketingUsers() {
        return this.data.remarketing_users;
    }
}

module.exports = SimpleDB;