/**
 * Configuração do Facebook Pixel e Conversions API
 * 
 * IMPORTANTE: Configure as variáveis de ambiente antes de usar em produção
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0 - Facebook Integration
 */

module.exports = {
    // Facebook Pixel ID (cliente)
    PIXEL_ID: process.env.FACEBOOK_PIXEL_ID || '66ac66dd43136b1d66bddb65',
    
    // Conversions API (servidor)
    ACCESS_TOKEN: process.env.FACEBOOK_ACCESS_TOKEN || '',
    
    // Test Event Code (para testes)
    TEST_EVENT_CODE: process.env.FACEBOOK_TEST_EVENT_CODE || '',
    
    // URLs da API do Facebook
    CONVERSIONS_API_URL: 'https://graph.facebook.com/v18.0',
    
    // Configurações de retry e timeout
    API_TIMEOUT: 5000,
    MAX_RETRIES: 3,
    
    // Eventos padrão do Facebook
    STANDARD_EVENTS: {
        PAGE_VIEW: 'PageView',
        VIEW_CONTENT: 'ViewContent',
        ADD_TO_CART: 'AddToCart',
        INITIATE_CHECKOUT: 'InitiateCheckout',
        ADD_PAYMENT_INFO: 'AddPaymentInfo',
        PURCHASE: 'Purchase',
        LEAD: 'Lead',
        COMPLETE_REGISTRATION: 'CompleteRegistration'
    },
    
    // Mapeamento de eventos customizados
    CUSTOM_EVENT_MAPPING: {
        'page_view': 'PageView',
        'view_content': 'ViewContent',
        'lead_captured': 'Lead',
        'checkout_started': 'InitiateCheckout',
        'payment_info_added': 'AddPaymentInfo',
        'purchase_completed': 'Purchase',
        'upsell_view': 'ViewContent',
        'downsell_view': 'ViewContent'
    },
    
    // Configurações de deduplicação
    DEDUPLICATION: {
        enabled: true,
        window_hours: 24,
        use_event_id: true
    },
    
    // Configurações de dados do cliente
    CUSTOMER_DATA_HASHING: {
        enabled: true,
        hash_algorithm: 'sha256'
    }
};