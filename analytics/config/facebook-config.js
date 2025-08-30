/**
 * Configuração do Facebook Pixel e Conversions API
 * 
 * IMPORTANTE: Configure as variáveis de ambiente antes de usar em produção
 * 
 * @author Sistema de Analytics Funil Spy
 * @version 1.0.0 - Facebook Integration
 */

module.exports = {
    // Configurações básicas
    PIXEL_ID: process.env.FACEBOOK_PIXEL_ID,
    ACCESS_TOKEN: process.env.FACEBOOK_ACCESS_TOKEN,
    TEST_EVENT_CODE: process.env.FACEBOOK_TEST_EVENT_CODE,
    
    // URLs da API
    API_VERSION: 'v18.0',
    CONVERSIONS_API_URL: 'https://graph.facebook.com/v18.0',
    
    // Configurações de retry e timeout (melhoradas)
    MAX_RETRIES: 3,
    TIMEOUT: 15000, // 15 segundos (aumentado para maior confiabilidade)
    RETRY_DELAY: 1000, // 1 segundo base
    PROGRESSIVE_DELAY: true, // Delay progressivo (1s, 2s, 3s)
    
    // Configurações de validação
    VALIDATE_TOKEN_ON_STARTUP: true,
    STRICT_PURCHASE_VALIDATION: true,
    
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
        'PageView': 'PageView',
        'view_content': 'ViewContent',
        'ViewContent': 'ViewContent',
        'lead_captured': 'Lead',
        'Lead': 'Lead',
        'checkout_started': 'InitiateCheckout',
        'InitiateCheckout': 'InitiateCheckout',
        'payment_info_added': 'AddPaymentInfo',
        'AddPaymentInfo': 'AddPaymentInfo',
        'purchase_completed': 'Purchase',
        'Purchase': 'Purchase',
        'upsell_view': 'ViewContent',
        'downsell_view': 'ViewContent',
        'AddToCart': 'AddToCart',
        'add_to_cart': 'AddToCart',
        'CompleteRegistration': 'CompleteRegistration',
        'complete_registration': 'CompleteRegistration',
        // Eventos específicos do funil
        'funnel_step_1': 'ViewContent',
        'funnel_step_2': 'ViewContent',
        'funnel_step_3': 'InitiateCheckout',
        'order_bump_view': 'ViewContent',
        'order_bump_add': 'AddToCart',
        'upsell_1_view': 'ViewContent',
        'upsell_2_view': 'ViewContent',
        'downsell_1_view': 'ViewContent',
        'thank_you_page': 'Purchase'
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