'use strict';

/* =========================================================
   Desktop Guard — aviso “solo escritorio” (móvil/tablet)
   - Detecta móvil/tablet por UA + touch + media queries.
   - Muestra overlay accesible.
   - i18n según idioma del navegador (es/en/pt-BR/de/fr/it/ko/ja/zh/hi/ru/ar).
   - Permite continuar (warning) o ir a la web.
   ========================================================= */

(() => {
  /* ===== Config ===== */
  const APP_NAME = 'Mand△L@s';
  const STORAGE_KEY = 'mandalas_desktop_notice_dismissed_v1';

  // Si pulsas “Abrir web”, irá aquí:
  const REDIRECT_URL = 'https://optimeflows-site.vercel.app';

  // Si quieres “bloquear” (sin botón continuar), ponlo a false:
  const ALLOW_CONTINUE_ANYWAY = true;

  // Si añades ?desktop=1 a la URL, NO muestra el aviso (útil para pruebas)
  const BYPASS_QUERY_PARAM = 'desktop';

  /* ===== i18n ===== */
  const I18N = {
    'es': {
      title: 'Solo para escritorio',
      body:
        `${APP_NAME} está diseñada para usarse en ordenador (teclado + ratón). ` +
        `En móvil o tablet la experiencia puede ser limitada o fallar. ` +
        `Recomendado: abrir desde Desktop.`,
      continue: 'Continuar igualmente',
      openWeb: 'Abrir web'
    },
    'en': {
      title: 'Desktop only',
      body:
        `${APP_NAME} is designed for desktop use (keyboard + mouse). ` +
        `On mobile/tablet the experience may be limited or unreliable. ` +
        `Recommended: open on Desktop.`,
      continue: 'Continue anyway',
      openWeb: 'Open website'
    },
    'pt-BR': {
      title: 'Apenas para desktop',
      body:
        `${APP_NAME} foi feita para uso no desktop (teclado + mouse). ` +
        `Em celular/tablet a experiência pode ser limitada ou falhar. ` +
        `Recomendado: abrir no Desktop.`,
      continue: 'Continuar mesmo assim',
      openWeb: 'Abrir site'
    },
    'fr': {
      title: 'Uniquement sur ordinateur',
      body:
        `${APP_NAME} est conçue pour une utilisation sur ordinateur (clavier + souris). ` +
        `Sur mobile/tablette, l’expérience peut être limitée ou instable. ` +
        `Recommandé : ouvrir sur Desktop.`,
      continue: 'Continuer quand même',
      openWeb: 'Ouvrir le site'
    },
    'de': {
      title: 'Nur für Desktop',
      body:
        `${APP_NAME} ist für die Nutzung am Desktop gedacht (Tastatur + Maus). ` +
        `Auf Smartphone/Tablet kann die Nutzung eingeschränkt oder unzuverlässig sein. ` +
        `Empfohlen: am Desktop öffnen.`,
      continue: 'Trotzdem fortfahren',
      openWeb: 'Website öffnen'
    },
    'it': {
      title: 'Solo Desktop',
      body:
        `${APP_NAME} è progettata per l’uso su desktop (tastiera + mouse). ` +
        `Su mobile/tablet l’esperienza può essere limitata o instabile. ` +
        `Consigliato: aprire da Desktop.`,
      continue: 'Continua comunque',
      openWeb: 'Apri sito'
    },
    'ko': {
      title: '데스크톱 전용',
      body:
        `${APP_NAME} 는 데스크톱(키보드 + 마우스) 사용을 기준으로 설계되었습니다. ` +
        `모바일/태블릿에서는 기능이 제한되거나 불안정할 수 있습니다. ` +
        `권장: 데스크톱에서 열기.`,
      continue: '계속 진행',
      openWeb: '웹 열기'
    },
    'ja': {
      title: 'デスクトップ専用',
      body:
        `${APP_NAME} はデスクトップ（キーボード＋マウス）向けに設計されています。 ` +
        `モバイル/タブレットでは動作が不安定または制限される場合があります。 ` +
        `推奨：デスクトップで開く。`,
      continue: 'このまま続行',
      openWeb: 'サイトを開く'
    },
    'zh': {
      title: '仅限桌面端',
      body:
        `${APP_NAME} 为桌面端（键盘 + 鼠标）设计。 ` +
        `在手机/平板上体验可能受限或不稳定。 ` +
        `建议：在桌面端打开。`,
      continue: '仍要继续',
      openWeb: '打开网站'
    },
    'hi': {
      title: 'केवल डेस्कटॉप के लिए',
      body:
        `${APP_NAME} डेस्कटॉप उपयोग (कीबोर्ड + माउस) के लिए बनाई गई है। ` +
        `मोबाइल/टैबलेट पर अनुभव सीमित या अस्थिर हो सकता है। ` +
        `सुझाव: डेस्कटॉप पर खोलें।`,
      continue: 'फिर भी जारी रखें',
      openWeb: 'वेबसाइट खोलें'
    },
    'ru': {
      title: 'Только для Desktop',
      body:
        `${APP_NAME} рассчитана на использование на компьютере (клавиатура + мышь). ` +
        `На телефоне/планшете работа может быть ограниченной или нестабильной. ` +
        `Рекомендуется: открыть на Desktop.`,
      continue: 'Продолжить всё равно',
      openWeb: 'Открыть сайт'
    },
    'ar': {
      title: 'للأجهزة المكتبية فقط',
      body:
        `${APP_NAME} مُصممة للاستخدام على الكمبيوتر (لوحة مفاتيح + فأرة). ` +
        `على الهاتف/اللوحي قد تكون التجربة محدودة أو غير مستقرة. ` +
        `يوصى بفتحها على Desktop.`,
      continue: 'متابعة على أي حال',
      openWeb: 'فتح الموقع'
    }
  };

  /* ===== Lang detect ===== */
  function normalizeLangTag(tag){
    const s = String(tag || '').trim().replace(/_/g,'-').toLowerCase();
    if(!s) return '';

    if(s.indexOf('pt')===0) return 'pt-BR';
    if(s.indexOf('es')===0) return 'es';
    if(s.indexOf('en')===0) return 'en';
    if(s.indexOf('fr')===0) return 'fr';
    if(s.indexOf('de')===0) return 'de';
    if(s.indexOf('it')===0) return 'it';
    if(s.indexOf('ko')===0) return 'ko';
    if(s.indexOf('ja')===0) return 'ja';
    if(s.indexOf('zh')===0) return 'zh';
    if(s.indexOf('hi')===0) return 'hi';
    if(s.indexOf('ru')===0) return 'ru';
    if(s.indexOf('ar')===0) return 'ar';

    return '';
  }

  function detectBrowserLang(){
    try{
      const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
      for(let i=0;i<langs.length;i++){
        const cand = normalizeLangTag(langs[i]);
        if(cand && I18N[cand]) return cand;
      }
    }catch(_){}
    return 'es';
  }

  function copy(){
    const lang = detectBrowserLang();
    return I18N[lang] || I18N.es;
  }

  function isRTL(){
    return detectBrowserLang() === 'ar';
  }

  /* ===== Device detection ===== */
  function isProbablyMobileOrTablet(){
    // 1) UA-CH (Chrome, etc.)
    try{
      if(navigator.userAgentData && navigator.userAgentData.mobile) return true;
    }catch(_){}

    // 2) Classic UA hints
    const ua = String(navigator.userAgent || '');
    if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(ua)) return true;

    // 3) Touch + coarse pointer + viewport heuristics (caza iPad “modo desktop”)
    const touch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
    const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const noHover = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);

    const w = window.innerWidth || 0;
    const h = window.innerHeight || 0;
    const maxSide = Math.max(w, h);
    const minSide = Math.min(w, h);

    // Heurística: teléfonos/tablets suelen estar por debajo de estos rangos de viewport
    const viewportLooksHandheld =
      (minSide <= 900) ||
      (maxSide <= 1400 && minSide <= 1100);

    if(touch && (coarse || noHover) && viewportLooksHandheld) return true;

    return false;
  }

  function shouldBypass(){
    try{
      const sp = new URLSearchParams(window.location.search || '');
      const v = sp.get(BYPASS_QUERY_PARAM);
      if(v === '1' || v === 'true' || v === 'yes') return true;
    }catch(_){}
    return false;
  }

  function wasDismissed(){
    try{
      return localStorage.getItem(STORAGE_KEY) === '1';
    }catch(_){
      return false;
    }
  }

  function markDismissed(){
    try{
      localStorage.setItem(STORAGE_KEY, '1');
    }catch(_){}
  }

  /* ===== Overlay UI ===== */
  const UI = {
    overlay: null,
    title: null,
    msg: null,
    btnContinue: null,
    btnWeb: null
  };

  function ensureStyles(){
    const id = 'desktop-guard-style';
    if(document.getElementById(id)) return;

    const st = document.createElement('style');
    st.id = id;
    st.textContent = `
#desktopOnlyOverlay{
  position:fixed;
  inset:0;
  display:none;
  align-items:center;
  justify-content:center;
  padding:16px;
  background: rgba(0,0,0,.86);
  z-index: 100000;
}
#desktopOnlyOverlay[aria-hidden="false"]{ display:flex; }

#desktopOnlyOverlay .dg-box{
  width: min(620px, 94vw);
  border-radius: 14px;
  padding: 16px;
  border: 1px solid var(--border, rgba(148,163,184,.35));
  background: var(--surface, #0f172a);
  color: var(--text, #e5e7eb);
  box-shadow: 0 20px 60px rgba(0,0,0,.55);
}

#desktopOnlyOverlay .dg-title{
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: .2px;
}

#desktopOnlyOverlay .dg-msg{
  margin: 0 0 14px 0;
  line-height: 1.5;
  color: #e5e7eb;
}

#desktopOnlyOverlay .dg-actions{
  display:flex;
  gap:10px;
  justify-content:flex-end;
  flex-wrap:wrap;
}

#desktopOnlyOverlay .dg-btn{
  appearance:none;
  border:1px solid var(--border, rgba(148,163,184,.35));
  background: rgba(255,255,255,.06);
  color: var(--text, #e5e7eb);
  padding: 10px 12px;
  border-radius: 10px;
  font-weight: 800;
  cursor:pointer;
}
#desktopOnlyOverlay .dg-btn:hover{
  border-color: var(--brand, #22d3ee);
}

#desktopOnlyOverlay .dg-btn.primary{
  border-color: var(--brand, #22d3ee);
}

body.desktop-only-open{
  overflow:hidden !important;
}
`;
    document.head.appendChild(st);
  }

  function ensureOverlay(){
    if(UI.overlay) return;

    ensureStyles();

    const ov = document.createElement('div');
    ov.id = 'desktopOnlyOverlay';
    ov.setAttribute('role','dialog');
    ov.setAttribute('aria-modal','true');
    ov.setAttribute('aria-hidden','true');

    // lang/dir
    const lang = detectBrowserLang();
    ov.setAttribute('lang', lang);
    ov.setAttribute('dir', isRTL() ? 'rtl' : 'ltr');

    const box = document.createElement('div');
    box.className = 'dg-box';

    const h = document.createElement('h2');
    h.className = 'dg-title';
    h.id = 'desktopOnlyTitle';

    const p = document.createElement('p');
    p.className = 'dg-msg';
    p.id = 'desktopOnlyMsg';

    const actions = document.createElement('div');
    actions.className = 'dg-actions';

    const btnContinue = document.createElement('button');
    btnContinue.type = 'button';
    btnContinue.className = 'dg-btn primary';
    btnContinue.id = 'desktopOnlyContinue';

    const btnWeb = document.createElement('button');
    btnWeb.type = 'button';
    btnWeb.className = 'dg-btn';
    btnWeb.id = 'desktopOnlyWeb';

    actions.appendChild(btnWeb);
    if(ALLOW_CONTINUE_ANYWAY) actions.appendChild(btnContinue);

    box.appendChild(h);
    box.appendChild(p);
    box.appendChild(actions);

    ov.appendChild(box);
    document.body.appendChild(ov);

    UI.overlay = ov;
    UI.title = h;
    UI.msg = p;
    UI.btnContinue = btnContinue;
    UI.btnWeb = btnWeb;

    // Esc cierra (si hay “continuar”)
    window.addEventListener('keydown', (ev) => {
      if(!UI.overlay) return;
      if(UI.overlay.getAttribute('aria-hidden') !== 'false') return;
      if(ev.key === 'Escape' && ALLOW_CONTINUE_ANYWAY){
        ev.preventDefault();
        hideOverlay(true);
      }
    });
  }

  function applyTexts(){
    const c = copy();
    if(UI.title) UI.title.textContent = c.title;
    if(UI.msg) UI.msg.textContent = c.body;
    if(UI.btnContinue) UI.btnContinue.textContent = c.continue;
    if(UI.btnWeb) UI.btnWeb.textContent = c.openWeb;

    if(UI.overlay){
      const lang = detectBrowserLang();
      UI.overlay.setAttribute('lang', lang);
      UI.overlay.setAttribute('dir', isRTL() ? 'rtl' : 'ltr');
    }
  }

  function showOverlay(){
    ensureOverlay();
    applyTexts();

    UI.overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('desktop-only-open');

    UI.btnWeb.onclick = () => { window.location.href = REDIRECT_URL; };

    if(ALLOW_CONTINUE_ANYWAY){
      UI.btnContinue.onclick = () => hideOverlay(true);
    }

    requestAnimationFrame(() => {
      try{
        const target = ALLOW_CONTINUE_ANYWAY ? UI.btnContinue : UI.btnWeb;
        if(target && typeof target.focus === 'function'){
          target.focus({ preventScroll: true });
        }
      }catch(_){}
    });
  }

  function hideOverlay(remember){
    if(!UI.overlay) return;

    UI.overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('desktop-only-open');

    if(remember) markDismissed();
  }

  function maybeShow(){
    if(shouldBypass()) return;
    if(wasDismissed()) return;
    if(!isProbablyMobileOrTablet()) return;

    showOverlay();
  }

  window.addEventListener('languagechange', () => {
    if(!UI.overlay) return;
    if(UI.overlay.getAttribute('aria-hidden') !== 'false') return;
    applyTexts();
  });

  // start
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', maybeShow);
  }else{
    maybeShow();
  }
})();
