/* ===================================
   VOICE.JS - Voice Recognition & Synthesis
   Web Speech API with Multilingual Support
   Voice Ledger AI by TuyiTek Digital Solutions
=================================== */

const VoiceModule = {
  recognition: null,
  isListening: false,
  currentContext: 'general',

  init() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Voice recognition not supported in this browser.');
      document.querySelectorAll('.btn-voice, .voice-fab, #voiceTriggerMini, #chatVoiceBtn').forEach(el => {
        el.title = 'Voice recognition works on modern Chrome and Edge browsers';
      });
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRec();
    this.recognition.continuous     = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives= 1;
    this.recognition.lang           = this.getLang();

    this.recognition.onstart = () => {
      this.isListening = true;
      this.showOverlay();
    };

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const transcriptEl = document.getElementById('voiceTranscript');
      if (transcriptEl) transcriptEl.textContent = transcript;

      if (event.results[event.resultIndex].isFinal) {
        this.processCommand(transcript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Voice error:', event.error);
      this.hideOverlay();
      let msg = I18N.current === 'yo' ? 'Àṣìṣe ohùn ṣẹlẹ̀.' : 'Voice recognition error.';
      if (event.error === 'not-allowed') {
        msg = I18N.current === 'yo' ? 'Ẹ jọ̀wọ́ gba ẹ̀rọ àbánisọ̀rọ̀ láyè láti lo gbohùngbohùn.' : 'Microphone permission was denied.';
      }
      if (event.error === 'no-speech') {
        msg = I18N.current === 'yo' ? 'Kò sí ohùn kankan tí a gbọ́. Ẹ tún gbìyànjú.' : 'No speech detected. Please try again.';
      }
      App.showToast(msg, 'error');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (document.getElementById('voiceOverlay')?.classList.contains('active')) {
        setTimeout(() => this.hideOverlay(), 1200);
      }
    };

    this.bindEvents();
  },

  getLang() {
    const langMap = {
      en: 'en-NG',
      yo: 'yo-NG',
      pcm: 'en-NG',
      ig: 'ig-NG',
      ha: 'ha-NG',
      edo: 'en-NG'
    };
    return langMap[I18N.current] || 'en-NG';
  },

  bindEvents() {
    document.getElementById('voiceFab')?.addEventListener('click', () => this.startListening('general'));
    document.getElementById('voiceTriggerMini')?.addEventListener('click', () => this.startListening('general'));
    document.getElementById('voiceStopBtn')?.addEventListener('click', () => this.stop());

    document.getElementById('languageSelect')?.addEventListener('change', () => {
      if (this.recognition) this.recognition.lang = this.getLang();
    });
  },

  startListening(context = 'general') {
    if (!this.recognition) {
      App.showToast(
        I18N.current === 'yo' ? 'Ẹ̀rọ yín kò gba ohùn láàyè. Lo Google Chrome tàbí Edge.' : 'Voice recognition not supported. Use Chrome or Edge.',
        'warning'
      );
      return;
    }
    if (this.isListening) return;
    this.currentContext = context;

    const listeningText = document.getElementById('voiceListeningText');
    if (listeningText) {
      const isYo = I18N.current === 'yo';
      const hints = {
        general:   isYo ? 'Ń gbọ́rọ̀... Sọ àṣẹ kan' : 'Listening... Say a command',
        ledger:    isYo ? 'Sọ pé: "Mo ta ₦5,000 fún ìrẹsì" tàbí "Mo ná ₦2,000 fún epo"' : 'Say: "Record sale ₦5,000" or "Add expense ₦2,000 for fuel"',
        inventory: isYo ? 'Sọ pé: "Fi àpò ìrẹsì 20 kún ọjà"' : 'Say: "Add 20 bags of rice" or "Update stock"',
        chat:      isYo ? 'Béèrè ohunkóhun nípa òwò rẹ...' : 'Ask your business anything...'
      };
      listeningText.textContent = hints[context] || I18N.t('voice_listening');
    }

    try {
      this.recognition.lang = this.getLang();
      this.recognition.start();
    } catch(e) {
      console.error(e);
    }
  },

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.hideOverlay();
  },

  showOverlay() {
    const overlay = document.getElementById('voiceOverlay');
    if (overlay) overlay.classList.add('active');
  },

  hideOverlay() {
    const overlay = document.getElementById('voiceOverlay');
    if (overlay) overlay.classList.remove('active');
    const transcript = document.getElementById('voiceTranscript');
    if (transcript) transcript.textContent = '';
  },

  // Parse voice commands in English, Yoruba, Pidgin, etc.
  processCommand(text) {
    const t = text.toLowerCase();
    const isYo = I18N.current === 'yo';

    // 1. In chat context: forward directly to AI
    if (this.currentContext === 'chat') {
      setTimeout(() => AIAssistant.sendVoiceQuery(text), 500);
      return;
    }

    // 2. SALE / INCOME
    const isSale = /(mo ta|títà|tita|record sale|add sale|enter sale|sold|i sold|revenue)/i.test(t);
    if (isSale) {
      const amount = this.extractAmount(text);
      if (amount) {
        const desc = this.extractDescription(text) || (isYo ? 'Títà pẹ̀lú ohùn' : 'Voice sale entry');
        Ledger.addFromVoice({ type: 'income', amount, description: desc, category: 'sales' });
        const successMsg = isYo
          ? `✅ A kọ títà sílẹ̀: ${I18N.formatCurrency(amount)} — ${desc}`
          : `✅ Sale recorded: ${I18N.formatCurrency(amount)} — ${desc}`;
        App.showToast(successMsg, 'success');
        if (App.currentPage !== 'ledger') App.navigate('ledger');
        return;
      }
    }

    // 3. EXPENSE
    const isExpense = /(mo na|ìnáwó|inawo|record expense|spent|bought|expense|paid for)/i.test(t);
    if (isExpense) {
      const amount = this.extractAmount(text);
      if (amount) {
        const desc = this.extractDescription(text) || (isYo ? 'Ìnáwó pẹ̀lú ohùn' : 'Voice expense entry');
        Ledger.addFromVoice({ type: 'expense', amount, description: desc, category: 'supplies' });
        const successMsg = isYo
          ? `✅ A kọ ìnáwó sílẹ̀: ${I18N.formatCurrency(amount)} — ${desc}`
          : `✅ Expense recorded: ${I18N.formatCurrency(amount)} — ${desc}`;
        App.showToast(successMsg, 'success');
        if (App.currentPage !== 'ledger') App.navigate('ledger');
        return;
      }
    }

    // 4. NAVIGATION
    if (/lọ sí|si|open|show|go to|take me to/i.test(t)) {
      const navMap = {
        'dashboard|agbekale|àgbékalẹ̀': 'dashboard',
        'ledger|akọọ́lẹ̀|akọọlẹ|iwe|transactions': 'ledger',
        'profit|loss|p&l|pnl|ere|àdánù': 'pnl',
        'inventory|stock|oja|ọjà|goods': 'inventory',
        'debt|gbese|gbèsè|owe': 'debts',
        'invoice|risiti|ìwé ìsanwó': 'invoice',
        'ask|assistant|chat|beere': 'ask',
        'summary|akopo|àkópọ̀': 'summary',
        'health|ilera|ìlera': 'health',
        'alerts|ikilo|ìkìlọ̀': 'alerts',
        'reports|ijabo|ìjábọ̀': 'reports'
      };
      for (const [pattern, page] of Object.entries(navMap)) {
        if (new RegExp(pattern, 'i').test(t)) {
          App.navigate(page);
          return;
        }
      }
    }

    // 5. Default: Pass to AI Assistant
    App.navigate('ask');
    setTimeout(() => AIAssistant.sendVoiceQuery(text), 500);
    App.showToast(`AI: "${text}"`, 'info');
  },

  extractAmount(text) {
    const match = text.match(/(\d[\d,]*(?:\.\d+)?)/);
    if (match) return parseFloat(match[1].replace(/,/g, ''));
    return null;
  },

  extractDescription(text) {
    return text
      .replace(/\d[\d,]*(?:\.\d+)?/g, '')
      .replace(/record|add|sale|sold|expense|spent|naira|₦|mo ta|mo na|fun|lori|of|for/gi, '')
      .trim() || null;
  },

  // Web Speech Text to Speech
  speak(text) {
    if (!window.speechSynthesis) return;
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang  = this.getLang();
    utterance.rate  = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
};
