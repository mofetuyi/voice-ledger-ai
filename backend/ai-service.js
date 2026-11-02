/**
 * AI-SERVICE.JS - Enterprise Server-Side Gemini AI Gateway
 * Voice Ledger AI by TuyiTek Digital Solutions
 * 
 * Features:
 * - Secure server-side API key handling (via GEMINI_API_KEY environment variable)
 * - Automatic model failover (gemini-3-flash-preview -> gemma-4-26b-a4b-it)
 * - Real-time business telemetry injection
 * - Multilingual prompt engineering (Pure Yorùbá, Pidgin, Igbo, Hausa, Edo, English)
 * - Transaction action extraction
 * - Resilient offline fallback generator
 */

const https = require('https');
const db = require('./db');
const { calculateAnalytics } = require('./analytics');

class AIService {
  constructor() {
    this.models = ['gemini-3-flash-preview', 'gemma-4-26b-a4b-it'];
  }

  getActiveKey(clientKey) {
    const envKey = process.env.GEMINI_API_KEY;
    if (envKey && envKey.trim().length > 10) {
      return envKey.trim();
    }
    if (clientKey && typeof clientKey === 'string' && clientKey.trim().length > 10) {
      return clientKey.trim();
    }
    return null;
  }

  hasConfiguredKey() {
    return !!this.getActiveKey();
  }

  formatNaira(amount) {
    return '₦' + Number(amount || 0).toLocaleString('en-NG');
  }

  buildSystemContext(lang) {
    const analytics = calculateAnalytics();
    const business = db.getBusiness();
    const debts = db.getCollection('debts');
    const inv = db.getCollection('inventory');

    const topDebtors = debts
      .filter(d => d.debtType === 'receivable' && d.status !== 'paid')
      .slice(0, 5)
      .map(d => `${d.person}: ${this.formatNaira(d.amount)} (due ${d.dueDate || 'pending'})`)
      .join(', ') || 'None';

    const lowStockItems = inv
      .filter(i => i.qty <= (i.lowAlert || 5))
      .map(i => `${i.name} (qty: ${i.qty} ${i.unit || ''})`)
      .join(', ') || 'None';

    let langInstruction = '';
    if (lang === 'yo') {
      langInstruction = `CRITICAL LANGUAGE REQUIREMENT:
You MUST respond in 100% natural, fluent, culturally rich, pure standard Yoruba with accurate tone marks (diacritics: à, á, è, é, ẹ, ẹ́, ẹ̀, ì, í, ò, ó, ọ, ọ́, ọ̀, ù, ú, ṣ).
DO NOT USE ANY ENGLISH WORDS. Even numbers and dates must be expressed in Yoruba or with standard naira currency notation (₦).
Maintain respectful Yoruba business tone (e.g. Ẹ kú iṣẹ́, ọ̀gá/màmá olówó ìṣòwò).`;
    } else if (lang === 'pcm') {
      langInstruction = `LANGUAGE REQUIREMENT: Respond in authentic, vibrant Nigerian Pidgin English (e.g. 'How far my person', 'Omo your business dey grow well well', 'Wetin dey happen be say...').`;
    } else if (lang === 'ig') {
      langInstruction = `LANGUAGE REQUIREMENT: Respond in natural, fluent standard Igbo.`;
    } else if (lang === 'ha') {
      langInstruction = `LANGUAGE REQUIREMENT: Respond in natural, fluent standard Hausa.`;
    } else if (lang === 'edo') {
      langInstruction = `LANGUAGE REQUIREMENT: Respond in natural, fluent standard Edo.`;
    } else {
      langInstruction = `LANGUAGE REQUIREMENT: Respond in clear, encouraging, professional Nigerian business English.`;
    }

    return `You are TuyiTek Voice Ledger AI, an elite multilingual financial advisor and smart business partner created by TuyiTek Digital Solutions for Nigerian and African small/medium businesses.

REAL-TIME BUSINESS TELEMETRY & FINANCIAL DATA:
• Business Name: ${business.name || 'TuyiTek Merchant'}
• Business Type: ${business.type || 'Retail Store'}
• Total Revenue: ${this.formatNaira(analytics.income)}
• Total Expenses: ${this.formatNaira(analytics.expense)}
• Net Profit: ${this.formatNaira(analytics.profit)} (Margin: ${analytics.profitMargin}%)
• Today's Revenue: ${this.formatNaira(analytics.todayIncome)}
• Today's Expenses: ${this.formatNaira(analytics.todayExpense)}
• Today's Net: ${this.formatNaira(analytics.todayNet)}
• This Month's Revenue: ${this.formatNaira(analytics.monthIncome)}
• This Month's Expenses: ${this.formatNaira(analytics.monthExpense)}
• Total Receivables (Debts Owed to Business): ${this.formatNaira(analytics.receivable)} [Key Debtors: ${topDebtors}]
• Total Payables (Debts Business Owes): ${this.formatNaira(analytics.payable)}
• Inventory Stock Valuation: ${this.formatNaira(analytics.stockValue)}
• Low Stock Items: ${lowStockItems}
• Out of Stock Items: ${analytics.outOfStock} items
• Business Health Score: ${analytics.healthScore}/100

${langInstruction}

FORMATTING & GUIDELINES:
- Use emojis, clean formatting, bullet points, and bold text for clarity.
- Always use accurate financial math based on the data above.
- If the user asks for business advice, provide practical, high-ROI tips for growing profits, collecting debts, managing inventory, or cutting waste.

ACTION TAG PROTOCOL:
If the user tells you about a sale they made, money they received, or an expense they paid (e.g., "I sold 3 bags of rice for ₦45,000", "Record expense ₦2,000 for transport", "Mo ta ẹja ₦12,000", "Mo ná ₦1,500 lórí epo"), acknowledge it warmly and AT THE VERY END of your response on a new line, output EXACTLY this tag:
[ACTION:TRANSACTION:{"type":"income"|"expense","amount":number,"category":"sales"|"services"|"supplies"|"rent"|"utilities"|"transport"|"salary"|"other","description":"short summary"}]`;
  }

  async requestGemini(model, apiKey, prompt) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 12000
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) resolve(text);
              else reject(new Error('Empty candidate response from Gemini API'));
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`Gemini API HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout calling Gemini model ${model}`));
      });

      req.write(payload);
      req.end();
    });
  }

  async chat(query, lang = 'en', clientKey = null) {
    const apiKey = this.getActiveKey(clientKey);

    if (apiKey) {
      const systemContext = this.buildSystemContext(lang);
      const fullPrompt = `${systemContext}\n\nUSER QUESTION / COMMAND: ${query}`;

      for (const model of this.models) {
        try {
          const rawText = await this.requestGemini(model, apiKey, fullPrompt);

          // Extract action tag
          let actionData = null;
          let cleanedText = rawText;
          const match = rawText.match(/\[ACTION:TRANSACTION:(\{.*?\})\]/);
          if (match && match[1]) {
            try {
              actionData = JSON.parse(match[1]);
              cleanedText = rawText.replace(match[0], '').trim();
            } catch (e) {
              console.warn('Action parse warning:', e.message);
            }
          }

          return {
            source: 'gemini',
            model,
            text: cleanedText,
            action: actionData
          };
        } catch (err) {
          console.warn(`Model ${model} failed, checking fallback:`, err.message);
        }
      }
    }

    // Local Intelligent Fallback
    return this.generateLocalFallback(query, lang);
  }

  generateLocalFallback(query, lang) {
    const analytics = calculateAnalytics();
    const fmt = this.formatNaira;
    const isYo = lang === 'yo';
    const isPcm = lang === 'pcm';

    if (/revenue|profit|income|owo|èrè/i.test(query)) {
      if (isYo) {
        return {
          source: 'local',
          text: `📊 <strong>Àkópọ̀ Ìṣirò Owó Rẹ:</strong>\n\n• <strong>Apapọ̀ Owó Wọlé:</strong> ${fmt(analytics.income)}\n• <strong>Apapọ̀ Ìnáwó:</strong> ${fmt(analytics.expense)}\n• <strong>Èrè Tó Ṣẹ́kù:</strong> ${fmt(analytics.profit)}\n• <strong>Ìwọ̀n Èrè:</strong> ${analytics.profitMargin}%\n\n${analytics.profit > 0 ? '✅ Ìṣòwò rẹ ń sọ èrè dáadáa!' : '⚠️ Ìnáwó pọ̀ ju owó tó ń wọlé lọ.'}`
        };
      }
      if (isPcm) {
        return {
          source: 'local',
          text: `📊 <strong>See As Your Money Dey Stand:</strong>\n\n• <strong>Total Income:</strong> ${fmt(analytics.income)}\n• <strong>Total Expense:</strong> ${fmt(analytics.expense)}\n• <strong>Clean Profit:</strong> ${fmt(analytics.profit)}\n• <strong>Profit Margin:</strong> ${analytics.profitMargin}%\n\n${analytics.profit > 0 ? '✅ Business dey run well well!' : '⚠️ Expense dey high o, cut spending.'}`
        };
      }
      return {
        source: 'local',
        text: `📊 <strong>Financial Overview:</strong>\n\n• <strong>Total Revenue:</strong> ${fmt(analytics.income)}\n• <strong>Total Expenses:</strong> ${fmt(analytics.expense)}\n• <strong>Net Profit:</strong> ${fmt(analytics.profit)}\n• <strong>Profit Margin:</strong> ${analytics.profitMargin}%\n\n${analytics.profit > 0 ? '✅ Your business is operating profitably!' : '⚠️ Expenses are exceeding current revenues.'}`
      };
    }

    // Default response
    const defaultText = isYo
      ? `Mo ti gbọ́ ọ̀rọ̀ rẹ: "${query}". Ẹ lè béèrè nípa owó tó wọlé, èrè, ọjà tó fẹ́ tán, tàbí gbèsè tó wà lórí ilé-iṣẹ́ rẹ!`
      : isPcm
      ? `I hear you: "${query}". You fit ask me about your profit today, who dey owe money, or wetin remain for shop!`
      : `I have received your request: "${query}". You can ask about today's income, best-selling inventory, pending debts, or growth tips!`;

    return { source: 'local', text: defaultText };
  }
}

module.exports = new AIService();
