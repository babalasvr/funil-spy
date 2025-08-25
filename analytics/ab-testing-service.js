/**
 * A/B Testing Service for Remarketing Campaigns
 * Manages campaign variants and statistical analysis
 */

const sqlite3 = require('sqlite3').verbose();

class ABTestingService {
    constructor(dbPath = './analytics.db') {
        this.db = new sqlite3.Database(dbPath);
        this.initializeTables();
    }

    initializeTables() {
        this.db.serialize(() => {
            // A/B Test experiments table
            this.db.run(`CREATE TABLE IF NOT EXISTS ab_experiments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                campaign_type TEXT NOT NULL, -- email, whatsapp, social
                status TEXT DEFAULT 'draft', -- draft, running, paused, completed
                start_date DATETIME,
                end_date DATETIME,
                target_audience TEXT, -- JSON conditions
                confidence_level REAL DEFAULT 95.0,
                minimum_sample_size INTEGER DEFAULT 100,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Test variants table
            this.db.run(`CREATE TABLE IF NOT EXISTS ab_variants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                experiment_id INTEGER NOT NULL,
                variant_name TEXT NOT NULL,
                variant_type TEXT NOT NULL, -- control, variant_a, variant_b, etc.
                traffic_split REAL NOT NULL, -- percentage 0-100
                template_data TEXT, -- JSON template configuration
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (experiment_id) REFERENCES ab_experiments (id)
            )`);

            // Test results table
            this.db.run(`CREATE TABLE IF NOT EXISTS ab_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                experiment_id INTEGER NOT NULL,
                variant_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                event_type TEXT NOT NULL, -- impression, click, conversion
                event_value REAL DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (experiment_id) REFERENCES ab_experiments (id),
                FOREIGN KEY (variant_id) REFERENCES ab_variants (id)
            )`);
        });

        console.log('🧪 A/B Testing Service initialized');
    }

    // Create new A/B test experiment
    async createExperiment(experimentData) {
        const { name, description, campaignType, targetAudience, variants } = experimentData;
        
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                // Insert experiment
                const stmt = this.db.prepare(`INSERT INTO ab_experiments (
                    name, description, campaign_type, target_audience
                ) VALUES (?, ?, ?, ?)`);
                
                stmt.run([name, description, campaignType, JSON.stringify(targetAudience)], function(err) {
                    if (err) {
                        this.db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    const experimentId = this.lastID;
                    
                    // Insert variants
                    const variantStmt = this.db.prepare(`INSERT INTO ab_variants (
                        experiment_id, variant_name, variant_type, traffic_split, template_data
                    ) VALUES (?, ?, ?, ?, ?)`);
                    
                    let variantsProcessed = 0;
                    variants.forEach(variant => {
                        variantStmt.run([
                            experimentId,
                            variant.name,
                            variant.type,
                            variant.trafficSplit,
                            JSON.stringify(variant.templateData)
                        ], (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            variantsProcessed++;
                            if (variantsProcessed === variants.length) {
                                this.db.run('COMMIT');
                                resolve({ experimentId, message: 'Experiment created successfully' });
                            }
                        });
                    });
                });
            });
        });
    }

    // Assign user to test variant
    async assignUserToVariant(experimentId, userId) {
        return new Promise((resolve, reject) => {
            // Get experiment variants
            this.db.all(
                'SELECT * FROM ab_variants WHERE experiment_id = ? ORDER BY id',
                [experimentId],
                (err, variants) => {
                    if (err || !variants.length) {
                        reject(err || new Error('No variants found'));
                        return;
                    }
                    
                    // Deterministic assignment based on user ID hash
                    const hash = this.hashUserId(userId);
                    const random = hash % 100;
                    
                    let cumulativeWeight = 0;
                    let selectedVariant = null;
                    
                    for (const variant of variants) {
                        cumulativeWeight += variant.traffic_split;
                        if (random < cumulativeWeight) {
                            selectedVariant = variant;
                            break;
                        }
                    }
                    
                    if (!selectedVariant) {
                        selectedVariant = variants[variants.length - 1]; // Fallback
                    }
                    
                    resolve(selectedVariant);
                }
            );
        });
    }

    // Hash user ID for consistent variant assignment
    hashUserId(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Track A/B test event
    async trackEvent(experimentId, variantId, userId, eventType, eventValue = 0) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`INSERT INTO ab_results (
                experiment_id, variant_id, user_id, event_type, event_value
            ) VALUES (?, ?, ?, ?, ?)`);
            
            stmt.run([experimentId, variantId, userId, eventType, eventValue], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ resultId: this.lastID });
                }
            });
        });
    }

    // Get experiment results with statistical analysis
    async getExperimentResults(experimentId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    v.id as variant_id,
                    v.variant_name,
                    v.variant_type,
                    v.traffic_split,
                    COUNT(CASE WHEN r.event_type = 'impression' THEN 1 END) as impressions,
                    COUNT(CASE WHEN r.event_type = 'click' THEN 1 END) as clicks,
                    COUNT(CASE WHEN r.event_type = 'conversion' THEN 1 END) as conversions,
                    SUM(CASE WHEN r.event_type = 'conversion' THEN r.event_value ELSE 0 END) as revenue,
                    COUNT(DISTINCT r.user_id) as unique_users
                FROM ab_variants v
                LEFT JOIN ab_results r ON v.id = r.variant_id
                WHERE v.experiment_id = ?
                GROUP BY v.id, v.variant_name, v.variant_type, v.traffic_split
                ORDER BY v.id
            `;
            
            this.db.all(query, [experimentId], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Calculate conversion rates and statistical significance
                const results = rows.map(row => {
                    const conversionRate = row.impressions > 0 ? (row.conversions / row.impressions) * 100 : 0;
                    const clickRate = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
                    const avgRevenue = row.conversions > 0 ? row.revenue / row.conversions : 0;
                    
                    return {
                        ...row,
                        conversionRate: parseFloat(conversionRate.toFixed(2)),
                        clickRate: parseFloat(clickRate.toFixed(2)),
                        avgRevenue: parseFloat(avgRevenue.toFixed(2))
                    };
                });
                
                // Calculate statistical significance
                const analysisResults = this.calculateStatisticalSignificance(results);
                
                resolve({
                    variants: results,
                    analysis: analysisResults,
                    summary: this.generateSummary(results, analysisResults)
                });
            });
        });
    }

    // Calculate statistical significance using Z-test
    calculateStatisticalSignificance(variants) {
        if (variants.length < 2) return { significant: false, message: 'Need at least 2 variants' };
        
        const control = variants.find(v => v.variant_type === 'control') || variants[0];
        const testVariants = variants.filter(v => v.variant_id !== control.variant_id);
        
        const results = testVariants.map(variant => {
            const pControl = control.conversions / control.impressions;
            const pVariant = variant.conversions / variant.impressions;
            
            if (!pControl || !pVariant || control.impressions < 30 || variant.impressions < 30) {
                return {
                    variantId: variant.variant_id,
                    variantName: variant.variant_name,
                    significant: false,
                    confidence: 0,
                    improvement: 0,
                    message: 'Insufficient sample size'
                };
            }
            
            // Calculate Z-score
            const pPooled = (control.conversions + variant.conversions) / (control.impressions + variant.impressions);
            const sePooled = Math.sqrt(pPooled * (1 - pPooled) * (1/control.impressions + 1/variant.impressions));
            const zScore = (pVariant - pControl) / sePooled;
            
            // Calculate confidence level (two-tailed test)
            const confidence = (1 - 2 * (1 - this.cumulativeNormalDistribution(Math.abs(zScore)))) * 100;
            const improvement = ((pVariant - pControl) / pControl) * 100;
            
            return {
                variantId: variant.variant_id,
                variantName: variant.variant_name,
                significant: confidence > 95,
                confidence: parseFloat(confidence.toFixed(1)),
                improvement: parseFloat(improvement.toFixed(1)),
                zScore: parseFloat(zScore.toFixed(2)),
                message: confidence > 95 ? 
                    (improvement > 0 ? 'Statistically significant improvement' : 'Statistically significant decrease') :
                    'Not statistically significant'
            };
        });
        
        return results;
    }

    // Cumulative normal distribution function
    cumulativeNormalDistribution(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    // Error function approximation
    erf(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    }

    // Generate experiment summary
    generateSummary(variants, analysis) {
        const control = variants.find(v => v.variant_type === 'control') || variants[0];
        const bestVariant = variants.reduce((best, current) => 
            current.conversionRate > best.conversionRate ? current : best
        );
        
        const totalImpressions = variants.reduce((sum, v) => sum + v.impressions, 0);
        const totalConversions = variants.reduce((sum, v) => sum + v.conversions, 0);
        const totalRevenue = variants.reduce((sum, v) => sum + v.revenue, 0);
        
        let recommendation = 'Continue testing';
        const significantResults = analysis.filter(a => a.significant);
        
        if (significantResults.length > 0) {
            const bestSignificant = significantResults.reduce((best, current) => 
                current.improvement > best.improvement ? current : best
            );
            recommendation = `Implement ${bestSignificant.variantName} (${bestSignificant.improvement}% improvement)`;
        }
        
        return {
            totalImpressions,
            totalConversions,
            totalRevenue,
            overallConversionRate: totalImpressions > 0 ? (totalConversions / totalImpressions * 100).toFixed(2) : 0,
            bestVariant: bestVariant.variant_name,
            bestConversionRate: bestVariant.conversionRate,
            recommendation,
            testDuration: this.calculateTestDuration(),
            status: significantResults.length > 0 ? 'conclusive' : 'needs_more_data'
        };
    }

    calculateTestDuration() {
        // Simplified duration calculation
        return '7 days'; // This would be calculated based on actual start/end dates
    }

    // Start experiment
    async startExperiment(experimentId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE ab_experiments 
                SET status = 'running', start_date = CURRENT_TIMESTAMP 
                WHERE id = ?
            `);
            
            stmt.run([experimentId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ message: 'Experiment started successfully' });
                }
            });
        });
    }

    // Stop experiment
    async stopExperiment(experimentId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                UPDATE ab_experiments 
                SET status = 'completed', end_date = CURRENT_TIMESTAMP 
                WHERE id = ?
            `);
            
            stmt.run([experimentId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ message: 'Experiment stopped successfully' });
                }
            });
        });
    }

    // Get all experiments
    async getAllExperiments() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    e.*,
                    COUNT(v.id) as variant_count,
                    COUNT(r.id) as total_events
                FROM ab_experiments e
                LEFT JOIN ab_variants v ON e.id = v.experiment_id
                LEFT JOIN ab_results r ON e.id = r.experiment_id
                GROUP BY e.id
                ORDER BY e.created_at DESC
            `;
            
            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Predefined experiment templates
    getEmailTestTemplates() {
        return {
            subjectLineTest: {
                name: 'Subject Line A/B Test',
                description: 'Test different email subject lines',
                variants: [
                    {
                        name: 'Control - Direct',
                        type: 'control',
                        trafficSplit: 50,
                        templateData: {
                            subject: 'Você esqueceu algo importante! 🔍',
                            style: 'direct'
                        }
                    },
                    {
                        name: 'Urgent - Fear of Missing Out',
                        type: 'variant_a',
                        trafficSplit: 50,
                        templateData: {
                            subject: '⚠️ ÚLTIMA CHANCE: Sua oferta expira em 2 horas!',
                            style: 'urgent'
                        }
                    }
                ]
            },
            discountTest: {
                name: 'Discount Amount Test',
                description: 'Test different discount percentages',
                variants: [
                    {
                        name: 'Control - 20% OFF',
                        type: 'control',
                        trafficSplit: 33.33,
                        templateData: { discount: 20 }
                    },
                    {
                        name: 'Higher - 40% OFF',
                        type: 'variant_a',
                        trafficSplit: 33.33,
                        templateData: { discount: 40 }
                    },
                    {
                        name: 'Highest - 60% OFF',
                        type: 'variant_b',
                        trafficSplit: 33.34,
                        templateData: { discount: 60 }
                    }
                ]
            }
        };
    }
}

module.exports = ABTestingService;