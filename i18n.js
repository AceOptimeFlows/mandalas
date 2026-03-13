(function(global){
  'use strict';

  var DEFAULTS = {
    basePath: './lang/',
    defaultLang: 'es',
    supported: ['es','en','pt-BR','fr','de','it','ko','zh-CN','ja-JP','ru']
  };

  var STORAGE_PREFIX = 'mandalas_i18n_pack_';
  var cache = {};
  var currentLang = DEFAULTS.defaultLang;

  function normalizeLang(lang){
    var low = String(lang || 'es').toLowerCase();
    if(low.indexOf('pt') === 0) return 'pt-BR';
    if(low === 'zh' || low.indexOf('zh-') === 0) return 'zh-CN';
    if(low === 'ja' || low.indexOf('ja-') === 0) return 'ja-JP';
    if(low === 'ko' || low.indexOf('ko-') === 0) return 'ko';
    if(low.indexOf('ru') === 0) return 'ru';
    if(low.indexOf('en') === 0) return 'en';
    if(low.indexOf('fr') === 0) return 'fr';
    if(low.indexOf('de') === 0) return 'de';
    if(low.indexOf('it') === 0) return 'it';
    return 'es';
  }

  function emptyPack(){
    return {
      ui: {},
      toastPrefixes: {},
      license: {},
      coherence: {}
    };
  }

  function own(obj, key){
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function clone(obj){
    try{ return JSON.parse(JSON.stringify(obj || {})); }
    catch(_){ return obj || {}; }
  }

  function mergePack(base, extra){
    var out = emptyPack();
    var sections = ['ui','toastPrefixes','license','coherence'];
    var i, name, srcBase, srcExtra, key;

    base = base || emptyPack();
    extra = extra || emptyPack();

    for(i=0;i<sections.length;i++){
      name = sections[i];
      srcBase = base[name] || {};
      srcExtra = extra[name] || {};
      out[name] = {};

      for(key in srcBase){
        if(own(srcBase, key)) out[name][key] = srcBase[key];
      }
      for(key in srcExtra){
        if(own(srcExtra, key)) out[name][key] = srcExtra[key];
      }
    }
    return out;
  }

  function fileCandidates(lang){
    var code = normalizeLang(lang);
    var short = code.split('-')[0];
    var list = [code];
    if(short !== code) list.push(short);
    return list;
  }

  function readJSONSync(path){
    var xhr, text;
    try{
      xhr = new XMLHttpRequest();
      xhr.open('GET', path, false);
      xhr.send(null);

      if(!((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0)) return null;

      text = xhr.responseText;
      if(!text) return null;

      return JSON.parse(text);
    }catch(_){
      return null;
    }
  }

  function storageKey(lang){
    return STORAGE_PREFIX + normalizeLang(lang);
  }

  function readStoredPack(lang){
    try{
      var raw = localStorage.getItem(storageKey(lang));
      if(!raw) return null;
      var obj = JSON.parse(raw);
      return (obj && typeof obj === 'object') ? obj : null;
    }catch(_){
      return null;
    }
  }

  function writeStoredPack(lang, pack){
    try{
      localStorage.setItem(storageKey(lang), JSON.stringify(pack || emptyPack()));
    }catch(_){}
  }

  function loadRawLang(lang){
    var files = fileCandidates(lang);
    var i, data, stored;

    // 1) Red / SW primero (para coger cambios nuevos si existen)
    for(i=0;i<files.length;i++){
      data = readJSONSync(DEFAULTS.basePath + files[i] + '.json');
      if(data && typeof data === 'object'){
        writeStoredPack(files[i], data);
        return data;
      }
    }

    // 2) Fallback local persistente
    for(i=0;i<files.length;i++){
      stored = readStoredPack(files[i]);
      if(stored && typeof stored === 'object'){
        return stored;
      }
    }

    return null;
  }

  function ensureBase(){
    if(!cache.es){
      cache.es = mergePack(emptyPack(), loadRawLang('es') || emptyPack());
      writeStoredPack('es', cache.es);
    }
    return cache.es;
  }

  function ensureLang(lang){
    var code = normalizeLang(lang);
    var base = ensureBase();
    var loaded;

    if(cache[code]) return cache[code];
    if(code === 'es') return base;

    loaded = loadRawLang(code) || emptyPack();
    cache[code] = mergePack(base, loaded);

    // Guardamos el pack ya fusionado para que offline no dependa de la red/SW
    writeStoredPack(code, cache[code]);

    return cache[code];
  }

  function warmSupportedPacks(){
    var list = DEFAULTS.supported || [];
    var i, code;

    ensureBase();

    for(i=0;i<list.length;i++){
      code = normalizeLang(list[i]);
      try{
        ensureLang(code);
      }catch(_){}
    }
  }

  function interpolate(str, data){
    return String(str == null ? '' : str).replace(/\{\{(\w+)\}\}/g, function(_, key){
      return own(data, key) ? String(data[key]) : '';
    });
  }

  function getByPath(obj, path){
    var parts = String(path || '').split('.');
    var cur = obj, i;

    for(i=0;i<parts.length;i++){
      if(!cur || !own(cur, parts[i])) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function t(key, lang){
    var pack = ensureLang(lang || currentLang);
    if(pack.ui && own(pack.ui, key)) return pack.ui[key];

    var base = ensureBase();
    if(base.ui && own(base.ui, key)) return base.ui[key];

    return key;
  }

  function get(path, data, lang){
    var pack = ensureLang(lang || currentLang);
    var value = getByPath(pack, path);

    if(typeof value === 'undefined'){
      value = getByPath(ensureBase(), path);
    }

    if(typeof value === 'string'){
      return interpolate(value, data || {});
    }

    return value;
  }

  function translateToast(text, lang){
    var msg = String(text == null ? '' : text);
    var pack = ensureLang(lang || currentLang);
    var base = ensureBase();
    var prefixes = (pack && pack.toastPrefixes) || {};
    var basePrefixes = (base && base.toastPrefixes) || {};
    var key;

    if(pack.ui && own(pack.ui, msg)) return pack.ui[msg];
    if(base.ui && own(base.ui, msg)) return base.ui[msg];

    for(key in prefixes){
      if(own(prefixes, key) && msg.indexOf(key) === 0){
        return String(prefixes[key]) + msg.slice(key.length);
      }
    }

    for(key in basePrefixes){
      if(own(basePrefixes, key) && msg.indexOf(key) === 0){
        return String(basePrefixes[key]) + msg.slice(key.length);
      }
    }

    return msg;
  }

  function setLang(lang){
    currentLang = normalizeLang(lang || DEFAULTS.defaultLang);
    ensureLang(currentLang);

    try{
      if(global.document && global.document.documentElement){
        global.document.documentElement.setAttribute('lang', currentLang);
      }
    }catch(_){}

    try{
      var evt;
      if(typeof CustomEvent === 'function'){
        evt = new CustomEvent('i18n:changed', { detail:{ lang: currentLang } });
      }else if(global.document && global.document.createEvent){
        evt = global.document.createEvent('CustomEvent');
        evt.initCustomEvent('i18n:changed', false, false, { lang: currentLang });
      }
      if(evt && global.dispatchEvent) global.dispatchEvent(evt);
    }catch(_){}

    return currentLang;
  }

  function init(options){
    options = options || {};

    if(options.basePath) DEFAULTS.basePath = String(options.basePath);
    if(options.supported && options.supported.length) DEFAULTS.supported = clone(options.supported);
    if(options.defaultLang) DEFAULTS.defaultLang = normalizeLang(options.defaultLang);

    ensureBase();
    warmSupportedPacks();
    setLang(options.defaultLang || currentLang || DEFAULTS.defaultLang);

    return api;
  }

  function getPack(lang){
    return ensureLang(lang || currentLang);
  }

  function getLang(){
    return currentLang;
  }

  function getSupported(){
    return clone(DEFAULTS.supported);
  }

  var api = {
    init: init,
    t: t,
    get: get,
    getPack: getPack,
    getLang: getLang,
    setLang: setLang,
    translateToast: translateToast,
    normalizeLang: normalizeLang,
    getSupported: getSupported
  };

  global.MandalaI18n = api;
  global.i18n = api;
})(window);