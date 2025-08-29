/**
 * 📊 Serviço de Monitoramento e Alertas
 * Sistema de Tracking Avançado
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');

class MonitoringService {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                success: 0,
                errors: 0,
                lastHour: []
            },
            facebook: {
                pixelEvents: 0,
                conversionsApiEvents: 0,
                errors: 0,
                lastError: null
            },
            performance: {
                avgResponseTime: 0,
                responseTimes: [],
                memoryUsage: [],
                cpuUsage: []
            },
            events: {
                pageViews: 0,
                leads: 0,
                checkouts: 0,
                purchases: 0,
                customEvents: 0
            }
        };
        
        this.alerts = {
            errorRate: 0.5, // 50% de erro (mais tolerante)
            responseTime: 10000, // 10 segundos (mais tolerante)
            memoryUsage: 0.95, // 95% da memória (mais tolerante)
            facebookErrors: 10 // 10 erros consecutivos (mais tolerante)
        };
        
        this.emailTransporter = this.setupEmailTransporter();
        this.startMonitoring();
    }

    /**
     * Configurar transporter de email
     */
    setupEmailTransporter() {
        if (!process.env.SMTP_HOST || !process.env.ALERT_EMAIL) {
            console.log('📧 Email alerts não configurados (SMTP_HOST ou ALERT_EMAIL ausentes)');
            return null;
        }
        
        return nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Iniciar monitoramento contínuo
     */
    startMonitoring() {
        // Coletar métricas a cada minuto
        setInterval(() => {
            this.collectSystemMetrics();
            this.checkAlerts();
        }, 60000);
        
        // Limpar dados antigos a cada hora
        setInterval(() => {
            this.cleanupOldData();
        }, 3600000);
        
        // Gerar relatório diário
        setInterval(() => {
            this.generateDailyReport();
        }, 86400000);
        
        console.log('📊 Monitoramento iniciado');
    }

    /**
     * Registrar requisição
     */
    recordRequest(req, res, responseTime) {
        this.metrics.requests.total++;
        
        if (res.statusCode < 400) {
            this.metrics.requests.success++;
        } else {
            this.metrics.requests.errors++;
        }
        
        // Adicionar à lista da última hora
        const now = Date.now();
        this.metrics.requests.lastHour.push({
            timestamp: now,
            statusCode: res.statusCode,
            responseTime,
            endpoint: req.path
        });
        
        // Atualizar tempo de resposta médio
        this.metrics.performance.responseTimes.push(responseTime);
        if (this.metrics.performance.responseTimes.length > 100) {
            this.metrics.performance.responseTimes.shift();
        }
        
        this.metrics.performance.avgResponseTime = 
            this.metrics.performance.responseTimes.reduce((a, b) => a + b, 0) / 
            this.metrics.performance.responseTimes.length;
    }

    /**
     * Registrar evento do Facebook
     */
    recordFacebookEvent(type, success, error = null) {
        if (type === 'pixel') {
            this.metrics.facebook.pixelEvents++;
        } else if (type === 'conversions_api') {
            this.metrics.facebook.conversionsApiEvents++;
        }
        
        if (!success) {
            this.metrics.facebook.errors++;
            this.metrics.facebook.lastError = {
                timestamp: new Date().toISOString(),
                type,
                error: error?.message || 'Erro desconhecido'
            };
        }
    }

    /**
     * Registrar evento de tracking
     */
    recordTrackingEvent(eventType) {
        switch (eventType) {
            case 'PageView':
                this.metrics.events.pageViews++;
                break;
            case 'Lead':
                this.metrics.events.leads++;
                break;
            case 'InitiateCheckout':
                this.metrics.events.checkouts++;
                break;
            case 'Purchase':
                this.metrics.events.purchases++;
                break;
            default:
                this.metrics.events.customEvents++;
        }
    }

    /**
     * Coletar métricas do sistema
     */
    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
        
        this.metrics.performance.memoryUsage.push({
            timestamp: Date.now(),
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            percentage: memUsagePercent
        });
        
        // Manter apenas últimas 60 medições (1 hora)
        if (this.metrics.performance.memoryUsage.length > 60) {
            this.metrics.performance.memoryUsage.shift();
        }
    }

    /**
     * Verificar alertas
     */
    checkAlerts() {
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        
        // Filtrar requisições da última hora
        const recentRequests = this.metrics.requests.lastHour.filter(
            req => req.timestamp > oneHourAgo
        );
        
        if (recentRequests.length === 0) return;
        
        // Verificar taxa de erro
        const errorRequests = recentRequests.filter(req => req.statusCode >= 400);
        const errorRate = errorRequests.length / recentRequests.length;
        
        if (errorRate > this.alerts.errorRate) {
            this.sendAlert('HIGH_ERROR_RATE', {
                errorRate: (errorRate * 100).toFixed(2),
                totalRequests: recentRequests.length,
                errorRequests: errorRequests.length
            });
        }
        
        // Verificar tempo de resposta
        const avgResponseTime = recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length;
        
        if (avgResponseTime > this.alerts.responseTime) {
            this.sendAlert('HIGH_RESPONSE_TIME', {
                avgResponseTime: avgResponseTime.toFixed(2),
                threshold: this.alerts.responseTime
            });
        }
        
        // Verificar uso de memória
        const latestMemUsage = this.metrics.performance.memoryUsage[this.metrics.performance.memoryUsage.length - 1];
        
        if (latestMemUsage && latestMemUsage.percentage > this.alerts.memoryUsage) {
            this.sendAlert('HIGH_MEMORY_USAGE', {
                memoryUsage: (latestMemUsage.percentage * 100).toFixed(2),
                heapUsed: (latestMemUsage.heapUsed / 1024 / 1024).toFixed(2),
                heapTotal: (latestMemUsage.heapTotal / 1024 / 1024).toFixed(2)
            });
        }
        
        // Verificar erros do Facebook
        if (this.metrics.facebook.errors >= this.alerts.facebookErrors) {
            this.sendAlert('FACEBOOK_ERRORS', {
                errorCount: this.metrics.facebook.errors,
                lastError: this.metrics.facebook.lastError
            });
        }
    }

    /**
     * Enviar alerta
     */
    async sendAlert(type, data) {
        const alert = {
            timestamp: new Date().toISOString(),
            type,
            data,
            severity: this.getAlertSeverity(type)
        };
        
        console.warn(`🚨 ALERT [${type}]:`, JSON.stringify(data));
        
        // Salvar alerta em arquivo
        this.saveAlert(alert);
        
        // Enviar por email se configurado
        if (this.emailTransporter) {
            await this.sendEmailAlert(alert);
        }
        
        // Enviar para webhook se configurado
        if (process.env.WEBHOOK_URL) {
            await this.sendWebhookAlert(alert);
        }
    }

    /**
     * Determinar severidade do alerta
     */
    getAlertSeverity(type) {
        const severityMap = {
            'HIGH_ERROR_RATE': 'critical',
            'HIGH_RESPONSE_TIME': 'warning',
            'HIGH_MEMORY_USAGE': 'warning',
            'FACEBOOK_ERRORS': 'critical'
        };
        
        return severityMap[type] || 'info';
    }

    /**
     * Salvar alerta em arquivo
     */
    saveAlert(alert) {
        const alertsDir = path.join(__dirname, '../logs');
        const alertsFile = path.join(alertsDir, 'alerts.log');
        
        if (!fs.existsSync(alertsDir)) {
            fs.mkdirSync(alertsDir, { recursive: true });
        }
        
        const logLine = JSON.stringify(alert) + '\n';
        fs.appendFileSync(alertsFile, logLine);
    }

    /**
     * Enviar alerta por email
     */
    async sendEmailAlert(alert) {
        try {
            const subject = `🚨 Alert: ${alert.type} - ${alert.severity.toUpperCase()}`;
            const html = this.generateAlertEmailHTML(alert);
            
            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: process.env.ALERT_EMAIL,
                subject,
                html
            });
            
            console.log('📧 Alerta enviado por email');
        } catch (error) {
            console.error('❌ Erro ao enviar email de alerta:', error.message);
        }
    }

    /**
     * Gerar HTML do email de alerta
     */
    generateAlertEmailHTML(alert) {
        const severityColor = {
            'critical': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        }[alert.severity] || '#6c757d';
        
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${severityColor}; color: white; padding: 20px; text-align: center;">
                <h1>🚨 Sistema de Tracking - Alerta</h1>
                <h2>${alert.type}</h2>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa;">
                <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
                <p><strong>Severidade:</strong> ${alert.severity.toUpperCase()}</p>
                
                <h3>Detalhes:</h3>
                <pre style="background: white; padding: 15px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(alert.data, null, 2)}</pre>
                
                <h3>Métricas Atuais:</h3>
                <ul>
                    <li><strong>Total de Requisições:</strong> ${this.metrics.requests.total}</li>
                    <li><strong>Taxa de Sucesso:</strong> ${((this.metrics.requests.success / this.metrics.requests.total) * 100).toFixed(2)}%</li>
                    <li><strong>Tempo de Resposta Médio:</strong> ${this.metrics.performance.avgResponseTime.toFixed(2)}ms</li>
                    <li><strong>Eventos Facebook:</strong> ${this.metrics.facebook.pixelEvents + this.metrics.facebook.conversionsApiEvents}</li>
                </ul>
            </div>
            
            <div style="padding: 20px; text-align: center; color: #6c757d;">
                <p>Sistema de Tracking Avançado - UTMify + Facebook</p>
            </div>
        </div>
        `;
    }

    /**
     * Enviar alerta para webhook
     */
    async sendWebhookAlert(alert) {
        try {
            await axios.post(process.env.WEBHOOK_URL, {
                text: `🚨 *${alert.type}* (${alert.severity})\n\`\`\`${JSON.stringify(alert.data, null, 2)}\`\`\``,
                username: 'Tracking Monitor',
                icon_emoji: ':warning:'
            });
            
            console.log('🔗 Alerta enviado para webhook');
        } catch (error) {
            console.error('❌ Erro ao enviar webhook:', error.message);
        }
    }

    /**
     * Limpar dados antigos
     */
    cleanupOldData() {
        const oneHourAgo = Date.now() - 3600000;
        
        // Limpar requisições antigas
        this.metrics.requests.lastHour = this.metrics.requests.lastHour.filter(
            req => req.timestamp > oneHourAgo
        );
        
        console.log('🧹 Dados antigos limpos');
    }

    /**
     * Gerar relatório diário
     */
    generateDailyReport() {
        const report = {
            date: new Date().toISOString().split('T')[0],
            summary: {
                totalRequests: this.metrics.requests.total,
                successRate: ((this.metrics.requests.success / this.metrics.requests.total) * 100).toFixed(2),
                avgResponseTime: this.metrics.performance.avgResponseTime.toFixed(2),
                facebookEvents: this.metrics.facebook.pixelEvents + this.metrics.facebook.conversionsApiEvents,
                trackingEvents: {
                    pageViews: this.metrics.events.pageViews,
                    leads: this.metrics.events.leads,
                    checkouts: this.metrics.events.checkouts,
                    purchases: this.metrics.events.purchases
                }
            }
        };
        
        // Salvar relatório
        const reportsDir = path.join(__dirname, '../reports');
        const reportFile = path.join(reportsDir, `daily-${report.date}.json`);
        
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log(`📊 Relatório diário gerado: ${reportFile}`);
        
        // Reset métricas diárias
        this.resetDailyMetrics();
    }

    /**
     * Reset métricas diárias
     */
    resetDailyMetrics() {
        this.metrics.requests = {
            total: 0,
            success: 0,
            errors: 0,
            lastHour: []
        };
        
        this.metrics.facebook = {
            pixelEvents: 0,
            conversionsApiEvents: 0,
            errors: 0,
            lastError: null
        };
        
        this.metrics.events = {
            pageViews: 0,
            leads: 0,
            checkouts: 0,
            purchases: 0,
            customEvents: 0
        };
    }

    /**
     * Obter métricas atuais
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Obter status de saúde
     */
    getHealthStatus() {
        const oneHourAgo = Date.now() - 3600000;
        const recentRequests = this.metrics.requests.lastHour.filter(
            req => req.timestamp > oneHourAgo
        );
        
        const errorRate = recentRequests.length > 0 
            ? recentRequests.filter(req => req.statusCode >= 400).length / recentRequests.length
            : 0;
        
        const latestMemUsage = this.metrics.performance.memoryUsage[this.metrics.performance.memoryUsage.length - 1];
        const memoryUsage = latestMemUsage ? latestMemUsage.percentage : 0;
        
        const status = {
            healthy: true,
            checks: {
                errorRate: {
                    status: errorRate < this.alerts.errorRate ? 'ok' : 'warning',
                    value: (errorRate * 100).toFixed(2) + '%',
                    threshold: (this.alerts.errorRate * 100) + '%'
                },
                responseTime: {
                    status: this.metrics.performance.avgResponseTime < this.alerts.responseTime ? 'ok' : 'warning',
                    value: this.metrics.performance.avgResponseTime.toFixed(2) + 'ms',
                    threshold: this.alerts.responseTime + 'ms'
                },
                memoryUsage: {
                    status: memoryUsage < this.alerts.memoryUsage ? 'ok' : 'warning',
                    value: (memoryUsage * 100).toFixed(2) + '%',
                    threshold: (this.alerts.memoryUsage * 100) + '%'
                },
                facebookErrors: {
                    status: this.metrics.facebook.errors < this.alerts.facebookErrors ? 'ok' : 'critical',
                    value: this.metrics.facebook.errors,
                    threshold: this.alerts.facebookErrors
                }
            }
        };
        
        // Determinar status geral
        status.healthy = Object.values(status.checks).every(check => check.status === 'ok');
        
        return status;
    }
}

module.exports = MonitoringService;