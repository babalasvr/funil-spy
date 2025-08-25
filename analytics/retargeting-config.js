/**
 * Advanced Retargeting Configuration
 * Facebook, Google, and other platform pixel management
 */

class RetargetingConfig {
    constructor() {
        this.platforms = {
            facebook: {
                enabled: true,
                pixelId: process.env.FACEBOOK_PIXEL_ID || 'YOUR_FACEBOOK_PIXEL_ID',
                accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
                adAccountId: process.env.FACEBOOK_AD_ACCOUNT_ID,
                audiences: {
                    allVisitors: 'All Website Visitors - Last 30 Days',
                    reportViewers: 'Report Page Viewers - Last 7 Days', 
                    checkoutAbandon: 'Checkout Abandoners - Last 3 Days',
                    highIntent: 'High Intent Users - Last 14 Days',
                    converters: 'Converters - Last 180 Days'
                }
            },
            google: {
                enabled: true,
                conversionId: process.env.GOOGLE_CONVERSION_ID || 'AW-YOUR_CONVERSION_ID',
                conversionLabel: process.env.GOOGLE_CONVERSION_LABEL || 'YOUR_CONVERSION_LABEL',
                customerId: process.env.GOOGLE_CUSTOMER_ID,
                audiences: {
                    allVisitors: 'Website Visitors',
                    reportViewers: 'Report Interested',
                    checkoutAbandon: 'Checkout Abandoners',
                    remarketing: 'Remarketing List'
                }
            },
            tiktok: {
                enabled: false,
                pixelId: process.env.TIKTOK_PIXEL_ID,
                accessToken: process.env.TIKTOK_ACCESS_TOKEN
            },
            snapchat: {
                enabled: false,
                pixelId: process.env.SNAPCHAT_PIXEL_ID
            }
        };

        this.audienceRules = {
            highIntent: {
                behaviorScore: 50,
                events: ['form_started', 'checkout_button_clicked', 'qr_code_generated'],
                timeframe: 7 // days
            },
            checkoutAbandon: {
                events: ['page_view_checkout', 'form_started'],
                excludeEvents: ['conversion'],
                timeframe: 3 // days
            },
            reportViewers: {
                events: ['page_view_report'],
                minTimeOnPage: 30, // seconds
                timeframe: 7 // days
            }
        };
    }

    // Generate Facebook Pixel code
    getFacebookPixelCode() {
        if (!this.platforms.facebook.enabled) return '';

        return `
            <!-- Facebook Pixel Code -->
            <script>
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');

                fbq('init', '${this.platforms.facebook.pixelId}');
                fbq('track', 'PageView');
                
                // Custom events for funnel tracking
                window.fbqTrackCustom = function(eventName, parameters) {
                    fbq('trackCustom', eventName, parameters);
                };
                
                // Standard events mapping
                window.fbqTrackStandard = function(eventName, parameters) {
                    const standardEvents = {
                        'form_started': 'Lead',
                        'checkout_view': 'InitiateCheckout', 
                        'conversion': 'Purchase',
                        'report_download': 'ViewContent'
                    };
                    
                    const fbEvent = standardEvents[eventName] || eventName;
                    fbq('track', fbEvent, parameters);
                };
            </script>
            <noscript>
                <img height="1" width="1" style="display:none"
                    src="https://www.facebook.com/tr?id=${this.platforms.facebook.pixelId}&ev=PageView&noscript=1"/>
            </noscript>
            <!-- End Facebook Pixel Code -->
        `;
    }

    // Generate Google Ads conversion tracking code  
    getGoogleAdsCode() {
        if (!this.platforms.google.enabled) return '';

        return `
            <!-- Google Ads Conversion Tracking -->
            <script async src="https://www.googletagmanager.com/gtag/js?id=${this.platforms.google.conversionId}"></script>
            <script>
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${this.platforms.google.conversionId}');
                
                // Conversion tracking function
                window.gtagConversion = function(value, currency = 'BRL') {
                    gtag('event', 'conversion', {
                        'send_to': '${this.platforms.google.conversionId}/${this.platforms.google.conversionLabel}',
                        'value': value,
                        'currency': currency
                    });
                };
                
                // Enhanced ecommerce events
                window.gtagEnhanced = function(eventName, parameters) {
                    gtag('event', eventName, parameters);
                };
                
                // Remarketing events
                window.gtagRemarketing = function(eventName, customParameters) {
                    gtag('event', 'page_view', {
                        'custom_map': customParameters,
                        'send_to': '${this.platforms.google.conversionId}'
                    });
                };
            </script>
            <!-- End Google Ads Code -->
        `;
    }

    // Generate complete pixel integration code
    getCompletePixelCode() {
        return `
            ${this.getFacebookPixelCode()}
            ${this.getGoogleAdsCode()}
            
            <script>
                // Unified tracking functions
                window.trackAllPlatforms = function(eventName, parameters = {}) {
                    // Facebook tracking
                    if (typeof fbq !== 'undefined') {
                        if (eventName === 'conversion') {
                            fbq('track', 'Purchase', {
                                value: parameters.value,
                                currency: 'BRL'
                            });
                        } else if (eventName === 'form_started') {
                            fbq('track', 'Lead');
                        } else if (eventName === 'checkout_view') {
                            fbq('track', 'InitiateCheckout');
                        } else {
                            fbq('trackCustom', eventName, parameters);
                        }
                    }
                    
                    // Google Ads tracking
                    if (typeof gtag !== 'undefined') {
                        if (eventName === 'conversion') {
                            gtagConversion(parameters.value);
                        } else {
                            gtag('event', eventName, parameters);
                        }
                    }
                    
                    console.log('🎯 Tracked on all platforms:', eventName, parameters);
                };
                
                // Audience segmentation tracking
                window.trackAudienceSegment = function(segment, userData = {}) {
                    const segmentData = {
                        segment: segment,
                        timestamp: new Date().toISOString(),
                        ...userData
                    };
                    
                    // Send to Facebook as custom event
                    if (typeof fbq !== 'undefined') {
                        fbq('trackCustom', 'AudienceSegment', segmentData);
                    }
                    
                    // Send to Google as custom parameter
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'audience_segment', {
                            'custom_parameter_1': segment,
                            'custom_parameter_2': JSON.stringify(userData)
                        });
                    }
                };
            </script>
        `;
    }

    // Create custom audiences via API
    async createFacebookCustomAudience(audienceName, description, pixelId = null) {
        if (!this.platforms.facebook.enabled || !this.platforms.facebook.accessToken) {
            console.log('Facebook API not configured');
            return null;
        }

        try {
            const axios = require('axios');
            
            const response = await axios.post(
                `https://graph.facebook.com/v18.0/${this.platforms.facebook.adAccountId}/customaudiences`,
                {
                    name: audienceName,
                    description: description,
                    subtype: 'WEBSITE',
                    pixel_id: pixelId || this.platforms.facebook.pixelId,
                    retention_days: 30,
                    rule: {
                        'inclusions': {
                            'operator': 'or',
                            'rules': [
                                {
                                    'event_sources': [
                                        {
                                            'id': pixelId || this.platforms.facebook.pixelId,
                                            'type': 'pixel'
                                        }
                                    ],
                                    'retention_seconds': 2592000, // 30 days
                                    'filter': {
                                        'operator': 'and',
                                        'filters': [
                                            {
                                                'field': 'event',
                                                'operator': 'eq',
                                                'value': 'PageView'
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.platforms.facebook.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Facebook custom audience created:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error creating Facebook audience:', error.response?.data || error.message);
            return null;
        }
    }

    // Create Google Ads remarketing list
    async createGoogleRemarketingList(listName, description) {
        // This would require Google Ads API setup
        console.log(`Creating Google remarketing list: ${listName}`);
        // Implementation would go here with Google Ads API
        return { success: true, listName };
    }

    // Dynamic audience rules based on user behavior
    evaluateAudienceSegment(userBehavior) {
        const { events, behaviorScore, timeOnSite, lastVisit } = userBehavior;
        
        // High intent audience
        if (behaviorScore >= 50 || events.includes('checkout_button_clicked')) {
            return 'high_intent';
        }
        
        // Checkout abandoners
        if (events.includes('page_view_checkout') && !events.includes('conversion')) {
            return 'checkout_abandon';
        }
        
        // Report viewers
        if (events.includes('page_view_report') && timeOnSite > 30) {
            return 'report_viewers';
        }
        
        // General visitors
        return 'general_visitors';
    }

    // Track retargeting campaign performance
    trackCampaignPerformance(platform, campaignId, metrics) {
        console.log(`📊 ${platform} campaign ${campaignId}:`, metrics);
        
        // Store metrics in database
        // Implementation would depend on your analytics structure
        return {
            platform,
            campaignId,
            timestamp: new Date().toISOString(),
            ...metrics
        };
    }

    // Generate dynamic retargeting ads data
    generateDynamicAdData(userProfile) {
        const { lastProduct, behaviorScore, location, device } = userProfile;
        
        return {
            headline: this.getDynamicHeadline(behaviorScore),
            description: this.getDynamicDescription(lastProduct),
            image: this.getDynamicImage(device),
            cta: this.getDynamicCTA(behaviorScore),
            discount: this.getDynamicDiscount(behaviorScore)
        };
    }

    getDynamicHeadline(behaviorScore) {
        if (behaviorScore > 70) return "Você estava tão perto da verdade!";
        if (behaviorScore > 40) return "Não deixe as dúvidas te consumirem";
        return "Descubra a verdade sobre aquela pessoa especial";
    }

    getDynamicDescription(lastProduct) {
        return "Verificação completa do WhatsApp em menos de 5 minutos. Mais de 50.000 pessoas já descobriram a verdade.";
    }

    getDynamicImage(device) {
        return device === 'mobile' ? 'mobile-hero.jpg' : 'desktop-hero.jpg';
    }

    getDynamicCTA(behaviorScore) {
        if (behaviorScore > 50) return "FINALIZAR VERIFICAÇÃO";
        return "DESCOBRIR AGORA";
    }

    getDynamicDiscount(behaviorScore) {
        if (behaviorScore > 70) return 50;
        if (behaviorScore > 40) return 30;
        return 20;
    }
}

module.exports = RetargetingConfig;