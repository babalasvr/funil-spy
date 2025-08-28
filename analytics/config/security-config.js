/**
 * 🔒 Configurações de Segurança e Performance
 * Sistema de Tracking Avançado - Produção
 */

const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

class SecurityConfig {
    /**
     * Configurações de segurança com Helmet
     */
    static getHelmetConfig() {
        return helmet({
            // Content Security Policy
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'", // Necessário para Facebook Pixel
                        "https://connect.facebook.net",
                        "https://www.facebook.com",
                        "https://analytics.facebook.com"
                    ],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: [
                        "'self'",
                        "data:",
                        "https://www.facebook.com",
                        "https://analytics.facebook.com"
                    ],
                    connectSrc: [
                        "'self'",
                        "https://graph.facebook.com",
                        "https://www.facebook.com",
                        "https://analytics.facebook.com"
                    ],
                    fontSrc: ["'self'", "data:"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            
            // Cross Origin Embedder Policy
            crossOriginEmbedderPolicy: false, // Desabilitado para compatibilidade com Facebook
            
            // DNS Prefetch Control
            dnsPrefetchControl: {
                allow: false
            },
            
            // Frame Guard
            frameguard: {
                action: 'deny'
            },
            
            // Hide Powered By
            hidePoweredBy: true,
            
            // HTTP Strict Transport Security
            hsts: {
                maxAge: 31536000, // 1 ano
                includeSubDomains: true,
                preload: true
            },
            
            // IE No Open
            ieNoOpen: true,
            
            // No Sniff
            noSniff: true,
            
            // Origin Agent Cluster
            originAgentCluster: true,
            
            // Permitted Cross Domain Policies
            permittedCrossDomainPolicies: false,
            
            // Referrer Policy
            referrerPolicy: {
                policy: ['no-referrer', 'strict-origin-when-cross-origin']
            },
            
            // X-XSS-Protection
            xssFilter: true
        });
    }

    /**
     * Configurações de compressão
     */
    static getCompressionConfig() {
        return compression({
            // Nível de compressão (1-9, 6 é padrão)
            level: 6,
            
            // Threshold mínimo para compressão (bytes)
            threshold: 1024,
            
            // Filtro de tipos de arquivo
            filter: (req, res) => {
                // Não comprimir se o cliente não suporta
                if (req.headers['x-no-compression']) {
                    return false;
                }
                
                // Usar filtro padrão do compression
                return compression.filter(req, res);
            },
            
            // Configurações específicas
            windowBits: 15,
            memLevel: 8
        });
    }

    /**
     * Rate limiting para API de tracking
     */
    static getTrackingRateLimit() {
        return rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minuto
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests por minuto
            message: {
                error: 'Muitas requisições. Tente novamente em alguns minutos.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            
            // Função para gerar chave única por IP
            keyGenerator: (req) => {
                return req.ip || req.connection.remoteAddress;
            },
            
            // Pular rate limit para IPs confiáveis
            skip: (req) => {
                const trustedIPs = (process.env.TRUSTED_IPS || '').split(',');
                return trustedIPs.includes(req.ip);
            },
            
            // Log quando limite é excedido (removido onLimitReached depreciado)
            handler: (req, res) => {
                console.warn(`Rate limit exceeded for IP: ${req.ip}`);
                res.status(429).json({
                    error: 'Muitas requisições. Tente novamente em alguns minutos.',
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: 60
                });
            }
        });
    }

    /**
     * Rate limiting mais restritivo para endpoints sensíveis
     */
    static getStrictRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 10, // 10 requests por 15 minutos
            message: {
                error: 'Muitas tentativas. Tente novamente em 15 minutos.',
                code: 'STRICT_RATE_LIMIT_EXCEEDED',
                retryAfter: 900
            },
            standardHeaders: true,
            legacyHeaders: false
        });
    }

    /**
     * Middleware de validação de origem
     */
    static validateOrigin(allowedOrigins = []) {
        return (req, res, next) => {
            const origin = req.get('Origin') || req.get('Referer');
            
            // Se não há origem definida, permitir (requisições diretas)
            if (!origin) {
                return next();
            }
            
            // Verificar se origem está na lista permitida
            const isAllowed = allowedOrigins.some(allowed => {
                if (allowed === '*') return true;
                if (typeof allowed === 'string') {
                    return origin.includes(allowed);
                }
                if (allowed instanceof RegExp) {
                    return allowed.test(origin);
                }
                return false;
            });
            
            if (!isAllowed) {
                return res.status(403).json({
                    error: 'Origem não autorizada',
                    code: 'FORBIDDEN_ORIGIN'
                });
            }
            
            next();
        };
    }

    /**
     * Middleware de validação de API Key
     */
    static validateApiKey() {
        return (req, res, next) => {
            const apiKey = req.headers['x-api-key'] || req.query.api_key;
            const validApiKey = process.env.API_KEY;
            
            // Se API Key não está configurada, pular validação
            if (!validApiKey) {
                return next();
            }
            
            if (!apiKey || apiKey !== validApiKey) {
                return res.status(401).json({
                    error: 'API Key inválida ou ausente',
                    code: 'INVALID_API_KEY'
                });
            }
            
            next();
        };
    }

    /**
     * Middleware de sanitização de dados
     */
    static sanitizeInput() {
        return (req, res, next) => {
            // Função para sanitizar strings
            const sanitizeString = (str) => {
                if (typeof str !== 'string') return str;
                
                return str
                    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove scripts
                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                    .replace(/javascript:/gi, '') // Remove javascript: URLs
                    .replace(/on\w+\s*=/gi, '') // Remove event handlers
                    .trim();
            };
            
            // Função recursiva para sanitizar objetos
            const sanitizeObject = (obj) => {
                if (obj === null || typeof obj !== 'object') {
                    return typeof obj === 'string' ? sanitizeString(obj) : obj;
                }
                
                if (Array.isArray(obj)) {
                    return obj.map(sanitizeObject);
                }
                
                const sanitized = {};
                for (const [key, value] of Object.entries(obj)) {
                    sanitized[sanitizeString(key)] = sanitizeObject(value);
                }
                return sanitized;
            };
            
            // Sanitizar body, query e params
            if (req.body) {
                req.body = sanitizeObject(req.body);
            }
            if (req.query) {
                req.query = sanitizeObject(req.query);
            }
            if (req.params) {
                req.params = sanitizeObject(req.params);
            }
            
            next();
        };
    }

    /**
     * Middleware de logging de segurança
     */
    static securityLogger() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            // Log da requisição
            const logData = {
                timestamp: new Date().toISOString(),
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                origin: req.get('Origin'),
                referer: req.get('Referer')
            };
            
            // Override do res.end para capturar resposta
            const originalEnd = res.end;
            res.end = function(chunk, encoding) {
                const duration = Date.now() - startTime;
                
                // Log de resposta
                const responseLog = {
                    ...logData,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    contentLength: res.get('Content-Length') || 0
                };
                
                // Log apenas se houver erro ou for endpoint sensível
                if (res.statusCode >= 400 || req.url.includes('/api/')) {
                    console.log('Security Log:', JSON.stringify(responseLog));
                }
                
                originalEnd.call(this, chunk, encoding);
            };
            
            next();
        };
    }

    /**
     * Configuração completa de segurança
     */
    static configure(app) {
        // Aplicar configurações básicas
        app.use(this.getHelmetConfig());
        app.use(this.getCompressionConfig());
        app.use(this.securityLogger());
        app.use(this.sanitizeInput());
        
        // Configurar CORS baseado em ambiente
        const corsOrigins = process.env.CORS_ORIGIN 
            ? process.env.CORS_ORIGIN.split(',')
            : ['http://localhost:3000', 'http://localhost:8080'];
        
        app.use(this.validateOrigin(corsOrigins));
        
        // Rate limiting global
        app.use('/api/', this.getTrackingRateLimit());
        
        // Rate limiting estrito para endpoints sensíveis
        app.use('/api/tracking/test', this.getStrictRateLimit());
        app.use('/api/tracking/health', this.getStrictRateLimit());
        
        console.log('🔒 Configurações de segurança aplicadas');
    }
}

module.exports = SecurityConfig;