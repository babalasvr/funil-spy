/**
 * WhatsApp Remarketing Integration Service
 * Handles WhatsApp Business API integration for remarketing campaigns
 */

const express = require('express');
const axios = require('axios');

class WhatsAppService {
    constructor(config = {}) {
        this.config = {
            // WhatsApp Business API Configuration
            apiUrl: config.apiUrl || 'https://graph.facebook.com/v18.0',
            accessToken: config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN,
            phoneNumberId: config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID,
            verifyToken: config.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN,
            
            // Alternative services (for demo purposes)
            evolutionApi: {
                enabled: config.evolutionApi?.enabled || false,
                url: config.evolutionApi?.url || 'http://localhost:8080',
                instance: config.evolutionApi?.instance || 'remarketing',
                token: config.evolutionApi?.token || process.env.EVOLUTION_API_TOKEN
            },
            
            // Zapier/Make.com integration
            webhookUrl: config.webhookUrl || process.env.WHATSAPP_WEBHOOK_URL,
            
            debug: config.debug || false
        };
    }

    // Setup webhook routes for Express app
    setupWebhooks(app) {
        // WhatsApp webhook verification
        app.get('/webhook/whatsapp', (req, res) => {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode === 'subscribe' && token === this.config.verifyToken) {
                console.log('✅ WhatsApp webhook verified');
                res.status(200).send(challenge);
            } else {
                console.log('❌ WhatsApp webhook verification failed');
                res.sendStatus(403);
            }
        });

        // WhatsApp webhook for receiving messages
        app.post('/webhook/whatsapp', (req, res) => {
            const body = req.body;

            if (body.object === 'whatsapp_business_account') {
                body.entry.forEach(entry => {
                    entry.changes.forEach(change => {
                        if (change.field === 'messages') {
                            this.handleIncomingMessage(change.value);
                        }
                    });
                });
                res.status(200).send('EVENT_RECEIVED');
            } else {
                res.sendStatus(404);
            }
        });

        console.log('🔗 WhatsApp webhooks configured');
    }

    // Handle incoming WhatsApp messages
    handleIncomingMessage(messageData) {
        if (messageData.messages) {
            messageData.messages.forEach(message => {
                console.log('📱 Incoming WhatsApp message:', {
                    from: message.from,
                    text: message.text?.body,
                    type: message.type
                });

                // Handle different message types
                if (message.type === 'text') {
                    this.handleTextMessage(message);
                } else if (message.type === 'interactive') {
                    this.handleInteractiveMessage(message);
                }
            });
        }

        // Handle status updates (delivered, read, etc.)
        if (messageData.statuses) {
            messageData.statuses.forEach(status => {
                console.log('📊 WhatsApp status update:', {
                    messageId: status.id,
                    status: status.status,
                    timestamp: status.timestamp
                });
                // Update campaign status in database
                this.updateCampaignStatus(status);
            });
        }
    }

    // Handle text messages from users
    async handleTextMessage(message) {
        const userPhone = message.from;
        const messageText = message.text.body.toLowerCase();

        // Check for conversion keywords
        if (messageText.includes('sim') || messageText.includes('quero') || messageText.includes('comprar')) {
            await this.sendConversionLink(userPhone);
        } else if (messageText.includes('não') || messageText.includes('nao') || messageText.includes('parar')) {
            await this.handleOptOut(userPhone);
        } else if (messageText.includes('info') || messageText.includes('mais')) {
            await this.sendMoreInfo(userPhone);
        }
    }

    // Send remarketing message via WhatsApp Business API
    async sendRemarketingMessage(phoneNumber, templateData) {
        if (!this.config.accessToken || !this.config.phoneNumberId) {
            console.log('📱 WhatsApp API not configured, simulating message send...');
            return this.simulateMessageSend(phoneNumber, templateData);
        }

        try {
            const messagePayload = this.buildMessagePayload(phoneNumber, templateData);
            
            const response = await axios.post(
                `${this.config.apiUrl}/${this.config.phoneNumberId}/messages`,
                messagePayload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ WhatsApp message sent successfully:', response.data);
            return { success: true, messageId: response.data.messages[0].id };
        } catch (error) {
            console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);
            
            // Fallback to alternative service
            return await this.sendViaAlternativeService(phoneNumber, templateData);
        }
    }

    // Build message payload for WhatsApp API
    buildMessagePayload(phoneNumber, templateData) {
        const { message, discount, offerUrl, firstName } = templateData;
        
        // Clean phone number (remove +55 if present for Brazilian numbers)
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        return {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: 'remarketing_offer', // You need to create this template in Meta Business
                language: {
                    code: 'pt_BR'
                },
                components: [
                    {
                        type: 'header',
                        parameters: [
                            {
                                type: 'text',
                                text: `${discount}% OFF`
                            }
                        ]
                    },
                    {
                        type: 'body',
                        parameters: [
                            {
                                type: 'text',
                                text: firstName || 'Cliente'
                            },
                            {
                                type: 'text',
                                text: `${discount}%`
                            },
                            {
                                type: 'text',
                                text: `R$ ${(27.90 * (1 - discount/100)).toFixed(2)}`
                            }
                        ]
                    },
                    {
                        type: 'button',
                        sub_type: 'url',
                        index: '0',
                        parameters: [
                            {
                                type: 'text',
                                text: `discount=${discount}&utm_source=whatsapp`
                            }
                        ]
                    }
                ]
            }
        };
    }

    // Alternative service integration (Evolution API or similar)
    async sendViaAlternativeService(phoneNumber, templateData) {
        if (!this.config.evolutionApi.enabled) {
            return this.simulateMessageSend(phoneNumber, templateData);
        }

        try {
            const { message, discount, offerUrl } = templateData;
            
            const payload = {
                number: phoneNumber,
                text: message,
                options: {
                    delay: 1000,
                    presence: 'composing'
                }
            };

            const response = await axios.post(
                `${this.config.evolutionApi.url}/message/sendText/${this.config.evolutionApi.instance}`,
                payload,
                {
                    headers: {
                        'apikey': this.config.evolutionApi.token,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Message sent via Evolution API:', response.data);
            return { success: true, messageId: response.data.key?.id };
        } catch (error) {
            console.error('❌ Error sending via Evolution API:', error.response?.data || error.message);
            return this.simulateMessageSend(phoneNumber, templateData);
        }
    }

    // Simulate message send for demo purposes
    simulateMessageSend(phoneNumber, templateData) {
        const { message, discount } = templateData;
        
        console.log('📱 [SIMULATED] WhatsApp message to:', phoneNumber);
        console.log('💬 Message:', message);
        console.log('🎯 Discount:', `${discount}%`);
        console.log('---');
        
        return { 
            success: true, 
            messageId: `sim_${Date.now()}`,
            simulated: true 
        };
    }

    // Send conversion link when user shows interest
    async sendConversionLink(phoneNumber) {
        const message = `🎉 Perfeito! Aqui está seu link especial com desconto:

👉 https://funilspy.com/checkout?utm_source=whatsapp&phone=${phoneNumber}

✅ Desconto já aplicado
✅ Pagamento seguro
✅ Relatório em 5 minutos

Qualquer dúvida, é só responder!`;

        return await this.sendTextMessage(phoneNumber, message);
    }

    // Handle opt-out requests
    async handleOptOut(phoneNumber) {
        // Remove from remarketing list
        console.log(`🚫 User ${phoneNumber} opted out of WhatsApp remarketing`);
        
        const message = `Entendido! Você foi removido da nossa lista de mensagens.

Se mudar de ideia, visite: https://funilspy.com

Obrigado! 🙏`;

        return await this.sendTextMessage(phoneNumber, message);
    }

    // Send more information
    async sendMoreInfo(phoneNumber) {
        const message = `📋 *WhatsApp Spy - Como funciona:*

🔍 Verificamos atividade do WhatsApp
📱 Mostramos conversas suspeitas  
⏰ Horários de atividade
👥 Contatos mais frequentes

✅ *100% Legal e Seguro*
✅ *Mais de 50.000 verificações*
✅ *Resultados em 5 minutos*

Quer descobrir a verdade?
Responda *SIM* para continuar!`;

        return await this.sendTextMessage(phoneNumber, message);
    }

    // Send simple text message
    async sendTextMessage(phoneNumber, text) {
        if (!this.config.accessToken) {
            console.log(`📱 [SIMULATED] Text to ${phoneNumber}: ${text}`);
            return { success: true, simulated: true };
        }

        try {
            const response = await axios.post(
                `${this.config.apiUrl}/${this.config.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: phoneNumber,
                    type: 'text',
                    text: { body: text }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return { success: true, messageId: response.data.messages[0].id };
        } catch (error) {
            console.error('Error sending text message:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    // Update campaign status based on WhatsApp status updates
    updateCampaignStatus(status) {
        // This would update the remarketing_campaigns table
        // Implementation depends on your database structure
        console.log(`📊 Campaign status update: ${status.id} -> ${status.status}`);
    }

    // Webhook integration for Zapier/Make.com
    async sendViaWebhook(phoneNumber, templateData) {
        if (!this.config.webhookUrl) {
            return { success: false, error: 'No webhook URL configured' };
        }

        try {
            const payload = {
                phone: phoneNumber,
                message: templateData.message,
                discount: templateData.discount,
                timestamp: new Date().toISOString(),
                source: 'funnel_spy_remarketing'
            };

            const response = await axios.post(this.config.webhookUrl, payload);
            
            console.log('✅ Webhook message sent:', response.status);
            return { success: true, webhookResponse: response.data };
        } catch (error) {
            console.error('❌ Webhook error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Bulk message sending for campaigns
    async sendBulkCampaign(contacts, templateData) {
        const results = [];
        const delay = 2000; // 2 seconds between messages to avoid rate limiting

        for (const contact of contacts) {
            try {
                const result = await this.sendRemarketingMessage(contact.phone, {
                    ...templateData,
                    firstName: contact.firstName
                });
                
                results.push({
                    phone: contact.phone,
                    success: result.success,
                    messageId: result.messageId
                });

                // Wait between messages
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                results.push({
                    phone: contact.phone,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Analytics for WhatsApp campaigns
    getWhatsAppStats() {
        return {
            messagesSent: 0, // Get from database
            messagesDelivered: 0,
            messagesRead: 0,
            conversions: 0,
            deliveryRate: 0,
            readRate: 0,
            conversionRate: 0
        };
    }
}

module.exports = WhatsAppService;