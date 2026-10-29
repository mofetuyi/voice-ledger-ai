/* ===================================
   AI-ASSISTANT.JS - Ask Your Business
   Multilingual Intelligent Business Advisory & Action Engine
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const AIAssistant = {
  messageHistory: [],

  init() {
    this.bindEvents();
    this.updateLanguage();
    this.updateGeminiStatusBadge();
    window.addEventListener('online', () => this.updateGeminiStatusBadge());
    window.addEventListener('offline', () => this.updateGeminiStatusBadge());
  },

  updateGeminiStatusBadge(forceOnline) {
    const badgeText = document.getElementById('geminiBadgeText');
    const pulseDot = document.getElementById('geminiPulseDot');
    const isOnline = forceOnline !== undefined ? forceOnline : (navigator.onLine && !!DB.getGeminiKey());

    if (badgeText && pulseDot) {
      if (isOnline) {
        badgeText.textContent = I18N.t('gemini_status_connected');
        pulseDot.classList.remove('offline');
      } else {
        badgeText.textContent = I18N.t('gemini_status_offline');
        pulseDot.classList.add('offline');
      }
    }
  },

  bindEvents() {
    document.getElementById('chatSendBtn')?.addEventListener('click', () => this.send());
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.send();
    });
    document.getElementById('chatVoiceBtn')?.addEventListener('click', () => VoiceModule.startListening('chat'));

    // Bind suggestion buttons
    document.getElementById('suggestedQuestions')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.suggest-btn');
      if (btn) {
        const q = btn.getAttribute('data-q') || btn.textContent.trim();
        const input = document.getElementById('chatInput');
        if (input) input.value = q;
        this.send();
      }
    });
  },

  updateLanguage() {
    const lang = I18N.current;
    const questionsContainer = document.getElementById('suggestedQuestions');
    if (!questionsContainer) return;

    const questionsByLang = {
      yo: [
        { q: 'Owó tó wọlé ní oṣù yìí?', label: 'Owó tó wọlé ní oṣù yìí?' },
        { q: 'Ọjà wo ló tà jùlọ?', label: 'Ọjà wo ló tà jùlọ?' },
        { q: 'Ta ló jẹ mí ní gbèsè?', label: 'Ta ló jẹ mí ní gbèsè?' },
        { q: 'Èrè mélòó ni mo ní lónìí?', label: 'Èrè mélòó ni mo ní lónìí?' },
        { q: 'Ọjà wo ló fẹ́ tán?', label: 'Ọjà wo ló fẹ́ tán?' },
        { q: 'Báwo ni mo ṣe lè mú owó mi pọ̀ síi?', label: 'Àmọ̀ràn láti mú owó pọ̀ síi?' }
      ],
      pcm: [
        { q: 'How much money enter this month?', label: 'Money wey enter this month?' },
        { q: 'Which product dey sell pass?', label: 'Which product sell pass?' },
        { q: 'Who dey owe me money?', label: 'Who dey owe me money?' },
        { q: 'Wetin be my profit today?', label: 'Wetin be my profit today?' },
        { q: 'Which goods dey finish?', label: 'Which goods dey finish?' },
        { q: 'How I fit grow my business?', label: 'How to make more money?' }
      ],
      ig: [
        { q: 'Ego ole batara n\'ọnwa a?', label: 'Ego ole batara n\'ọnwa a?' },
        { q: 'Kedu ngwaahịa kacha ere?', label: 'Kedu ngwaahịa kacha ere?' },
        { q: 'Onye ji m ụgwọ?', label: 'Onye ji m ụgwọ?' },
        { q: 'Uru ole ka m nwere taa?', label: 'Uru ole ka m nwere taa?' },
        { q: 'Kedu ngwaahịa na-agwụ?', label: 'Kedu ngwaahịa na-agwụ?' },
        { q: 'Kedu ka m ga-esi mụbaa ego m?', label: 'Ndụmọdụ azụmahịa?' }
      ],
      ha: [
        { q: 'Nawa ya shigo a wannan watan?', label: 'Nawa ya shigo a watan nan?' },
        { q: 'Wane kaya ne ya fi tafiya?', label: 'Kayan da ya fi tafiya?' },
        { q: 'Wane ne yake bina bashi?', label: 'Wa yake bina bashi?' },
        { q: 'Nawa ne ribata a yau?', label: 'Ribar yau?' },
        { q: 'Wane kaya ne yake karewa?', label: 'Kayan da ke karewa?' },
        { q: 'Yaya zan bunkasa kasuwancina?', label: 'Shawarwarin kasuwanci?' }
      ],
      edo: [
        { q: 'Egho bun vbe uki nẹ?', label: 'Egho bun vbe uki nẹ?' },
        { q: 'Ewa ne a khiẹn gbe?', label: 'Ewa ne a khiẹn gbe?' },
        { q: 'Ọmwa ne o mọ owe?', label: 'Ọmwa ne o mọ owe?' },
        { q: 'Ure ede nẹ?', label: 'Ure ede nẹ?' },
        { q: 'Ewa ne o fẹ parí?', label: 'Ewa ne o fẹ parí?' },
        { q: 'De vbe i khian ru ne egho bun?', label: 'Iruese ugbo?' }
      ],
      en: [
        { q: 'What is my total revenue this month?', label: 'Total revenue this month?' },
        { q: 'Which product sells the most?', label: 'Best-selling product?' },
        { q: 'Who owes me money?', label: 'Who owes me money?' },
        { q: 'What is my profit today?', label: 'What is my profit today?' },
        { q: 'Show me low stock items', label: 'Low stock items?' },
        { q: 'How can I grow my business?', label: 'Business growth tips?' }
      ]
    };

    const list = questionsByLang[lang] || questionsByLang['en'];
    questionsContainer.innerHTML = list.map(item => `
      <button class="suggest-btn" data-q="${item.q}">${item.label}</button>
    `).join('');
    this.updateGeminiStatusBadge();
  },

  async send() {
    const input = document.getElementById('chatInput');
    const query = input?.value?.trim();
    if (!query) return;

    input.value = '';
    this.appendUserMsg(query);
    this.showTyping();

    const lang = I18N.detectLanguage(query);

    // If offline and immediate action command, handle locally immediately
    const actionTx = this.detectTransactionAction(query);
    if (actionTx && !navigator.onLine) {
      setTimeout(() => {
        this.removeTyping();
        const responseData = this.handleTransactionAction(actionTx, lang);
        this.appendAIMsg(responseData);
      }, 300);
      return;
    }

    // Try Gemini first if online and API key exists
    if (navigator.onLine && DB.getGeminiKey()) {
      try {
        const geminiRes = await this.queryGemini(query, lang);
        this.removeTyping();
        this.appendAIMsg(geminiRes);
        this.updateGeminiStatusBadge(true);
        return;
      } catch (err) {
        console.warn('Gemini query encountered an issue, falling back to local intelligence:', err);
      }
    }

    // Fallback to local intelligence engine
    setTimeout(() => {
      this.removeTyping();
      const responseData = this.generateResponse(query);
      this.appendAIMsg({ ...responseData, source: 'local' });
      this.updateGeminiStatusBadge(false);
    }, 450);
  },

  appendUserMsg(text) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;

    const div = document.createElement('div');
    div.className = 'chat-msg user-msg';
    div.innerHTML = `
      <div class="msg-bubble">${this.esc(text)}</div>
      <div class="msg-avatar">👤</div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    this.messageHistory.push({ role: 'user', content: text });
  },

  appendAIMsg(data) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;

    const text = typeof data === 'string' ? data : data.text;
    const actionHtml = data.actionHtml || '';
    const isGemini = data.source === 'gemini';

    const div = document.createElement('div');
    div.className = 'chat-msg ai-msg';
    const msgId = 'msg-' + Date.now();
    div.id = msgId;

    const renderedHtml = this.formatResponseToHtml(text);
    const sourceBadge = isGemini
      ? `<span style="display:inline-flex; align-items:center; gap:4px; font-size:10px; background:linear-gradient(135deg, rgba(66,133,244,0.18), rgba(168,85,247,0.18)); color:#a5b4fc; padding:2px 8px; border-radius:12px; font-weight:600; border:1px solid rgba(138,180,248,0.25); margin-bottom:8px;">⚡ Gemini 3 Flash</span>`
      : `<span style="display:inline-flex; align-items:center; gap:4px; font-size:10px; background:rgba(255,255,255,0.06); color:var(--text-muted); padding:2px 8px; border-radius:12px; font-weight:600; margin-bottom:8px;">⚡ TuyiTek Smart Engine</span>`;

    div.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">
        <div>${sourceBadge}</div>
        <div class="msg-text-content">${renderedHtml}</div>
        ${actionHtml}
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;">
          <button class="btn btn-ghost" style="padding:2px 8px; font-size:11px;" onclick="AIAssistant.speak('${encodeURIComponent(text)}')">
            🔊 ${I18N.current === 'yo' ? 'Gbọ́' : I18N.current === 'pcm' ? 'Hear am' : 'Listen'}
          </button>
          <span class="msg-time">${new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    this.messageHistory.push({ role: 'ai', content: text });
  },

  formatResponseToHtml(text) {
    if (!text) return '';
    // If already pre-formatted HTML from local generator, preserve it
    if (text.includes('<strong>') || text.includes('<li>') || text.includes('<p>')) {
      return text.split('\n').map(line => line ? `<p style="margin:4px 0;">${line}</p>` : '<div style="height:6px;"></div>').join('');
    }

    let escaped = this.esc(text);
    // Markdown formatting
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px; color:var(--primary-light);">$1</h4>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 6px; color:#c4b5fd;">$1</h3>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0 8px; color:#e0e7ff;">$1</h2>');

    const lines = escaped.split('\n');
    return lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return `<div style="display:flex; gap:6px; margin:3px 0 3px 6px;"><span>•</span><span>${trimmed.substring(2)}</span></div>`;
      }
      return trimmed ? `<p style="margin:4px 0;">${trimmed}</p>` : '<div style="height:6px;"></div>';
    }).join('');
  },

  buildBusinessContext(lang) {
    const data = DB.getAnalytics();
    const biz = DB.getBusiness();
    const inv = DB.getInventory();
    const debts = DB.getDebts();
    const fmt = I18N.formatCurrency;

    const topDebtors = debts
      .filter(d => d.debtType === 'receivable' && d.status !== 'paid')
      .slice(0, 5)
      .map(d => `${d.person}: ${fmt(d.amount)} (due ${d.dueDate || 'pending'})`)
      .join(', ') || 'None';

    const lowStockItems = inv
      .filter(i => i.qty <= i.lowAlert)
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
• Business Name: ${biz.name || 'TuyiTek Merchant'}
• Business Type: ${biz.type || 'Retail'}
• Total Revenue (All Time): ${fmt(data.income)}
• Total Expenses (All Time): ${fmt(data.expense)}
• Net Profit: ${fmt(data.profit)}
• Profit Margin: ${data.profitMargin}%
• Today's Revenue: ${fmt(data.todayIncome)}
• Today's Expenses: ${fmt(data.todayExpense)}
• Today's Net: ${fmt(data.todayNet)}
• This Month's Revenue: ${fmt(data.monthIncome)}
• This Month's Expenses: ${fmt(data.monthExpense)}
• Total Debts Owed to Business (Receivables): ${fmt(data.receivable)} [Key Debtors: ${topDebtors}]
• Total Debts Business Owes Others (Payables): ${fmt(data.payable)}
• Inventory Stock Valuation: ${fmt(data.stockValue)}
• Low Stock Items: ${lowStockItems}
• Out of Stock Items: ${data.outOfStock} items

${langInstruction}

FORMATTING & GUIDELINES:
- Use emojis, clean formatting, bullet points, and bold text for clarity.
- Always use accurate financial math based on the data above.
- If the user asks for business advice, provide practical, high-ROI tips for growing profits, collecting debts, managing inventory, or cutting waste.

ACTION TAG PROTOCOL:
If the user tells you about a sale they made, money they received, or an expense they paid (e.g., "I sold 3 bags of rice for ₦45,000", "Record expense ₦2,000 for transport", "Mo ta ẹja ₦12,000", "Mo ná ₦1,500 lórí epo"), acknowledge it warmly and AT THE VERY END of your response on a new line, output EXACTLY this tag:
[ACTION:TRANSACTION:{"type":"income"|"expense","amount":number,"category":"sales"|"services"|"supplies"|"rent"|"utilities"|"transport"|"salary"|"other","description":"short summary"}]`;
  },

  async queryGemini(query, lang) {
    const key = DB.getGeminiKey();
    if (!key) throw new Error('No Gemini API key configured');

    const systemContext = this.buildBusinessContext(lang);
    const models = ['gemini-3-flash-preview', 'gemma-4-26b-a4b-it'];

    const promptText = `${systemContext}\n\nUSER QUESTION / COMMAND: ${query}`;
    const payload = {
      contents: [{
        parts: [{ text: promptText }]
      }]
    };

    let lastError = null;
    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errBody = await response.text();
          console.warn(`Gemini model ${model} failed (${response.status}):`, errBody);
          lastError = new Error(`API Error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('Empty response from Gemini');

        // Check for Action Tag
        let actionHtml = '';
        let cleanedText = rawText;
        const actionMatch = rawText.match(/\[ACTION:TRANSACTION:(\{.*?\})\]/);
        if (actionMatch && actionMatch[1]) {
          try {
            const actionData = JSON.parse(actionMatch[1]);
            cleanedText = rawText.replace(actionMatch[0], '').trim();
            const actionResult = this.handleTransactionAction(actionData, lang);
            actionHtml = actionResult.actionHtml || '';
          } catch(e) {
            console.warn('Failed to parse action JSON:', e);
          }
        }

        return {
          text: cleanedText,
          actionHtml,
          source: 'gemini'
        };
      } catch (err) {
        lastError = err;
        console.warn(`Attempt with ${model} failed:`, err.message);
      }
    }

    throw lastError || new Error('All Gemini models failed');
  },

  openGeminiSettings() {
    const modal = document.getElementById('geminiModal');
    const input = document.getElementById('geminiApiKeyInput');
    const resBox = document.getElementById('geminiTestResult');
    if (input) input.value = DB.getGeminiKey();
    if (resBox) resBox.style.display = 'none';
    if (modal) modal.classList.remove('hidden');
  },

  closeGeminiSettings() {
    document.getElementById('geminiModal')?.classList.add('hidden');
  },

  toggleKeyVisibility() {
    const input = document.getElementById('geminiApiKeyInput');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  },

  async testGeminiConnection() {
    const input = document.getElementById('geminiApiKeyInput');
    const testBtn = document.getElementById('geminiTestBtn');
    const resBox = document.getElementById('geminiTestResult');
    const key = (input?.value || DB.getGeminiKey()).trim();

    if (!key) {
      App.showToast('Please enter an API key', 'error');
      return;
    }

    if (testBtn) {
      testBtn.disabled = true;
      testBtn.textContent = 'Testing...';
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, confirm TuyiTek Gemini connection.' }] }]
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('No candidate content');

      if (resBox) {
        resBox.style.display = 'block';
        resBox.style.background = 'rgba(16,185,129,0.15)';
        resBox.style.border = '1px solid rgba(16,185,129,0.3)';
        resBox.style.color = '#34d399';
        resBox.innerHTML = `✅ ${I18N.t('gemini_test_success')}`;
      }
      App.showToast(I18N.t('gemini_test_success'), 'success');
    } catch(err) {
      if (resBox) {
        resBox.style.display = 'block';
        resBox.style.background = 'rgba(239,68,68,0.15)';
        resBox.style.border = '1px solid rgba(239,68,68,0.3)';
        resBox.style.color = '#f87171';
        resBox.innerHTML = `❌ ${I18N.t('gemini_test_failed')} (${err.message})`;
      }
      App.showToast(I18N.t('gemini_test_failed'), 'error');
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.textContent = I18N.t('gemini_test_btn');
      }
    }
  },

  saveGeminiSettings() {
    const input = document.getElementById('geminiApiKeyInput');
    const key = (input?.value || '').trim();
    if (!key) {
      App.showToast('API Key cannot be empty', 'error');
      return;
    }
    DB.setGeminiKey(key);
    this.updateGeminiStatusBadge(true);
    this.closeGeminiSettings();
    App.showToast('Gemini API settings saved successfully!', 'success');
  },

  speak(encodedText) {
    const text = decodeURIComponent(encodedText);
    VoiceModule.speak(text);
  },

  showTyping() {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'chat-msg ai-msg typing-msg';
    div.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  },

  removeTyping() {
    document.querySelector('.typing-msg')?.remove();
  },

  // ══════════════════════════════════════════════
  // SMART NLU & RESPONSE GENERATOR
  // ══════════════════════════════════════════════
  generateResponse(query) {
    const q      = query.toLowerCase().trim();
    const lang   = I18N.detectLanguage(query);
    const data   = DB.getAnalytics();
    const biz    = DB.getBusiness();
    const txs    = DB.getTransactions();
    const inv    = DB.getInventory();
    const debts  = DB.getDebts();
    const fmt    = I18N.formatCurrency;

    // ── 1. ACTION DETECTION: RECORD SALE / EXPENSE FROM CHAT ──
    const actionTx = this.detectTransactionAction(query);
    if (actionTx) {
      return this.handleTransactionAction(actionTx, lang);
    }

    // ── 2. REVENUE / PROFIT INQUIRIES ──
    if (
      /revenue|income|profit|money.*enter|earn|gain|owo.*wo|owo.*wọ|èrè|èré|ego.*batara|kudi.*shigo|riba|ure|wetin.*make|how much.*make|owo.*osù/i.test(q)
    ) {
      if (lang === 'yo') {
        const text = [
          `📊 <strong>Àkópọ̀ Ìṣirò Owó Rẹ:</strong>`,
          ``,
          `💰 <strong>Apapọ̀ Owó Wọlé:</strong> ${fmt(data.income)}`,
          `💸 <strong>Apapọ̀ Ìnáwó:</strong> ${fmt(data.expense)}`,
          `📈 <strong>Èrè Gidi Tó Ṣẹ́kù:</strong> ${fmt(data.profit)}`,
          `📅 <strong>Oṣù Yìí:</strong> ${fmt(data.monthIncome)} wọlé, ${fmt(data.monthExpense)} náwó`,
          `🎯 <strong>Ìwọ̀n Èrè:</strong> ${data.profitMargin}%`,
          ``,
          data.profit > 0
            ? `✅ <strong>Ìròyìn Ayọ̀!</strong> Iṣòwò rẹ ń sọ èrè dáadáa. Máa bá a lọ láti kọ gbogbo owó tí ń wọlé àti èyí tí ń jáde!`
            : `⚠️ <strong>Ìkìlọ̀:</strong> Ìnáwó rẹ pọ̀ ju owó tó ń wọlé lọ. Ẹ jọ̀wọ́ dín ìnáwó kù tàbí kí ẹ wa ọ̀nà láti mú títà pọ̀ síi.`
        ].join('\n');
        return { text };
      }

      if (lang === 'pcm') {
        const text = [
          `📊 <strong>See As Your Money Dey Stand:</strong>`,
          ``,
          `💰 <strong>Total Money Wey Enter:</strong> ${fmt(data.income)}`,
          `💸 <strong>Total Money Wey You Spend:</strong> ${fmt(data.expense)}`,
          `📈 <strong>Your Clean Profit:</strong> ${fmt(data.profit)}`,
          `📅 <strong>This Month:</strong> ${fmt(data.monthIncome)} enter, ${fmt(data.monthExpense)} go out`,
          `🎯 <strong>Profit Margin:</strong> ${data.profitMargin}%`,
          ``,
          data.profit > 0
            ? `✅ <strong>Omo your business dey burst!</strong> You dey make good gain. Keep tracking every kobo!`
            : `⚠️ <strong>Cost too high!</strong> You dey spend pass wetin enter. Cut expenses sharp sharp.`
        ].join('\n');
        return { text };
      }

      if (lang === 'ig') {
        const text = [
          `📊 <strong>Nchịkọta Ego Azụmahịa Gị:</strong>`,
          ``,
          `💰 <strong>Ego Niile Batara:</strong> ${fmt(data.income)}`,
          `💸 <strong>Ego Niile Ejiri:</strong> ${fmt(data.expense)}`,
          `📈 <strong>Ezigbo Uru Gị:</strong> ${fmt(data.profit)}`,
          `🎯 <strong>Pasent Uru:</strong> ${data.profitMargin}%`,
          ``,
          data.profit > 0
            ? `✅ <strong>Ozi Ọma!</strong> Azụmahịa gị na-amịpụta uru nke ukwuu. Gaa n'ihu!`
            : `⚠️ <strong>Ihe Egwu:</strong> Ihe oriri karịrị ego batara. Belata ihe oriri gị ngwa ngwa.`
        ].join('\n');
        return { text };
      }

      if (lang === 'ha') {
        const text = [
          `📊 <strong>Bayanin Kuɗin Kasuwancin Ka:</strong>`,
          ``,
          `💰 <strong>Kuɗin Da Ya Shigo:</strong> ${fmt(data.income)}`,
          `💸 <strong>Kuɗin Da Aka Kashe:</strong> ${fmt(data.expense)}`,
          `📈 <strong>Ainihin Riba:</strong> ${fmt(data.profit)}`,
          `🎯 <strong>Kason Riba:</strong> ${data.profitMargin}%`,
          ``,
          data.profit > 0
            ? `✅ <strong>Barka!</strong> Kasuwancinka yana kawo riba mai kyau. Ci gaba da bibiyar kowane kwabo!`
            : `⚠️ <strong>Faɗakarwa:</strong> Kuɗin da kake kashewa ya fi kuɗin shiga. Rage kashe kuɗi marasa amfani.`
        ].join('\n');
        return { text };
      }

      // Default English
      const text = [
        `📊 <strong>Financial Performance Overview:</strong>`,
        ``,
        `💰 <strong>Total Revenue:</strong> ${fmt(data.income)}`,
        `💸 <strong>Total Expenses:</strong> ${fmt(data.expense)}`,
        `📈 <strong>Net Profit:</strong> ${fmt(data.profit)}`,
        `📅 <strong>This Month:</strong> ${fmt(data.monthIncome)} revenue, ${fmt(data.monthExpense)} expenses`,
        `🎯 <strong>Profit Margin:</strong> ${data.profitMargin}%`,
        ``,
        data.profit > 0
          ? `✅ <strong>Profitable!</strong> Your business is running a healthy margin. Continue logging every transaction to maintain accuracy!`
          : `⚠️ <strong>Deficit Warning:</strong> Expenses exceed current revenue. Focus on high-margin sales and trim overhead costs.`
      ].join('\n');
      return { text };
    }

    // ── 3. TODAY'S PERFORMANCE ──
    if (/today|lónìí|loni|taa|yau|ede nẹ|wetin.*today|today.*sale|today.*profit/i.test(q)) {
      if (lang === 'yo') {
        return {
          text: [
            `📅 <strong>Àkópọ̀ Iṣòwò Ọjọ́ Òní:</strong>`,
            ``,
            `💰 <strong>Títà Ọjọ́ Òní:</strong> ${fmt(data.todayIncome)}`,
            `💸 <strong>Ìnáwó Ọjọ́ Òní:</strong> ${fmt(data.todayExpense)}`,
            `📈 <strong>Èrè Ọjọ́ Òní:</strong> ${fmt(data.todayNet)}`,
            `🔢 <strong>Iye Iṣòwò Tí A Kọ:</strong> ${data.todayTxCount}`,
            ``,
            data.todayIncome === 0
              ? `📌 Ẹ kò tí ì kọ iṣòwò kankan fún ọjọ́ òní. Ẹ tẹ bọ́tìnì ohùn láti kọ títà sílẹ̀!`
              : data.todayNet >= 0
                ? `✅ Ọjọ́ rere! Ẹ ní èrè lónìí.`
                : `⚠️ Ìnáwó lónìí pọ̀ ju títà lọ. Ẹ jẹ́ kí a kọ iṣòwò títà síwájú síi.`
          ].join('\n')
        };
      }

      return {
        text: [
          `📅 <strong>Today's Performance Summary:</strong>`,
          ``,
          `💰 <strong>Sales Today:</strong> ${fmt(data.todayIncome)}`,
          `💸 <strong>Expenses Today:</strong> ${fmt(data.todayExpense)}`,
          `📈 <strong>Net Profit Today:</strong> ${fmt(data.todayNet)}`,
          `🔢 <strong>Transactions:</strong> ${data.todayTxCount}`,
          ``,
          data.todayIncome === 0
            ? `📌 No sales recorded yet today. Use the voice command to quickly log sales!`
            : data.todayNet >= 0
              ? `✅ Good business day! You are operating in positive profit today.`
              : `⚠️ Operating in deficit today. Strive to generate additional sales before closing.`
        ].join('\n')
      };
    }

    // ── 4. DEBT / WHO OWES ME & WHATSAPP GENERATOR ──
    if (/debt|owe|credit|gbèsè|gbese|ụgwọ|ugwo|bashi|owe.*me|customer.*owe|who.*owe/i.test(q)) {
      const receivable = debts.filter(d => d.debtType === 'receivable' && d.status !== 'paid');
      const payable    = debts.filter(d => d.debtType === 'payable' && d.status !== 'paid');
      const totalRec   = receivable.reduce((s,d) => s+d.amount, 0);
      const totalPay   = payable.reduce((s,d) => s+d.amount, 0);

      if (lang === 'yo') {
        let text = [
          `💳 <strong>Àkójọpọ̀ Gbèsè Iṣòwò:</strong>`,
          ``,
          `📥 <strong>Owó Tí Wọ́n Jẹ Ọ́:</strong> ${fmt(totalRec)} (${receivable.length} oníbàárà)`,
          `📤 <strong>Owó Tí Ìwọ Jẹ Ènìyàn:</strong> ${fmt(totalPay)} (${payable.length} olùtajà)`,
          ``
        ];

        if (receivable.length > 0) {
          text.push(`<strong>Àwọn Tó Jẹ Ọ́ Ní Gbèsè:</strong>`);
          receivable.slice(0, 4).forEach((d, i) => {
            text.push(`${i+1}. 👤 <strong>${d.person}</strong>: ${fmt(d.amount)} ${d.dueDate ? `(Ọjọ́: ${d.dueDate})` : ''}`);
          });
          text.push(``);
          text.push(`💡 <em>Ẹ lè tẹ ọ̀rọ̀ WhatsApp ìsàlẹ̀ yìí láti rán ìránlétí sí wọn!</em>`);
        } else {
          text.push(`✅ Kò sí ẹnikẹ́ni tó jẹ ọ́ ní gbèsè ní báyìí!`);
        }

        let actionHtml = '';
        if (receivable.length > 0) {
          const topDebtor = receivable[0];
          const waPhone = (topDebtor.phone || '').replace(/\D/g, '');
          const waMsg = encodeURIComponent(`Ẹ kú ọjọ́ méjì o, ${topDebtor.person}. Ẹ jọ̀wọ́ mo rán yín létí nípa owó ${fmt(topDebtor.amount)} tí ẹ jẹ ${biz.name || 'iṣòwò wa'}. Ẹ ṣeun fún àkókò yín!`);
          actionHtml = `
            <div style="margin-top:10px; padding:10px; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.3); border-radius:8px;">
              <strong>📲 Ìránlétí WhatsApp Fún ${topDebtor.person}:</strong>
              <div style="margin-top:6px;">
                <a href="https://wa.me/${waPhone}?text=${waMsg}" target="_blank" class="btn btn-primary" style="font-size:12px; padding:6px 12px; display:inline-block; text-decoration:none;">
                  💬 Rán Ìránlétí WhatsApp Sí ${topDebtor.person}
                </a>
              </div>
            </div>
          `;
        }
        return { text: text.join('\n'), actionHtml };
      }

      // Default English / Pidgin
      let text = [
        `💳 <strong>Debt & Receivables Analysis:</strong>`,
        ``,
        `📥 <strong>Money Owed To You:</strong> ${fmt(totalRec)} (${receivable.length} customers)`,
        `📤 <strong>Money You Owe Others:</strong> ${fmt(totalPay)} (${payable.length} vendors)`,
        ``
      ];

      if (receivable.length > 0) {
        text.push(`<strong>Top Outstanding Debtors:</strong>`);
        receivable.slice(0, 4).forEach((d, i) => {
          text.push(`${i+1}. 👤 <strong>${d.person}</strong>: ${fmt(d.amount)} ${d.phone ? `(${d.phone})` : ''}`);
        });
        text.push(``);
        text.push(`💡 Regular follow-up recovers over 70% of delinquent debts. Send a polite reminder today!`);
      } else {
        text.push(`✅ All customer receivables are completely settled! Outstanding collection risk is zero.`);
      }

      let actionHtml = '';
      if (receivable.length > 0) {
        const topDebtor = receivable[0];
        const waPhone = (topDebtor.phone || '').replace(/\D/g, '');
        const waMsg = encodeURIComponent(`Hello ${topDebtor.person}, friendly reminder regarding the outstanding balance of ${fmt(topDebtor.amount)} with ${biz.name || 'our business'}. Kindly let us know when payment will be completed. Thank you!`);
        actionHtml = `
          <div style="margin-top:10px; padding:10px; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.3); border-radius:8px;">
            <strong>📲 1-Click WhatsApp Reminder for ${topDebtor.person}:</strong>
            <div style="margin-top:6px;">
              <a href="https://wa.me/${waPhone}?text=${waMsg}" target="_blank" class="btn btn-primary" style="font-size:12px; padding:6px 12px; display:inline-block; text-decoration:none;">
                💬 Send Reminder via WhatsApp
              </a>
            </div>
          </div>
        `;
      }
      return { text: text.join('\n'), actionHtml };
    }

    // ── 5. INVENTORY & STOCK QUERIES ──
    if (/stock|inventory|ọjà|oja|goods|akọnụ|kaya|ewa|low.*stock|wetin.*remain/i.test(q)) {
      const lowItems = inv.filter(p => p.qty <= p.lowAlert && p.qty > 0);
      const outItems = inv.filter(p => p.qty === 0);
      const totalVal = inv.reduce((s,p) => s + p.costPrice * p.qty, 0);

      if (lang === 'yo') {
        return {
          text: [
            `📦 <strong>Ipò Àwọn Ọjà Rẹ Nílẹ̀:</strong>`,
            ``,
            `📊 <strong>Àpapọ̀ Ọjà Tí Ó Wà:</strong> ${inv.length}`,
            `💎 <strong>Iye Owó Gbogbo Ọjà:</strong> ${fmt(totalVal)}`,
            `⚠️ <strong>Àwọn Ọjà Tó Fẹ́ Tán:</strong> ${lowItems.length}`,
            `❌ <strong>Àwọn Ọjà Tó Ti Tán Pátápátá:</strong> ${outItems.length}`,
            ``,
            lowItems.length > 0 ? `🔴 <strong>Àwọn tó fẹ́ tán:</strong> ${lowItems.map(p => `${p.name} (ẹ̀yọ ${p.qty} ló kù)`).join(', ')}` : '',
            outItems.length > 0 ? `❌ <strong>Àwọn tó ti tán:</strong> ${outItems.map(p => p.name).join(', ')}` : '✅ Gbogbo ọjà rẹ wà nílẹ̀ dáadáa!',
            ``,
            `💡 <em>Àmọ̀ràn: Ra àwọn ọjà tó ń tán kíákíá kí ẹ má bà a sọ oníbàárà nù!</em>`
          ].filter(l => l !== '').join('\n')
        };
      }

      return {
        text: [
          `📦 <strong>Inventory & Stock Health:</strong>`,
          ``,
          `📊 <strong>Total Unique Products:</strong> ${inv.length}`,
          `💎 <strong>Total Stock Valuation:</strong> ${fmt(totalVal)}`,
          `⚠️ <strong>Low Stock Warning:</strong> ${lowItems.length} items`,
          `❌ <strong>Completely Out of Stock:</strong> ${outItems.length} items`,
          ``,
          lowItems.length > 0 ? `🔴 <strong>Low stock items:</strong> ${lowItems.map(p => `${p.name} (${p.qty} left)`).join(', ')}` : '',
          outItems.length > 0 ? `❌ <strong>Out of stock:</strong> ${outItems.map(p => p.name).join(', ')}` : '✅ All inventory items are adequately stocked.',
          ``,
          `💡 <em>Recommendation: Reorder fast-selling stock immediately to capture unfulfilled customer demand!</em>`
        ].filter(l => l !== '').join('\n')
      };
    }

    // ── 6. BUSINESS HEALTH SCORE ──
    if (/health|score|vitality|ìlera|ilera|ahụike|lafiyar|status|diagnosis/i.test(q)) {
      const score = HealthScore.calculate();
      const verdict = HealthScore.getVerdict(score);

      if (lang === 'yo') {
        return {
          text: [
            `💚 <strong>Ìwọ̀n Ìlera Iṣòwò Rẹ:</strong> ${Math.round(score)}/100 (${verdict.label})`,
            ``,
            `Ẹ̀rọ AI ń ṣàyẹ̀wò òwò rẹ nípasẹ̀:`,
            `• 📈 Ìdàgbàsókè owó wọlé`,
            `• 💰 Ìwọ̀n èrè gidi`,
            `• 📦 Ìlera àwọn ọjà rẹ nílẹ̀`,
            `• 💳 Ìtọ́jú gbèsè àti àwọn tó jẹ ọ́`,
            `• 💧 Bí owó ṣe ń ṣàn lọ́wọ́ rẹ`,
            ``,
            score >= 70
              ? `✅ <strong>Iṣòwò rẹ wà ní ipò tó dára gan-an!</strong> Máa tẹ̀síwájú nínú ìtòlẹ́sẹẹsẹ ìnáwó rẹ.`
              : `⚠️ <strong>Àkíyèsí:</strong> Iṣòwò rẹ nílò àfikún ìfẹsẹ̀múlẹ̀. Dín àwọn ìnáwó tí kò pọndandan kù kí o sì wa àwọn oníbàárà tuntun.`
          ].join('\n')
        };
      }

      return {
        text: [
          `💚 <strong>Business Health Diagnosis:</strong> ${Math.round(score)}/100 (${verdict.label})`,
          ``,
          `Your vitality is computed dynamically across 6 core pillars:`,
          `1. Revenue Velocity & Growth`,
          `2. Gross & Net Profit Margin`,
          `3. Stock Turnover & Inventory Availability`,
          `4. Debt-to-Revenue Exposure`,
          `5. Transaction Activity Frequency`,
          `6. Working Capital Cash Flow`,
          ``,
          score >= 70
            ? `✅ <strong>Solid Health!</strong> Your financial indicators are resilient. Keep building operational reserves.`
            : `⚠️ <strong>Action Needed:</strong> Strengthen collections and reduce unessential overhead to boost your vitality score.`
        ].join('\n')
      };
    }

    // ── 7. BUSINESS GROWTH TIPS & ADVISORY ──
    if (/tip|advice|grow|improve|boost|àmọ̀ràn|amoran|ona|how.*better|wetin.*do/i.test(q)) {
      if (lang === 'yo') {
        const tips = [
          '💡 <strong>Kọ gbogbo iṣòwò sílẹ̀:</strong> Kódà owó kékeré bí ₦500 tàbí ₦1,000 máa ń kóra jọ di owó ńlá.',
          '📦 <strong>Má ṣe jẹ́ kí ọjà tó ń tà tán:</strong> Mọ àwọn ọjà 3 tó ń tà jùlọ fún ọ, kí o sì rí i dájú pé wọ́n wà nílẹ̀ nígbà gbogbo.',
          '💳 <strong>Tẹ̀lé àwọn ajẹgbèsè lẹ́sẹ̀kẹsẹ̀:</strong> Má ṣe jẹ́ kí gbèsè kọjá ọjọ́ méje kí o tó rán ìránlétí WhatsApp sí wọn.',
          '🧾 <strong>Máa fún wọn ní ìwé ẹ̀rí (Invoice):</strong> Ó ń mú kí iṣòwò rẹ ní ọlá àti ìgbẹ́kẹ̀lé gidi lójú àwọn oníbàárà.',
          '💰 <strong>Pín owó rẹ sọ́tọ̀:</strong> Ya owó ìnáwó ara rẹ sọ́tọ̀ kúrò nínú owó iṣòwò pátápátá.'
        ];
        return {
          text: [
            `💡 <strong>Àwọn Àmọ̀ràn Pàtàkì Láti Mú Iṣòwò Rẹ Dàgbà:</strong>`,
            ``,
            ...tips,
            ``,
            `🚀 <strong>TuyiTek Digital Solutions</strong> wà pẹ̀lú rẹ láti ṣe àtìlẹ́yìn fún àṣeyọrí rẹ!`
          ].join('\n')
        };
      }

      const tips = [
        '💡 <strong>Zero Revenue Leakage:</strong> Record every single transaction, regardless of size — untracked petty cash drains SME profits.',
        '📦 <strong>Stock Velocity Priority:</strong> Keep your top 20% revenue-driving inventory constantly stocked to eliminate stockout losses.',
        '💳 <strong>Proactive Debt Follow-up:</strong> Send polite payment reminders via WhatsApp 48 hours before debts mature.',
        '🧾 <strong>Professional Billing:</strong> Issue formal digital invoices; customers settle verified invoices 2.5x faster than verbal requests.',
        '💰 <strong>Separate Personal & Business Funds:</strong> Pay yourself a fixed business salary rather than dipping into daily cash drawers.'
      ];
      return {
        text: [
          `💡 <strong>Strategic Growth Recommendations:</strong>`,
          ``,
          ...tips,
          ``,
          `🚀 Powered by <strong>TuyiTek Digital Solutions</strong> financial intelligence.`
        ].join('\n')
      };
    }

    // ── 8. DEFAULT FALLBACK ──
    if (lang === 'yo') {
      return {
        text: [
          `Ẹ káàbọ̀! Èmi ni olùrànlọ́wọ́ AI TuyiTek Digital Solutions rẹ.`,
          ``,
          `Mo lè ràn yín lọ́wọ́ pẹ̀lú:`,
          `• 📊 Àyẹ̀wò owó wọlé àti èrè tí ẹ rí`,
          `• 📦 Bójúwò àwọn ọjà tó wà àti èyí tó fẹ́ tán`,
          `• 💳 Mọ àwọn tó jẹ ọ́ ní gbèsè àti fífiranṣẹ́ sí WhatsApp wọn`,
          `• 💡 Gbígba àmọ̀ràn pàtàkì fún ìdàgbàsókè òwò rẹ`,
          `• 🎙️ Kíkọ iṣòwò tuntun sílẹ̀ (àpẹẹrẹ: "Mo ta ₦10,000 fún epo")`,
          ``,
          `Ẹ béèrè ohunkóhun lónìí!`
        ].join('\n')
      };
    }

    return {
      text: [
        `I'm your <strong>TuyiTek Digital Solutions AI Business Assistant</strong>!`,
        ``,
        `I provide instant financial intelligence for your business:`,
        `• 📊 Revenue, expense & real profit margin analysis`,
        `• 📦 Inventory valuation & low-stock early warnings`,
        `• 💳 Receivables recovery & 1-click WhatsApp payment reminders`,
        `• 💡 Actionable growth tips and SME cash-flow advice`,
        `• 🎙️ Direct entry creation (e.g. <em>"Record sale ₦12,000 for rice"</em>)`,
        ``,
        `How can I assist your business operations today?`
      ].join('\n')
    };
  },

  // ══════════════════════════════════════════════
  // ACTION ENGINE: Parse voice/chat into real ledger entry
  // ══════════════════════════════════════════════
  detectTransactionAction(text) {
    const t = text.toLowerCase();
    const amountMatch = t.match(/(\d[\d,]*(?:\.\d+)?)/);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return null;

    // Check if it's a sale / income
    const isIncome = /(record|add|enter|log|sold|sale|income|ta|títà|tita|rere|ere|gain)/i.test(t) && !/(na|spent|expense|bought|cost)/i.test(t);
    // Check if it's an expense
    const isExpense = /(na|spent|expense|bought|cost|pay|bills|loss|inawo|ìnáwó)/i.test(t);

    if (!isIncome && !isExpense) return null;

    const type = isIncome ? 'income' : 'expense';

    // Extract description: remove numbers and action words
    let desc = text
      .replace(/(\d[\d,]*(?:\.\d+)?)/g, '')
      .replace(/naira|₦|record|add|enter|sale|sold|mo ta|mo na|expense|spent|bought|for|of|lori|fun/gi, '')
      .trim();

    if (!desc) {
      desc = type === 'income' ? 'Cash Sale' : 'Business Expense';
    }

    // Auto category
    let category = 'sales';
    if (type === 'expense') {
      if (/fuel|petrol|diesel|generator|epo/i.test(desc)) category = 'utilities';
      else if (/transport|fare|bus|okada|fuel/i.test(desc)) category = 'transport';
      else if (/food|feeding|lunch/i.test(desc)) category = 'supplies';
      else if (/rent|shop/i.test(desc)) category = 'rent';
      else category = 'supplies';
    }

    return { type, amount, description: desc, category };
  },

  handleTransactionAction(action, lang) {
    const fmt = I18N.formatCurrency;
    const isYo = lang === 'yo';
    const actionKey = 'tx_act_' + Date.now();

    window._pendingTx = window._pendingTx || {};
    window._pendingTx[actionKey] = action;

    const label = action.type === 'income' ? (isYo ? 'Owó Wọlé (Títà)' : 'Income (Sale)') : (isYo ? 'Ìnáwó' : 'Expense');
    const confirmBtn = isYo ? '✅ Tẹ́ ẹ láti Fipamọ́ Sínú Ìwé' : '✅ Confirm & Save to Ledger';

    const text = isYo
      ? `📝 <strong>Mo ti gbọ́ iṣòwò rẹ:</strong>\n\n• <strong>Irúfẹ́:</strong> ${label}\n• <strong>Iye Owó:</strong> ${fmt(action.amount)}\n• <strong>Ìjúwe:</strong> ${action.description}\n• <strong>Ìsọ̀rí:</strong> ${action.category}\n\nṢé kí n kọ ọ́ sínú iwe àkọọ́lẹ̀ báyìí?`
      : `📝 <strong>Transaction Detected:</strong>\n\n• <strong>Type:</strong> ${label}\n• <strong>Amount:</strong> ${fmt(action.amount)}\n• <strong>Description:</strong> ${action.description}\n• <strong>Category:</strong> ${action.category}\n\nWould you like me to record this into your ledger?`;

    const actionHtml = `
      <div style="margin-top:10px; padding:12px; background:rgba(108,60,245,0.15); border:1px solid rgba(108,60,245,0.4); border-radius:10px;">
        <button class="btn btn-primary btn-full" onclick="AIAssistant.executeSaveTx('${actionKey}')">
          ${confirmBtn}
        </button>
      </div>
    `;

    return { text, actionHtml };
  },

  executeSaveTx(key) {
    if (!window._pendingTx || !window._pendingTx[key]) return;
    const action = window._pendingTx[key];

    const tx = {
      id: DB.genId(),
      type: action.type,
      amount: action.amount,
      category: action.category,
      date: new Date().toISOString().split('T')[0],
      description: action.description,
      customer: '',
      payment: 'cash',
      createdAt: new Date().toISOString()
    };

    DB.saveTransaction(tx);
    Ledger.render();
    App.refreshDashboard();
    Alerts.generateAlerts();

    delete window._pendingTx[key];

    const msg = I18N.current === 'yo'
      ? `🎉 A ti fipamọ́ sínú ìwé àkọọ́lẹ̀ pẹ̀lú àṣeyọrí! (${I18N.formatCurrency(tx.amount)})`
      : `🎉 Transaction recorded into ledger successfully! (${I18N.formatCurrency(tx.amount)})`;

    App.showToast(msg, 'success');
    this.appendAIMsg(msg);
  },

  // Called from voice module
  sendVoiceQuery(text) {
    const input = document.getElementById('chatInput');
    if (input) input.value = text;
    this.send();
  },

  esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
};
