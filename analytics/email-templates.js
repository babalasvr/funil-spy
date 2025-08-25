/**
 * Email Remarketing Templates and Automation
 * Progressive discount email campaigns with A/B testing
 */

class EmailTemplates {
    static getTemplateByStep(step, userData, discount) {
        const templates = {
            1: this.getFirstAbandonmentEmail(userData, discount),
            2: this.getSecondFollowUpEmail(userData, discount),
            3: this.getFinalOfferEmail(userData, discount),
            4: this.getLastChanceEmail(userData, discount)
        };
        
        return templates[step] || templates[1];
    }

    static getFirstAbandonmentEmail(userData, discount) {
        const firstName = userData.first_name || 'Cliente';
        
        return {
            subject: `${firstName}, você esqueceu algo importante! 🔍`,
            html: `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Não perca essa oportunidade!</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            margin: 0; padding: 0; background: #f5f5f5; 
                        }
                        .container { 
                            max-width: 600px; margin: 0 auto; background: white; 
                        }
                        .header { 
                            background: linear-gradient(135deg, #e74c3c, #c0392b); 
                            color: white; padding: 30px 20px; text-align: center; 
                        }
                        .content { padding: 30px 20px; }
                        .discount-badge { 
                            background: #27ae60; color: white; 
                            font-size: 2.5em; font-weight: bold; 
                            text-align: center; padding: 20px; 
                            border-radius: 10px; margin: 20px 0; 
                            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        }
                        .cta { 
                            background: #e74c3c; color: white; 
                            padding: 18px 40px; text-decoration: none; 
                            border-radius: 30px; display: inline-block; 
                            margin: 20px 0; font-weight: bold; 
                            font-size: 1.1em; text-transform: uppercase;
                            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
                        }
                        .urgency { 
                            background: #fff3cd; padding: 20px; 
                            border-left: 4px solid #ffc107; margin: 20px 0; 
                            border-radius: 5px;
                        }
                        .features { 
                            background: #f8f9fa; padding: 20px; 
                            border-radius: 10px; margin: 20px 0; 
                        }
                        .feature-item { 
                            display: flex; align-items: center; 
                            margin: 10px 0; 
                        }
                        .feature-icon { 
                            margin-right: 10px; font-size: 1.2em; 
                        }
                        .footer { 
                            background: #2c3e50; color: white; 
                            padding: 20px; text-align: center; 
                            font-size: 0.9em; 
                        }
                        @media (max-width: 600px) {
                            .content { padding: 20px 15px; }
                            .discount-badge { font-size: 2em; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔍 WhatsApp Spy</h1>
                            <p style="margin: 0; font-size: 1.1em;">Descubra a verdade agora!</p>
                        </div>
                        
                        <div class="content">
                            <h2>Olá ${firstName}!</h2>
                            <p>Notamos que você estava interessado em descobrir a verdade sobre aquela pessoa especial, mas não finalizou sua verificação.</p>
                            
                            <p><strong>Não deixe as dúvidas te consumirem!</strong> Você estava a poucos cliques de descobrir:</p>
                            
                            <div class="features">
                                <div class="feature-item">
                                    <span class="feature-icon">💬</span>
                                    <span>Conversas secretas no WhatsApp</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">📱</span>
                                    <span>Atividade online em tempo real</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">👤</span>
                                    <span>Contatos mais frequentes</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">⏰</span>
                                    <span>Horários de atividade</span>
                                </div>
                            </div>
                            
                            <div class="discount-badge">
                                ${discount.discount}% OFF
                            </div>
                            
                            <p style="text-align: center; font-size: 1.2em;">
                                <strong>De R$ 27,90 por apenas</strong><br>
                                <span style="color: #e74c3c; font-size: 1.4em; font-weight: bold;">
                                    R$ ${(27.90 * (1 - discount.discount/100)).toFixed(2)}
                                </span>
                            </p>
                            
                            <div class="urgency">
                                <strong>⏰ Oferta por tempo limitado!</strong><br>
                                Esta é uma oportunidade única de descobrir a verdade com desconto especial.
                                <br><br>
                                <em>Válida apenas por 24 horas ou até esgotar o estoque de relatórios.</em>
                            </div>
                            
                            <div style="text-align: center;">
                                <a href="https://funilspy.com/checkout?discount=${discount.discount}&user=${userData.user_id}&utm_source=email&utm_campaign=abandonment_1" class="cta">
                                    DESCOBRIR A VERDADE AGORA
                                </a>
                            </div>
                            
                            <p style="font-size: 0.9em; color: #666;">
                                <strong>Por que milhares de pessoas confiam em nós:</strong>
                            </p>
                            <ul style="color: #666; font-size: 0.9em;">
                                <li>✅ Mais de 50.000 verificações realizadas</li>
                                <li>✅ 98% de satisfação dos clientes</li>
                                <li>✅ Resultados em menos de 5 minutos</li>
                                <li>✅ Totalmente confidencial e seguro</li>
                            </ul>
                        </div>
                        
                        <div class="footer">
                            <p>Se você não deseja mais receber nossos e-mails, <a href="#" style="color: #3498db;">clique aqui para descadastrar</a>.</p>
                            <p>&copy; 2024 WhatsApp Spy - Todos os direitos reservados</p>
                        </div>
                    </div>
                    
                    <!-- Tracking pixel -->
                    <img src="https://funilspy.com/pixel/email-open?user=${userData.user_id}&campaign=abandonment_1" width="1" height="1" style="display:none;">
                </body>
                </html>
            `
        };
    }

    static getSecondFollowUpEmail(userData, discount) {
        const firstName = userData.first_name || 'Cliente';
        
        return {
            subject: `${firstName}, sua chance está acabando! ${discount.discount}% OFF 🚨`,
            html: `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Sua oportunidade está acabando!</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            margin: 0; padding: 0; background: #f5f5f5; 
                        }
                        .container { 
                            max-width: 600px; margin: 0 auto; background: white; 
                        }
                        .header { 
                            background: linear-gradient(135deg, #d32f2f, #b71c1c); 
                            color: white; padding: 30px 20px; text-align: center; 
                        }
                        .content { padding: 30px 20px; }
                        .discount-badge { 
                            background: linear-gradient(135deg, #ff5722, #d84315); 
                            color: white; font-size: 3em; font-weight: bold; 
                            text-align: center; padding: 25px; 
                            border-radius: 15px; margin: 25px 0; 
                            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                            animation: pulse 2s infinite;
                        }
                        .cta { 
                            background: linear-gradient(135deg, #d32f2f, #b71c1c); 
                            color: white; padding: 20px 45px; 
                            text-decoration: none; border-radius: 35px; 
                            display: inline-block; margin: 20px 0; 
                            font-weight: bold; font-size: 1.2em; 
                            text-transform: uppercase;
                            box-shadow: 0 6px 20px rgba(211, 47, 47, 0.4);
                        }
                        .urgency { 
                            background: linear-gradient(135deg, #ffebee, #ffcdd2); 
                            padding: 25px; border: 2px solid #f44336; 
                            margin: 25px 0; border-radius: 10px; 
                            text-align: center;
                        }
                        .countdown { 
                            background: #1a1a1a; color: #ff5722; 
                            padding: 20px; border-radius: 10px; 
                            text-align: center; margin: 20px 0; 
                            font-family: monospace; font-size: 1.5em; 
                            font-weight: bold;
                        }
                        .testimonial { 
                            background: #e8f5e8; padding: 20px; 
                            border-left: 4px solid #4caf50; 
                            margin: 20px 0; border-radius: 5px; 
                            font-style: italic;
                        }
                        @keyframes pulse {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.05); }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🚨 TEMPO ESGOTANDO!</h1>
                            <p style="margin: 0; font-size: 1.2em;">Sua oportunidade está acabando...</p>
                        </div>
                        
                        <div class="content">
                            <h2>Olá ${firstName},</h2>
                            
                            <p style="font-size: 1.1em; line-height: 1.6;">
                                <strong>Você está perdendo uma oportunidade única!</strong> 
                                Aumentamos seu desconto para que você não perca a chance de descobrir a verdade.
                            </p>
                            
                            <div class="urgency">
                                <h3 style="color: #d32f2f; margin-top: 0;">⚠️ ATENÇÃO: OFERTA LIMITADA!</h3>
                                <p>Restam apenas algumas horas para garantir seu desconto exclusivo.</p>
                            </div>
                            
                            <div class="discount-badge">
                                ${discount.discount}% OFF
                            </div>
                            
                            <div class="countdown">
                                ⏰ Expira em: 23:59:59
                            </div>
                            
                            <p style="text-align: center; font-size: 1.3em;">
                                <span style="text-decoration: line-through; color: #999;">R$ 27,90</span><br>
                                <strong style="color: #d32f2f; font-size: 1.5em;">
                                    R$ ${(27.90 * (1 - discount.discount/100)).toFixed(2)}
                                </strong>
                            </p>
                            
                            <div class="testimonial">
                                <p><strong>"Descobri que meu namorado estava conversando com a ex. O relatório me mostrou tudo o que eu precisava saber. Valeu cada centavo!"</strong></p>
                                <p style="text-align: right; margin: 0; color: #666;">- Maria S., São Paulo</p>
                            </div>
                            
                            <div style="text-align: center;">
                                <a href="https://funilspy.com/checkout?discount=${discount.discount}&user=${userData.user_id}&utm_source=email&utm_campaign=abandonment_2" class="cta">
                                    GARANTIR MEU DESCONTO AGORA
                                </a>
                            </div>
                            
                            <p style="font-size: 0.9em; color: #666; text-align: center;">
                                <strong>⚡ Processamento instantâneo</strong> - Receba seu relatório em menos de 5 minutos
                            </p>
                        </div>
                    </div>
                    
                    <!-- Tracking pixel -->
                    <img src="https://funilspy.com/pixel/email-open?user=${userData.user_id}&campaign=abandonment_2" width="1" height="1" style="display:none;">
                </body>
                </html>
            `
        };
    }

    static getFinalOfferEmail(userData, discount) {
        const firstName = userData.first_name || 'Cliente';
        
        return {
            subject: `🔥 ÚLTIMA CHANCE: ${discount.discount}% OFF para ${firstName}`,
            html: `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Última Chance!</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            margin: 0; padding: 0; background: #1a1a1a; color: white;
                        }
                        .container { 
                            max-width: 600px; margin: 0 auto; background: #2c2c2c; 
                        }
                        .header { 
                            background: linear-gradient(135deg, #ff1744, #d50000); 
                            color: white; padding: 40px 20px; text-align: center; 
                        }
                        .content { padding: 30px 20px; }
                        .discount-badge { 
                            background: linear-gradient(135deg, #ff9800, #f57c00); 
                            color: white; font-size: 4em; font-weight: bold; 
                            text-align: center; padding: 30px; 
                            border-radius: 20px; margin: 30px 0; 
                            text-shadow: 0 3px 6px rgba(0,0,0,0.5);
                            border: 3px solid #fff;
                            animation: glow 2s infinite alternate;
                        }
                        .cta { 
                            background: linear-gradient(135deg, #ff1744, #d50000); 
                            color: white; padding: 25px 50px; 
                            text-decoration: none; border-radius: 40px; 
                            display: inline-block; margin: 25px 0; 
                            font-weight: bold; font-size: 1.3em; 
                            text-transform: uppercase;
                            box-shadow: 0 8px 25px rgba(255, 23, 68, 0.5);
                            animation: shake 3s infinite;
                        }
                        .final-warning { 
                            background: linear-gradient(135deg, #ff5722, #d84315); 
                            padding: 30px; border-radius: 15px; 
                            margin: 30px 0; text-align: center;
                            border: 2px solid #fff;
                        }
                        @keyframes glow {
                            from { box-shadow: 0 0 20px #ff9800; }
                            to { box-shadow: 0 0 40px #ff9800, 0 0 60px #ff9800; }
                        }
                        @keyframes shake {
                            0%, 100% { transform: translateX(0); }
                            25% { transform: translateX(-5px); }
                            75% { transform: translateX(5px); }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔥 ÚLTIMA CHANCE!</h1>
                            <p style="margin: 0; font-size: 1.3em;">Esta é a sua FINAL oportunidade!</p>
                        </div>
                        
                        <div class="content">
                            <h2>⚠️ ${firstName}, NÃO PERCA ESTA CHANCE!</h2>
                            
                            <p style="font-size: 1.2em; line-height: 1.6;">
                                Esta é oficialmente a <strong>ÚLTIMA vez</strong> que oferecemos este desconto especial. 
                                Depois disso, o preço volta ao normal e você perderá para sempre esta oportunidade.
                            </p>
                            
                            <div class="final-warning">
                                <h3 style="margin-top: 0; font-size: 1.5em;">🚨 AVISO FINAL 🚨</h3>
                                <p style="font-size: 1.1em;">
                                    Após este e-mail, não enviaremos mais ofertas.<br>
                                    <strong>Esta é sua ÚLTIMA CHANCE de descobrir a verdade com desconto!</strong>
                                </p>
                            </div>
                            
                            <div class="discount-badge">
                                ${discount.discount}% OFF
                            </div>
                            
                            <p style="text-align: center; font-size: 1.4em;">
                                <span style="text-decoration: line-through; color: #888;">R$ 27,90</span><br>
                                <strong style="color: #ff9800; font-size: 1.8em;">
                                    R$ ${(27.90 * (1 - discount.discount/100)).toFixed(2)}
                                </strong><br>
                                <small style="color: #ccc;">Economize R$ ${(27.90 * (discount.discount/100)).toFixed(2)}</small>
                            </p>
                            
                            <div style="text-align: center;">
                                <a href="https://funilspy.com/checkout?discount=${discount.discount}&user=${userData.user_id}&utm_source=email&utm_campaign=final_offer" class="cta">
                                    GARANTIR AGORA OU PERDER PARA SEMPRE
                                </a>
                            </div>
                            
                            <p style="font-size: 0.9em; color: #ccc; text-align: center; margin-top: 30px;">
                                Após este e-mail, o preço volta para R$ 27,90 e não haverá mais descontos.
                            </p>
                        </div>
                    </div>
                    
                    <!-- Tracking pixel -->
                    <img src="https://funilspy.com/pixel/email-open?user=${userData.user_id}&campaign=final_offer" width="1" height="1" style="display:none;">
                </body>
                </html>
            `
        };
    }

    static getLastChanceEmail(userData, discount) {
        const firstName = userData.first_name || 'Cliente';
        
        return {
            subject: `💔 ${firstName}, você perdeu... ou não? (Última tentativa)`,
            html: `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Você perdeu... ou não?</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            margin: 0; padding: 0; background: #fafafa; 
                        }
                        .container { 
                            max-width: 600px; margin: 0 auto; background: white; 
                        }
                        .header { 
                            background: linear-gradient(135deg, #37474f, #263238); 
                            color: white; padding: 30px 20px; text-align: center; 
                        }
                        .content { padding: 30px 20px; }
                        .surprise-offer { 
                            background: linear-gradient(135deg, #4caf50, #388e3c); 
                            color: white; font-size: 2.5em; font-weight: bold; 
                            text-align: center; padding: 25px; 
                            border-radius: 15px; margin: 25px 0; 
                            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        }
                        .cta { 
                            background: linear-gradient(135deg, #4caf50, #388e3c); 
                            color: white; padding: 20px 40px; 
                            text-decoration: none; border-radius: 30px; 
                            display: inline-block; margin: 20px 0; 
                            font-weight: bold; font-size: 1.1em; 
                            text-transform: uppercase;
                            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
                        }
                        .personal-note { 
                            background: #f8f9fa; padding: 25px; 
                            border-radius: 10px; margin: 25px 0; 
                            border-left: 4px solid #4caf50;
                            font-style: italic;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>💔 Você perdeu...</h1>
                            <p style="margin: 0; font-size: 1.1em;">...ou talvez não?</p>
                        </div>
                        
                        <div class="content">
                            <h2>Oi ${firstName},</h2>
                            
                            <p>
                                Eu sei que você perdeu nossa oferta especial... mas deixe-me te contar uma coisa:
                            </p>
                            
                            <p>
                                <strong>Eu passei pela mesma situação que você.</strong> As dúvidas, as noites sem dormir, 
                                a sensação de que algo estava errado mas sem conseguir provar...
                            </p>
                            
                            <div class="personal-note">
                                <p><strong>Uma história pessoal:</strong></p>
                                <p>
                                    "Há 3 anos, eu suspeitava que meu parceiro estava me traindo. Passei meses 
                                    tentando descobrir a verdade sozinha, até que finalmente decidi investigar 
                                    o WhatsApp dele. Em 5 minutos, descobri tudo o que precisava saber."
                                </p>
                                <p style="text-align: right; margin: 0;">
                                    - Ana, Fundadora do WhatsApp Spy
                                </p>
                            </div>
                            
                            <p>
                                Por isso, decidi fazer algo que nunca fiz antes: 
                                <strong>dar uma última chance com o maior desconto que já ofereci.</strong>
                            </p>
                            
                            <div class="surprise-offer">
                                OFERTA SURPRESA<br>
                                ${discount.discount}% OFF
                            </div>
                            
                            <p style="text-align: center; font-size: 1.2em;">
                                <strong>De R$ 27,90 por apenas</strong><br>
                                <span style="color: #4caf50; font-size: 1.4em; font-weight: bold;">
                                    R$ ${(27.90 * (1 - discount.discount/100)).toFixed(2)}
                                </span>
                            </p>
                            
                            <p style="color: #666;">
                                <strong>Por que estou fazendo isso?</strong> Porque sei como é viver com dúvidas. 
                                E sei que você merece descobrir a verdade, mesmo que tenha perdido as ofertas anteriores.
                            </p>
                            
                            <div style="text-align: center;">
                                <a href="https://funilspy.com/checkout?discount=${discount.discount}&user=${userData.user_id}&utm_source=email&utm_campaign=last_chance" class="cta">
                                    ACEITAR OFERTA SURPRESA
                                </a>
                            </div>
                            
                            <p style="font-size: 0.9em; color: #666;">
                                <strong>Promessa:</strong> Este é realmente o último e-mail sobre ofertas. 
                                Se você não aproveitar agora, respeitarei sua decisão.
                            </p>
                        </div>
                    </div>
                    
                    <!-- Tracking pixel -->
                    <img src="https://funilspy.com/pixel/email-open?user=${userData.user_id}&campaign=last_chance" width="1" height="1" style="display:none;">
                </body>
                </html>
            `
        };
    }

    static getWhatsAppTemplate(userData, discount) {
        const firstName = userData.first_name || 'Cliente';
        
        return `🔍 *WhatsApp Spy* 

Oi ${firstName}! 👋

Você estava quase descobrindo a verdade sobre aquela pessoa especial... 

🔥 *OFERTA ESPECIAL PARA VOCÊ:*
${discount.discount}% OFF - De R$ 27,90 por *R$ ${(27.90 * (1 - discount.discount/100)).toFixed(2)}*

✅ Descubra conversas secretas
✅ Veja atividade online
✅ Resultados em 5 minutos
✅ 100% confidencial

⏰ *Válido apenas por 24h*

👉 Clique aqui para garantir: https://funilspy.com/checkout?discount=${discount.discount}&user=${userData.user_id}&utm_source=whatsapp

Não perca essa chance de descobrir a verdade! 🔍`;
    }
}

module.exports = EmailTemplates;