/* Mand△L@s — Puntas, trazados y transparencias por trazo; línea recta;
   capas en rejilla; panel al frente al arrastrar;
   NOMBRE obligatorio para guardar/exportar;
   Galería 5×N; (Libro en placeholder);
   export PNG/PDF/SVG fiel; pausa anim al dibujar; 8 skins. (Compat ES5) */
(function(){
  'use strict';

  /* ===== Utils ===== */
  
function $(sel, ctx){ if(!ctx) ctx=document; return ctx.querySelector(sel); }
function $$(sel, ctx){ if(!ctx) ctx=document; return Array.prototype.slice.call(ctx.querySelectorAll(sel)); }
function el(tag, props, children){
  if(!props) props={}; 
  if(typeof children==='undefined') children=[];
  var n=document.createElement(tag);

  // ✅ Soporte robusto de style:"…" como CSS inline (tu lógica original)
  if (props && typeof props.style === 'string') {
    try { n.style.cssText = props.style; } catch(_) { n.setAttribute('style', props.style); }
    delete props.style; // evita reasignarlo abajo
  }

  // Asignación de props (tu lógica original)
  if (typeof Object.assign==='function') Object.assign(n, props);
  else { for (var k in props) if (props.hasOwnProperty(k)) n[k]=props[k]; }
  // ⬅️ FIX: asegura atributos con guion (data-*, aria-*, etc.)
  try{
    Object.keys(props || {}).forEach(function(k){
      // Si el nombre lleva guion (ej. "data-action") o es data-/aria-, se fuerza como atributo HTML
      if(k.indexOf('data-')===0 || k.indexOf('aria-')===0 || k.indexOf('-')!==-1){
        n.setAttribute(k, props[k]);
      }
    });
    // Soporte opcional si alguien pasa props.dataset = { action: '...' }
    if(props && props.dataset && typeof props.dataset==='object'){
      Object.keys(props.dataset).forEach(function(key){
        n.dataset[key] = props.dataset[key];
      });
    }
  }catch(_){}

  // 🆕 Helper de traducción segura (solo sustituye si hay clave exacta)
  function trMaybe(s){
    try{
      if(typeof s!=='string') return s;
      var L = I18N && I18N[curLang ? curLang() : 'es'] || {};
      return (L && Object.prototype.hasOwnProperty.call(L, s)) ? L[s] : s;
    }catch(_){ return s; }
  }

  // 🆕 Traducir atributos de texto comunes si vienen como cadenas
  try{
    if(typeof n.title==='string')      n.title      = trMaybe(n.title);
    if(typeof n.placeholder==='string') n.placeholder = trMaybe(n.placeholder);
    if(typeof n.alt==='string')        n.alt        = trMaybe(n.alt);
    // soporte por si alguien pasa ariaLabel en camelCase
    if(props && typeof props['ariaLabel']==='string') n.setAttribute('aria-label', trMaybe(props['ariaLabel']));
    // si nos pasaron textContent como prop explícita, lo traducimos aquí
    if(props && typeof props.textContent==='string'){ n.textContent = trMaybe(props.textContent); }
  }catch(_){}

  // Añadir hijos (texto auto‑traducido si hay clave)
  var arr=Array.isArray(children)?children:[children];
  for(var i=0;i<arr.length;i++){
    var c=arr[i]; if(!c) continue;
    if(c && c.nodeType){ n.append(c); continue; }
    var s = (typeof c==='string') ? trMaybe(c) : c;
    n.append( document.createTextNode(s) );
  }
  return n;
}


  function uid(){ return 'id-'+Math.random().toString(36).slice(2,9); }
  function on(node,ev,fn,opts){ if(node&&node.addEventListener) node.addEventListener(ev,fn,opts); }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function fmt(n,dec){ var f=dec==null?0:dec; return (Math.round(n*Math.pow(10,f))/Math.pow(10,f)).toFixed(f); }
  function toast(msg, timeout){ timeout=timeout==null?2600:timeout;
    var box=$('#toast'); if(!box) return;
    var text = (typeof translateRuntimeText === 'function') ? translateRuntimeText(msg) : msg;
    box.textContent=text; box.classList.add('show');
    setTimeout(function(){ box.classList.remove('show'); }, timeout);
  }
  function modal(title, bodyHTML, wide){
    var m=$('#modal'), t=$('#modal-title'), b=$('#modal-body'), c=$('.modal-content');
    t.textContent=title; b.innerHTML=bodyHTML; if(wide){ c.style.width='min(1280px,96vw)'; } else { c.style.width='min(720px,92vw)'; }

    m.classList.remove('hidden');
    on($('#modal-close'),'click',function(){ m.classList.add('hidden'); });
  }
  function slugify(s){
    try{ s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){}
    return String(s||'').toLowerCase().replace(/[^a-z0-9\-_\. ]+/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'mandala';
  }

  function isHexColor6(v){ return /^#([0-9a-f]{6})$/i.test(String(v||'')); }

  function normalizeColorHex(v, fallback){
    var s = String(v==null ? '' : v).trim();
    var m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if(m){
      var raw = m[1];
      if(raw.length===3 || raw.length===4){
        return (
          '#'
          + raw.charAt(0)+raw.charAt(0)
          + raw.charAt(1)+raw.charAt(1)
          + raw.charAt(2)+raw.charAt(2)
        ).toLowerCase();
      }
      return ('#'+raw.slice(0,6)).toLowerCase();
    }

    var rgba = s.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
    if(rgba){
      function toHex(n){
        var nn = clamp(parseInt(n,10)||0, 0, 255).toString(16);
        return nn.length<2 ? '0'+nn : nn;
      }
      return ('#'+toHex(rgba[1])+toHex(rgba[2])+toHex(rgba[3])).toLowerCase();
    }

    return isHexColor6(fallback) ? String(fallback).toLowerCase() : null;
  }

  function normalizeColorList(list, limit){
    var out=[], seen={}, max=(limit==null?8:limit);
    (list||[]).forEach(function(c){
      var hex = normalizeColorHex(c, null);
      if(!hex || seen[hex]) return;
      seen[hex]=1;
      out.push(hex);
    });
    return out.slice(0, max);
  }

  function sanitizeStrokeColors(stroke){
    if(!stroke) return stroke;
    if(stroke.color!=null) stroke.color = normalizeColorHex(stroke.color, '#000000') || '#000000';
    if(stroke.outlineColor!=null) stroke.outlineColor = normalizeColorHex(stroke.outlineColor, '#000000') || '#000000';
    return stroke;
  }

  function sanitizeDocColors(doc){
    if(!doc || !doc.layers) return doc;
    doc.layers.forEach(function(L){
      (L.strokes||[]).forEach(sanitizeStrokeColors);
    });
    return doc;
  }

  function sanitizeStateColors(next){
    if(!next) next = {};
    next.settings = next.settings || {};

    next.settings.color        = normalizeColorHex(next.settings.color,        '#ffffff') || '#ffffff';
    next.settings.background   = normalizeColorHex(next.settings.background,   '#ffffff') || '#ffffff';
    next.settings.outlineColor = normalizeColorHex(next.settings.outlineColor, '#000000') || '#000000';
    next.settings.gridColor    = normalizeColorHex(next.settings.gridColor,    '#ffffff') || '#ffffff';
    next.settings.colorHistory = normalizeColorList(next.settings.colorHistory, 8);

    if(next.pendingDoc) sanitizeDocColors(next.pendingDoc);

    (next.gallery||[]).forEach(function(item){
      if(item && item.settings){
        item.settings.color        = normalizeColorHex(item.settings.color,        '#ffffff') || '#ffffff';
        item.settings.background   = normalizeColorHex(item.settings.background,   '#ffffff') || '#ffffff';
        item.settings.outlineColor = normalizeColorHex(item.settings.outlineColor, '#000000') || '#000000';
        item.settings.gridColor    = normalizeColorHex(item.settings.gridColor,    '#ffffff') || '#ffffff';
        item.settings.colorHistory = normalizeColorList(item.settings.colorHistory, 8);
      }
      if(item && item.doc) sanitizeDocColors(item.doc);
    });

    return next;
  }

  // Nombre de descarga: si hay base -> base.ext ; si no -> fallback-timestamp.ext
function smartDownloadName(base, fallback, ext){
  var b = String(base||'').trim();
  return b ? (slugify(b)+ext) : (slugify(fallback)+'-'+Date.now()+ext);
}
  /* ===== I18N (jsons externos + manager) ===== */
var I18N_BASE_PATH = './lang/';
var I18N = { es:{} };
var SUPPORTED_LANGS = [
  ['es', 'Español'],
  ['en', 'Inglés'],
  ['pt-BR', 'Portugués (Brasil)'],
  ['fr', 'Francés'],
  ['de', 'Alemán'],
  ['it', 'Italiano'],
  ['ko', 'Coreano'],
  ['zh-CN', 'Chino'],
  ['ja-JP', 'Japonés'],
  ['ru', 'Русский']
];

function __i18nNormalizeLang(lang){
  var low = String(lang || 'es').toLowerCase();
  if(low.indexOf('pt')===0) return 'pt-BR';
  if(low==='zh' || low.indexOf('zh-')===0) return 'zh-CN';
  if(low==='ja' || low.indexOf('ja-')===0) return 'ja-JP';
  if(low==='ko' || low.indexOf('ko-')===0) return 'ko';
  if(low.indexOf('ru')===0) return 'ru';
  if(low.indexOf('en')===0) return 'en';
  if(low.indexOf('fr')===0) return 'fr';
  if(low.indexOf('de')===0) return 'de';
  if(low.indexOf('it')===0) return 'it';
  return 'es';
}
function __i18nGetManager(){
  return window.MandalaI18n || window.i18n || null;
}
function __i18nSupportedCodes(){
  return SUPPORTED_LANGS.map(function(pair){ return pair[0]; });
}
function __i18nSyncCache(lang){
  var api = __i18nGetManager();
  var code = __i18nNormalizeLang(lang || 'es');
  if(!api || typeof api.getPack !== 'function') return I18N;
  try{
    var basePack = api.getPack('es') || {};
    var pack = api.getPack(code) || {};
    I18N.es = (basePack.ui && typeof basePack.ui === 'object') ? basePack.ui : (I18N.es || {});
    I18N[code] = (pack.ui && typeof pack.ui === 'object') ? pack.ui : I18N.es;
  }catch(_){ }
  return I18N;
}
function __i18nStartManager(defaultLang){
  var api = __i18nGetManager();
  var code = __i18nNormalizeLang(defaultLang || 'es');
  if(!api || typeof api.init !== 'function') return;
  try{
    api.init({
      basePath: I18N_BASE_PATH,
      supported: __i18nSupportedCodes(),
      defaultLang: code
    });
    if(typeof api.setLang === 'function') api.setLang(code);
    __i18nSyncCache(code);
  }catch(_){ }
}
function __i18nInitManager(defaultLang){
  var existing = __i18nGetManager();
  var code = __i18nNormalizeLang(defaultLang || 'es');
  if(existing && typeof existing.init === 'function'){
    __i18nStartManager(code);
    return;
  }
  try{
    var script = document.querySelector('script[data-i18n-manager="1"]');
    if(script){
      if(script.getAttribute('data-loaded') === '1'){
        __i18nStartManager(code);
      }else{
        script.addEventListener('load', function(){
          script.setAttribute('data-loaded', '1');
          __i18nStartManager(code);
          try{ applyI18NNow(); }catch(_){ }
        });
      }
      return;
    }
    script = document.createElement('script');
    script.src = './i18n.js';
    script.async = false;
    script.setAttribute('data-i18n-manager', '1');
    script.onload = function(){
      script.setAttribute('data-loaded', '1');
      __i18nStartManager(code);
      try{ applyI18NNow(); }catch(_){ }
    };
    document.head.appendChild(script);
  }catch(_){ }
}
function curLang(){
  try{
    var api = __i18nGetManager();
    var lang = (state && state.lang) || (api && api.getLang && api.getLang()) || document.documentElement.getAttribute('lang') || 'es';
    return __i18nNormalizeLang(lang);
  }catch(_){ return 'es'; }
}
function t(key){
  var api = __i18nGetManager();
  var code = curLang();
  if(api && typeof api.t === 'function'){
    try{
      __i18nSyncCache(code);
      return api.t(key, code);
    }catch(_){ }
  }
  var dict = I18N[code] || I18N.es || {};
  return (dict && Object.prototype.hasOwnProperty.call(dict, key)) ? dict[key] : key;
}
function tData(path, data){
  var api = __i18nGetManager();
  if(api && typeof api.get === 'function'){
    try{ return api.get(path, data, curLang()); }catch(_){ }
  }
  return '';
}
function extendI18N(add){ return add; }
function translateRuntimeText(msg){
  var api = __i18nGetManager();
  if(api && typeof api.translateToast === 'function'){
    try{ return api.translateToast(msg, curLang()); }catch(_){ }
  }
  return msg;
}
function __i18nBuildReverseIndex(){
  var rev = {};
  var code = curLang();
  function addDict(dict){
    Object.keys(dict || {}).forEach(function(k){
      var v = dict[k];
      if(typeof k === 'string' && k) rev[k] = k;
      if(typeof v === 'string' && v) rev[v] = k;
    });
  }
  try{
    __i18nSyncCache(code);
    addDict(I18N.es || {});
    addDict(I18N[code] || {});
  }catch(_){ }
  return rev;
}
function __i18nTranslateTextNode(node, rev){
  var raw = node.nodeValue || '';
  var trimmed = raw.trim();
  if(!trimmed) return;
  var key = rev[trimmed];
  if(!key) return;
  var translated = t(key);
  if(translated && translated !== trimmed){
    var lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
    node.nodeValue = lead + translated + tail;
  }
}
function __i18nTranslateAttrs(el, rev){
  ['title','placeholder','alt','aria-label','value'].forEach(function(attr){
    var v = (attr==='value' && (el.tagName==='INPUT'||el.tagName==='BUTTON')) ? el.value
            : (el.getAttribute && el.getAttribute(attr));
    if(typeof v === 'string' && v){
      var key = rev[v.trim()];
      if(key){
        var nv = t(key);
        if(attr==='value' && (el.tagName==='INPUT'||el.tagName==='BUTTON')) el.value = nv;
        else el.setAttribute(attr, nv);
      }
    }
  });
}
function __i18nWalk(node, rev){
  if(!node) return;
  if(node.nodeType===3){ __i18nTranslateTextNode(node, rev); return; }
  if(node.nodeType!==1) return;
  __i18nTranslateAttrs(node, rev);
  var kids = node.childNodes; for(var i=0;i<kids.length;i++) __i18nWalk(kids[i], rev);
}
function applyI18NNow(){
  try{ document.documentElement.setAttribute('lang', curLang()); }catch(_){ }
  __i18nSyncCache(curLang());
  var rev = __i18nBuildReverseIndex();
  ['siteHeader','settingsMenu','panelsMenu','siteFooter','p-file','p-advanced','p-brush','p-layers','modal'].forEach(function(id){
    var n = document.getElementById(id); if(n) __i18nWalk(n, rev);
  });
  var nav = document.querySelector('.nav'); if(nav) __i18nWalk(nav, rev);
  try{
    var langItem = document.querySelector('#settingsMenu [data-action="language"]');
    if(langItem) langItem.textContent = t('Idioma');
  }catch(_){ }
}

__i18nInitManager('es');
on(window,'DOMContentLoaded', function(){
  try{
    __i18nInitManager(curLang());
    __i18nSyncCache(curLang());
    document.documentElement.setAttribute('lang', curLang());
    applyI18NNow();
  }catch(_){ }
});

/* ===== (Re)inyecta efectos del título si faltan ===== */
(function ensureTitleFX(){
  var id='title-fx-style';
  if(document.getElementById(id)) return;

  var css = [
    ".tagline{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:10px;white-space:nowrap;pointer-events:none}",
    ".glyph{display:inline-block;line-height:1;transform-origin:center bottom}",
    ".frag-silver{font-size:2rem;color:#cfd3d6;opacity:.9;animation:wave 3.8s ease-in-out infinite;text-shadow:0 0 6px rgba(255,255,255,.18)}",
    ".frag-white{font-size:2rem;color:#fff;opacity:.95;animation:wave 3.8s ease-in-out infinite;text-shadow:0 0 8px rgba(255,255,255,.25)}",
    ".sun-i{font-weight:900;font-size:2.2rem;color:#fff;text-shadow:0 0 8px rgba(255,255,255,.7),0 0 22px rgba(255,255,255,.55),0 0 40px rgba(207,229,248,.5)}",
    ".orb-blue{font-weight:900;font-size:2.35rem;color:#bfe5ff;text-shadow:0 0 8px rgba(180,215,255,.9),0 0 22px rgba(80,160,255,.85),0 0 40px rgba(40,120,255,.7)}",
    ".orb-black{font-weight:900;font-size:2rem;color:#000;text-shadow:0 0 8px rgba(255,255,255,.45),0 0 22px rgba(190,190,190,.35),0 0 40px rgba(130,130,130,.3)}",
    ".rotate-z{animation:tiltZ 5s ease-in-out infinite alternate}",
    ".orb-dawn{font-weight:900;font-size:2.35rem;color:#ffd1b1;animation:dawnGlow 6s ease-in-out infinite}",
    "@keyframes tiltZ{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}",
    "@keyframes wave{0%,100%{transform:translateY(0);opacity:.6}50%{transform:translateY(-3px);opacity:.85}}",
    "@keyframes dawnGlow{0%{color:#ffd1b1;text-shadow:0 0 8px rgba(255,180,80,.95),0 0 24px rgba(255,140,0,.8),0 0 40px rgba(255,100,0,.65)}25%{color:#ffc2ef;text-shadow:0 0 8px rgba(255,0,128,.95),0 0 24px rgba(255,80,160,.8),0 0 40px rgba(255,0,120,.6)}50%{color:#ffd9e6;text-shadow:0 0 8px rgba(255,70,160,.95),0 0 24px rgba(255,20,100,.8),0 0 40px rgba(255,50,140,.6)}75%{color:#d6f1ff;text-shadow:0 0 8px rgba(120,180,255,.95),0 0 24px rgba(70,140,255,.8),0 0 40px rgba(40,120,255,.6)}100%{color:#ffd1b1;text-shadow:0 0 8px rgba(255,180,80,.95),0 0 24px rgba(255,140,0,.8),0 0 40px rgba(255,100,0,.65)}}"
  ];

  // ⬇️ añade la regla responsive al ARRAY (no como cadena suelta)
  css.push('@media (max-width:920px){ .tagline{ position:static !important; transform:none !important; left:auto !important; top:auto !important; margin:2px auto 0 !important; text-align:center !important; } }');

  var st = el('style',{id:id});
  st.textContent = css.join('\n');   // convierte el array en un string CSS
  document.head.appendChild(st);
})();


  /* ===== Skins ===== */
/* ===== Skins ===== */
/* ===== Skins ===== */
var SKINS = {
  // Midnight — azul marino (menos oscuro)
  midnight: {
    bg:    '#130d47ff',   // navy suave
    alt:   '#312268ff',
    max:   '#9FB6D9',
    text:  '#EAF1FF',
    muted: '#9FB6D9',
    accent:'#2E7AFF',   // azul vivo
    accent2:'#7FB8FF'   // segundo tono para degradado
  },

  // Océano / turquesa (igual que tenías)
  ocean: {
    bg:    '#062B36',
    alt:   '#0B3A44',
    text:  '#E0F7FF',
    muted: '#7FD0E3',
    accent:'#00C2D1',
    accent2:'#66E0F0'
  },

  // Bosque profundo (sin cambios)
  forest: {
    bg:    '#0B2F1A',
    alt:   '#0F2212',
    text:  '#E6FFE8',
    muted: '#7BC29A',
    accent:'#2ECC71',
    accent2:'#A3E6B5'
  },

  // Sunset — más rojizo/cálido
  sunset: {
    bg:    '#2B0A0A',
    alt:   '#4A1112',
    text:  '#FFEAE5',
    muted: '#FFB0A0',
    accent:'#FF5A3C',   // rojo-naranja
    accent2:'#FFB347'   // ámbar cálido
  },

  // Orchid (sin cambios de tono)
  orchid: {
    bg:    '#3b1830ff',
    alt:   '#662656ff',
    text:  '#F2E6FF',
    muted: '#C9A3FF',
    accent:'#B067FF',
    accent2:'#7A5CFF'
  },

  // **Graphite** — antes “practice”, ahora escala de grises más oscura
  graphite: {
    bg:    '#24272eff',   // casi negro
    alt:   '#3a3c44ff',
    text:  '#E5E7EB',
    muted: '#9AA0A6',
    accent:'#6B7280',   // gris azulado
    accent2:'#4B5563'
  },

  // Arena más amarilla (como pediste)
  sand: {
    bg:    '#2F2400',
    alt:   '#4A3600',
    text:  '#FFF2B0',
    muted: '#CFB25A',
    accent:'#FFCC33',
    accent2:'#FFD966'
  },

  // **Aurora** — fucsia ⇄ esmeralda (degradado)
  aurora: {
    bg:    '#271f64ff',   // índigo oscuro
    alt:   '#7c4d3bff',   // sombra fría
    text:  '#FDEBF7',
    muted: '#A0EAD2',
    accent:'#FF5BC4',   // fucsia
    accent2:'#22D7A5'   // esmeralda/teal
  }
};


  function applySkin(id){
  var s = SKINS[id] || SKINS.midnight;
  var r = document.documentElement.style;
  r.setProperty('--bg',      s.bg);
  r.setProperty('--bg-alt',  s.alt);
  r.setProperty('--text',    s.text);
  r.setProperty('--muted',   s.muted);
  r.setProperty('--accessory', s.accent); // opcional, por si quieres usarlo en más sitios
  r.setProperty('--accent',  s.bbru || s.accent);
  r.print = s; // no functional
  r.setProperty('--accent-2', s.accent2 || s.accent);
}


  /* ===== Identidad / tema ===== */
  var APP_NAME='Mand△L@s', AUTHOR_NAME='Andrés Calvo Espinosa';
  (function setupFooter(){
    try{
      var y=new Date().getFullYear();
      var yEl=$('#f-year'), aEl=$('#f-author'), nEl=$('#f-app');
      if(yEl) yEl.textContent=y; if(aEl) aEl.textContent=AUTHOR_NAME; if(nEl) nEl.textContent=APP_NAME;
    }catch(e){}
  })();

  /* ===== Storage ===== */
  var SafeLS=(function(){
    try{
      var k='__ls__'+Date.now(); localStorage.setItem(k,'ok'); localStorage.removeItem(k);
      return {ok:true, get:function(k,f){ if(f==null)f=null; try{ var v=localStorage.getItem(k); return v==null?f:v; }catch(e){return f;} },
              set:function(k,v){ try{ localStorage.setItem(k,v);}catch(e){} },
              del:function(k){ try{ localStorage.removeItem(k);}catch(e){} } };
    }catch(e){
      var mem={}; console.warn('LocalStorage no disponible. Memoria temporal.'); toast('⚠️ Sin almacenamiento persistente.');
      return {ok:false, get:function(k,f){ if(f==null)f=null; return (k in mem)?mem[k]:f; },
              set:function(k,v){ mem[k]=String(v); }, del:function(k){ delete mem[k]; } };
    }
  })();

  /* ===== Estado ===== */
  var KEY='mandalas-state-v9';
  var defaults={
    theme:'dark',
    skin:'midnight',
    lang:'es',
   ui:{ panelsHidden:false, panelGlow:true, studioHudHidden:false },   // 🆕 por defecto ON + HUD Studio

    settings:{
  symmetry:12, mirror:true, mirrorInverse:false, altFlip:false, showGrid:true, labelCenters:false,
  brushSize:8, brushOpacity:1, color:'#ffffff',
  brushShape:'round',
  brushPattern:'solid',
  background:'#ffffff', transparentBg:false, gridColor:'#ffffff',

  outlineEnabled:true, outlineColor:'#000000', outlineWidth:2, outlineOpacity:1,
  colorHistory:[]
},


  center:{ mode:'centrado', count:1, points:[], active:{ mode:'all', index:0 } },


    anim:{ enabled:false },
    studio:{ speedFactor:1 }, // velocidad global (Studio)
        layout:{ 
      visible:{ 'p-file': true, 'p-advanced': true, 'p-brush': true },
      panels:{}, 
      layersOpen:false 
    },


    currentName:'',
    pendingDoc:null,
       gallery:[],
    bookDraft:null

    
  };

  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  function mergeStateWithDefaults(source){
    var src = source || {};
    var next = clone(defaults);

    if(typeof Object.assign==='function'){
      next = Object.assign(next, src);
      next.ui = Object.assign({}, clone(defaults.ui), src.ui||{});
      next.settings = Object.assign({}, clone(defaults.settings), src.settings||{});
      next.center = Object.assign({}, clone(defaults.center), src.center||{});
      next.center.active = Object.assign({}, clone(defaults.center.active), (src.center && src.center.active)||{});
      next.anim = Object.assign({}, clone(defaults.anim), src.anim||{});
      next.studio = Object.assign({}, clone(defaults.studio), src.studio||{});
      next.layout = Object.assign({}, clone(defaults.layout), src.layout||{});
      next.layout.visible = Object.assign({}, clone(defaults.layout.visible), (src.layout && src.layout.visible)||{});
      next.layout.panels = Object.assign({}, clone(defaults.layout.panels), (src.layout && src.layout.panels)||{});
    }else{
      for(var k in src) if(src.hasOwnProperty(k)) next[k]=src[k];
    }

    return sanitizeStateColors(next);
  }

  function load(){
    try{
      var raw=SafeLS.get(KEY,null);
      if(!raw) return mergeStateWithDefaults(null);
      return mergeStateWithDefaults(JSON.parse(raw)||{});
    }catch(e){
      return mergeStateWithDefaults(null);
    }
  }

  var state=load();
  try{
    __i18nInitManager(state.lang || 'es');
    __i18nStartManager(state.lang || 'es');
    __i18nSyncCache(state.lang || 'es');
  }catch(_){ }

  function save(){ try{ SafeLS.set(KEY, JSON.stringify(state)); }catch(e){} }
  function setTheme(theme){
    state.theme=theme;
    try{ if(theme==='light') document.documentElement.setAttribute('data-theme','light');
         else document.documentElement.removeAttribute('data-theme'); }catch(e){}
    save();
  }
  function initTheme(){ setTheme(state.theme||'dark'); applySkin(state.skin||'midnight'); } initTheme();
  // 🆕 Aplica el contorno al cargar según el estado (por defecto ON)
document.body.classList.toggle('panels-glow', !!(state && state.ui && state.ui.panelGlow));

  /* ===== PWA ===== */
  var deferredPrompt=null;
on(window,'beforeinstallprompt',function(e){
  e.preventDefault(); deferredPrompt=e;
  // ya no mostramos botón en el header; se llama desde el menú
});
function tryInstall(){
  if(!deferredPrompt){ toast('Instalación no disponible.'); return; }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(function(res){
    toast(res && res.outcome==='accepted' ? '¡Instalada!' : 'Instalación cancelada'); deferredPrompt=null;
  });
}
window.tryInstall = tryInstall; // 🆕 usado por el menú

// Al instalar como PWA: limpia el prompt y desactiva el ítem "Instalar"
on(window,'appinstalled',function(){
  try{ toast('¡Instalada!'); }catch(_){}
  try{
    deferredPrompt = null;
    var itInst = document.querySelector('#settingsMenu .item[data-action="install"]');
    if (itInst){
      itInst.setAttribute('aria-disabled','true');
      itInst.setAttribute('disabled','');
    }
  }catch(_){}
});

  /* ===== Tema claro/oscuro ===== */
  on($('#themeToggle'),'click',function(){ setTheme(state.theme==='dark'?'light':'dark'); toast('Tema: '+state.theme); });

  /* ===== Skins overlay ===== */
  (function(){
  var ov=$('#skinsOverlay'), grid=$('#skinsGrid');
  function close(){ ov.style.display='none'; }
  function open(){ ov.style.display='flex'; }
  if(grid){
    grid.innerHTML='';
    for(var id in SKINS){
      (function(id){
        var card=el('div',{className:'skin-card', title:id});
        card.append(el('div',{}, id));
        var sw = el('div', { className: 'skin-sample' });
// usa accent2 si está definido; si no, cae a alt (como antes)
var g2 = (SKINS[id].accent2 || SKINS[id].alt || '#333');
sw.style.background = 'linear-gradient(90deg,' + (SKINS[id].accent || '#888') + ',' + g2 + ')';

        card.append(sw);
        on(card,'click',function(){ state.skin=id; applySkin(id); save(); close(); });
        grid.append(card);
      })(id);
    }
    on($('#btnCloseSkins'),'click',close);
    on(ov,'click',function(e){ if(e.target && e.target.id==='skinsOverlay') close(); });
    // 🆕 Exponer para el menú Ajustes
    window.openSkinsOverlay = open;
  }
})();


  /* ===== Ojo: ocultar paneles ===== */
  (function bindEye(){
    var btn=$('#viewToggle');
    if(!btn) return;
    function apply(){
  btn.setAttribute('aria-pressed', state.ui.panelsHidden?'true':'false');
  btn.textContent = state.ui.panelsHidden ? '👁' : '🙈';
  document.body.classList.toggle('panels-hidden', !!state.ui.panelsHidden);
  // 🔔 Notifica a la UI (recalcular cuando se muestren)
  try{
    window.dispatchEvent(new CustomEvent(state.ui.panelsHidden ? 'panels:hidden' : 'panels:shown'));
  }catch(e){}
}

    on(btn,'click',function(){ state.ui.panelsHidden=!state.ui.panelsHidden; save(); apply(); });
    apply();
  })();

  
/* ===== Menú Ajustes (⚙️) ===== */
(function settingsMenu(){
  var btn  = $('#settingsMenuBtn');
  var menu = $('#settingsMenu');
  if(!btn || !menu) return;

  // Asegura la opción “Idioma” y que esté traducida
  function ensureLangItem(){
  // 1) Si por cualquier motivo hay más de uno, dejamos solo el primero
  var all = menu.querySelectorAll('[data-action="language"]');
  if (all.length > 1){
    for (var i = 1; i < all.length; i++){ try{ all[i].remove(); }catch(_){ } }
  }
  var it = all[0];

    // 2) Si no existe, lo creamos justo después de “Temas”; si no, rehacemos el label
  if(!it){
    // ⚠️ No pases 'data-action' en props: el helper lo forza abajo con setAttribute
    it = el('button', { type:'button', className:'item' }, t('Idioma'));
    it.setAttribute('role','menuitem');
    it.setAttribute('data-action', 'language'); // ✅ atributo real (evita duplicados)

    var afterThemes = menu.querySelector('[data-action="themes"]');
    if (afterThemes && afterThemes.nextSibling){
      menu.insertBefore(it, afterThemes.nextSibling);
    } else {
      menu.append(it);
    }
  }else{
    it.textContent = t('Idioma'); // re‑traduce si cambió el idioma
  }

  // 🧹 Limpieza: elimina copias antiguas sin data‑action que se hayan quedado en el menú
  ;[].slice.call(menu.querySelectorAll('.item')).forEach(function(n){
    if(n !== it && !n.getAttribute('data-action') &&
       (n.textContent || '').trim() === t('Idioma')){
      try{ n.parentNode && n.parentNode.removeChild(n); }catch(_){}
    }
  });

  
}

  function open(){
    menu.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    document.body.classList.add('menu-open');
    update();
  }
  function close(){
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
    document.body.classList.remove('menu-open');
  }
  function toggle(){
    (menu.classList.contains('open') ? close() : open());
  }

  function update(){
    // Glow ON/OFF
    var onGlow = document.body.classList.contains('panels-glow');
var lab = $('#panelGlowState');
if (lab) lab.textContent = t(onGlow ? 'ON' : 'OFF');
// fuerza el prefijo traducido si el contenedor existe
var itGlow = document.querySelector('#settingsMenu .item[data-action="panelGlow"]');
if (itGlow) itGlow.innerHTML = t('Esquinas') + ': <span id="panelGlowState">' + t(onGlow ? 'ON' : 'OFF') + '</span>';



    // Garantiza que el ítem “Idioma” esté en el idioma activo
    ensureLangItem();
// Habilita/deshabilita "Instalar" según availability del prompt PWA
try{
  var itInst = document.querySelector('#settingsMenu .item[data-action="install"]');
  if (itInst){
    var available = !!deferredPrompt;
    if (available){
      itInst.removeAttribute('disabled');
      itInst.setAttribute('aria-disabled','false');
    }else{
      itInst.setAttribute('disabled','');
      itInst.setAttribute('aria-disabled','true');
    }
  }
}catch(_){}

    // También re‑aplica traducciones de los textos del menú por si cambió el idioma
    try{ applyI18NNow(); }catch(_){}
  }

  // ==== Panel de idioma (modal dinámico con 7 radios) ====
   function openLanguagePanel(){
    modal(t('Idioma'), '', false);

    var body = $('#modal-body');
    if(!body) return;
    body.innerHTML = '';

    var current = __i18nNormalizeLang(state.lang || 'es');

    var wrap = el('div',{className:'lang-picker'});
    wrap.append(
      el('p',{className:'lang-picker-copy'}, t('Selecciona idioma'))
    );

    var grid = el('div',{className:'lang-picker-grid'});

    SUPPORTED_LANGS.forEach(function(p){
      var code = p[0];
      var labelKey = p[1];
      var input = el('input',{ type:'radio', name:'lang', value:code });
      if(current === code) input.checked = true;

      var ui = el('span',{className:'lang-option-ui'},[
        el('span',{className:'lang-option-code'}, code),
        el('span',{className:'lang-option-name'}, t(labelKey))
      ]);

      grid.append(
        el('label',{className:'lang-option'},[
          input,
          ui
        ])
      );
    });

    var btnCancel = el('button',{className:'btn ghost', type:'button', id:'langCancel'}, t('Cancelar'));
    var btnApply  = el('button',{className:'btn success', type:'button', id:'langApply'}, t('Aplicar'));

    on(btnCancel,'click', function(){
      $('#modal').classList.add('hidden');
    });

    on(btnApply,'click', function(){
      try{
        var sel = $('#modal [name="lang"]:checked');
        var v = sel && sel.value || 'es';
        state.lang = __i18nNormalizeLang(v);
        save();

        var api = __i18nGetManager();
        if(api && typeof api.setLang === 'function') api.setLang(state.lang);
        __i18nSyncCache(state.lang);

        $('#modal').classList.add('hidden');

        applyI18NNow();
        update();
        router.resolve();
      }catch(_){}
    });

    wrap.append(
      grid,
      el('div',{className:'lang-picker-actions'},[
        btnCancel,
        btnApply
      ])
    );

    body.append(wrap);
  }

  // ——— Interacciones del botón del menú
  on(btn,'pointerdown', function(e){ e.stopPropagation(); });
  on(btn,'click', function(e){ e.preventDefault(); e.stopPropagation(); toggle(); });

  // Dentro del menú: no dejar que suba al documento
    // Evita que el pointerdown interno burbujee y dispare el cierre global
  on(menu,'pointerdown', function(e){ e.stopPropagation(); });

  on(menu,'click', function(e){
    e.stopPropagation();
  var it = e.target.closest('.item'); if(!it) return;
  // ⛔ si está deshabilitado o marcado aria-disabled, no hacemos nada
  if (it.hasAttribute('disabled') || it.getAttribute('aria-disabled') === 'true') return;
  var act = it.getAttribute('data-action');


    if(act==='themes'){ window.openSkinsOverlay && window.openSkinsOverlay(); close(); return; }
    if(act==='panelGlow'){
      document.body.classList.toggle('panels-glow');
      state.ui = state.ui || {};
      state.ui.panelGlow = document.body.classList.contains('panels-glow');
      save(); update(); return;
    }
    if(act==='resetPanels'){
      if(location.hash.indexOf('/crear')===-1){ toast('Abre "Crear" para ordenar los paneles.'); close(); return; }
      if (window.orderPanelsBase) window.orderPanelsBase();
      if (window.ensurePanelsVisibleNow) window.ensurePanelsVisibleNow();
      close(); return;
    }
    if(act==='install'){ window.tryInstall && window.tryInstall(); close(); return; }
    if(act==='language'){
      openLanguagePanel();
      close();
      return;
    }
  });

  // Cierre al clicar fuera o con Escape
  on(document,'pointerdown', function(e){
    if(e.target===btn || btn.contains(e.target) || menu.contains(e.target)) return;
    close();
  });
  on(document,'keydown', function(e){ if(e.key==='Escape') close(); });

  // Estado inicial del glow y refresco de etiquetas
  if(state && state.ui && state.ui.panelGlow) document.body.classList.add('panels-glow');
  update();
})();

/* ===== Menú Paneles (header) + botón ⇵ ===== */
(function panelsMenu(){
 var btn  = $('#panelsMenuBtn');
var menu = $('#panelsMenu');
var chF = $('#chkPanelFile'), chA = $('#chkPanelAdvanced'), chB = $('#chkPanelBrush');


  if(!btn || !menu) return;

  function syncChecksFromState(){
    var v = (state.layout && state.layout.visible) || {};
   if(chF) chF.checked = v['p-file']     !== false;
if(chA) chA.checked = v['p-advanced'] !== false;
if(chB) chB.checked = v['p-brush']    !== false;

  }

  function open(){
    document.body.classList.add('menu-open');
    menu.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    syncChecksFromState();
  }
  function close(){
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
    document.body.classList.remove('menu-open');
  }
  function toggle(){ (menu.classList.contains('open') ? close() : open()); }

  // header button
  on(btn,'pointerdown', function(e){ e.stopPropagation(); });
  on(btn,'click', function(e){ e.preventDefault(); e.stopPropagation(); toggle(); });

  // click inside menu NO cierra
  on(menu,'pointerdown', function(e){ e.stopPropagation(); });

  // clicks fuera cierran
  on(document,'pointerdown', function(e){
    if(e.target===btn || btn.contains(e.target) || menu.contains(e.target)) return;
    close();
  });
  on(document,'keydown', function(e){ if(e.key==='Escape') close(); });

  // Cambios de checks
  function set(key, on){
    if(typeof window.__applyPanelVisibility === 'function'){
      window.__applyPanelVisibility(key, !!on);
    }else{
      // respaldo si aún no cargó el estudio
      state.layout = state.layout || {}; state.layout.visible = state.layout.visible || {};
      state.layout.visible[key] = !!on; save();
    }
  }
  if(chF) on(chF,'change', function(e){ set('p-file', e.target.checked); });
  if(chA) on(chA,'change', function(e){ set('p-advanced', e.target.checked); });
  if(chB) on(chB,'change', function(e){ set('p-brush', e.target.checked); });




  // disponible para el estudio
  window.__setPanelsMenuChecks = syncChecksFromState;
})();
/* ===== Botón ⇵ (ordenar paneles) ===== */
/* Marcar el botón para que sólo viva en /crear (CSS hará el resto) */
(function(){
  var b = document.getElementById('orderPanelsBtn');
  if (b && !b.classList.contains('only-crear')) b.classList.add('only-crear');
})();

/* ===== Botón ⇵ (ordenar paneles) ===== */
on($('#orderPanelsBtn'),'click', function(){
  if(location.hash.indexOf('/crear')===-1){ toast('Abre "Crear" para ordenar los paneles.'); return; }
  window.orderPanelsBase ? window.orderPanelsBase() : toast('Paneles no disponibles.');
});


  /* ===== Color helpers ===== */
  function hexToRgb(hex){
    var safe = normalizeColorHex(hex, '#000000') || '#000000';
    var h = String(safe).replace('#','');
    return {
      r: parseInt(h.slice(0,2),16),
      g: parseInt(h.slice(2,4),16),
      b: parseInt(h.slice(4,6),16)
    };
  }
  function rgbToHex(r,g,b){ function toHex(n){ var s=n.toString(16); return s.length<2?'0'+s:s; } return '#'+toHex(r)+toHex(g)+toHex(b); }
  function normalizePickerValue(input, fallback){
    var fb = normalizeColorHex(fallback, '#000000') || '#000000';
    var col = normalizeColorHex(input && input.value, fb) || fb;
    if(input) input.value = col;
    return col;
  }
  function rgbaStr(hex, a){ if(a==null)a=1; var c=hexToRgb(hex); a=clamp(a,0,1); return 'rgba('+c.r+','+c.g+','+c.b+','+a+')'; }
  function hslToHex(h,s,l){
    s/=100; l/=100;
    var c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
    var r=0,g=0,b=0;
    if (h<60){ r=c; g=x; b=0; }
    else if (h<120){ r=x; g=c; b=0; }
    else if (h<180){ r=0; g=c; b=x; }
    else if (h<240){ r=0; g=x; b=c; }
    else if (h<300){ r=x; g=0; b=c; }
    else { r=c; g=0; b=x; }
    r=Math.round((r+m)*255); g=Math.round((g+m)*255); b=Math.round((b+m)*255);
    function toHex(n){ var s=n.toString(16); return s.length<2?'0'+s:s; }
    return '#'+toHex(r)+toHex(g)+toHex(b);
  }

   /* ===== Dibujo ===== */
  var dpr=Math.max(1, Math.min(2, window.devicePixelRatio||1));
  function calcCanvasSquare(){
    var header=$('#siteHeader'), footer=$('#siteFooter');
    var hh=header?header.offsetHeight:0, fh=footer?footer.offsetHeight:0;
    var availH = Math.max(0, window.innerHeight - hh - fh); // +12px de respiro

    var availW = Math.max(0, window.innerWidth);
    var base   = Math.min(availH, availW);
    if (!isFinite(base) || base <= 0) base = Math.min(window.innerWidth || 0, window.innerHeight || 0) - 32;
    var size = Math.floor(clamp(base, 320, 2400));
    return { w:size, h:size };
  }
// ---------------- MandalaStudio ----------------
 function MandalaStudio(){
  var wrap=el('section',{className:'card'});
  var workspace=el('div',{className:'workspace'});
  var stage=el('div',{className:'canvas-stage'});
 

  var canvas=el('canvas', {id:'mandala'});
 stage.append( canvas);

// ——— Dock de animación (pegado a la derecha del panel “Archivo”)

// 🔒 Limpieza defensiva: borra CUALQUIER copia previa (por id duplicado)
Array.prototype.forEach.call(document.querySelectorAll('#animDock'), function(n){
  if(n && n.parentNode) n.parentNode.removeChild(n);
});

var animDock = el('div',{
  id:'animDock',
  className:'only-crear',
  // ❗️no ponemos display aquí; lo controla CSS (.only-crear) y positionAnimDock()
  style:'position:fixed; flex-direction:column; gap:8px; z-index:58;'
});
var btnPlay  = el('button',{className:'btn small ghost square', title:t('Reproducir')}, '▶');
var btnPause = el('button',{className:'btn small ghost square', title:t('Pausar')},     '⏸');
var btnStop  = el('button',{className:'btn small ghost square', title:t('Parar')},      '⏹');
var btnAudio = el('button',{className:'btn small ghost square', title:t('Importar audio')}, '🎵');

var inpAudio = el('input',{type:'file', accept:'audio/*', style:'display:none'});

animDock.append(btnPlay, btnPause, btnStop, btnAudio, inpAudio);
document.body.appendChild(animDock);


// Posiciona el dock colindante al panel Archivo y sincroniza su visibilidad
function positionAnimDock(){
  if(!PF || !PF.panel || !animDock) return;

  // 🚫 Nunca visible fuera de la vista “/crear”
  if(!document.body.classList.contains('is-crear')){
    animDock.style.display = 'none';
    return;
  }

  var p = PF.panel;
  var x = p.offsetLeft + p.offsetWidth + 12;  // pegado a su derecha
  var y = p.offsetTop + 6;                    // alineado arriba
  animDock.style.left = x + 'px';
  animDock.style.top  = y + 'px';

  // Solo si Archivo está visible
  var v = (state.layout && state.layout.visible) || {};
  var show = (v['p-file'] !== false);
  animDock.style.display = show ? 'flex' : 'none';
}

window.positionAnimDock = positionAnimDock;

// Reproductor de audio compartido
var audioEl = new Audio(); audioEl.preload='auto';

on(btnAudio,'click', function(){ inpAudio.click(); });
on(inpAudio,'change', function(e){
  var f = e.target.files && e.target.files[0]; if(!f) return;
  if(audioEl.src){ try{ URL.revokeObjectURL(audioEl.src); }catch(_){ } }
  audioEl.src = URL.createObjectURL(f);
  state.anim = state.anim || {}; state.anim.audioName = f.name||'audio'; save();
});

on(btnPlay,'click',  function(){ state.anim.enabled=true;  save(); ensureAnim(); try{ audioEl.play(); }catch(_){ } });
on(btnPause,'click', function(){ state.anim.enabled=false; save(); ensureAnim(); try{ audioEl.pause(); }catch(_){ } });
on(btnStop,'click',  function(){
  state.anim.enabled=false;
  for(var i=0;i<doc.layers.length;i++){ doc.layers[i].rotAngle=0; }
  save(); ensureAnim(); render();
  try{ audioEl.pause(); audioEl.currentTime=0; }catch(_){ }
});

  workspace.append(stage);
  wrap.append(workspace);


    /* Documento */
    var doc = state.pendingDoc ? clone(state.pendingDoc) : {
  layers:[{id:uid(), name:'Trazos', visible:true, outlineUnion:false, strokes:[], rotEnabled:false, rotSpeed:8, rotDir:1, rotAngle:0}],
  activeLayer:0
};
if(state.pendingDoc){ toast('Obra cargada.'); }

// 🧊 Compat: si la obra abierta viene de antes, congela flags y centros faltantes
(function freezeLegacyStyleAndCenters(){
  try{
    doc.layers.forEach(function(L){
      (L.strokes||[]).forEach(function(s){
        if(s.sectors==null) s.sectors = state.settings.symmetry|0;
        if(s.mirror==null) s.mirror = !!state.settings.mirror;
        if(s.mirrorInverse==null) s.mirrorInverse = !!state.settings.mirrorInverse;
        if(s.altFlip==null) s.altFlip = !!state.settings.altFlip;
        if((!s.centersUV || !s.centersUV.length) && state.center && Array.isArray(state.center.points) && state.center.points.length){
          s.centersUV = state.center.points.map(function(p){ return {u:clamp(p.u,0,1), v:clamp(p.v,0,1)}; });
        }
      });
    });
  }catch(_){}
})();

var history=[], redoStack=[];

function autosave(){ state.pendingDoc = clone(doc); save(); }

// ⛑️ Congela "sectors" en trazos existentes para que no cambien con el slider de "nuevos trazos"
(function freezeLegacySectors(){
  try{
    doc.layers.forEach(function(L){
      (L.strokes||[]).forEach(function(s){
        if(s.sectors==null) s.sectors = state.settings.symmetry|0;
      });
    });
  }catch(_){}
})();

    

    function pushHistory(a){ history.push(a); redoStack.length=0; }
    function undo(){ if(!history.length) return; var a=history.pop(); if(a.type==='add-stroke'){ doc.layers[a.layer].strokes.pop(); redoStack.push(a); render(); } }
    function redo(){ if(!redoStack.length) return; var a=redoStack.pop(); if(a.type==='add-stroke'){ doc.layers[a.layer].strokes.push(a.stroke); history.push(a); render(); } }

    /* Canvas */
    var viewCssSide=0;
    function resizeCanvas(){
  // Altura disponible: igual que antes
  var header=$('#siteHeader'), footer=$('#siteFooter');
  var hh=header?header.offsetHeight:0, fh=footer?footer.offsetHeight:0;
  var availH = Math.max(0, window.innerHeight - hh - fh - 28);

 // 🆕 Ancho disponible: usa directamente el contenedor del visor (stage)
var MARGIN = (window.innerWidth > 980 ? 20 : 6); // 20px en desktop, 6px en móvil
var stageW = stage ? Math.round(stage.clientWidth) : window.innerWidth;
var freeW  = Math.max(0, stageW - (MARGIN * 2));


  var base = Math.min(availH, freeW);
  var side = clamp(Math.floor(base), 320, 2400);

  viewCssSide = side;
  canvas.width  = Math.floor(side * dpr);
  canvas.height = Math.floor(side * dpr);
  canvas.style.width  = side + 'px';
  canvas.style.height = side + 'px';

  var ctx=canvas.getContext('2d'); if(!ctx) return;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  render();
}

    on(window,'resize',resizeCanvas);
on(window,'resize', positionAnimDock);

    /* Grid */
    function drawGrid(ctx,w,h){
  if(!state.settings.showGrid) return;

  var centers = getActiveCenters(w,h);                // ✅ usa el/los centros activos
  var K = Math.max(1, state.settings.symmetry|0);
  ctx.save();
var gcol = (state && state.settings && state.settings.gridColor) || '#ffffff';
ctx.strokeStyle = rgbaStr(gcol, 0.18);  // leve transparencia
ctx.lineWidth = 1;


  centers.forEach(function(C){
    // Radio máximo visible desde ese centro (para que los círculos entren en el lienzo)
    var R = Math.max(8, Math.min(C.x, w-C.x, C.y, h-C.y));
    // Radios concéntricos
    var step = R/6, r;
    for(r=step; r<=R+0.01; r+=step){
      ctx.beginPath(); ctx.arc(C.x, C.y, r, 0, Math.PI*2); ctx.stroke();
    }
    // Rayos radiales
    for(var k=0;k<K;k++){
      var a = k*(2*Math.PI/K);
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(C.x + Math.cos(a)*R, C.y + Math.sin(a)*R);
      ctx.stroke();
    }
  });

  ctx.restore();
}
function drawCenterLabels(ctx, centers){
  if(!centers || !centers.length) return;
  ctx.save();
  var acc = (getComputedStyle && getComputedStyle(document.documentElement).getPropertyValue('--accent')) || '#0ea5e9';
  ctx.font = 'bold 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  centers.forEach(function(C, i){
    var t = String(i+1), padX=6, h=16;
    var tx = C.x, ty = C.y - 14;
    var w = ctx.measureText(t).width + padX*2;
    var x = tx - w/2, y = ty - h/2, r = 6;

    // etiqueta (rectángulo redondeado)
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.stroke();

    // número
    ctx.fillStyle = String(acc).trim() || '#0ea5e9';
    ctx.fillText(t, tx, ty);
  });

  ctx.restore();
}

    function getActiveCenters(w,h){
  // Puntos normalizados (u,v)
  var pts = state.center && Array.isArray(state.center.points) ? state.center.points : [];

  // Compat: inicializa active si faltara
  if(!state.center.active){ state.center.active = { mode:'all', index:0 }; }

  if(state.center.mode==='centrado' || !pts.length){
    return [{x:w/2, y:h/2}];
  }

  // “Elegir”: usa solo un centro
  if(state.center.active.mode==='choose' && pts.length){
    var i = clamp(parseInt(state.center.active.index||0,10), 0, pts.length-1);
    var p = pts[i]; return [{x:p.u*w, y:p.v*h}];
  }

  // “Todos”
  return pts.map(function(p){ return {x:p.u*w, y:p.v*h}; });
}

function remainingCentersToPick(){
  if(state.center.mode!=='seleccion') return 0;
  var need = Math.max(1, parseInt(state.center.count||1,10));
  var has  = (state.center.points||[]).length;
  return Math.max(0, need - has);
}

var centerPickConsumed=false, centerPickPointerId=null;

function startPickingCenters(){
  state.center.points = [];
  centerPickConsumed = false;
  centerPickPointerId = null;
  save();
  toast('Haz clic en el lienzo para elegir '+Math.max(1,state.center.count||1)+' centro(s).');
  render(); // ✅ limpia/actualiza rejilla + etiquetas
}


    /* === Path helpers === */
    function buildPathFn(ctx, stroke, w, h, cx, cy){
  var pts=stroke.points.map(function(p){ return {x:p.u*w, y:p.v*h}; });
  pts = pts.filter(function(p){ return isFinite(p.x)&&isFinite(p.y); });
  var rel = pts.map(function(p){ return {x:p.x - cx, y:p.y - cy}; });
  if(!rel.length) return null;
  return function(){
    ctx.beginPath();
    if(rel.length===1){ ctx.arc(rel[0].x, rel[0].y, Math.max(.5, (stroke.size)/2), 0, Math.PI*2); return; }
    ctx.moveTo(rel[0].x, rel[0].y);
    function mid(p,q){ return {x:(p.x+q.x)/2, y:(p.y+q.y)/2}; }
    for(var i=1;i<rel.length-1;i++){ var cp=rel[i]; var mp=mid(rel[i], rel[i+1]); ctx.quadraticCurveTo(cp.x, cp.y, mp.x, mp.y); }
    var last=rel[rel.length-1]; ctx.lineTo(last.x, last.y);
  };
}
// === Simplificador Ramer–Douglas–Peucker (en UV) ===
function simplifyRDP(pts, eps){
  if(!pts || pts.length <= 2) return pts;
  function d2(a,b){ var du=a.u-b.u, dv=a.v-b.v; return du*du + dv*dv; }
  function segDist(p, a, b){
    var l2 = d2(a,b); if(l2===0) return Math.sqrt(d2(p,a));
    var t = ((p.u-a.u)*(b.u-a.u) + (p.v-a.v)*(b.v-a.v)) / l2;
    t = Math.max(0, Math.min(1, t));
    var x = a.u + t*(b.u-a.u), y = a.v + t*(b.v-a.v);
    var du = p.u - x, dv = p.v - y;
    return Math.sqrt(du*du + dv*dv);
  }
  function rdp(arr, first, last, out){
    var maxD = 0, idx = -1;
    for(var i=first+1; i<last; i++){
      var d = segDist(arr[i], arr[first], arr[last]);
      if(d > maxD){ maxD = d; idx = i; }
    }
    if(maxD > eps && idx > first){
      rdp(arr, first, idx, out);
      rdp(arr, idx,   last, out);
    }else{
      out.push(arr[first]);
      out.push(arr[last]);
    }
  }
  var tmp = []; rdp(pts, 0, pts.length-1, tmp);
  // compacta duplicados
  var out=[tmp[0]];
  for(var j=1;j<tmp.length;j++){
    var a=out[out.length-1], b=tmp[j];
    if(a.u!==b.u || a.v!==b.v) out.push(b);
  }
  return out;
}


    /* === Réplicas radial/diédrico + nuevos modos === */
    function drawReplicated(ctx, pathFn, w, h, sectors, mirror, mirrorInv, altFlip, cx, cy){
  cx = (cx==null)? w/2 : cx; cy = (cy==null)? h/2 : cy;
  var K=Math.max(1, sectors|0), ang=(2*Math.PI)/K, k;
  for(k=0;k<K;k++){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(ang*k); if(altFlip && (k%2===1)) ctx.scale(-1,1); pathFn(); ctx.stroke(); ctx.restore();
    if(mirror){
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(ang*k); ctx.scale(-1,1); pathFn(); ctx.stroke(); ctx.restore();
    }
    if(mirrorInv){
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(ang*k + ang/2); ctx.scale(-1,1); pathFn(); ctx.stroke(); ctx.restore();
    }
  }
}


    function applyBrushStyle(ctx, stroke){
      var lw = stroke.size;
      ctx.shadowBlur=0; ctx.filter='none';
      if(stroke.shape==='round'){ ctx.lineCap='round'; ctx.lineJoin='round'; }
      else if(stroke.shape==='square'){ ctx.lineCap='butt'; ctx.lineJoin='bevel'; ctx.miterLimit=2; }
      else if(stroke.shape==='soft'){ ctx.lineCap='round'; ctx.lineJoin='round'; ctx.shadowColor=stroke.color; ctx.shadowBlur=Math.max(2, lw*0.6); }

      if(stroke.tool==='eraser'){ ctx.setLineDash([]); return; }
      var p = stroke.pattern||'solid', d=[];
var dref = (stroke.dashBaseSize!=null ? stroke.dashBaseSize : lw);
if(p==='solid')      d=[];
else if(p==='dash')      d=[4*dref, 2*dref];
else if(p==='longdash')  d=[8*dref, 3*dref];
else if(p==='dot')       d=[Math.max(1, dref*0.1), 2.1*dref];
else if(p==='dashdot')   d=[6*dref, 2*dref, dref, 2*dref];
/* p==='pulse' -> sin dashes aquí; se manejan en drawStrokeCustom */
ctx.setLineDash(d);

    }
    /* ===== Sellos (stamp-*) — puntos colocados a lo largo del trazo ===== */
function drawStampStroke(ctx, stroke, w, h, o){
  var lw      = o.lw;                           // usamos overrideWidth como “tamaño” del sello
  var color   = o.color;
  var comp    = o.comp || 'source-over';
  var sectors = Math.max(1, o.sectors|0);
  var mirror  = !!o.mirror, invMir=!!o.invMir, altFlip=!!o.altFlip;
  var centers = (o.centers && o.centers.length) ? o.centers : [{x:w/2, y:h/2}];

  // Puntos en px y muestreo por distancia (evita saturar sellos)
  var pts = (stroke.points||[]).map(function(p){ return {x:p.u*w, y:p.v*h}; });
  if(!pts.length) return;

  var spacing = Math.max(4, lw * 1.1);   // distancia mínima entre sellos
  var filtered = [];
  var last = null, i;
  for(i=0;i<pts.length;i++){
    var P = pts[i];
    if(!last){ filtered.push({x:P.x, y:P.y, a:0}); last=P; continue; }
    var dx=P.x-last.x, dy=P.y-last.y, d=Math.sqrt(dx*dx+dy*dy);
    if(d>=spacing){
      filtered.push({x:P.x, y:P.y, a:Math.atan2(dy,dx)});
      last = P;
    }
  }
  if(filtered.length===1){ filtered[0].a = 0; }

  var kind = String(stroke.shape||'').replace('stamp-',''); // dot | geo | petal

  function drawOneStamp(radius){
    if(kind==='dot'){
      ctx.beginPath(); ctx.arc(0,0, Math.max(1, radius*0.6), 0, Math.PI*2);
      ctx.fillStyle = color; ctx.fill(); return;
    }
    if(kind==='geo'){
      // Hexágono pequeño (geometría mini)
      var R = Math.max(1, radius*0.7);
      ctx.beginPath();
      for(var t=0;t<6;t++){
        var ang = t * Math.PI/3;
        var x = Math.cos(ang)*R, y = Math.sin(ang)*R;
        if(t===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath();
      ctx.lineWidth = Math.max(1, radius*0.28);
      ctx.strokeStyle = color;
      ctx.stroke();
      return;
    }
    if(kind==='petal'){
      // Pétalo elíptico
      var Rx = Math.max(1, radius*0.8), Ry = Math.max(1, radius*0.55);
      ctx.beginPath();
      ctx.ellipse(0,0, Rx, Ry, 0, 0, Math.PI*2);
      ctx.fillStyle = color; ctx.fill(); return;
    }
  }

  function drawRep(angleOffset){
    centers.forEach(function(C){
      // puntos relativos al centro
      var rel = filtered.map(function(p){ return {x:p.x-C.x, y:p.y-C.y, a:p.a}; });

      for(var k=0;k<sectors;k++){
        ctx.save();
        ctx.translate(C.x, C.y);
        ctx.rotate((2*Math.PI/sectors)*k + (angleOffset||0));
        if(altFlip && (k%2===1)) ctx.scale(-1,1);

        rel.forEach(function(p){
          ctx.save();
          ctx.translate(p.x, p.y);
          if(kind==='petal'){ ctx.rotate(p.a||0); }
          drawOneStamp(lw);
          ctx.restore();
        });
        ctx.restore();

        if(mirror){
          ctx.save(); ctx.translate(C.x, C.y); ctx.rotate((2*Math.PI/sectors)*k); ctx.scale(-1,1);
          rel.forEach(function(p){
            ctx.save();
            ctx.translate(p.x, p.y);
            if(kind==='petal'){ ctx.rotate(p.a||0); }
            drawOneStamp(lw);
            ctx.restore();
          });
          ctx.restore();
        }
      }
    });
  }

  var oldComp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = comp; // respeta goma si algún día se usa
  drawRep(0);                          // base
  if(invMir) drawRep(Math.PI/sectors); // espejo inverso (½ sector)
  ctx.globalCompositeOperation = oldComp;
}

    function drawStrokeCustom(ctx, stroke, w, h, opts){
  if(!stroke.points || !stroke.points.length) return;
  opts=opts||{};
  var lw=(opts.overrideWidth!=null?opts.overrideWidth:stroke.size);
  var color=(opts.overrideColor||rgbaStr(stroke.color, stroke.opacity));
  var comp=(opts.overrideComposite|| (stroke.tool==='eraser'?'destination-out':'source-over'));
  var sectors = (opts.sectors!=null?opts.sectors:(stroke.sectors!=null?stroke.sectors:state.settings.symmetry));
  var mirror  = (opts.mirror !=null?opts.mirror :(stroke.mirror !=null?stroke.mirror :state.settings.mirror));
  var invMir  = (opts.mirrorInv!=null?opts.mirrorInv:(stroke.mirrorInverse!=null?stroke.mirrorInverse:state.settings.mirrorInverse));
  var altFlip = (opts.altFlip !=null?opts.altFlip :(stroke.altFlip !=null?stroke.altFlip:state.settings.altFlip));
  var centers = (stroke.centersUV && stroke.centersUV.length)
  ? stroke.centersUV.map(function(p){ return {x:p.u*w, y:p.v*h}; })
  : (opts.centers || getActiveCenters(w,h));
        // === NUEVO: sellos (stamp-* en "Punta")
  if (/^stamp-/.test(stroke.shape||'')) {
    drawStampStroke(ctx, stroke, w, h, {
      lw: lw, color: color, comp: comp, sectors: sectors,
      mirror: mirror, invMir: invMir, altFlip: altFlip, centers: centers
    });
    return;
  }


  ctx.save();
  ctx.globalCompositeOperation=comp;
  ctx.strokeStyle=color; ctx.lineWidth=lw;
 applyBrushStyle(ctx, {
  shape:stroke.shape, size:lw, dashBaseSize:(stroke.size||lw),
  pattern:stroke.pattern, tool:stroke.tool, color:color
});


  // patrón 'pulso'
  if(stroke.pattern==='pulse' && stroke.tool!=='eraser'){
    var baseL = Math.max(2, Math.round(8 * ((stroke && stroke.size) ? stroke.size : lw)));

    centers.forEach(function(C){
      // grueso
      ctx.save();
      ctx.setLineDash([baseL, baseL]);
      ctx.lineDashOffset=0;
      ctx.lineWidth=lw*1.6;
      var pf = buildPathFn(ctx, stroke, w, h, C.x, C.y);
      if(pf) drawReplicated(ctx, pf, w, h, Math.max(1,sectors|0), !!mirror, !!invMir, !!altFlip, C.x, C.y);
      ctx.restore();

      // fino
      ctx.save();
      ctx.setLineDash([baseL, baseL]);
      ctx.lineDashOffset=baseL;
      ctx.lineWidth=Math.max(1, lw*0.6);
      var pf2 = buildPathFn(ctx, stroke, w, h, C.x, C.y);
      if(pf2) drawReplicated(ctx, pf2, w, h, Math.max(1,sectors|0), !!mirror, !!invMir, !!altFlip, C.x, C.y);
      ctx.restore();
    });
    ctx.restore();
    return;
  }

  // normal
  centers.forEach(function(C){
    var pf = buildPathFn(ctx, stroke, w, h, C.x, C.y);
    if(pf) drawReplicated(ctx, pf, w, h, Math.max(1,sectors|0), !!mirror, !!invMir, !!altFlip, C.x, C.y);
  });

  ctx.restore();
}

// Aplica K sectores a TODOS los trazos del documento
function applySymmetryToAllStrokes(k){
  k = clamp(parseInt(k||1,10), 1, 64);
  try{
    doc.layers.forEach(function(L){
      (L.strokes||[]).forEach(function(s){
        s.sectors = k;
      });
    });
    render(); autosave();
    toast(t('Radiales aplicados a todo: ')+k);
  }catch(_){}
}

    function drawStrokeWithOutline(ctx, stroke, w, h, hasUnion){
      if(stroke.tool==='eraser'){ drawStrokeCustom(ctx, stroke, w, h, {}); return; }
      if(!hasUnion && stroke.outline){
        var ow=stroke.outlineWidth||1, outW=(stroke.size + 2*ow);
        var ocol = rgbaStr(stroke.outlineColor, stroke.outlineOpacity==null?1:stroke.outlineOpacity);
        drawStrokeCustom(ctx, stroke, w, h, {overrideWidth:outW, overrideColor:ocol, overrideComposite:'source-over'});
      }
      drawStrokeCustom(ctx, stroke, w, h, {});
    }

    function drawLayerUnionOutline(ctx, layer, w, h){
      var need=false, i, s;
      for(i=0;i<layer.strokes.length;i++){ s=layer.strokes[i]; if(s.tool!=='eraser' && s.outline){ need=true; break; } }
      if(!need) return;

      var ocA=document.createElement('canvas'), ocB=document.createElement('canvas');
      ocA.width=Math.floor(w); ocA.height=Math.floor(h);
      ocB.width=ocA.width; ocB.height=ocA.height;
      var a=ocA.getContext('2d'), b=ocB.getContext('2d');
      a.setTransform(1,0,0,1,0,0); b.setTransform(1,0,0,1,0,0);

      for(i=0;i<layer.strokes.length;i++){
        s=layer.strokes[i];
        if(s.tool==='eraser'){
          drawStrokeCustom(a, s, w, h, {});
          drawStrokeCustom(b, s, w, h, {});
          continue;
        }
        if(!s.outline) continue;
        var ow=s.outlineWidth||1, bigW=(s.size+2*ow);
        var ocol = rgbaStr(s.outlineColor, s.outlineOpacity==null?1:s.outlineOpacity);
        drawStrokeCustom(a, s, w, h, {overrideWidth:bigW, overrideColor:ocol, overrideComposite:'source-over'});
        drawStrokeCustom(b, s, w, h, {overrideWidth:(s.size), overrideColor:'#000', overrideComposite:'source-over'});
      }
      a.globalCompositeOperation='destination-out'; a.drawImage(ocB,0,0); a.globalCompositeOperation='source-over';
      try{ ocB.width=0; }catch(e){}
      ctx.drawImage(ocA,0,0);
    }

    function renderTo(ctx, w, h, opts){
  opts=opts||{}; var layerAngles=opts.layerAngles||null;
  var cx=w/2, cy=h/2;

  ctx.clearRect(0,0,w,h);
  var transparent = opts && opts.transparent;
  if(!transparent){
    ctx.fillStyle=state.settings.background; ctx.fillRect(0,0,w,h);
  }

  if (ctx.imageSmoothingEnabled !== undefined) {
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  }

  // Rejilla en el canvas principal (no por capa)
  drawGrid(ctx,w,h);

  // ⬇️ Render por capa en offscreen para aislar la “goma” de cada capa
  for(var i=0;i<doc.layers.length;i++){
    var L=doc.layers[i]; if(!L.visible) continue;

    // 1) dibuja la capa en un offscreen
    var lay = document.createElement('canvas');
    lay.width = Math.floor(w); lay.height = Math.floor(h);
    var lc = lay.getContext('2d');
    if (lc.imageSmoothingEnabled !== undefined) {
      lc.imageSmoothingEnabled = true; lc.imageSmoothingQuality = 'high';
    }

    var hasUnion = !!L.outlineUnion;
    if(hasUnion){
      drawLayerUnionOutline(lc, L, w, h);
    }
    for(var j=0;j<(L.strokes||[]).length;j++){
      drawStrokeWithOutline(lc, L.strokes[j], w, h, hasUnion);
    }

    // 2) compón el offscreen rotado (si procede) sobre el canvas principal
    var angle = layerAngles ? (layerAngles[i]||0) : (L.rotAngle||0);
    ctx.save();
    ctx.translate(cx,cy); if(angle) ctx.rotate(angle); ctx.translate(-cx,-cy);
    ctx.drawImage(lay, 0, 0);
    ctx.restore();

    // liberar
    try{ lay.width=0; }catch(_){}
  }

  // Etiquetas de los centros (encima de todo)
  if(state.settings.labelCenters){
    drawCenterLabels(ctx, getActiveCenters(w,h));
  }
}


    var animRAF=null, animLast=0;
    function anyLayerEnabled(){ for(var i=0;i<doc.layers.length;i++){ if(doc.layers[i].rotEnabled) return true; } return false; }
    function tick(ts){
      if(!state.anim.enabled || !anyLayerEnabled()){ animRAF=null; render(); return; }
      if(!animLast) animLast=ts;
      var dt=(ts-animLast)/1000; animLast=ts;

      for(var i=0;i<doc.layers.length;i++){
        var L=doc.layers[i]; if(!L.rotEnabled) continue;
        var speedRad=( (L.rotSpeed||8) * Math.PI/180 ) * (L.rotDir||1);
        L.rotAngle=( (L.rotAngle||0) + dt*speedRad ) % (Math.PI*2);
      }
      var ctx=canvas.getContext('2d'); if(!ctx) return;
      renderTo(ctx, viewCssSide, viewCssSide, {});
      animRAF=requestAnimationFrame(tick);
    }
    function ensureAnim(){
      if(state.anim.enabled && anyLayerEnabled() && !animRAF){ animLast=0; animRAF=requestAnimationFrame(tick); }
      if((!state.anim.enabled || !anyLayerEnabled()) && animRAF){ cancelAnimationFrame(animRAF); animRAF=null; render(); }
    }
    function render(){ var ctx=canvas.getContext('2d'); if(!ctx) return; renderTo(ctx, viewCssSide, viewCssSide, {}); }

    /* Interacción */
    var drawing=false, curStroke=null, currentTool='brush';
    var wasPlaying=false;
    var pointerIsDown=false; // ⬅️ NUEVO: dibujar solo con botón presionado

    /* === Rutinas de dibujo: iniciar / actualizar / finalizar === */
function pointToUV(x, y){
  var rect = canvas.getBoundingClientRect();
  var u = clamp((x - rect.left) / rect.width , 0, 1);
  var v = clamp((y - rect.top)  / rect.height, 0, 1);
  return {u:u, v:v};
}
function captureAnchoredCentersUV(){
  if(state.center && (state.center.mode === 'anclado' || state.center.mode === 'seleccion')){
    var w = viewCssSide || (canvas.clientWidth || 1);
    var h = w;
    return getActiveCenters(w,h).map(function(C){
      return { u: clamp(C.x / w, 0, 1), v: clamp(C.y / h, 0, 1) };
    });
  }
  return null;
}


function startStroke(x, y, pr){
  drawing = true;
  wasPlaying = !!state.anim.enabled;
  // Pausa animación mientras dibujas (más preciso)
  state.anim.enabled = false; ensureAnim();

  // Crea el trazo con los ajustes actuales
  var uv = pointToUV(x,y);
  curStroke = {
  tool: (currentTool==='eraser' ? 'eraser' : (currentTool==='line' ? 'line' : 'brush')),
  points: [uv],
  size: state.settings.brushSize,
  opacity: state.settings.brushOpacity,
  color: state.settings.color,
  shape: state.settings.brushShape,
  pattern: state.settings.brushPattern,
  outline: !!state.settings.outlineEnabled,
  outlineColor: state.settings.outlineColor,
  outlineWidth: state.settings.outlineWidth,
  outlineOpacity: state.settings.outlineOpacity,
  sectors: state.settings.symmetry,       // congela radiales
  mirror: state.settings.mirror,          // 🆕 congela espejo
  mirrorInverse: state.settings.mirrorInverse, // 🆕 congela espejo inverso
  altFlip: state.settings.altFlip         // 🆕 congela alternancia par/impar
};


  // Si el centro está en modo "anclado", congela los centros en el trazo:
  var anch = captureAnchoredCentersUV();
  if(anch && anch.length) curStroke.centersUV = anch;

  // Asegura una capa activa y mete el trazo ahí
  if(!doc.layers[doc.activeLayer]) doc.activeLayer = 0;
  doc.layers[doc.activeLayer].strokes.push(curStroke);

  // Historial para deshacer/rehacer
  pushHistory({ type:'add-stroke', layer: doc.activeLayer, stroke: curStroke });

  render();
}

function updateStroke(x, y, pr, renderNow){

  if(!drawing || !curStroke) return;
  var uv = pointToUV(x,y);

  if(currentTool === 'line'){
    // Mantén 2 puntos: inicio y fin
    if(curStroke.points.length === 1) curStroke.points.push(uv);
    else curStroke.points[1] = uv;
    }else{
    // Añade puntos solo si hay movimiento suficiente (suaviza)
    var last = curStroke.points[curStroke.points.length-1];
    var du = uv.u - last.u, dv = uv.v - last.v;

    // 🆕 Umbral en píxeles reales (≈1.5 px) => trazo MUY fluido
    var rect = canvas.getBoundingClientRect();
    var dxPx = du * rect.width;
    var dyPx = dv * rect.height;
    if ((dxPx*dxPx + dyPx*dyPx) > (1.5*1.5)) {
      curStroke.points.push(uv);
    }
  }

  if(renderNow!==false) render();

}

function endStroke(){
  if(!drawing) return;
  drawing = false;

  // Si en modo línea soltaste sin mover, deja un punto (círculo)
  if(currentTool === 'line' && curStroke && curStroke.points.length === 1){
    curStroke.points.push(curStroke.points[0]);
  }
  // Compacta trazos de goma: reduce puntos redundantes (≈1.5 px)
  if(curStroke && curStroke.tool === 'eraser'){
    try{
      var rect = canvas.getBoundingClientRect();
      var tolUV = 1.5 / Math.max(1, rect.width); // 1.5 px → UV
      curStroke.points = simplifyRDP(curStroke.points, tolUV);
    }catch(_){}
  }

  autosave();
  curStroke = null;

  // Reanuda animación si estaba activa
  if(wasPlaying){ state.anim.enabled = true; ensureAnim(); }

  render();
}

    // 🆕 Long-press cuentagotas + tap = punto + move = trazo
var downX=0, downY=0, downPr=.5, moved=false, sampling=false, holdTimer=null;

on(canvas,'pointerdown',function(e){
  // Modo Selección de centros: solo guardar puntos, NO dibujar
  if(state.center.mode==='seleccion' && remainingCentersToPick()>0){
    pointerIsDown = false;
    cancelHold();
    sampling = false;
    centerPickConsumed = true;
    centerPickPointerId = e.pointerId;
    if(canvas.setPointerCapture){ try{ canvas.setPointerCapture(e.pointerId); }catch(_){ } }

    // ⛑️ Antes de cambiar centros, ancla todos los trazos existentes a los centros actuales
    var w = viewCssSide || (canvas.clientWidth||1), h = w;
    var prev = getActiveCenters(w,h);
    doc.layers.forEach(function(L){
      L.strokes.forEach(function(s){
        if(!s.centersUV || !s.centersUV.length){
          s.centersUV = prev.map(function(C){ return {u: clamp(C.x/w,0,1), v: clamp(C.y/h,0,1)}; });
        }
      });
    });

    var rect=canvas.getBoundingClientRect();
    var u=(e.clientX-rect.left)/rect.width, v=(e.clientY-rect.top)/rect.height;
    state.center.points.push({u:u, v:v}); save();
    if(typeof refreshActiveCenterUI === 'function'){ refreshActiveCenterUI(); }
    render();
    var rest = remainingCentersToPick();
    toast( rest>0 ? ('Centro guardado. Faltan '+rest+'.') : 'Centros listos. ¡A dibujar! 🎯' );
    e.preventDefault();
    if(e.stopPropagation) e.stopPropagation();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    return;
  }

  centerPickConsumed = false;
  centerPickPointerId = null;

  // Solo si NO estamos en selección, arrancamos posible dibujo
  pointerIsDown = true;
  if(canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);

  moved=false; sampling=false; downX=e.clientX; downY=e.clientY; downPr=e.pressure||.5;


  holdTimer = setTimeout(function(){
    if(!moved && !drawing){
      try{
        var rect=canvas.getBoundingClientRect();
        var px = Math.round((downX - rect.left) * dpr);
        var py = Math.round((downY - rect.top) * dpr);
        var ctx=canvas.getContext('2d');
        var d = ctx.getImageData(px,py,1,1).data;
        var hex = rgbToHex(d[0], d[1], d[2]);
        state.settings.color = normalizeColorHex(hex, '#ffffff') || '#ffffff';
        save();
        var inp=$('#bColor',PB.body); if(inp) inp.value=state.settings.color;
        pushColorHistory(state.settings.color); refreshColorHistory();
        toast('🎯 Color: '+state.settings.color.toUpperCase());
      }catch(err){}
      sampling=true;
    }
  }, 520);

  e.preventDefault();
});

function cancelHold(){ if(holdTimer){ clearTimeout(holdTimer); holdTimer=null; } }

on(canvas,'pointermove',function(e){
  if(centerPickConsumed){
    e.preventDefault();
    return;
  }

  if(state.center.mode==='seleccion' && remainingCentersToPick()>0){ e.preventDefault(); return; }

  if(sampling) return;
  if(!pointerIsDown) { e.preventDefault(); return; } // ignora hover sin pulsar

  if(!drawing){
    var dx=e.clientX - downX, dy=e.clientY - downY;
    if(Math.abs(dx)+Math.abs(dy) > 3){
      moved = true; cancelHold();
      startStroke(downX, downY, downPr);

      // 🆕 Captura TODOS los puntos del frame (coalesced)
var evs = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : null;
if(evs && evs.length){
  for(var i=0;i<evs.length;i++){
    var ce = evs[i];
    updateStroke(ce.clientX, ce.clientY, ce.pressure||.5, false); // ⬅️ no render aquí
  }
  render(); // ⬅️ 1 solo render por frame
}else{
  updateStroke(e.clientX, e.clientY, e.pressure||.5);
}

    }
  }else{
    // 🆕 También durante el trazo
    var evs2 = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : null;
if(evs2 && evs2.length){
  for(var j=0;j<evs2.length;j++){
    var c2 = evs2[j];
    updateStroke(c2.clientX, c2.clientY, c2.pressure||.5, false); // ⬅️ no render en el bucle
  }
  render(); // ⬅️ 1 solo render por frame
}else{
  updateStroke(e.clientX, e.clientY, e.pressure||.5);
}

  }
  e.preventDefault();
});

on(canvas,'pointerup',function(e){
  pointerIsDown = false;

  // Este pointerup pertenece a un clic usado para seleccionar centro(s), así que NO dibuja.
  if(centerPickConsumed && (centerPickPointerId==null || e.pointerId===centerPickPointerId)){
    centerPickConsumed = false;
    centerPickPointerId = null;
    cancelHold();
    sampling = false;
    if(canvas.releasePointerCapture){ try{ canvas.releasePointerCapture(e.pointerId); }catch(_){ } }
    e.preventDefault();
    return;
  }

  // En modo selección de centros, nunca dibujar mientras falten puntos
  if(state.center.mode==='seleccion' && remainingCentersToPick()>0){
    cancelHold(); sampling=false; e.preventDefault(); return;
  }

  if(sampling){ sampling=false; cancelHold(); e.preventDefault(); return; }
  if(!drawing){
    cancelHold(); // tap = punto
    startStroke(downX, downY, downPr);
    endStroke();
  }else{
    endStroke();
  }
  e.preventDefault();
});

on(canvas,'pointercancel',function(e){
  pointerIsDown=false;
  centerPickConsumed=false;
  centerPickPointerId=null;
  if(canvas.releasePointerCapture && e && e.pointerId!=null){ try{ canvas.releasePointerCapture(e.pointerId); }catch(_){ } }
  cancelHold();
  if(drawing) endStroke();
  sampling=false;
});
on(canvas,'mouseleave',function(){
  pointerIsDown=false;
  centerPickConsumed=false;
  centerPickPointerId=null;
  cancelHold();
  if(drawing) endStroke();
});



    /* ===== Paneles ===== */
  var topZ = 55;

  // [ROBUST FIX] helper de clamping que reutilizamos fuera y dentro
  function clampPosFactory(stage){
    return function clampPos(x,y){
      var header=$('#siteHeader'), footer=$('#siteFooter');
      var hh=header?header.offsetHeight:0, fh=footer?footer.offsetHeight:0;

      var padSide = (window.innerWidth<=720?8:24);
      var minX = padSide;
      var maxX = Math.max(minX, window.innerWidth - padSide);
            var minY = hh + 8;  // pequeña separación bajo el header

      var maxY = Math.max(minY, window.innerHeight - fh);
      // si tenemos el size real del panel, corregimos:
      var p = this && this.panel ? this.panel : null;
      if(p){
        maxX = Math.max(minX, window.innerWidth - p.offsetWidth - padSide);
        maxY = Math.max(minY, window.innerHeight - fh - p.offsetHeight);
      }
      x = clamp(x, minX, maxX);
      y = clamp(y, minY, maxY);
      return {x:x,y:y};
    }
  }
  var clampPosGlobal = clampPosFactory(stage);


    function makePanel(id, title){
  var p=el('div',{className:'float-panel only-crear', id:id});
    var head=el('div',{className:'fp-head'}, [el('span',{},title)]);
    var body=el('div',{className:'fp-body'});
    p.append(head,body);

    // [ROBUST FIX] Montar SIEMPRE en <body> para evitar stacking raros
    (document.body || $('#app')).appendChild(p);

    var dragging=false, dx=0, dy=0;
    function padX(){ return (window.innerWidth<=720?8:24); }
    function clampPos(x,y){ return clampPosGlobal.call({panel:p}, x, y); }

    on(head,'pointerdown',function(e){
      dragging=true; p.classList.add('dragging');
      p.style.zIndex = String(++topZ);
      dx=e.clientX - p.offsetLeft; dy=e.clientY - p.offsetTop;
      if (head.setPointerCapture) head.setPointerCapture(e.pointerId);
    });
    function moveHandler(e){
  if(!dragging) return;
  var pos=clampPos(e.clientX-dx, e.clientY-dy);
  p.style.left=pos.x+'px'; p.style.top=pos.y+'px';
  if(window.positionAnimDock) window.positionAnimDock();
}

    function upHandler(){
      if(!dragging) return; dragging=false; p.classList.remove('dragging');

      if(window.innerWidth<=720){
        // Snap lateral y apilado en móvil
        var pads = padX();
        var mid  = window.innerWidth/2;
        var toRight = (p.offsetLeft + p.offsetWidth/2) > mid;
        p.style.left = toRight ? (window.innerWidth - p.offsetWidth - pads)+'px' : pads+'px';
        stackDockMobile();
      }
      var layout=state.layout|| (state.layout={panels:{}}); layout.panels[id]={x:p.offsetLeft, y:p.offsetTop}; save();
if(window.positionAnimDock) window.positionAnimDock();
}


    on(window,'pointermove',moveHandler);
    on(window,'pointerup',upHandler);
    on(window,'pointercancel',upHandler);
    on(window,'blur',upHandler);
    on(window,'resize',function(){
      var pos=clampPos(p.offsetLeft,p.offsetTop); p.style.left=pos.x+'px'; p.style.top=pos.y+'px';
      if(window.innerWidth<=720) stackDockMobile();
    });
    return {panel:p, head:head, body:body};
  }
          /* 🆕 En móvil: acopla a izquierda/derecha y apila sin solaparse */
     function stackDockMobile(){
  try{
    if(window.innerWidth > 720) return;

    var pad = 8, gap = 8;
    var header = $('#siteHeader');
    var hh = header ? header.offsetHeight : 0;

    // Paneles visibles, en orden: Archivo, Contorno+Simetría, Pincel
    var list = [];
    if(PF && PF.panel && PF.panel.style.display!=='none') list.push(PF.panel);
    if(PA && PA.panel && PA.panel.style.display!=='none') list.push(PA.panel);
    if(PB && PB.panel && PB.panel.style.display!=='none') list.push(PB.panel);

    // Si no hay ninguno visible, nada que apilar
    if(!list.length) return;

    // Alto inicial: debajo del header
    var top = hh + pad;

    list.forEach(function(p){
      p.style.left = pad + 'px';
      p.style.width = (window.innerWidth - pad*2) + 'px';
     // fija la posición actual y CONSERVA esa Y real
var yNow = top;
p.style.top = yNow + 'px';

// incrementa top con la altura real del panel
var hNow = (p.offsetHeight || p.getBoundingClientRect().height || 0);
top += hNow + gap;

// guarda en estado la coordenada real usada en pantalla
try{
  state.layout = state.layout || {}; state.layout.panels = state.layout.panels || {};
  state.layout.panels[p.id] = { x: pad, y: yNow };
  save();
}catch(_){ }

    });
  }catch(_){}
}



    /* ===== Archivo (fusiona herramientas) ===== */
   var PF = makePanel('p-file',      t('Archivo'));
var PA = makePanel('p-advanced',  t('Contorno + Simetría'));
var PB = makePanel('p-brush',     t('Pincel'));
  var PL = makePanel('p-layers',    t('Capas'));
positionAnimDock();
  

  function resetPanelsPositions(forceSave){
  var pad = (window.innerWidth<=720?8:24);

  requestAnimationFrame(function(){
    try{
      var header = $('#siteHeader');
      var hh = header ? header.offsetHeight : 0;
      var top1 = hh + 8; // pequeña separación bajo el header

      // === Columna izquierda ===
      // Archivo (arriba-izquierda). Si está visible, además recordamos su altura real.
      if (PF && PF.panel){
        PF.panel.style.left = pad + 'px';
        PF.panel.style.top  = top1 + 'px';
        // memoriza altura real por si luego se oculta
        try{
          PF.panel.dataset.lastH = String(PF.panel.offsetHeight || PF.panel.getBoundingClientRect().height || 0);
        }catch(_){}
      }

      // Contorno+Simetría debe quedar SIEMPRE en su "propio" sitio:
      // - Si Archivo está visible: debajo de Archivo (sin hueco)
      // - Si Archivo está oculto: debajo del ALTO MEMORIZADO de Archivo (dejando ese hueco)
      var pfVisible = !!(PF && PF.panel && PF.panel.style.display !== 'none');
      var pfH = 0;
      if (PF && PF.panel){
        pfH = pfVisible
          ? (PF.panel.offsetHeight || PF.panel.getBoundingClientRect().height || 0)
          : (parseInt(PF.panel.dataset.lastH || '0', 10) || 0);
      }
      var yPA = top1 + pfH + (pad - 10); // SIEMPRE debajo del "espacio PF" (exista o no)

      if (PA && PA.panel){
        PA.panel.style.left = pad + 'px';
        PA.panel.style.top  = yPA + 'px';
      }

      // === Columna derecha ===
      // Pincel pegado a la derecha, alineado con el header
      if (PB && PB.panel){
        var right = Math.max(pad, window.innerWidth - (PB.panel.offsetWidth || PB.panel.getBoundingClientRect().width || 360) - pad);
        PB.panel.style.left = right + 'px';
        PB.panel.style.top  = top1 + 'px';
      }

      // Guardar (si viene de "Ordenar paneles")
      if (forceSave){
        state.layout = state.layout || {};
        state.layout.panels = {
          'p-file':     { x: PF.panel.offsetLeft, y: PF.panel.offsetTop },
          'p-advanced': { x: PA.panel.offsetLeft, y: PA.panel.offsetTop },
          'p-brush':    { x: PB.panel.offsetLeft, y: PB.panel.offsetTop }
        };
        save();
        toast(t('Paneles restaurados'));
      }

      // Recoloca el dock tras el reordenado
      if (window.positionAnimDock) window.positionAnimDock();

    }catch(_){}
  });
}

  window.orderPanelsBase = function(){ resetPanelsPositions(true); };

  function applySavedPositions(){
    var P=state.layout && state.layout.panels || {};
    function place(p,id){ if(P[id]){ p.style.left=P[id].x+'px'; p.style.top=P[id].y+'px'; } }
   place(PF.panel,'p-file'); place(PA.panel,'p-advanced'); place(PB.panel,'p-brush'); 
if(!P['p-file'] || !P['p-advanced'] || !P['p-brush']) resetPanelsPositions(false);
if(state.layout.layersOpen){ positionLayersPanel(); }

// 🆕 asegura posición del dock tras restaurar posiciones
if (window.positionAnimDock) window.positionAnimDock();
  }

  // [ROBUST FIX] fuerza visibilidad & clamping
  window.ensurePanelsVisibleNow = function(){
  try{
    document.body.classList.remove('panels-hidden');
    var vis = (state.layout && state.layout.visible) || {};
    ['p-file','p-advanced','p-brush'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      // respeta los checks del menú de paneles
      el.style.display = (vis[id]===false) ? 'none' : 'block';
      if(el.style.display==='none') return;

      // clamping de posición
      var pos = (function(p){
        var header=$('#siteHeader'), footer=$('#siteFooter');
        var hh=header?header.offsetHeight:0, fh=footer?footer.offsetHeight:0;
        var padSide = (window.innerWidth<=720?8:24);
        var minX=padSide, maxX=Math.max(minX, window.innerWidth - p.offsetWidth - padSide);
                var minY=hh+8,   maxY=Math.max(minY, window.innerHeight - fh - p.offsetHeight);

        var x=clamp(p.offsetLeft||minX, minX, maxX);
        var y=clamp(p.offsetTop ||minY, minY, maxY);
        return {x:x,y:y};
      })(el);
      el.style.left = pos.x+'px';
      el.style.top  = pos.y+'px';
  });
    // 🆕 reposiciona el dock tras garantizar la visibilidad
    if (window.positionAnimDock) window.positionAnimDock();
  }catch(_){}
};


  (window.requestAnimationFrame||function(cb){return setTimeout(cb,0);})(function(){
    refreshLayers(); resizeCanvas(); applySavedPositions(); ensureAnim();
    // [ROBUST FIX] en el siguiente tick, garantiza visibilidad
    setTimeout(function(){
      if(document.body.classList.contains('is-crear')) window.ensurePanelsVisibleNow();
    },0);

    on(window,'panels:shown', function(){
      if (window.__eqTools) window.__eqTools();
      applySavedPositions();
      resizeCanvas();
      render();
      // [ROBUST FIX] también aquí
      setTimeout(function(){
        if(document.body.classList.contains('is-crear')) window.ensurePanelsVisibleNow();
      },0);
    });
  });


    // Botones principales (izquierda)
  var btnNew = el('button',{className:'btn small danger fullw',  textContent: t('Nuevo lienzo')});
var btnSave= el('button',{className:'btn small success fullw', textContent: t('Guardar')});


    var expSel = el('select',{id:'exportType', className:'stretch'});
['PNG (alta)','SVG','PDF A4','PDF A5','PDF 6×9" (KDP)','Clip vídeo 20 s'].forEach(function(txt,i){
  var v=['png','svg','pdf-a4','pdf-a5','pdf-6x9','video-20s'][i];
  expSel.append(el('option',{value:v}, t(txt)));
});


    var nameInput = el('input',{
  id:'docName',
  placeholder: t('Nombre del mandala'),
  value:state.currentName||'',
style:'width:100%'   // ⬆️ doble de largo que antes
});
    on(nameInput,'input',function(e){ state.currentName=e.target.value; save(); });
    var btnExport=el('button',{className:'tool',                    textContent: t('Exportar')});

    // Botón de ayuda (atajos)
var btnHelp = el('button',{className:'btn small ghost square',  title: t('Atajos de teclado'), textContent:'?'});
// Títulos pedidos
var titleName   = el('div',{className:'field'},[ el('label',{}, t('Nombre del lienzo')) ]);
var titleFormat = el('div',{className:'field'},[ el('label',{}, t('Formato de exportación')) ]);

on(btnHelp,'click', function(){
  var html = [
  '<div class="grid cols-2">',
    '<div><strong>', t('Edición') ,'</strong><ul>',
      '<li><b>Ctrl/Cmd + Z</b> — ', t('Deshacer') ,'</li>',
      '<li><b>Ctrl/Cmd + Shift + Z</b> — ', t('Rehacer') ,'</li>',
    '</ul></div>',
    '<div><strong>', t('Archivo') ,'</strong><ul>',
      '<li><b>Ctrl/Cmd + C</b> — ', t('Guardar') ,'</li>',
      '<li><b>Ctrl/Cmd + X</b> — ', t('Exportar') ,'</li>',
    '</ul></div>',
    '<div><strong>', t('Herramientas') ,'</strong><ul>',
      '<li><b>Ctrl/Cmd + V</b> — ', t('Línea') ,'</li>',
      '<li><b>Ctrl/Cmd + B</b> — ', t('Pincel') ,'</li>',
    '</ul></div>',
    '<div><strong>', t('Tamaño del pincel') ,'</strong><ul>',
      '<li><b>+</b> — ', t('Aumentar tamaño') ,'</li>',
      '<li><b>-</b> — ', t('Reducir tamaño') ,'</li>',
    '</ul></div>',
  '</div>'
].join('');
modal(t('Atajos de teclado'), html, false);
// el modal ya tiene botón "Cerrar"
});

    // “Herramientas” integradas (derecha)
   var btnBrush = el('button',{className:'tool active', textContent:'✏️ '+t('Pincel')});
var btnLine  = el('button',{className:'tool', textContent:'📏 '+t('Línea')});
var btnEraser= el('button',{className:'tool', textContent:'🧽 '+t('Borrar')});
var btnUndo  = el('button',{className:'tool', textContent:'↶ '+t('Deshacer')});
var btnRedo  = el('button',{className:'tool', textContent:'↷ '+t('Rehacer')});
var btnLayers= el('button',{className:'tool', id:'openLayersBtn'}, t('Capas')+' ▸');


    // Grid 4 columnas × 5 filas (según especificación)
var grid = el('div',{className:'file-grid'});

// === Columnas 1–2 (Archivo) ===

// 1.1 Título: "Nombre del lienzo"
grid.append(
  el('div',{className:'field', style:'grid-column:1; grid-row:1;'}, [ el('label',{}, t('Nombre del lienzo')) ])
);

// 1.2–2.2 Campo de nombre (ocupa 2 columnas)
grid.append(
  el('div',{style:'grid-column:1 / 3; grid-row:2;'}, [ nameInput ])
);

// 1.3–2.3 Título: "Formato de exportación" (ocupa 2 columnas para que quepa siempre)
grid.append(
  el('div',{className:'field', style:'grid-column:1 / 3; grid-row:3;'}, [ el('label',{}, t('Formato de exportación')) ])
);

// 1.4–2.4 Desplegable de formato (2 columnas)
grid.append(
  el('div',{style:'grid-column:1 / 3; grid-row:4;'}, [ expSel ])
);

// 1.5 Botón Guardar
grid.append(
  el('div',{style:'grid-column:1; grid-row:5;'}, [ btnSave ])
);

// 2.5 Botón Nuevo Lienzo
grid.append(
  el('div',{style:'grid-column:2; grid-row:5;'}, [ btnNew ])
);



// === Columnas 3–4 (Herramientas) ===

// 3.1 Pincel
grid.append( el('div',{style:'grid-column:3; grid-row:1;'}, [ btnBrush ]) );

// 4.1 Línea
grid.append( el('div',{style:'grid-column:4; grid-row:1;'}, [ btnLine ]) );

// 3.2 Borrar
grid.append( el('div',{style:'grid-column:3; grid-row:2;'}, [ btnEraser ]) );

// 4.2 Deshacer
grid.append( el('div',{style:'grid-column:4; grid-row:2;'}, [ btnUndo ]) );

// 3.3 Rehacer
grid.append( el('div',{style:'grid-column:3; grid-row:3;'}, [ btnRedo ]) );

// 4.3 Capas
grid.append( el('div',{style:'grid-column:4; grid-row:3;'}, [ btnLayers ]) );

// 3.4 Exportar (tamaño herramienta)
grid.append( el('div',{style:'grid-column:3; grid-row:4;'}, [ btnExport ]) );

// 4.4 Atajos (cuadrado con “?”)
grid.append( el('div',{style:'grid-column:4; grid-row:4; display:flex; align-items:center;'}, [ btnHelp ]) );
// 3.5–4.5 Radiales globales (aplican a TODO el dibujo)
var symAllWrap = el('div',{className:'field'},[ el('label',{}, t('Radiales (aplicar a TODO)')) ]);

var symAllRange = el('input',{type:'range', min:'1', max:'64', step:'1', value:String(state.settings.symmetry)});
var symAllNum   = el('input',{type:'number', className:'num', min:'1', max:'64', step:'1', value:String(state.settings.symmetry)});
var symAllLine  = el('div',{className:'slider-line'}, [ symAllRange, symAllNum ]);
symAllWrap.append(symAllLine);

function setSymAll(v){
  v = clamp(parseInt(v||1,10),1,64);
  symAllRange.value = String(v);
  symAllNum.value   = String(v);
  applySymmetryToAllStrokes(v);
}
on(symAllRange,'input', function(e){ setSymAll(e.target.value); });
on(symAllNum,'change', function(e){ setSymAll(e.target.value); });

grid.append( el('div',{style:'grid-column:3 / 5; grid-row:5;'}, [ symAllWrap ]) );


    PF.body.append(grid);
    // Igualar el ancho de Pincel/Línea/Borrar/Deshacer/Rehacer/Capas al de "Deshacer"
    /*
(function equalizeTools(){
  function apply(){
            // referencia: ancho real de "Deshacer"
  var w = btnUndo ? btnUndo.offsetWidth : 0;
if (w <= 0) return;                    // ⛑️ evita fijar 0px si los paneles están ocultos
      // ⛑️ evita fijar 0px si los paneles están ocultos
    // Igualar ancho de botones (estable entre idiomas)
  (function equalizeToolButtons(){
  var list = [btnBrush,btnLine,bErase,btnUndo,btnRedo,btnLayers,btnExport];
  function apply(){
    // 1) medimos el ancho máximo actual (idioma activo)
    var nowMax = 0;
    list.forEach(function(b){ nowMax = Math.max(nowMax, (b ? b.offsetWidth : 0)); });

    // 2) ancho “base” guardado (p.ej. obtenido en ES la primera vez)
    state.ui = state.ui || {};
    var base = state.ui.toolsBtnW || 0;

    // Si no hay base, la registramos (y la dejamos un pelín más larga)
    if(!base){
      base = Math.round(nowMax * 1.10); // “pelín más largo” que el idioma presente (normalmente ES)
      state.ui.toolsBtnW = base; save();
    }

    // 3) ancho objetivo = máx(base, medido) + margen
    var target = Math.max(base, nowMax) + 6;

    // 4) aplicar ancho y reducir ligeramente la fuente
    list.forEach(function(b){
      if(!b) return;
      b.style.width = target + 'px';
      b.style.fontSize = '0.92em';
      b.style.whiteSpace = 'nowrap';
    });
  }
  // Primera aplicación + re-aplicación tras un pequeño delay (por reflow)
  setTimeout(apply, 0);
  window.__eqTools = apply; // por si lo llamas tras cambiar idioma dinámicamente
})();

  }
  window.__eqTools = apply;               // 🔁 disponible al volver a mostrar paneles
  requestAnimationFrame(apply);
  on(window,'resize', function(){ requestAnimationFrame(apply); });
})();
*/

    function ensureDocName(){
      var nm=(nameInput.value||'').trim();
      if(!nm){ toast('✍️ '+t('Escribe un nombre en Archivo para guardar/exportar')); nameInput.focus(); nameInput.style.outline='2px dashed var(--warning)'; setTimeout(function(){nameInput.style.outline=''},1200); return null; }
      state.currentName=nm; save(); return nm;
    }

    // Listeners de herramientas
    function setTool(t){
      currentTool=t;
      btnBrush.classList.toggle('active', t==='brush');
      btnLine.classList.toggle('active', t==='line');
      btnEraser.classList.toggle('active', t==='eraser');
    }
    on(btnBrush,'click', function(){ setTool('brush'); });
    on(btnLine, 'click', function(){ setTool('line');  });
    on(btnEraser,'click',function(){ setTool('eraser');});
    on(btnUndo,'click', function(){ undo(); });
    on(btnRedo,'click', function(){ redo(); });

   on(btnNew,'click',function(){
  // 🗣️ Modal 100% traducible (título, texto y botón)
  modal(
    t('Nuevo lienzo'),
    '<p>' + t('¿Deseas limpiar todos los trazos?') + '</p>' +
    '<div class="row"><button class="btn danger" id="confirmNew">' + t('Sí, limpiar') + '</button></div>'
  );

  // Traduce el botón de cierre del modal
  var closeBtn = $('#modal-close');
  if (closeBtn) closeBtn.textContent = t('Cerrar');

  // ✅ Mantengo tu lógica de limpieza tal cual
  on($('#confirmNew'),'click',function(){
    // 🔄 Deja solo la primera capa y límpiala
    if (doc.layers.length) {
      doc.layers.splice(1); // elimina de la 2ª en adelante
      var L0 = doc.layers[0];
      L0.strokes = [];
      L0.visible = true;
      L0.outlineUnion = false;
      L0.rotEnabled = false; L0.rotSpeed = 8; L0.rotDir = 1; L0.rotAngle = 0;
      L0.name = 'Trazos';
    } else {
      doc.layers = [{
        id: uid(), name:'Trazos', visible:true, outlineUnion:false, strokes:[],
        rotEnabled:false, rotSpeed:8, rotDir:1, rotAngle:0
      }];
    }
    doc.activeLayer = 0;
    history = []; redoStack = [];
    $('#modal').classList.add('hidden');
    refreshLayers();   // ✅ refresca la UI de Capas
    render();
    autosave();
  });
});

    on(btnSave,'click',function(){
      var nm = ensureDocName(); if(!nm) return;
      var thumb=canvas.toDataURL('image/png');
           var item={
  id:uid(), name:nm, date:Date.now(), thumb:thumb, selected:false,
  doc:clone(doc), settings:clone(state.settings), center: clone(state.center)
};

state.gallery.unshift(item); save(); toast(t('Guardado')+': '+nm);

    });
    on(btnExport,'click',function(){
  var nm = ensureDocName(); if(!nm) return;
  var t=expSel.value;
  if(t==='png') exportPNGHigh(nm);
  else if(t==='svg') exportSVG(nm);
  else if(t==='pdf-a4') exportPDF('A4', nm);
  else if(t==='pdf-a5') exportPDF('A5', nm);
  else if(t==='pdf-6x9') exportPDF('6x9', nm);
  else if(t==='video-20s') exportVideo20s(nm);
});


    on(document,'keydown',function(e){
        // Solo responder a atajos si estamos en "Crear"
  if(!document.body.classList.contains('is-crear')){ return; }

  var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
  
  var isEditable = (tag==='input' || tag==='textarea' || tag==='select' || e.target.isContentEditable);
  var m = e.metaKey || e.ctrlKey;

  // Deshacer / Rehacer
  if(m && e.key.toLowerCase()==='z'){ if(e.shiftKey) redo(); else undo(); e.preventDefault(); }

  // Solo fuera de campos editables
  if(!isEditable){
    // Tamaño del pincel
    if(!m && (e.key==='+'||e.key==='=')){ 
      state.settings.brushSize=Math.min(64, state.settings.brushSize+1);
      sSize.input.value=String(state.settings.brushSize); 
      sSize.output.textContent=String(state.settings.brushSize); 
      save(); 
    }
    if(!m && (e.key==='-'||e.key==='_')){ 
      state.settings.brushSize=Math.max(1, state.settings.brushSize-1);
      sSize.input.value=String(state.settings.brushSize); 
      sSize.output.textContent=String(state.settings.brushSize); 
      save(); 
    }

    // NUEVOS ATAJOS
    if(m && e.key.toLowerCase()==='c'){ btnSave.click();   e.preventDefault(); } // Guardar
    if(m && e.key.toLowerCase()==='x'){ btnExport.click(); e.preventDefault(); } // Exportar
    if(m && e.key.toLowerCase()==='b'){ setTool('brush');  e.preventDefault(); } // Pincel
    if(m && e.key.toLowerCase()==='v'){ setTool('line');   e.preventDefault(); } // Línea
  }
});


    /* ===== Pincel ===== */

    function slider(label,id,opts){
      opts=opts||{};
      var wrap=el('div',{className:'field'}); wrap.append(el('label',{},label));
      var s=el('input',{id:id,type:'range',min:String(opts.min||0),max:String(opts.max||100),step:String(opts.step==null?1:opts.step),value:String(opts.value||0)});
      var out=el('output',{id:id+'Out'}, (opts.format?opts.format(opts.value||0):(String(opts.value||0))));
      var row=el('div',{className:'slider'},[s,out]); wrap.append(row);
      on(s,'input',function(e){ out.textContent = opts.format?opts.format(+e.target.value):String(e.target.value); if(opts.oninput) opts.oninput(+e.target.value); });
      return {wrap:wrap, input:s, output:out};
    }
    var split = el('div',{className:'pb-split'}), colL = el('div',{className:'pb-col'}), colR = el('div',{className:'pb-col'});
    var sSize=slider(t('Tamaño:'),'bSize',{min:1,max:64,step:1,value:state.settings.brushSize,oninput:function(v){ state.settings.brushSize=v; save(); }});
    var sOp=slider(t('Opacidad:'),'bOp',{min:0,max:1,step:0.01,value:state.settings.brushOpacity,format:function(v){ return fmt(v,2); },oninput:function(v){ state.settings.brushOpacity=v; if(sTr) { sTr.input.value=fmt(1-v,2); sTr.output.textContent=fmt(1-v,2);} save(); }});
    var sTr=slider(t('Transparencia:'),'bTr',{min:0,max:1,step:0.01,value:fmt(1-state.settings.brushOpacity,2),format:function(v){ return fmt(v,2); },oninput:function(v){ state.settings.brushOpacity=clamp(1-v,0,1); sOp.input.value=fmt(state.settings.brushOpacity,2); sOp.output.textContent=fmt(state.settings.brushOpacity,2); save(); }});
    function syncBrushOpacityUI(){
  try{
    // Opacidad directa
    sOp.input.value = fmt(state.settings.brushOpacity,2);
    sOp.output.textContent = fmt(state.settings.brushOpacity,2);
    // Transparencia = 1 - opacidad
    var inv = fmt(1 - state.settings.brushOpacity, 2);
    sTr.input.value = inv;
    sTr.output.textContent = inv;
  }catch(_){}
}

    
    colL.append(sSize.wrap, sOp.wrap, sTr.wrap);

   var shapeSel=el('select',{id:'bShape'});
['round:Redondo','square:Cuadrado','soft:Suave (airbrush)','stamp-dot:Punto (sello)','stamp-geo:Geometría (sello)','stamp-petal:Pétalo (sello)']
  .forEach(function(s){ var p=s.split(':'); shapeSel.append(el('option',{value:p[0]}, t(p[1]))); });

    shapeSel.value=state.settings.brushShape;
    on(shapeSel,'change',function(e){ state.settings.brushShape=e.target.value; save(); });

    var patternSel=el('select',{id:'bPattern'});
['solid:Sólido','dash:Discontinuo','dot:Punteado','dashdot:Guión·Punto','longdash:Guión largo','pulse:Pulso (ancho/estrecho)']
  .forEach(function(s){ var p=s.split(':'); patternSel.append(el('option',{value:p[0]}, t(p[1]))); });

    patternSel.value=state.settings.brushPattern;
    on(patternSel,'change',function(e){ state.settings.brushPattern=e.target.value; save(); });
// === Preset "Neón" (airbrush + contorno) ===
var btnNeon = el('button',{className:'btn small ghost', id:'presetNeon'}, '⚡ '+t('Neón'));
on(btnNeon,'click', function(){
  // Color "neón" sugerido (ajústalo si quieres)
  var neon = '#00ffee';

  // Ajustes de pincel
  state.settings.color = neon;
  state.settings.brushShape = 'soft';     // Airbrush
  state.settings.brushPattern = 'solid';  // Trazo continuo

  // Contorno ON con parámetros llamativos
  state.settings.outlineEnabled = true;
  state.settings.outlineColor = neon;                     // mismo color para halo
  state.settings.outlineWidth = Math.max(2, Math.round(state.settings.brushSize*0.6));
  state.settings.outlineOpacity = 0.9;

  // Sincroniza UI visible
  var bColor = $('#bColor', PB.body); if(bColor) bColor.value = state.settings.color;
  shapeSel.value   = 'soft';
  patternSel.value = 'solid';

  var ch = $('#oEnable'); if(ch) ch.checked = true;
  var oc = $('#oColor');  if(oc) oc.value   = state.settings.outlineColor;

  // Si los controles numéricos de contorno están cargados, actualízalos
  try{
    if(oWidth && oWidth.num && oWidth.range){
      oWidth.num.value = String(state.settings.outlineWidth);
      oWidth.range.value = String(state.settings.outlineWidth);
    }
    if(oAlpha && oAlpha.num && oAlpha.range){
      oAlpha.num.value = String(state.settings.outlineOpacity);
      oAlpha.range.value = String(state.settings.outlineOpacity);
    }
  }catch(_){}

  // Historial de color
  syncBrushOpacityUI();

  pushColorHistory(state.settings.color); refreshColorHistory();

  save(); render();
  toast(t('Preset aplicado: Neón')+' ⚡');
});
// === Preset "Original" (valores por defecto de la app) ===
var btnOriginal = el('button',{className:'btn small ghost', id:'presetOriginal'}, t('Original'));
on(btnOriginal,'click', function(){
  var def = defaults && defaults.settings ? defaults.settings : {
    color:'#ffffff', brushOpacity:1, brushSize:8, brushShape:'round', brushPattern:'solid',
    outlineEnabled:true, outlineColor:'#000000', outlineWidth:2, outlineOpacity:1
  };
  state.settings.color         = def.color;
  state.settings.brushOpacity  = def.brushOpacity;
  state.settings.brushSize     = def.brushSize;
  state.settings.brushShape    = def.brushShape;
  state.settings.brushPattern  = def.brushPattern;
  state.settings.outlineEnabled= def.outlineEnabled;
  state.settings.outlineColor  = def.outlineColor;
  state.settings.outlineWidth  = def.outlineWidth;
  state.settings.outlineOpacity= def.outlineOpacity;

  var bColor = $('#bColor', PB.body); if(bColor) bColor.value = state.settings.color;
  shapeSel.value   = state.settings.brushShape;
  patternSel.value = state.settings.brushPattern;
  var ch = $('#oEnable'); if(ch) ch.checked = !!state.settings.outlineEnabled;
  var oc = $('#oColor');  if(oc) oc.value   = state.settings.outlineColor;

  try{
    if(oWidth && oWidth.num && oWidth.range){
      oWidth.num.value = String(state.settings.outlineWidth);
      oWidth.range.value = String(state.settings.outlineWidth);
    }
    if(oAlpha && oAlpha.num && oAlpha.range){
      oAlpha.num.value = String(state.settings.outlineOpacity);
      oAlpha.range.value = String(state.settings.outlineOpacity);
    }
  }catch(_){}
syncBrushOpacityUI();

  pushColorHistory(state.settings.color); refreshColorHistory();
  save(); render(); toast(t('Preset aplicado: Original')+' ✅');
});

// === Preset "Acuarela" (suave, sin contorno, baja opacidad) ===
var btnAcuarela = el('button',{className:'btn small ghost', id:'presetAcuarela'}, t('Acuarela'));
on(btnAcuarela,'click', function(){
  state.settings.color = '#ff8aa1';
  state.settings.brushOpacity = 0.35;
  state.settings.brushShape = 'soft';
  state.settings.brushPattern = 'solid';

  state.settings.outlineEnabled = false;

  var bColor = $('#bColor', PB.body); if(bColor) bColor.value = state.settings.color;
  shapeSel.value   = 'soft';
  patternSel.value = 'solid';
  var ch = $('#oEnable'); if(ch) ch.checked = false;
syncBrushOpacityUI();

  pushColorHistory(state.settings.color); refreshColorHistory();
  save(); render(); toast(t('Preset aplicado: Acuarela')+' 🖌️');
});

// === Preset "Sombra" (negro translúcido, sin contorno) ===
var btnSombra = el('button',{className:'btn small ghost', id:'presetSombra'}, t('Sombra'));
on(btnSombra,'click', function(){
  state.settings.color = '#000000';
  state.settings.brushOpacity = 0.25;
  state.settings.brushShape = 'soft';
  state.settings.brushPattern = 'solid';
  state.settings.outlineEnabled = false;

  var bColor = $('#bColor', PB.body); if(bColor) bColor.value = state.settings.color;
  shapeSel.value   = 'soft';
  patternSel.value = 'solid';
  var ch = $('#oEnable'); if(ch) ch.checked = false;
syncBrushOpacityUI();

  pushColorHistory(state.settings.color); refreshColorHistory();
  save(); render(); toast(t('Preset aplicado: Sombra')+' 🌑');
});

// === Preset "Fuego" (naranja alto, halo dorado) ===
var btnFuego = el('button',{className:'btn small ghost', id:'presetFuego'}, t('Fuego'));
on(btnFuego,'click', function(){
  state.settings.color = '#ff6a00';
  state.settings.brushOpacity = 0.9;
  state.settings.brushShape = 'round';
  state.settings.brushPattern = 'pulse';
  state.settings.outlineEnabled = true;
  state.settings.outlineColor = '#ffd000';
  state.settings.outlineWidth = Math.max(2, Math.round(state.settings.brushSize*0.5));
  state.settings.outlineOpacity = 0.8;

  var bColor = $('#bColor', PB.body); if(bColor) bColor.value = state.settings.color;
  shapeSel.value   = 'round';
  patternSel.value = 'pulse';
  var ch = $('#oEnable'); if(ch) ch.checked = true;
  var oc = $('#oColor');  if(oc) oc.value   = state.settings.outlineColor;

  try{
    if(oWidth && oWidth.num && oWidth.range){
      oWidth.num.value = String(state.settings.outlineWidth);
      oWidth.range.value = String(state.settings.outlineWidth);
    }
    if(oAlpha && oAlpha.num && oAlpha.range){
      oAlpha.num.value = String(state.settings.outlineOpacity);
      oAlpha.range.value = String(state.settings.outlineOpacity);
    }
  }catch(_){}
syncBrushOpacityUI();

  pushColorHistory(state.settings.color); refreshColorHistory();
  save(); render(); toast(t('Preset aplicado: Fuego')+' 🔥');
});

    colR.append(
  el('div',{className:'field'},[ el('label',{},'Punta'), shapeSel ]),
  el('div',{className:'field'},[ el('label',{},'Trazado'), patternSel ]),

  el('div',{className:'field'},[
    el('label',{}, t('Fondo')),
    el('div',{className:'row'},[
            el('input',{
        id:'bgColor',
        type:'color',
        className:'color-full',
        value:normalizeColorHex(state.settings.background, '#ffffff') || '#ffffff'
      }),

      el('button',{className:'btn small ghost', id:'bgDark'}, t('Oscuro')),
el('button',{className:'btn small ghost', id:'bgLight'}, t('Claro')),
el('button',{className:'btn small ghost', id:'bgVector'}, t('Vectorial'))


    ])
  ])
);
// Campo: color de la rejilla del visor (en línea)
colR.append(
  el('div', { className: 'row nowrap', style: 'align-items:center; gap:8px' }, [
    el('span', { style: 'font-size:14px; color:var(--muted)' }, t('Rejilla (color)')),

      el('input', {
      id: 'gridColor',
      type: 'color',
      className: 'color-full',
      value: normalizeColorHex(state.settings.gridColor || '#404040', '#404040') || '#404040'
    })
  ])
);


    split.append(colL,colR);

   var paletteWrap = el('div',{className:'field'});
   // Título "Presets:" y fila de 5 botones (en la misma línea, a la derecha uno del otro)
paletteWrap.append(
  el('div',{className:'field'}, [ el('label',{}, t('Presets:')) ])
);

var presetsRow = el('div',{className:'row', style:'gap:8px; align-items:center; flex-wrap:wrap'},[
  btnNeon, btnOriginal, btnAcuarela, btnSombra, btnFuego
]);
paletteWrap.append(presetsRow);


    var paletteGrid = el('div',{className:'palette-grid'});
    (function buildPalette(){
      var rows=12, cols=20, r,c,L,H,color,sw;
      for(r=0;r<rows;r++){
        L = 10 + (r*(80/(rows-1)));
        for(c=0;c<cols;c++){
          H = (c*360/cols); color = hslToHex(H, 85, L);
          sw = el('div',{className:'palette-swatch', title:color}); sw.style.background=color; sw.setAttribute('data-c', color);
          (function(node){ on(node,'click',function(){
  var col=node.getAttribute('data-c');
  state.settings.color=col; var inp=$('#bColor',PB.body); if(inp) inp.value=col; save();
  pushColorHistory(col); refreshColorHistory();
}); })(sw);

          paletteGrid.append(sw);
        }
      }
    })();
    paletteWrap.append(paletteGrid);

 var btnPick = el('button',{className:'btn small ghost square', id:'btnPickColor', title: t('Goterito (mantén pulsado en el lienzo para muestrear)')}, '🧪');
var histRow = el('div',{className:'color-history', id:'colorHistoryRow'});
var colorInput = el('input',{
  id:'bColor',
  type:'color',
  className:'color-full',
  value:normalizeColorHex(state.settings.color, '#ffffff') || '#ffffff'
});

PB.body.append(
  split,
  paletteWrap,
  el('div',{className:'field'},[
    
    el('div',{className:'color-tools-row'},[ colorInput, btnPick, histRow ])
  ])
);

function pushColorHistory(hex){
  var col = normalizeColorHex(hex, state.settings.color || '#ffffff') || '#ffffff';
  state.settings.colorHistory = state.settings.colorHistory || [];
  // evita duplicados, más reciente al frente
  state.settings.colorHistory = [col].concat(
    state.settings.colorHistory.filter(function(c){
      return String(c||'').toLowerCase() !== col.toLowerCase();
    })
  ).slice(0,8);
  save();
}

function refreshColorHistory(){
  var row = $('#colorHistoryRow', PB.body); if(!row) return;
  row.innerHTML='';
  (state.settings.colorHistory || []).forEach(function(c){
    var col = normalizeColorHex(c, '#ffffff') || '#ffffff';
    var dot = el('button',{className:'color-dot', title:col});
    dot.style.background = col;
    on(dot,'click', function(){
      state.settings.color = col;
      var inp=$('#bColor',PB.body); if(inp) inp.value=col;
      pushColorHistory(col);
      refreshColorHistory();
    });
    row.append(dot);
  });
}



    /* ===== Contorno + Simetría + Play/Pause ===== */


/* helpers UI */
function sliderNumber(label, min, max, step, value, onChange, format){
  var field = el('div',{className:'field'});
  field.append(el('label',{},label));
  var range = el('input',{type:'range', min:String(min), max:String(max), step:String(step), value:String(value)});
  var num   = el('input',{type:'number', className:'num', min:String(min), max:String(max), step:String(step), value:String(value)});
  var line  = el('div',{className:'slider-line'}, [range, num]);
  field.append(line);
  function set(v){
    var vv = (format? +fmt(v, (step<1?2:0)) : v);
    vv = clamp(vv, min, max);
    range.value = String(vv);
    num.value   = String(vv);
    if(onChange) onChange(vv);
  }
  on(range,'input', function(e){ set(+e.target.value); });
  on(num,'change', function(e){ set(+e.target.value); });
  return {wrap:field, set:set, range:range, num:num};
}

/* === Controles dispersos (los reutilizamos) === */
var oEnable = el('input',{id:'oEnable', type:'checkbox', checked:!!state.settings.outlineEnabled, style:'width:auto'});
on(oEnable,'change', function(e){ state.settings.outlineEnabled=e.target.checked; save(); });
var oColor  = el('input',{
  id:'oColor',
  type:'color',
  className:'color-full',
  value:normalizeColorHex(state.settings.outlineColor, '#000000') || '#000000'
});

on(oColor,'input', function(e){
  state.settings.outlineColor = normalizePickerValue(e.target, state.settings.outlineColor || '#000000');
  save();
});

var topRow = el('div',{className:'check-row'},[ oEnable, el('label',{}, t('Contorno (trazos nuevos)')) ]);




var oWidth = sliderNumber(t('Ancho de contorno:'),1, 32, 1, state.settings.outlineWidth, function(v){ state.settings.outlineWidth=v; save(); });
var oAlpha = sliderNumber(t('Transparencia de contorno:'), 0, 1, 0.01, state.settings.outlineOpacity, function(v){ state.settings.outlineOpacity=v; save(); }, true);
var sym    = sliderNumber(t('Radiales (nuevos trazos):'), 1, 64, 1, state.settings.symmetry, function(v){
  // Solo afecta a lo que dibujes A PARTIR DE AHORA
  state.settings.symmetry = v;
  save();
  // Redibuja para actualizar la REJILLA inmediatamente (no toca trazos ya dibujados)
  if (typeof render === 'function') render();
});




var cbMirror    = el('input',{type:'checkbox', checked:!!state.settings.mirror,        style:'width:auto'});
var cbMirrorInv = el('input',{type:'checkbox', checked:!!state.settings.mirrorInverse, style:'width:auto'});
var cbAltFlip   = el('input',{type:'checkbox', checked:!!state.settings.altFlip,       style:'width:auto'});
var cbGrid      = el('input',{type:'checkbox', checked:!!state.settings.showGrid,      style:'width:auto'});
on(cbMirror   ,'change',function(e){ state.settings.mirror=e.target.checked; save(); });
on(cbMirrorInv,'change',function(e){ state.settings.mirrorInverse=e.target.checked; save(); });
on(cbAltFlip  ,'change',function(e){ state.settings.altFlip=e.target.checked; save(); });
on(cbGrid     ,'change',function(e){ state.settings.showGrid=e.target.checked; save(); render(); });
// Etiquetas de centros (números sobre los centros)
var cbLblCenters = el('input',{type:'checkbox', checked:!!state.settings.labelCenters, style:'width:auto'});
on(cbLblCenters,'change',function(e){ state.settings.labelCenters=e.target.checked; save(); render(); });

/* Centros: modo + cantidad */
var centerMode = el('select',{});
['centrado:Centrado','seleccion:Selección','anclado:Anclado'].forEach(function(opt){
  var p=opt.split(':'); centerMode.append(el('option',{value:p[0]}, t(p[1])));
});

centerMode.value = state.center.mode || 'centrado';
on(centerMode,'change', function(e){
  centerPickConsumed = false;
  centerPickPointerId = null;

  state.center.mode = e.target.value;
  if(state.center.mode==='centrado'){ state.center.points=[]; save(); toast('Centro en el medio del lienzo.'); }
  if(state.center.mode==='seleccion'){ startPickingCenters(); }
  if(state.center.mode==='anclado'){ save(); toast('Centros anclados.'); }
  if(typeof refreshActiveCenterUI === 'function'){ refreshActiveCenterUI(); }
  render(); // ✅ refresco inmediato
});

var centerCount = el('input',{type:'number', className:'num', min:'1', max:'64', step:'1', value:String(state.center.count||1), title:'Cantidad de centros (modo Selección)'});
function applyCenterCount(v){
  v = clamp(parseInt(v||1,10),1,64);
  centerCount.value=String(v);
  state.center.count=v; save();
  if(state.center.mode==='seleccion'){ startPickingCenters(); }
  if(typeof refreshActiveCenterUI === 'function'){ refreshActiveCenterUI(); }
  render(); // ✅
}

on(centerCount,'change', function(e){ applyCenterCount(e.target.value); });

// Título "Centro" (solo etiqueta, fila 1 derecha)
var centerTitle = el('div',{className:'field'},[ el('label',{}, t('Centro')) ]);

// Controles "Centro" (modo + cantidad), fila 2 derecha
var rowCentersControls = el('div',{className:'field'},[
  el('div',{className:'slider-line'},[ centerMode, centerCount ])
]);


/* Centro activo: Todos / Elegir + índice */
if(!state.center.active){ state.center.active = { mode:'all', index:0 }; }
var activeTitle = el('div',{className:'field'},[ el('label',{}, t('Centro activo')) ]);

var selActiveMode = el('select',{},[
  el('option',{value:'all'}, t('Todos')),
  el('option',{value:'choose'}, t('Elegir'))
]);

selActiveMode.value = state.center.active.mode || 'all';

var selActiveIndex = el('select',{className:'num'}); // números 1..N (cuadrado)

function refreshActiveCenterUI(){
  var pts = state.center.points||[];
  var multi = (state.center.mode==='seleccion' && pts.length>1);
  selActiveMode.disabled  = !multi;
  selActiveIndex.disabled = !(multi && selActiveMode.value==='choose');
  selActiveIndex.innerHTML='';
  for(var i=0;i<pts.length;i++){ selActiveIndex.append( el('option',{value:String(i)}, String(i+1)) ); }
  var idx = clamp(state.center.active.index||0, 0, Math.max(0, pts.length-1));
  selActiveIndex.value = String(idx);
}
on(selActiveMode,'change', function(e){
  state.center.active.mode = e.target.value;
  save(); 
  refreshActiveCenterUI();
  render(); // ✅
});

on(selActiveIndex,'change', function(e){
  state.center.active.index = clamp(parseInt(e.target.value||0,10),0, (state.center.points||[]).length-1);
  save();
  render(); // ✅
});


var rowActiveControls = el('div',{className:'field'},[
  el('div',{className:'slider-line'},[ selActiveMode, selActiveIndex ])
]);


/* === Grid 4×7 EXACTO (1.1 arriba-izquierda, 4.7 abajo-derecha) === */
var grid = el('div',{className:'adv-grid-4x7'});

/* Etiquetas sueltas para ubicarlas donde tocan */
var lblWidth  = el('label',{}, t('Ancho de contorno:'));
var lblAlpha  = el('label',{}, t('Transparencia de contorno'));
var lblSym    = el('label',{}, t('Radial sectores'));
var lblCentro = el('label',{}, t('Centro'));
var lblAct    = el('label',{}, t('Centro activo'));


/* ===== Columna 1 (izquierda) =====
   1.1 Check Contorno (trazos nuevos)
   1.2 Texto “Ancho de contorno:”
   1.3 Slider de ancho
   1.4 Texto “Transparencia de contorno”
   1.5 Slider transparencia
   1.6 Texto “Radial (sectores)”
   1.7 Slider radial */
grid.append( el('div',{style:'grid-column:1; grid-row:1;'}, [ topRow ]) );
grid.append( el('div',{style:'grid-column:1 / 3; grid-row:2;'}, [ lblWidth ]) );   // invade 2.2 si lo necesita
grid.append( el('div',{style:'grid-column:1; grid-row:3;'}, [ oWidth.range ]) );
grid.append( el('div',{style:'grid-column:1 / 3; grid-row:4;'}, [ lblAlpha ]) );   // invade 2.4 si lo necesita
grid.append( el('div',{style:'grid-column:1; grid-row:5;'}, [ oAlpha.range ]) );
grid.append( el('div',{style:'grid-column:1 / 3; grid-row:6;'}, [ lblSym ]) );     // invade 2.6 si lo necesita
grid.append( el('div',{style:'grid-column:1; grid-row:7;'}, [ sym.range ]) );

/* ===== Columna 2 =====
   2.1 Color
   2.2 (vacío / invadible por 1.2)
   2.3 Número ancho
   2.4 (vacío / invadible por 1.4)
   2.5 Número transparencia
   2.6 (vacío / invadible por 1.6)
   2.7 Número radial */
grid.append( el('div',{style:'grid-column:2; grid-row:1;'}, [ oColor ]) );
grid.append( el('div',{style:'grid-column:2; grid-row:3;'}, [ oWidth.num ]) );
grid.append( el('div',{style:'grid-column:2; grid-row:5;'}, [ oAlpha.num ]) );
grid.append( el('div',{style:'grid-column:2; grid-row:7;'}, [ sym.num ]) );

/* ===== Columna 3 =====
   3.1 “Centro”
   3.2 Desplegable Centro
   3.3 “Centro activo”
   3.4 Desplegable Centro activo (Todos/Elegir)
   3.5 Check Etiquetar centros
   3.6 Check Espejo (diédrico)
   3.7 Check Espejo inverso (½ sector) */
grid.append( el('div',{style:'grid-column:3 / 5; grid-row:1;'}, [ lblCentro ]) ); // 4.1 puede quedar invadido
grid.append( el('div',{style:'grid-column:3; grid-row:2;'}, [ centerMode ]) );
grid.append( el('div',{style:'grid-column:3 / 5; grid-row:3;'}, [ lblAct ]) );    // 4.3 puede quedar invadido
grid.append( el('div',{style:'grid-column:3; grid-row:4;'}, [ selActiveMode ]) );
grid.append( el('div',{style:'grid-column:3; grid-row:5;'}, [ el('div',{className:'check-row'},[ cbLblCenters, el('label',{}, t('Etiquetar centros')) ]) ]) );

grid.append( el('div',{style:'grid-column:3; grid-row:6;'}, [ el('div',{className:'check-row'},[ cbMirror,    el('label',{}, t('Espejo (diédrico)')) ]) ]) );

grid.append( el('div',{style:'grid-column:3; grid-row:7;'}, [ el('div',{className:'check-row'},[ cbMirrorInv, el('label',{}, t('Espejo inverso (½ sector)')) ]) ]) );


/* ===== Columna 4 (derecha) =====
   4.1 (vacío / invadible por 3.1)
   4.2 Cantidad de centros
   4.3 (vacío / invadible por 3.3)
   4.4 Desplegable número de centro
   4.5 (vacío / invadible por 3.5)
   4.6 Check Alternar sectores
   4.7 Check Rejilla */
grid.append( el('div',{style:'grid-column:4; grid-row:2;'}, [ centerCount ]) );
grid.append( el('div',{style:'grid-column:4; grid-row:4;'}, [ selActiveIndex ]) );
grid.append( el('div',{style:'grid-column:4; grid-row:6;'}, [ el('div',{className:'check-row'},[ cbAltFlip, el('label',{}, t('Alternar sectores (par/impar)')) ]) ]) );

grid.append( el('div',{style:'grid-column:4; grid-row:7;'}, [ el('div',{className:'check-row'},[ cbGrid,    el('label',{}, t('Rejilla')) ]) ]) );


PA.body.innerHTML=''; PA.body.append(grid);

// Inicializa el UI de “Centro activo”
refreshActiveCenterUI();
    /* ===== Capas ===== */
   
    PL.panel.style.display = state.layout.layersOpen ? 'block' : 'none';
    var layerList = el('div',{className:'layer-list'});
    var btnNewLayer = el('button',{className:'btn small', textContent: t('Nueva capa')});
var btnCloseLayers = el('button',{className:'btn small ghost', textContent: t('Cerrar')});
    PL.body.append(el('div',{className:'row'},[btnNewLayer, btnCloseLayers]), layerList);
    /* 🆕 Mostrar/Ocultar paneles desde los checks del HEADER */
function applyPanelVisibility(key, on){
  // ⛑️ Asegura estructura
  state.layout = state.layout || {};
  state.layout.visible = state.layout.visible || {};

  state.layout.visible[key] = !!on;

  // Exclusividad Animación ↔ Contorno+Simetría
 

  save();

  var vis = state.layout.visible || {};
  // (Animación como panel ha sido eliminado)

var map = {'p-file': PF.panel, 'p-advanced': PA.panel, 'p-brush': PB.panel};

  Object.keys(map).forEach(function(k){
  var panel = map[k];
  if(!panel) return;
  // si vamos a ocultar p-file, guardamos su altura por si hace falta como referencia
  if(k==='p-file' && (vis[k]===false)){
    try{
      panel.dataset.lastH = String(panel.offsetHeight || panel.getBoundingClientRect().height || 0);
    }catch(_){}
  }
  panel.style.display = (vis[k]!==false) ? 'block' : 'none';
});


// ⬅️ sincroniza dock con la visibilidad de “Archivo”
if(window.positionAnimDock) window.positionAnimDock();
// ⬇️ Garantiza que ningún panel quede por encima del header tras cambios
if (typeof window.ensurePanelsVisibleNow === 'function') {
  window.ensurePanelsVisibleNow();
}


if(window.innerWidth<=720) stackDockMobile();
requestAnimationFrame(function(){ resizeCanvas(); render(); });

if(typeof window.__setPanelsMenuChecks === 'function'){ window.__setPanelsMenuChecks(); }

}


// expón para el header
window.__applyPanelVisibility = applyPanelVisibility;

// Conecta con los checks del menú del header
(function wirePanelChecksInHeader(){
  var chF = $('#chkPanelFile'), chA = $('#chkPanelAdvanced'), chB = $('#chkPanelBrush');
function sync(){
  var v = (state.layout && state.layout.visible) || {};
  if(chF) chF.checked = v['p-file']     !== false;
  if(chA) chA.checked = v['p-advanced'] !== false;
  if(chB) chB.checked = v['p-brush']    !== false;
}

  chF && on(chF,'change', function(e){ applyPanelVisibility('p-file', e.target.checked); });
  chA && on(chA,'change', function(e){ applyPanelVisibility('p-advanced', e.target.checked); });
  chB && on(chB,'change', function(e){ applyPanelVisibility('p-brush', e.target.checked); });

  window.__setPanelsMenuChecks = sync;
  sync();
})();

/* aplica estado guardado al cargar (blindado) */
var _v = (state.layout && state.layout.visible) || {};
applyPanelVisibility('p-file',     _v['p-file']     !== false);
applyPanelVisibility('p-advanced', _v['p-advanced'] !== false);
applyPanelVisibility('p-brush',    _v['p-brush']    !== false);

// Failsafe: si los 3 están en false, re-actívalos (para evitar quedarse sin UI)
(function ensureSomePanels(){
  var v = (state.layout && state.layout.visible) || {};
  var none = (v['p-file'] === false) && (v['p-advanced'] === false) && (v['p-brush'] === false);
  if (none) {
    applyPanelVisibility('p-file', true);
    applyPanelVisibility('p-advanced', true);
    applyPanelVisibility('p-brush', true);
    toast('Mostrando paneles (Archivo, Contorno+Simetría, Pincel)');
  }
})();


    function positionLayersPanel(){
      var m=24; PL.panel.style.display='block';
      PL.panel.style.left = (PF.panel.offsetLeft + PF.panel.offsetWidth + m) + 'px';
      PL.panel.style.top  = (PF.panel.offsetTop) + 'px';
      state.layout.layersOpen=true; save();
    }
    function hideLayersPanel(){ PL.panel.style.display='none'; state.layout.layersOpen=false; save(); }
    on($('#openLayersBtn',PF.body),'click',function(){ if(PL.panel.style.display==='none' || PL.panel.style.display===''){ positionLayersPanel(); } else hideLayersPanel(); });
    on(btnCloseLayers,'click', hideLayersPanel);
      var draggingLayerIndex = null;
    function refreshLayers(){
      

      layerList.innerHTML='';
      doc.layers.forEach(function(L,idx){
        if(L.rotEnabled==null){ L.rotEnabled=false; L.rotSpeed=8; L.rotDir=1; L.rotAngle=0; }

        var row=el('div',{className:'layer'});
        row.setAttribute('draggable','true');
on(row,'dragstart',function(e){ draggingLayerIndex = idx; e.dataTransfer.effectAllowed='move'; });
on(row,'dragover', function(e){ e.preventDefault(); row.classList.add('drag-over'); });
on(row,'dragleave',function(){ row.classList.remove('drag-over'); });
on(row,'drop', function(e){
  e.preventDefault(); row.classList.remove('drag-over');
  var from = draggingLayerIndex, to = idx;
  if(from==null || from===to) return;
  var moved = doc.layers.splice(from,1)[0];
  doc.layers.splice(to,0,moved);
  doc.activeLayer = to;
  draggingLayerIndex = null;
  refreshLayers(); render();
});
on(row,'dragend', function(){ draggingLayerIndex = null; });

        var grid=el('div',{style:'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-items:center'});

        var vis=el('input',{type:'checkbox', checked:L.visible, style:'width:auto'});
       var selectBtn=el('button',{className:'btn small ghost'}, t('Seleccionar'));
var del=el('button',{className:'btn small ghost'}, '🗑'); // (icono se queda igual)

        var chAnim=el('input',{type:'checkbox', checked:!!L.rotEnabled, title: t('Activar rotación'), style:'width:auto'});

        var dirBtn=el('button',{className:'btn small ghost'}, L.rotDir>0?'↻':'↺');
        var spdWrap=el('div',{style:'grid-column: 1 / span 3; display:flex; gap:8px; align-items:center'});
        var spdLab=el('span',{className:'small-note'}, t('Velocidad'));
        var spd=el('input',{type:'range', min:'0', max:'60', value:String(L.rotSpeed||8), style:'flex:1'});
        var spdOut=el('output',{}, String(L.rotSpeed||8));
        spdWrap.append(spdLab, spd, spdOut);
// === 🎨 Colores (capa) — aplica SOLO a trazos ya dibujados ===
// valores iniciales a partir de la capa (o de los ajustes por defecto)
var _initFill = (function(){
  var c = normalizeColorHex((state && state.settings && state.settings.color) || '#000000', '#000000') || '#000000';
  var ss = (L.strokes || []);
  for (var i = ss.length - 1; i >= 0; i--){
    var s = ss[i];
    if (s && s.tool !== 'eraser' && s.color){ c = normalizeColorHex(s.color, c) || c; break; }
  }
  return c;
})();
var _initOutline = (function(){
  var c = normalizeColorHex((state && state.settings && state.settings.outlineColor) || '#000000', '#000000') || '#000000';
  var ss = (L.strokes || []);
  for (var i = ss.length - 1; i >= 0; i--){
    var s = ss[i];
    if (s && s.tool !== 'eraser' && s.outline && s.outlineColor){ c = normalizeColorHex(s.outlineColor, c) || c; break; }
  }
  return c;
})();

var inpLayerOutline = el('input',{type:'color', className:'color-full', value:_initOutline, title: t('Contorno (capa)')});
var inpLayerFill    = el('input',{type:'color', className:'color-full', value:_initFill,    title: t('Relleno (capa)')});

on(inpLayerOutline,'input', function(e){
  var hex = normalizePickerValue(e.target, _initOutline);
  (L.strokes || []).forEach(function(s){
    if(!s || s.tool === 'eraser') return;
    if(s.outline){ s.outlineColor = hex; }
  });
  render(); autosave();
});
on(inpLayerFill,'input', function(e){
  var hex = normalizePickerValue(e.target, _initFill);
  (L.strokes || []).forEach(function(s){
    if(!s || s.tool === 'eraser') return;
    s.color = hex;
  });
  render(); autosave();
});
on(inpLayerFill,'input', function(e){
  var hex = e.target.value;
  (L.strokes || []).forEach(function(s){
    if(!s || s.tool === 'eraser') return;
    s.color = hex;
  });
  render(); autosave();
});

// fila a ancho completo con los 2 pickers
var layerColorsWrap = el('div',{
  style:'grid-column:1 / span 3; display:flex; gap:8px; align-items:center; flex-wrap:wrap'
},[
  el('label',{className:'small-note', style:'display:flex; align-items:center; gap:6px'},[
    document.createTextNode(t('Contorno (capa)')), inpLayerOutline
  ]),
  el('label',{className:'small-note', style:'display:flex; align-items:center; gap:6px'},[
    document.createTextNode(t('Relleno (capa)')),  inpLayerFill
  ])
]);

        var uni=el('label',{className:'small-note', style:'display:flex;align-items:center;gap:6px'},[
  (function(){ var ch=el('input',{type:'checkbox', checked:!!L.outlineUnion, style:'width:auto'}); on(ch,'change',function(e){ L.outlineUnion=e.target.checked; render(); }); return ch; })(),
  document.createTextNode(t('Unir contornos'))
]);
        var up =el('button',{className:'btn small ghost'},'▲');
        var dn =el('button',{className:'btn small ghost'},'▼');

        var topBar=el('div',{className:'top',style:'margin-bottom:6px'},[
  el('span',{className:'name'}, t(L.name) + (idx===doc.activeLayer?' •':''))
]);


        on(vis,'change',function(e){ L.visible=e.target.checked; render(); });
        on(selectBtn,'click',function(){ doc.activeLayer=idx; refreshLayers(); });
        on(del,'click',function(){ if(doc.layers.length<=1){ toast('Deja al menos una capa.'); return; } doc.layers.splice(idx,1); doc.activeLayer=Math.max(0,doc.activeLayer-1); refreshLayers(); render(); });

        on(chAnim,'change',function(e){ L.rotEnabled=e.target.checked; ensureAnim(); });
        on(dirBtn,'click',function(){ L.rotDir=L.rotDir>0?-1:1; dirBtn.textContent=(L.rotDir>0?'↻':'↺'); });
        on(spd,'input',function(e){ L.rotSpeed=+e.target.value; spdOut.textContent=String(L.rotSpeed); });

        on(up,'click',function(){ if(idx>0){ var t=doc.layers[idx-1]; doc.layers[idx-1]=doc.layers[idx]; doc.layers[idx]=t; doc.activeLayer=Math.max(0,doc.activeLayer-1); refreshLayers(); render(); } });
        on(dn,'click',function(){ if(idx<doc.layers.length-1){ var t=doc.layers[idx+1]; doc.layers[idx+1]=doc.layers[idx]; doc.layers[idx]=t; doc.activeLayer=Math.min(doc.layers.length-1,doc.activeLayer+1); refreshLayers(); render(); } });

        var visWrap = el('label',{className:'small-note',style:'display:flex;align-items:center;gap:6px'},[vis, document.createTextNode(t('Visibilidad'))]);
var rotWrap = el('label',{className:'small-note',style:'display:flex;align-items:center;gap:6px'},[chAnim, document.createTextNode(t('Rotación'))]);

grid.appendChild(visWrap); grid.appendChild(selectBtn); grid.appendChild(del);
grid.appendChild(rotWrap); grid.appendChild(dirBtn); grid.appendChild(spdWrap);
grid.appendChild(layerColorsWrap); // ← NUEVO: Contorno (capa) + Relleno (capa)
grid.appendChild(uni); grid.appendChild(up); grid.appendChild(dn);


        row.append(topBar, grid);
        layerList.append(row);
      });
    }
    on(btnNewLayer,'click',function(){
      doc.layers.push({id:uid(), name:'Capa '+(doc.layers.length+1), visible:true, outlineUnion:false, strokes:[], rotEnabled:false, rotSpeed:8, rotDir:1, rotAngle:0});
      doc.activeLayer=doc.layers.length-1; refreshLayers(); render();
    });

    on($('#bgColor',PB.body),'input',function(e){
  state.settings.background = normalizePickerValue(e.target, state.settings.background || '#ffffff');
  state.settings.transparentBg=false;
  save(); render();
});
on($('#bgDark',PB.body),'click',function(){
  state.settings.transparentBg=false;
  state.settings.background='#000000';               // negro puro
  $('#bgColor',PB.body).value='#000000';
  save(); render();
});

on($('#bgLight',PB.body),'click',function(){
  state.settings.transparentBg=false;
  state.settings.background='#ffffff';               // blanco puro
  $('#bgColor',PB.body).value='#ffffff';
  save(); render();
});

on($('#bgVector',PB.body),'click',function(){ state.settings.transparentBg=true; toast(t('Modo vectorial: exportar SIN fondo')); save(); });

// Color de rejilla
on($('#gridColor', PB.body), 'input', function(ev){
  state.settings.gridColor = normalizePickerValue(ev.target, state.settings.gridColor || '#404040');
  save();
  render();
});

    on($('#bColor',PB.body),'input',function(e){
  state.settings.color = normalizePickerValue(e.target, state.settings.color || '#ffffff');
  pushColorHistory(state.settings.color); refreshColorHistory();
});
on(btnPick,'click', function(){ toast(t('Mantén pulsado sobre el lienzo para muestrear color.')); });


    on($('#oColor',PA.body),'input',function(e){
  state.settings.outlineColor = normalizePickerValue(e.target, state.settings.outlineColor || '#000000');
  save();
});
   

        /* ===== Export ===== */
    function exportPNGHigh(name){
  var transparent = !!state.settings.transparentBg;

  // offscreen del tamaño REAL del canvas en pantalla a 100% (CSS) × DPR
  var off = document.createElement('canvas');
  off.width  = Math.floor(viewCssSide * dpr);
  off.height = Math.floor(viewCssSide * dpr);

  var ctxOff = off.getContext('2d');
  if (ctxOff.imageSmoothingEnabled !== undefined) {
    ctxOff.imageSmoothingEnabled = true;
    ctxOff.imageSmoothingQuality = 'high';
  }

  // Igualamos la transformación del canvas de trabajo (1 CSS px => dpr device px)
  ctxOff.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Usamos los ángulos actuales (si había animación por capa)
  var angles = doc.layers.map(function(L){ return L.rotAngle||0; });

  // Render idéntico al que ves (incluye rejilla si está activa)
  renderTo(ctxOff, viewCssSide, viewCssSide, { layerAngles: angles, transparent: transparent });

  var url = off.toDataURL('image/png');
  var a = document.createElement('a');
  a.href = url;
a.download = smartDownloadName(name, 'mandala', '.png');


  a.click();
}



    function svgDashFor(pattern, lw){
      if(pattern==='dash') return (4*lw)+','+(2*lw);
      if(pattern==='longdash') return (8*lw)+','+(3*lw);
      if(pattern==='dot') return (lw*0.1)+','+(2.1*lw);
      if(pattern==='dashdot') return (6*lw)+','+(2*lw)+','+(lw)+','+(2*lw);
      return '';
    }
    function svgPathD(stroke, w, h){
      var cx=w/2, cy=h/2;
      var pts=stroke.points.map(function(p){ return {x:p.u*w - cx, y:p.v*h - cy}; });
      if(!pts.length) return '';
      if(pts.length===1){
        var r=Math.max(0.5, stroke.size/2);
        return 'M '+(pts[0].x+r)+' '+pts[0].y+' A '+r+' '+r+' 0 1 0 '+(pts[0].x-r)+' '+pts[0].y+' A '+r+' '+r+' 0 1 0 '+(pts[0].x+r)+' '+pts[0].y;
      }
      var d=['M '+pts[0].x.toFixed(2)+' '+pts[0].y.toFixed(2)];
      function mid(p,q){ return {x:(p.x+q.x)/2, y:(p.y+q.y)/2}; }
      for(var i=1;i<pts.length-1;i++){
        var cp=pts[i]; var mp=mid(pts[i], pts[i+1]);
        d.push('Q '+cp.x.toFixed(2)+' '+cp.y.toFixed(2)+' '+mp.x.toFixed(2)+' '+mp.y.toFixed(2));
      }
      var last=pts[pts.length-1];
      d.push('L '+last.x.toFixed(2)+' '+last.y.toFixed(2));
      return d.join(' ');
    }
    function exportSVG(name){
      var w=viewCssSide, h=viewCssSide, cx=w/2, cy=h/2;
      var bg=state.settings.background;
      function emitStrokeWith(s, lw, color, sectors, mirror, mirrorInv, altFlip, dstr, rotAngle, shape, pattern){
        var out='', k, K=Math.max(1,sectors|0), ang=360/K, cap=(shape==='square'?'butt':'round'), join=(shape==='square'?'bevel':'round');
        var dash = svgDashFor(pattern, lw);
        for(k=0;k<K;k++){
          var base='translate('+cx+' '+cy+') rotate('+(rotAngle*180/Math.PI).toFixed(2)+') rotate('+(k*ang).toFixed(2)+')';
          var alt = (altFlip && (k%2===1)) ? ' scale(-1 1)' : '';
          out+='<g transform="'+base+alt+'"><path d="'+dstr+'" fill="none" stroke="'+color.replace('#','%23')+'" stroke-linecap="'+cap+'" stroke-linejoin="'+join+'" stroke-width="'+lw+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/></g>';

          if(mirror){
            var t1='translate('+cx+' '+cy+') rotate('+(rotAngle*180/Math.PI).toFixed(2)+') rotate('+(k*ang).toFixed(2)+') scale(-1 1)';
            out+='<g transform="'+t1+'"><path d="'+dstr+'" fill="none" stroke="'+color.replace('#','%23')+'" stroke-linecap="'+cap+'" stroke-linejoin="'+join+'" stroke-width="'+lw+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/></g>';
          }
          if(mirrorInv){
            var t2='translate('+cx+' '+cy+') rotate('+(rotAngle*180/Math.PI).toFixed(2)+') rotate('+((k*ang)+(ang/2)).toFixed(2)+') scale(-1 1)';
            out+='<g transform="'+t2+'"><path d="'+dstr+'" fill="none" stroke="'+color.replace('#','%23')+'" stroke-linecap="'+cap+'" stroke-linejoin="'+join+'" stroke-width="'+lw+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/></g>';
          }
        }
        return out;
      }
      var body='';
      doc.layers.forEach(function(L){
        if(!L.visible) return; var rotA=L.rotAngle||0;
        for (var j=0;j<L.strokes.length;j++){
          var s=L.strokes[j]; if(s.tool==='eraser') continue;
          var d=svgPathD(s, w, h); if(!d) continue;
          var sectors = s.sectors!=null?s.sectors:state.settings.symmetry;
          var mirror  = s.mirror !=null?s.mirror :state.settings.mirror;
          var mirrorInv = s.mirrorInverse!=null?s.mirrorInverse:state.settings.mirrorInverse;
          var altFlip = s.altFlip!=null?s.altFlip:state.settings.altFlip;

          // patrón "pulse": dos pasadas
          if(s.pattern==='pulse'){
            var thick = s.size*1.6, thin=Math.max(1,s.size*0.6);
            body+=emitStrokeWith(s, thick, rgbaStr(s.color, s.opacity), sectors, mirror, mirrorInv, altFlip, d, rotA, s.shape, 'dash'); // dash para simular
            body+=emitStrokeWith(s, thin , rgbaStr(s.color, s.opacity), sectors, mirror, mirrorInv, altFlip, d, rotA, s.shape, 'dash');
            continue;
          }

          if(s.outline && !L.outlineUnion){
            var lw = s.size + 2*(s.outlineWidth||1);
            var ocol = rgbaStr(s.outlineColor, s.outlineOpacity==null?1:s.outlineOpacity);
            body+=emitStrokeWith(s, lw, ocol, sectors, mirror, mirrorInv, altFlip, d, rotA, s.shape, s.pattern);
          }
          body+=emitStrokeWith(s, s.size, rgbaStr(s.color, s.opacity), sectors, mirror, mirrorInv, altFlip, d, rotA, s.shape, s.pattern);
        }
      });
      var transparent = !!state.settings.transparentBg;
var bgRect = transparent ? '' : '  <rect width="100%" height="100%" fill="'+bg+'"/>\n';
var svg='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">\n'+bgRect+body+'\n</svg>';

      var blob=new Blob([svg],{type:'image/svg+xml'}), url=URL.createObjectURL(blob);
      var a=document.createElement('a'); a.href=url; a.download=smartDownloadName(name,'mandala','.svg'); a.click(); URL.revokeObjectURL(url);

    }
function exportPDF(kind, name){
  // Tamaños estándar (puntos a 72 dpi)
  var page = {w:595, h:842}; // A4 por defecto
  if(kind==='A5')  page={w:420, h:595};
  if(kind==='6x9') page={w:432, h:648};

  // Márgenes y lado cuadrado del mandala dentro de la página
  var margin=36, maxW=page.w-2*margin, maxH=page.h-2*margin, side=Math.min(maxW, maxH);

  // 300 DPI manteniendo grosor relativo al visor
  var px  = Math.round(side/72*300);
  var dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1));
  var baseRef = Math.max(1, Math.floor((typeof calcCanvasSquare==='function' ? calcCanvasSquare().w : side) * dpr));
  var k = Math.max(0.01, px / baseRef);

  // Transparencia y color de fondo del mandala
  var tr  = !!state.settings.transparentBg;
  var bgc = (state.settings && state.settings.background) || '#ffffff';

  // Render cuadrado del mandala (px × px)
  var can = renderDocToCanvas(doc, px, {
    transparent: tr,
    backgroundColor: bgc,
    strokeScale: k
  });

  // Cuadro centrado donde va el mandala dentro de la página
  var x=(page.w-side)/2, y=(page.h-side)/2;

  // Lienzo intermedio del TAMAÑO DE LA PÁGINA (en píxeles a la misma escala)
  var pageCan = document.createElement('canvas');
  pageCan.width  = Math.round(px * (page.w/side));
  pageCan.height = Math.round(px * (page.h/side));
  var pctx = pageCan.getContext('2d');
  if (pctx.imageSmoothingEnabled !== undefined) {
    pctx.imageSmoothingEnabled = true;
    pctx.imageSmoothingQuality = 'high';
  }

  // 🔴 1) Fondo blanco de TODA la página (evita “zonas negras” al comprimir a JPEG)
  pctx.fillStyle = '#ffffff';
  pctx.fillRect(0,0,pageCan.width,pageCan.height);

  // Normaliza #RRGGBBAA → rgba()
  function _norm(c){
    var m = String(c||'').match(/^#([0-9a-f]{8})$/i);
    if(m){
      var R=parseInt(c.slice(1,3),16),G=parseInt(c.slice(3,5),16),B=parseInt(c.slice(5,7),16),A=parseInt(c.slice(7,9),16)/255;
      return 'rgba('+R+','+G+','+B+','+A+')';
    }
    return c||'#ffffff';
  }

  // 🔴 2) Pinta el rectángulo del área del mandala con el color de fondo elegido
  var scale = pageCan.width / page.w;
  pctx.fillStyle = _norm(bgc);
  pctx.fillRect(x*scale, y*scale, side*scale, side*scale);

  // 🔴 3) Dibuja el mandala cuadrado (no se deforma)
  pctx.drawImage(can, x*scale, y*scale, side*scale, side*scale);

  // JPEG de página completa
  var jpeg = pageCan.toDataURL('image/jpeg', 0.98).split(',')[1];
  var imgBytes = base64ToUint8(jpeg);

  // 🔴 4) Dibuja la IMAGEN A PÁGINA COMPLETA en el PDF (SIN “aplastarla” a un cuadrado)
  var pdfBytes = makePDF_MultiJPEG(page.w, page.h, [{
    ix:0, iy:0, iw:page.w, ih:page.h,              // ← página completa
    imgBytes: imgBytes, pxW: pageCan.width, pxH: pageCan.height
  }]);

  var blob=new Blob([pdfBytes], {type:'application/pdf'});
  var url = URL.createObjectURL(blob);

  // Nombre de archivo (usa el nombre del lienzo si hay; si no, fallback raro)
  function smartName(base, fallback, ext){
    base = String(base||'').trim();
    return base ? (slugify(base)+ext) : (slugify(fallback)+'-'+Date.now()+ext);
  }
  var a = document.createElement('a');
  a.href=url;
  a.download = smartName(name, 'mandala', '.pdf');
  a.click();
  URL.revokeObjectURL(url);
  }
    function exportVideo20s(name){
  if(!window.MandalaExport || typeof window.MandalaExport.exportVideo20s !== 'function'){
    toast('No se pudo cargar export.js');
    return;
  }

  return window.MandalaExport.exportVideo20s({
    name: name,
    canvas: canvas,
    audioEl: audioEl,
    state: state,
    save: save,
    ensureAnim: ensureAnim,
    smartDownloadName: smartDownloadName,
    toast: toast,
    el: el
  });
}
     function base64ToUint8(b64){ var bin=atob(b64), len=bin.length, u8=new Uint8Array(len); for(var i=0;i<len;i++) u8[i]=bin.charCodeAt(i); return u8; }
    function makePDF_MultiJPEG(pageW, pageH, pages){
      function str2buf(s){ var u=new Uint8Array(s.length); for(var i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; }
      function concat(arrs){ var len=0,i; for(i=0;i<arrs.length;i++) len+=arrs[i].length; var out=new Uint8Array(len), off=0; for(i=0;i<arrs.length;i++){ out.set(arrs[i],off); off+=arrs[i].length; } return out; }
      function objHeader(n){ return str2buf(n+' 0 obj\n'); }
      var parts=[], xref=[0], nextId=1;
      function offset(){ var l=0,i; for(i=0;i<parts.length;i++) l+=parts[i].length; return l; }
      function push(p){ parts.push(p); }
      function addObj(n, contentBuf){ xref[n]=offset(); push(objHeader(n)); push(contentBuf); push(str2buf('\nendobj\n')); }
      var catalogId=nextId++; var pagesId=nextId++;
      var kidIds=[], imgIds=[], contentIds=[];
      for(var i=0;i<pages.length;i++){
        var imgId=nextId++; imgIds.push(imgId);
        var head = '<< /Type /XObject /Subtype /Image /Width '+pages[i].pxW+' /Height '+pages[i].pxH+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+pages[i].imgBytes.length+' >>\nstream\n';
        push(objHeader(imgId)); push(str2buf(head)); push(pages[i].imgBytes); push(str2buf('\nendstream\nendobj\n'));
        var stream='q\n'+pages[i].iw+' 0 0 '+pages[i].ih+' '+pages[i].ix+' '+pages[i].iy+' cm\n/Im0 Do\nQ';
        var sb=str2buf(stream); var contId=nextId++; contentIds.push(contId);
        addObj(contId, str2buf('<< /Length '+sb.length+' >>\nstream\n'+stream+'\nendstream'));
        var pageId=nextId++; kidIds.push(pageId);
        addObj(pageId, str2buf('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /XObject << /Im0 '+imgId+' 0 R >> /ProcSet [/PDF /ImageC] >> /Contents '+contId+' 0 R >>'));
      }
      addObj(pagesId, str2buf('<< /Type /Pages /Count '+kidIds.length+' /Kids ['+kidIds.map(function(id){return id+' 0 R';}).join(' ')+'] >>'));
      addObj(catalogId, str2buf('<< /Type /Catalog /Pages '+pagesId+' 0 R >>'));
      var header=str2buf('%PDF-1.4\n%âãÏÓ\n');
      var xrefStart=offset()+header.length;
      var nObjs=nextId-1, i, xrefStr='xref\n0 '+(nObjs+1)+'\n0000000000 65535 f \n';
      for(i=1;i<=nObjs;i++){ var offStr=('0000000000'+( (xref[i]||0) + header.length )).slice(-10); xrefStr+=offStr+' 00000 n \n'; }
      var trailer='trailer << /Size '+(nObjs+1)+' /Root '+catalogId+' 0 R >>\nstartxref\n'+xrefStart+'\n%%EOF';
      return concat([header].concat(parts).concat([str2buf(xrefStr+trailer)]));
    }
        // ——— Destructor: se llama al cambiar de sección
    wrap.__destroy = function(){
  try{ if(animRAF){ cancelAnimationFrame(animRAF); animRAF=null; } }catch(_){}
  try{ window.removeEventListener('resize', resizeCanvas); }catch(_){}
  try{ window.removeEventListener('resize', positionAnimDock); }catch(_){}
  try{ audioEl.pause(); }catch(_){}

  // 🧹 elimina paneles flotantes creados por esta vista (evita duplicados al volver)
  ['p-file','p-advanced','p-brush','p-layers'].forEach(function(id){
    var n = document.getElementById(id);
    if(n && n.parentNode) n.parentNode.removeChild(n);
  });

  // 🧹 elimina también el dock de animación si hubiera quedado
  Array.prototype.forEach.call(document.querySelectorAll('#animDock'), function(n){
    if(n && n.parentNode) n.parentNode.removeChild(n);
  });

  // Nota: los listeners ligados al <canvas> se eliminan al quitar el nodo del DOM.
};

    return wrap;
  } // MandalaStudio()

  /* ===== Renderizador independiente (si hiciera falta) ===== */
  function renderDocToCanvas(doc, sidePx, opts){
  // sidePx = lado base del documento (escala cuadrada). El lienzo de salida
  // puede ser rectangular usando canvasWidthPx/canvasHeightPx + offsets UV.
  opts = opts || {};

  // --- Dimensiones reales del lienzo de salida (rectangular) ---
  var canW = Math.floor(opts.canvasWidthPx  != null ? opts.canvasWidthPx  : sidePx);
  var canH = Math.floor(opts.canvasHeightPx != null ? opts.canvasHeightPx : sidePx);

  // --- Desplazamiento del dominio UV (para mostrar u<0 y u>1, etc.) ---
  // Un u0 negativo desplaza a la izquierda; v0 negativo desplaza hacia arriba.
  var u0 = (typeof opts.offsetU === 'number') ? opts.offsetU : 0;
  var v0 = (typeof opts.offsetV === 'number') ? opts.offsetV : 0;

  // --- Lienzo de salida ---
  var canvas = document.createElement('canvas');
  canvas.width  = canW;
  canvas.height = canH;

  var ctx = canvas.getContext('2d');
  if (ctx.imageSmoothingEnabled !== undefined) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

     // === Fondo (normaliza #RRGGBBAA → rgba()) + escala de trazo para exportes ===
  function __normColor(c){
    if(typeof c !== 'string') return '#ffffff';
    var m = c.match(/^#([0-9a-f]{8})$/i);
    if(m){
      var R = parseInt(c.slice(1,3),16),
          G = parseInt(c.slice(3,5),16),
          B = parseInt(c.slice(5,7),16),
          A = parseInt(c.slice(7,9),16) / 255;
      return 'rgba('+R+','+G+','+B+','+A+')';
    }
    return c;
  }
  var bg = __normColor((opts && opts.backgroundColor) || (doc.settings && doc.settings.background) || '#ffffff'); /* 🆕 */
  var transparent = !!(opts && opts.transparent);

  // k = factor de escala de trazo (1 = igual que visor; >1 = exportes de más resolución)
  var __strokeK = Math.max(0.01, (opts && typeof opts.strokeScale === 'number') ? opts.strokeScale : 1); /* 🆕 */

  if(!transparent){ ctx.fillStyle = bg; ctx.fillRect(0,0,canW,canH); }



  // === Helpers de mapeo: UV -> px manteniendo escala cuadrada con sidePx ===
  function mapU(u){ return (u - u0) * sidePx; }
  function mapV(v){ return (v - v0) * sidePx; }

  // === Path relativo al centro (en px ya mapeados con offset) ===
  function buildPathFnAt(s, cx, cy){
    var pts = (s.points||[]).map(function(p){ return {x: mapU(p.u) - cx, y: mapV(p.v) - cy}; });
    if(!pts.length) return null;
    return function(c){
      c.beginPath();
      if(pts.length===1){
        c.arc(pts[0].x, pts[0].y, Math.max(.5, (s.size||1)/2), 0, Math.PI*2);
        return;
      }
      c.moveTo(pts[0].x, pts[0].y);
      function mid(p,q){ return {x:(p.x+q.x)/2, y:(p.y+q.y)/2}; }
      for(var i=1;i<pts.length-1;i++){
        var cp=pts[i]; var mp=mid(pts[i], pts[i+1]);
        c.quadraticCurveTo(cp.x, cp.y, mp.x, mp.y);
      }
      var last=pts[pts.length-1]; c.lineTo(last.x, last.y);
    };
  }

    function applyStyle(c, s, lw, col){
    var k = __strokeK || 1;
    var lwEff = Math.max(0.5, (lw || 1) * k);

    c.setLineDash([]);
    c.shadowBlur = 0;
    c.filter = 'none';

    if((s.shape||'')==='square'){
      c.lineCap='butt'; c.lineJoin='bevel'; c.miterLimit=2;
    }else if((s.shape||'')==='soft'){
      c.lineCap='round'; c.lineJoin='round';
      c.shadowColor = col; c.shadowBlur = Math.max(2, lwEff*0.6);
    }else{
      c.lineCap='round'; c.lineJoin='round';
    }

    var pat = s.pattern||'solid';
    // base de patrón también escala
    var baseDash = (s.dashBaseSize!=null ? s.dashBaseSize : (s.size || lw || 1));
    var dref = Math.max(1, baseDash * k);

    if(pat==='dash')          c.setLineDash([4*dref,2*dref]);
    else if(pat==='longdash') c.setLineDash([8*dref,3*dref]);
    else if(pat==='dot')      c.setLineDash([Math.max(1, dref*0.1), 2.1*dref]);
    else if(pat==='dashdot')  c.setLineDash([6*dref,2*dref,dref,2*dref]);
    else                      c.setLineDash([]);

    c.strokeStyle = col;
    c.lineWidth   = lwEff;
  }


  // === Sellos bitmap (adaptados a mapU/mapV) ===
  function drawStampStrokeBitmap(ctx, stroke, union){
  var k       = __strokeK || 1;
  var lw      = Math.max(0.5, (stroke.size || 1) * k);
  var color   = rgbaStr(stroke.color, stroke.opacity==null?1:stroke.opacity);
  var comp    = (stroke.tool==='eraser' ? 'destination-out' : 'source-over');
  var sectors = Math.max(1, (stroke.sectors||12)|0);
  var mirror  = !!stroke.mirror, invMir=!!stroke.mirrorInverse, altFlip=!!stroke.altFlip;


  var pts = (stroke.points||[]).map(function(p){ return {x: mapU(p.u), y: mapV(p.v)}; });
  if(!pts.length) return;

   var spacing = Math.max(4, lw * 1.1); // lw ya está escalado por k

  var filtered = [], last = null;
  for(var i=0;i<pts.length;i++){
    var P = pts[i];
    if(!last){ filtered.push({x:P.x, y:P.y, a:0}); last=P; continue; }
    var dx=P.x-last.x, dy=P.y-last.y, d=Math.sqrt(dx*dx+dy*dy);
    if(d>=spacing){
      filtered.push({x:P.x, y:P.y, a:Math.atan2(dy,dx)});
      last = P;
    }
  }
  if(filtered.length===1){ filtered[0].a = 0; }

  var kind = String(stroke.shape||'').replace('stamp-',''); // dot | geo | petal
  var doOutline = (stroke.tool!=='eraser') && !!stroke.outline && !union;
  var ow = Math.max(1, (stroke.outlineWidth||1) * k);

  var ocol = rgbaStr(stroke.outlineColor, stroke.outlineOpacity==null?1:stroke.outlineOpacity);

  function drawOneStamp(radius){
    if(kind==='dot'){
      // contorno
      if(doOutline){
        ctx.beginPath(); ctx.arc(0,0, Math.max(1, radius*0.6), 0, Math.PI*2);
        ctx.lineWidth = Math.max(1, 2*ow);
        ctx.strokeStyle = ocol; ctx.stroke();
      }
      // relleno
      ctx.beginPath(); ctx.arc(0,0, Math.max(1, radius*0.6), 0, Math.PI*2);
      ctx.fillStyle = color; ctx.fill();
      return;
    }
    if(kind==='geo'){
      var R = Math.max(1, radius*0.7);
      // contorno (primero, más grueso)
      if(doOutline){
        ctx.beginPath();
        for(var t=0;t<6;t++){
          var ang = t * Math.PI/3, x = Math.cos(ang)*R, y = Math.sin(ang)*R;
          if(t===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.lineWidth = Math.max(1, (radius*0.28) + 2*ow);
        ctx.strokeStyle = ocol; ctx.stroke();
      }
      // trazo principal
      ctx.beginPath();
      for(var t2=0;t2<6;t2++){
        var ang2 = t2 * Math.PI/3, x2 = Math.cos(ang2)*R, y2 = Math.sin(ang2)*R;
        if(t2===0) ctx.moveTo(x2,y2); else ctx.lineTo(x2,y2);
      }
      ctx.closePath();
      ctx.lineWidth = Math.max(1, radius*0.28);
      ctx.strokeStyle = color; ctx.stroke();
      return;
    }
    if(kind==='petal'){
      var Rx = Math.max(1, radius*0.8), Ry = Math.max(1, radius*0.55);
      if(doOutline){
        ctx.beginPath(); ctx.ellipse(0,0, Rx, Ry, 0, 0, Math.PI*2);
        ctx.lineWidth = Math.max(1, 2*ow);
        ctx.strokeStyle = ocol; ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0,0, Rx, Ry, 0, 0, Math.PI*2);
      ctx.fillStyle = color; ctx.fill();
      return;
    }
  }

  function drawRep(angleOffset, Cx, Cy){
    var rel = filtered.map(function(p){ return {x:p.x-Cx, y:p.y-Cy, a:p.a}; });
    for(var k=0;k<sectors;k++){
      ctx.save();
      ctx.translate(Cx, Cy);
      ctx.rotate((2*Math.PI/sectors)*k + (angleOffset||0));
      if(altFlip && (k%2===1)) ctx.scale(-1,1);
      rel.forEach(function(p){
        ctx.save();
        ctx.translate(p.x, p.y);
        if(kind==='petal'){ ctx.rotate(p.a||0); }
        drawOneStamp(lw);
        ctx.restore();
      });
      ctx.restore();

      if(mirror){
        ctx.save(); ctx.translate(Cx, Cy); ctx.rotate((2*Math.PI/sectors)*k); ctx.scale(-1,1);
        rel.forEach(function(p){
          ctx.save();
          ctx.translate(p.x, p.y);
          if(kind==='petal'){ ctx.rotate(p.a||0); }
          drawOneStamp(lw);
          ctx.restore();
        });
        ctx.restore();
      }
    }
  }

  var oldComp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = comp;

  var centers = (stroke.centersUV && stroke.centersUV.length)
    ? stroke.centersUV.map(function(p){ return {x: mapU(p.u), y: mapV(p.v)}; })
    : [{x: mapU(0.5), y: mapV(0.5)}];

  centers.forEach(function(C){
    drawRep(0, C.x, C.y);
    if(invMir) drawRep(Math.PI/sectors, C.x, C.y);
  });

  ctx.globalCompositeOperation = oldComp;
}
  function drawRep(c, pathFn, sec, mir, invMir, altFlip, cx, cy){
    var K=Math.max(1, sec|0), ang=(2*Math.PI)/K;
    for(var k=0;k<K;k++){
      c.save(); c.translate(cx,cy); c.rotate(ang*k); if(altFlip && (k%2===1)) c.scale(-1,1); pathFn(c); c.stroke(); c.restore();
      if(mir){    c.save(); c.translate(cx,cy); c.rotate(ang*k);         c.scale(-1,1); pathFn(c); c.stroke(); c.restore(); }
      if(invMir){ c.save(); c.translate(cx,cy); c.rotate(ang*k + ang/2); c.scale(-1,1); pathFn(c); c.stroke(); c.restore(); }
    }
  }

  function drawStroke(c, s, union){
    if(!s.points || !s.points.length) return;

    var centers = (s.centersUV && s.centersUV.length)
      ? s.centersUV.map(function(p){ return {x: mapU(p.u), y: mapV(p.v)}; })
      : [{x: mapU(0.5), y: mapV(0.5)}];

    var sec = s.sectors||12, mir=!!s.mirror, invMir=!!s.mirrorInverse, alt=!!s.altFlip;

    if(/^stamp-/.test(s.shape||'')){
  // ⬇️ contorno detrás del sello (si procede)
  if(s.tool!=='eraser' && s.outline && !union){
    var ow   = s.outlineWidth || 1;
    var S2   = Object.assign({}, s, {
      size:   (s.size||1) + 2*ow,                                  // sello “más grande” para simular aro
      color:  s.outlineColor,
      opacity:(s.outlineOpacity==null ? 1 : s.outlineOpacity)
    });
    drawStampStrokeBitmap(c, S2);
  }
  // sello normal encima
  drawStampStrokeBitmap(c, s, union);
  return;
}
     if(s.pattern==='pulse' && s.tool!=='eraser'){
    var baseL = Math.max(2, Math.round(8 * ( (s.size||1) * (__strokeK||1) )));
  centers.forEach(function(C){

    // ← nuevo: contorno del “pulso” (si NO estamos uniendo contornos por capa)
    if(s.outline && !union){
      var ow = s.outlineWidth||1;
      c.save();
      applyStyle(c, s, (s.size||1)+2*ow, rgbaStr(s.outlineColor, s.outlineOpacity==null?1:s.outlineOpacity));
      c.setLineDash([baseL,baseL]); c.lineDashOffset = 0;
      var pfO = buildPathFnAt(s, C.x, C.y); if(pfO) drawRep(c, pfO, sec, mir, invMir, alt, C.x, C.y);
      c.restore();
    }

    // dos pasadas del cuerpo del “pulso”
    c.save(); applyStyle(c, s, Math.max(1,(s.size||1)*1.6), rgbaStr(s.color, s.opacity==null?1:s.opacity));
    c.setLineDash([baseL,baseL]); c.lineDashOffset=0;
    var pf1 = buildPathFnAt(s, C.x, C.y); if(pf1) drawRep(c, pf1, sec, mir, invMir, alt, C.x, C.y);
    c.restore();

    c.save(); applyStyle(c, s, Math.max(1,(s.size||1)*0.6), rgbaStr(s.color, s.opacity==null?1:s.opacity));
    c.setLineDash([baseL,baseL]); c.lineDashOffset=baseL;
    var pf2 = buildPathFnAt(s, C.x, C.y); if(pf2) drawRep(c, pf2, sec, mir, invMir, alt, C.x, C.y);
    c.restore();
  });
  return;
}

    centers.forEach(function(C){
      if(s.tool!=='eraser' && s.outline && !union){
        var ow=s.outlineWidth||1;
        applyStyle(c, s, (s.size||1)+2*ow, rgbaStr(s.outlineColor, s.outlineOpacity==null?1:s.outlineOpacity));
        var pfO = buildPathFnAt(s, C.x, C.y); if(pfO) drawRep(c, pfO, sec, mir, invMir, alt, C.x, C.y);
      }
      applyStyle(c, s, (s.size||1), (s.tool==='eraser'?'rgba(0,0,0,1)':rgbaStr(s.color, s.opacity==null?1:s.opacity)));
      if(s.tool==='eraser'){ c.globalCompositeOperation='destination-out'; } else { c.globalCompositeOperation='source-over'; }
      var pf = buildPathFnAt(s, C.x, C.y); if(pf) drawRep(c, pf, sec, mir, invMir, alt, C.x, C.y);
      c.globalCompositeOperation='source-over';
    });
  }

   function drawStrokeAs(c, s, lw, col, comp, cx, cy){
    if(!s.points || !s.points.length) return;
    var sec=s.sectors||12, mir=!!s.mirror, invMir=!!s.mirrorInverse, alt=!!s.altFlip;
    var pf = buildPathFnAt(s, cx, cy); if(!pf) return;

    c.save();
    c.globalCompositeOperation = comp || 'source-over';
    applyStyle(c, s, lw, col);

    if(s.pattern==='pulse' && s.tool!=='eraser'){
      var baseL = Math.max(2, Math.round(8 * ( (((s && s.size) ? s.size : lw) * (__strokeK||1)) )));
      c.save(); c.setLineDash([baseL,baseL]); c.lineDashOffset=0; c.lineWidth=lw*1.6; drawRep(c, pf, sec, mir, invMir, alt, cx, cy); c.restore();
      c.save(); c.setLineDash([baseL,baseL]); c.lineDashOffset=baseL; c.lineWidth=Math.max(1, lw*0.6); drawRep(c, pf, sec, mir, invMir, alt, cx, cy); c.restore();
    }else{
      drawRep(c, pf, sec, mir, invMir, alt, cx, cy);
    }

    c.restore();
  }
  function drawLayerUnionOutlineInline(ctx, layer, w, h){
    var need=false;
    for(var i=0;i<layer.strokes.length;i++){ var s=layer.strokes[i]; if(s.tool!=='eraser' && s.outline){ need=true; break; } }
    if(!need) return;

    var ocA=document.createElement('canvas'), ocB=document.createElement('canvas');
    ocA.width=Math.floor(w); ocA.height=Math.floor(h);
    ocB.width=ocA.width;     ocB.height=ocA.height;
    var a=ocA.getContext('2d'), b=ocB.getContext('2d');
    a.imageSmoothingEnabled=true; a.imageSmoothingQuality='high';
    b.imageSmoothingEnabled=true; b.imageSmoothingQuality='high';

    for(var j=0;j<layer.strokes.length;j++){
      var s=layer.strokes[j];
      var centers = (s.centersUV && s.centersUV.length)
        ? s.centersUV.map(function(p){ return {x: mapU(p.u), y: mapV(p.v)}; })
        : [{x: mapU(0.5), y: mapV(0.5)}];

      centers.forEach(function(C){
        if(s.tool==='eraser'){
          drawStrokeAs(a, s, (s.size||1), 'rgba(0,0,0,1)', 'destination-out', C.x, C.y);
          drawStrokeAs(b, s, (s.size||1), 'rgba(0,0,0,1)', 'destination-out', C.x, C.y);
          return;
        }
        if(!s.outline) return;
        var ow=s.outlineWidth||1, bigW=((s.size||1)+2*ow);
        var ocol = rgbaStr(s.outlineColor, s.outlineOpacity==null?1:s.outlineOpacity);
        drawStrokeAs(a, s, bigW, ocol, 'source-over', C.x, C.y);
        drawStrokeAs(b, s, (s.size||1), '#000', 'source-over', C.x, C.y);
      });
    }

    a.globalCompositeOperation='destination-out';
    a.drawImage(ocB,0,0);
        a.globalCompositeOperation='source-over';
    try{ ocB.width=0; }catch(_){}
    ctx.drawImage(ocA,0,0);
    try{ ocA.width=0; }catch(_){}

  }

  var layerAnglesOpt = (opts && opts.layerAngles) || null;

  function layerAnchorPx(layer){
    for(var j=0;j<(layer.strokes||[]).length;j++){
      var s = layer.strokes[j];
      if(s.centersUV && s.centersUV.length){
        return { x: mapU(s.centersUV[0].u), y: mapV(s.centersUV[0].v) };
      }
    }
    return { x: mapU(0.5), y: mapV(0.5) };
  }

  var w = canW, h = canH;
  for(var i=0;i<(doc.layers||[]).length;i++){
    var L = doc.layers[i]; if(!L || !L.visible) continue;
    var ang = layerAnglesOpt ? (layerAnglesOpt[i]||0) : (L.rotAngle||0);

    var A = layerAnchorPx(L);
    ctx.save(); ctx.translate(A.x, A.y); if(ang) ctx.rotate(ang); ctx.translate(-A.x, -A.y);
    var union = !!L.outlineUnion;
    if(union) drawLayerUnionOutlineInline(ctx, L, w, h);
    for(var k=0;k<(L.strokes||[]).length;k++) drawStroke(ctx, L.strokes[k], union);
    ctx.restore();
  }
  return canvas;
}

  /* === Ayudas de exportación reutilizables (fuera del estudio) === */
function base64ToUint8(b64){ var bin=atob(b64), len=bin.length, u8=new Uint8Array(len); for(var i=0;i<len;i++) u8[i]=bin.charCodeAt(i); return u8; }
function makePDF_MultiJPEG(pageW, pageH, pages){
  function str2buf(s){ var u=new Uint8Array(s.length); for(var i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; }
  function concat(arrs){ var len=0,i; for(i=0;i<arrs.length;i++) len+=arrs[i].length; var out=new Uint8Array(len), off=0; for(i=0;i<arrs.length;i++){ out.set(arrs[i],off); off+=arrs[i].length; } return out; }
  function objHeader(n){ return str2buf(n+' 0 obj\n'); }
  var parts=[], xref=[0], nextId=1; function offset(){ var l=0,i; for(i=0;i<parts.length;i++) l+=parts[i].length; return l; }
  function push(p){ parts.push(p); }
  function addObj(n, c){ xref[n]=offset(); push(objHeader(n)); push(c); push(str2buf('\nendobj\n')); }
  var catalogId=nextId++, pagesId=nextId++, kidIds=[];
  pages.forEach(function(pg){
    var imgId=nextId++; var head='<< /Type /XObject /Subtype /Image /Width '+pg.pxW+' /Height '+pg.pxH+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+pg.imgBytes.length+' >>\nstream\n';
    push(objHeader(imgId)); push(str2buf(head)); push(pg.imgBytes); push(str2buf('\nendstream\nendobj\n'));
    var stream='q\n'+pg.iw+' 0 0 '+pg.ih+' '+pg.ix+' '+pg.iy+' cm\n/Im0 Do\nQ';
    var sb=str2buf(stream); var contId=nextId++; addObj(contId, str2buf('<< /Length '+sb.length+' >>\nstream\n'+stream+'\nendstream'));
    var pageId=nextId++; kidIds.push(pageId);
    addObj(pageId, str2buf('<< /Type /Page /Parent '+pagesId+' 0 R /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /XObject << /Im0 '+imgId+' 0 R >> /ProcSet [/PDF /ImageC] >> /Contents '+contId+' 0 R >>'));
  });
  addObj(pagesId, str2buf('<< /Type /Pages /Count '+kidIds.length+' /Kids ['+kidIds.map(function(id){return id+' 0 R';}).join(' ')+'] >>'));
  addObj(catalogId, str2buf('<< /Type /Catalog /Pages '+pagesId+' 0 R >>'));
  var header=str2buf('%PDF-1.4\n%âãÏÓ\n'); var xrefStart=offset()+header.length; var nObjs=nextId-1;
  var xrefStr='xref\n0 '+(nObjs+1)+'\n0000000000 65535 f \n';
  for(var i=1;i<=nObjs;i++){ var offStr=('0000000000'+( ( (parts.slice(0,i).reduce(function(a,b){return a+b.length;},0)) + header.length) )).slice(-10); xrefStr+=offStr+' 00000 n \n'; }
  var trailer='trailer << /Size '+(nObjs+1)+' /Root '+catalogId+' 0 R >>\nstartxref\n'+xrefStart+'\n%%EOF';
  return concat([header].concat(parts).concat([str2buf(xrefStr+trailer)]));
}

     /* ===== API pública para módulos externos ===== */
  window.MandalaAppAPI = {
    $: $,
    $$: $$,
    el: el,
    on: on,
    clamp: clamp,
    fmt: fmt,
    uid: uid,
    t: t,
    tData: tData,
    toast: toast,
    modal: modal,
    slugify: slugify,
    smartDownloadName: smartDownloadName,
    clone: clone,
    calcCanvasSquare: calcCanvasSquare,
    renderDocToCanvas: renderDocToCanvas,
    base64ToUint8: base64ToUint8,
    makePDF_MultiJPEG: makePDF_MultiJPEG,
    loadState: load,
    saveState: save,
    getState: function(){ return state; },
      replaceState: function(next){
      state = mergeStateWithDefaults(next || {});
      try{ document.body.classList.toggle('panels-glow', !!(state && state.ui && state.ui.panelGlow)); }catch(_){ }
      try{
        var lang = __i18nNormalizeLang((state && state.lang) || 'es');
        var i18nApi = __i18nGetManager();
        if(i18nApi && typeof i18nApi.setLang === 'function') i18nApi.setLang(lang);
        __i18nSyncCache(lang);
        document.documentElement.setAttribute('lang', lang);
        if(typeof applyI18NNow === 'function') applyI18NNow();
      }catch(_){ }
      return state;
    },
    deleteStorageKey: function(){ SafeLS.del(KEY); },
    setTheme: setTheme,
    applySkin: applySkin,
    resolveRoute: function(){ if(router && typeof router.resolve === 'function') router.resolve(); },
    navigate: function(path){ location.hash = path; }
  };
/* ===== Router bootstrap ===== */
var router = null;

(function initRouterModule(){
  if(!window.MandalaRouter || typeof window.MandalaRouter.createApp !== 'function'){
    console.warn('No se pudo cargar router.js');
    return;
  }

  router = window.MandalaRouter.createApp({
    app: $('#app'),
    el: el,
    t: t,
    toast: toast,
    on: on,
    api: window.MandalaAppAPI,
    createCrearView: MandalaStudio
  });
})();
 // ===== I18N para header + menús estáticos (nav, ajustes, paneles) =====
(function(){
  function applyHeaderTranslations(){
    try{
      // --- Nav principal ---
      var navRoot = document.querySelector('.nav') || document;
      var linkCanvas  = navRoot.querySelector('[data-link][href="#/crear"]');
      var linkStudio  = navRoot.querySelector('[data-link][href="#/studio"]');
      var linkGallery = navRoot.querySelector('[data-link][href="#/galeria"], [data-link][href="#/gallery"]');

      if(linkCanvas)  linkCanvas.textContent  = t('Lienzo');
      if(linkStudio)  linkStudio.textContent  = t('Studio');
      if(linkGallery) linkGallery.textContent = t('Galería');
// Botón del header de Studio (+Importar)
      var btnImp = document.getElementById('studioImportBtn');
      if(btnImp) btnImp.textContent = t('+Importar');
      // --- Desplegable Ajustes ---
      var menu = document.getElementById('settingsMenu');
      if(menu){
        var itThemes = menu.querySelector('.item[data-action="themes"]');
        var itGlow   = menu.querySelector('.item[data-action="panelGlow"]');
        var itReset  = menu.querySelector('.item[data-action="resetPanels"]');
        var itInst   = menu.querySelector('.item[data-action="install"]');
        var itLang   = menu.querySelector('.item[data-action="language"]');

        if(itThemes) itThemes.textContent = t('Temas');
        if(itReset)  itReset.textContent  = t('Restaurar paneles');
        if(itInst)   itInst.textContent   = t('Instalar');
        if(itLang)   itLang.textContent   = t('Idioma');

        // "Esquinas: ON/OFF" (respetando el span con id)
                if(itGlow){
          var on = document.body.classList.contains('panels-glow');
          // traducimos ON/OFF con el diccionario
          var onTxt = on ? t('ON') : t('OFF');
          itGlow.innerHTML = t('Esquinas') + ': <span id="panelGlowState">' + onTxt + '</span>';
        }

      }
          // Enlace "Licencia MIT" (se traduce al vuelo sin depender del diccionario t())
      (function(){
        var licLink = document.getElementById('licenseLink');
        if(!licLink) return;
        licLink.textContent = t('Licencia MIT');
      })();

      // 🆕 Botón "Política de privacidad" (usa t())
      (function(){
        var privacyLink = document.getElementById('privacyLink');
        if(!privacyLink) return;
        // Clave ya usada en tu overlay: t('Política de privacidad')
        privacyLink.textContent = t('Política de privacidad');
      })();


      // --- Desplegable "Paneles" (header en Lienzo) ---
      var pmenu = document.getElementById('panelsMenu');
      if(pmenu){
        // intenta localizar label[for=...] (lo más estándar)
        var lf = pmenu.querySelector('label[for="chkPanelFile"]');
        var la = pmenu.querySelector('label[for="chkPanelAdvanced"]');
        var lb = pmenu.querySelector('label[for="chkPanelBrush"]');
        if(lf) lf.textContent = t('Archivo');
        if(la) la.textContent = t('Contorno + Simetría');
        if(lb) lb.textContent = t('Pincel');
      }
    // Traduce textos del panel Archivo (si ya está montado)
      applyFilePanelTranslations();
    }catch(_){}
  }
  // Traducción dinámica del panel "Archivo" (Lienzo)
  function applyFilePanelTranslations(){
    try{
      if(!PF || !PF.body) return;
      var scope = PF.body;

      // Etiqueta: "Nombre del lienzo"
      var lblName = scope.querySelector('label[for="canvasName"], label.canvas-name');
      if(lblName) lblName.textContent = t('Nombre del lienzo');

      // Etiqueta: "Formato de exportación"
      var lblFmt = scope.querySelector('label[for="exportFormat"], label.export-format');
      if(lblFmt) lblFmt.textContent = t('Formato de exportación');

      // Botones: Exportar, Guardar, Nuevo lienzo
      var bExport = scope.querySelector('#btnExport, button.export');
      if(bExport) bExport.textContent = t('Exportar');

      var bSave   = scope.querySelector('#btnSave, button.save');
      if(bSave) bSave.textContent = t('Guardar');

      var bNew    = scope.querySelector('#btnNewCanvas, button.new-canvas');
      if(bNew) bNew.textContent = t('Nuevo lienzo');
    }catch(_){}
  }

  // disponible global por si quieres llamarlo tú
  window.applyHeaderTranslations = applyHeaderTranslations;

  // al cargar y al cambiar la ruta
  document.addEventListener('DOMContentLoaded', applyHeaderTranslations);
  window.addEventListener('hashchange', function(){ setTimeout(applyHeaderTranslations,0); });
  // 🔁 Auto‑refresh al cambiar de idioma (sin cambiar de sección ni reabrir menús)
  (function installI18NAutoRefresh(){
    // Idioma corriente (curLang() si existe; si no, <html lang="">; si no, 'es')
    var lastLang = (typeof curLang === 'function'
      ? curLang()
      : (document.documentElement.getAttribute('lang') || 'es'));

    function refreshAll(){
      try{ applyHeaderTranslations(); }catch(_){}
      // Refresca solo el texto ON/OFF si existiese el span en el DOM abierto
      try{
        var sp = document.getElementById('panelGlowState');
        if(sp){
          var on = document.body.classList.contains('panels-glow');
          sp.textContent = on ? t('ON') : t('OFF');
        }
      }catch(_){}
    }

    // 1) Observa cambios en <html lang="..."> (muchas implementaciones de idioma lo tocan)
    try{
      var mo = new MutationObserver(function(muts){
        for(var i=0;i<muts.length;i++){
          var m = muts[i];
          if(m.type==='attributes' && m.attributeName==='lang'){
            lastLang = document.documentElement.getAttribute('lang') || lastLang;
            refreshAll();
            break;
          }
        }
      });
      mo.observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
    }catch(_){}

    // 2) Poll de respaldo por si el cambio de idioma NO toca <html lang> (usa curLang() si existe)
    try{
      setInterval(function(){
        var now = (typeof curLang === 'function'
          ? curLang()
          : (document.documentElement.getAttribute('lang') || 'es'));
        if(now !== lastLang){
          lastLang = now;
          refreshAll();
        }
      }, 500);
    }catch(_){}

    // 3) Cuando se pulse el ajuste de "Esquinas", actualiza el texto inmediatamente
    document.addEventListener('click', function(ev){
      var it = ev.target && ev.target.closest && ev.target.closest('#settingsMenu .item[data-action="panelGlow"]');
      if(!it) return;
      // Deja que el handler que alterna la clase corra primero
      setTimeout(refreshAll, 0);
    });

    // 4) Helper global opcional (por si en otro sitio quieres forzar la actualización del chip)
    window.refreshPanelGlowStateText = function(){
      try{
        var sp = document.getElementById('panelGlowState');
        if(!sp) return;
        var on = document.body.classList.contains('panels-glow');
        sp.textContent = on ? t('ON') : t('OFF');
      }catch(_){}
    };
  })();

  // asegura refresco cuando Router resuelve (por cambios de idioma sin cambiar hash)
  if(window.Router && Router.prototype && typeof Router.prototype.resolve === 'function'){
    try{
      var _old = Router.prototype.resolve;
      Router.prototype.resolve = function(){
        var r = _old.apply(this, arguments);
        try{ applyHeaderTranslations(); }catch(_){}
        return r;
      };
    }catch(_){}
  }
})();


   /* ===== SW (https o localhost, sin HEAD) ===== */
  (function registerServiceWorker(){
    var isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var canUseSW = ('serviceWorker' in navigator) &&
      (location.protocol === 'https:' || isLocalhost);

    if(!canUseSW) return;

    var swUrl = './sw.js';
    var hadController = !!navigator.serviceWorker.controller;
    var refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', function(){
      // Recarga solo en actualizaciones, no en la primera instalación
      if(!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    function wireRegistration(reg){
      if(!reg) return;

      // Si ya hay una nueva versión esperando, actívala
      if(reg.waiting && hadController){
        try{ reg.waiting.postMessage({ type:'SKIP_WAITING' }); }catch(_){}
      }

      reg.addEventListener('updatefound', function(){
        var installing = reg.installing;
        if(!installing) return;

        installing.addEventListener('statechange', function(){
          // Nueva versión instalada mientras la app estaba abierta
          if(installing.state === 'installed' && hadController){
            try{
              if(reg.waiting) reg.waiting.postMessage({ type:'SKIP_WAITING' });
            }catch(_){}
          }
        });
      });

      // Pide comprobación de actualización al registrar
      try{ reg.update(); }catch(_){}
    }

    window.addEventListener('load', function(){
      navigator.serviceWorker
        .register(swUrl, { scope:'./' })
        .then(function(reg){
          wireRegistration(reg);
        })
        ["catch"](function(err){
          console.warn('SW registration failed:', err);
        });
    });
  })();

  /* ===== MIT & Privacidad ===== */
(function MIT_and_Privacy(){
  function licenseTextI18N(author, year){
    return tData('license.body', { author: author, year: year }) || '';
  }
  function privacyHTML(){
    var updated=(new Date()).toISOString().slice(0,10);
    var bullets = [
      t('Se ejecuta 100% en tu navegador. No subimos datos.'),
      t('Galería y ajustes se guardan en LocalStorage.'),
      t('Puedes borrar todo en Ajustes.'),
      t('Sin cookies de seguimiento.')
    ];
    return ''+
      '<p><b>'+APP_NAME+' · OptimeFlow(s)</b> '+t('app_claim')+'</p>'+
      '<ul>'+bullets.map(function(li){ return '<li>'+li+'</li>'; }).join('')+'</ul>'+
      '<p><b>'+t('Autor')+':</b> '+AUTHOR_NAME+'.<br/>'+t('Última actualización')+': '+updated+'.</p>';
  }

  var licenseLink=$('#licenseLink'),
      privacyLink=$('#privacyLink'),
      licOv=$('#licenseOverlay'),
      ppOv=$('#privacyOverlay'),
      licBody=$('#licenseBody'),
      btnCloseLic=$('#btnCloseLicense'),
      btnCopyLic=$('#btnCopyLicense'),
      btnClosePP=$('#btnClosePrivacy');

  function open(el){ if(el) el.style.display='flex'; }
  function close(el){ if(el) el.style.display='none'; }

  on(licenseLink,'click',function(){
    var y=new Date().getFullYear();
    if(licBody) licBody.textContent=licenseTextI18N(AUTHOR_NAME, y);
    var h = $('#licenseTitle'); if(h) h.textContent = t('Licencia MIT');
    var copy = $('#btnCopyLicense'); if(copy) copy.textContent = t('Copiar');
    var closeBtn = $('#btnCloseLicense'); if(closeBtn) closeBtn.textContent = t('Cerrar');
    open(licOv);
  });

  on(btnCloseLic,'click',function(){ close(licOv); });
  on(licOv,'click',function(e){ if(e.target.id==='licenseOverlay') close(licOv); });

  on(btnCopyLic,'click',function(){
    try{
      navigator.clipboard.writeText(licBody.textContent||'')
        .then(function(){ toast('Copiado'); })
        .catch(function(){ toast('No se pudo copiar'); });
    }catch(e){ toast('No se pudo copiar'); }
  });

  on(privacyLink,'click',function(){
    var h = $('#privacyTitle'); if(h) h.textContent = t('Política de privacidad');
    var body = $('#ppBody'); if(body) body.innerHTML = privacyHTML();
    var closeBtn = $('#btnClosePrivacy'); if(closeBtn) closeBtn.textContent = t('Cerrar');
    open(ppOv);
  });

  on(btnClosePP,'click',function(){ close(ppOv); });
  on(ppOv,'click',function(e){ if(e.target.id==='privacyOverlay') close(ppOv); });
})();

window.trUI = function(key){ return t(key); };

/* ==================== Coherencia Universal ==================== */
(function(){
  function setCoherenciaText(){
    var el = document.getElementById('coherenciaBody');
    if(el) el.innerHTML = tData('coherence.body') || '';
  }
  function setCoherenciaTitle(){
    var h = document.getElementById('coherenciaTitle');
    if(h) h.textContent = tData('coherence.title') || t('Coherencia Universal');
  }
  function refreshCoherencia(){
    setCoherenciaText();
    setCoherenciaTitle();
  }

  document.addEventListener('DOMContentLoaded', refreshCoherencia);
  try{
    window.addEventListener('i18n:changed', refreshCoherencia);
  }catch(_){ }
  new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      if(muts[i].attributeName === 'lang'){
        refreshCoherencia();
        break;
      }
    }
  }).observe(document.documentElement, { attributes:true, attributeFilter:['lang']});
})();

})();
