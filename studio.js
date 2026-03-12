/* Mand△L@s — módulo Studio */
(function(){
  'use strict';

  function fallbackView(message){
    var wrap = document.createElement('section');
    wrap.className = 'card';
    var h2 = document.createElement('h2');
    h2.textContent = 'Studio';
    var p = document.createElement('p');
    p.textContent = message || 'No se pudo cargar studio.js';
    wrap.appendChild(h2);
    wrap.appendChild(p);
    return wrap;
  }

  function createView(api){
    api = api || window.MandalaAppAPI || null;
    if(!api || typeof api.el !== 'function' || typeof api.getState !== 'function'){
      return fallbackView('No se pudo inicializar studio.js');
    }

    var $ = api.$;
    var $$ = api.$$;
    var el = api.el;
    var on = api.on;
    var clamp = api.clamp;
    var fmt = api.fmt;
    var uid = api.uid;
    var t = api.t || function(key){ return key; };
    var tData = api.tData || function(){ return ''; };
    var toast = api.toast;
    var modal = api.modal;
    var slugify = api.slugify;
    var smartDownloadName = api.smartDownloadName;
    var clone = api.clone;
    var calcCanvasSquare = api.calcCanvasSquare;
    var renderDocToCanvas = api.renderDocToCanvas;
    var base64ToUint8 = api.base64ToUint8;
    var makePDF_MultiJPEG = api.makePDF_MultiJPEG;
    var state = api.getState();

    function load(){
      var next = (api.loadState ? api.loadState() : state);
      if(api.replaceState) api.replaceState(next);
      state = api.getState ? api.getState() : next;
      return state;
    }
    function save(){
      if(api.saveState) api.saveState();
      state = api.getState ? api.getState() : state;
    }

function StudioView(){
  // Contenedor base (sin título, sin toolbar, sin tip => cero scroll)
  var wrap = el('section',{className:'card'});

  // Workspace + Stage a pantalla completa (el stage es el “recuadro amarillo”)
  var workspace = el('div',{className:'workspace'});
  workspace.style.alignItems = 'stretch';         // el stage ocupa todo el alto
  var stage = el('div',{className:'canvas-stage'});
stage.style.position = 'relative'; // necesario para posicionar el visor a tope

  stage.style.width = '100%';
  stage.style.height = '100%';
  stage.style.outline = '1px dashed rgba(255,255,255,0.14)';

  var visor = el('canvas',{id:'studioVisor'});
    // Ángulos locales para Studio (no muta L.rotAngle en el doc)
  var studioAngles = null;

  stage.append(visor);


// HUD Animación (siempre visible, arriba-dcha; no reduce el lienzo)
var hud = el('div',{id:'studioHud', className:'studio-hud'});
hud.append(
  el('h4',{}, t('Animación')),
  (function(){
    var field = el('div',{className:'field'});
    field.append(el('label',{}, t('Velocidad global')));
    var val = (state.studio && state.studio.speedFactor) || 1;
    var rng = el('input',{type:'range', min:'0.2', max:'3', step:'0.05', value:String(val)});
    var out = el('output',{}, val.toFixed(2)+'×');
    var line= el('div',{className:'slider-line'},[rng,out]);
    field.append(line);
    on(rng,'input', function(e){
      var v = clamp(parseFloat(e.target.value||'1'), 0.2, 3);
      out.textContent = v.toFixed(2)+'×';
      state.studio = state.studio || {};
      state.studio.speedFactor = v; save();
    });

   /* 👇👇👇 CONTROLES DE ANIMACIÓN: ⏹ ⏸ ▶ 🎵 (Studio) 👇👇👇 */
var studioAudio = new Audio(); studioAudio.preload = 'auto';
try{ window.__studioAudio = studioAudio; }catch(_){}
var inpAud = el('input',{type:'file', accept:'audio/*', style:'display:none'});


var btnStop  = el('button',{className:'btn small ghost square',   title:t('Parar')},       '⏹');
var btnPause = el('button',{className:'btn small ghost square',   title:t('Pausar')},      '⏸');
var btnPlay  = el('button',{className:'btn small success square', title:t('Reproducir')},  '▶');
var btnAudio = el('button',{className:'btn small ghost square',   title:t('Importar audio')}, '🎵');


var rowCtl   = el('div',{className:'row', style:'margin-top:8px; gap:8px; justify-content:flex-start'},[btnStop, btnPause, btnPlay, btnAudio, inpAud]);

field.append(rowCtl);

on(btnPlay,'click', function(){
  state.studio = state.studio || {};
  state.studio.paused = false; save();
  start();
  try{ if(studioAudio.src) studioAudio.play(); }catch(_){}
});
on(btnPause,'click', function(){
  state.studio = state.studio || {};
  state.studio.paused = true; save();
  stop();
  try{ if(studioAudio.src) studioAudio.pause(); }catch(_){}
});
on(btnStop,'click', function(){
  state.studio = state.studio || {};
  state.studio.paused = true; save();
  stop();
  // resetea ángulos locales (Studio usa studioAngles)
  var d = currentDoc();
  studioAngles = (d && d.layers) ? d.layers.map(function(){ return 0; }) : null;
  drawOnce();
  try{
    if(studioAudio.src){ studioAudio.pause(); studioAudio.currentTime = 0; }
  }catch(_){}
});
on(btnAudio,'click', function(){ inpAud.click(); });
on(inpAud,'change', function(e){
  var f = e.target.files && e.target.files[0]; if(!f) return;
  try{ if(studioAudio.src) URL.revokeObjectURL(studioAudio.src); }catch(_){}
  studioAudio.src = URL.createObjectURL(f);
  toast('Audio cargado: '+(f.name||'audio'));
});
/* ☝️☝️☝️ FIN CONTROLES DE ANIMACIÓN (Studio) ☝️☝️☝️ */
// === Panel: Fondo (debajo de “Animación”) ===
state.studio = state.studio || {};
state.studio.bg = state.studio.bg || {
  mode: 'solid',
  color: (state.settings && state.settings.background) || '#ffffff',
  alpha: 1
};

var bgField = el('div',{className:'field', style:'margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,.14)'});
bgField.append(el('label',{}, t('Fondo')));

var row1 = el('div',{className:'row', style:'gap:8px; align-items:center; flex-wrap:wrap'});

// Color
var inpBgColor = el('input',{id:'studioBgColor', type:'color', className:'color-full', value: state.studio.bg.color});

// Alpha
var alphaWrap = el('div',{className:'field', style:'min-width:220px'});
alphaWrap.append(el('label',{}, t('Alpha')));
var rngAlpha = el('input',{type:'range', min:'0', max:'1', step:'0.01', value:String(state.studio.bg.alpha)});
var outAlpha = el('output',{}, String(state.studio.bg.alpha));
alphaWrap.append(el('div',{className:'slider-line'},[rngAlpha, outAlpha]));

// Efecto
var selEffect = el('select',{id:'studioBgEffect'});
[
  ['solid',  'Color sólido'],
  ['tornado','Tornado multicolor'],
  ['space',  'Espacio sideral'],
  ['water',  'Flujo de agua'],
  ['snow',   'Noche nevando'],
  ['beach',  'Sol, playa y felicidad'],
  ['aurora', 'Aurora boreal (extra)']
].forEach(function(p){ selEffect.append(el('option',{value:p[0]}, t(p[1]))); });
selEffect.value = state.studio.bg.mode;

row1.append(
  el('div',{className:'field'},[ el('label',{}, t('Color')), inpBgColor ]),
  alphaWrap,
  el('div',{className:'field'},[ el('label',{}, t('Efecto')), selEffect ])
);

bgField.append(row1);
field.append(bgField); // ⬅️ se añade dentro del mismo panel padre de “Animación”

// Eventos
on(inpBgColor,'input', function(e){
  state.studio.bg.color = e.target.value;
  save(); drawOnce();
});
on(rngAlpha,'input', function(e){
  var v = clamp(parseFloat(e.target.value||'1'), 0, 1);
  state.studio.bg.alpha = v; outAlpha.textContent = String(v);
  save(); drawOnce();
});
on(selEffect,'change', function(e){
  state.studio.bg.mode = e.target.value;
  save(); drawOnce();
});


// —— Panel de Exportación (pegado debajo del de Animación)
var expField = el('div',{className:'field', style:'margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,.14)'});
expField.append(el('label',{}, t('Exportar visor (Studio)')));

var selFmt = el('select',{id:'studioExportFmt', style:'flex:0 0 180px; max-width:180px'});

[
  ['png-hi',   'PNG (alta calidad)'],
  ['pdf-a3',   'PDF A3'],
  ['pdf-a4',   'PDF A4'],
  ['pdf-a5',   'PDF A5'],
  ['pdf-kindle','PDF Kindle'],
  ['video-20s','Vídeo 20 s (Studio)']
].forEach(function(p){ selFmt.append(el('option',{value:p[0]}, t(p[1]))); });

var btnGo = el('button',{className:'btn small'}, t('Exportar'));

var rowExp = el('div',{className:'row', style:'gap:8px; align-items:center'}, [selFmt, btnGo]);
expField.append(rowExp);
field.append(expField);

on(btnGo,'click', function(){
  var nm = (state.currentName||'mandala');
  var v  = selFmt.value;
  if(v==='png-hi')      exportStudioPNGHigh(nm);
  else if(v==='pdf-a3') exportStudioPDF('A3', nm);
  else if(v==='pdf-a4') exportStudioPDF('A4', nm);
  else if(v==='pdf-a5') exportStudioPDF('A5', nm);
  else if(v==='pdf-kindle') exportStudioPDF('6x9', nm);
  else if(v==='video-20s') exportStudioVideo20s(nm);
});


    return field;
  })()
);

workspace.append(hud);
// 🆕 Botones de header para controlar el HUD de Studio (solo en /studio)
function applyStudioHudVisibility(){
  var hudEl = $('#studioHud');
  if(!hudEl) return;
  var hidden = !!(state.ui && state.ui.studioHudHidden);
  hudEl.style.display = hidden ? 'none' : '';
  var btn = $('#studioHudToggleBtn');
  if(btn){
    btn.textContent = hidden ? '👁' : '🙈';
    btn.setAttribute('title', hidden ? t('Mostrar panel') : t('Ocultar panel'));
    btn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
  }
}

function resetStudioHudPosition(showToast){
  try{
    var hudEl = $('#studioHud'); if(!hudEl) return;
    // Posición “por defecto” arriba‑derecha del viewport
    var header = $('#siteHeader'), hh = header ? header.offsetHeight : 0;
    hudEl.style.position = 'fixed';
    hudEl.style.right = '12px';
    hudEl.style.top = (hh + 10) + 'px';
    hudEl.style.left = '';
    hudEl.style.bottom = '';
    // Al restaurar, olvidamos la posición personalizada
try { state.ui = state.ui || {}; delete state.ui.studioHudPos; save(); } catch(_){}

    if(showToast) toast( t('Panel restaurado') );
  }catch(_){}
}
// Aplica la posición almacenada (si existe); si no, usa la por defecto
function applyStudioHudPositionFromState(){
  try{
    var hudEl = $('#studioHud'); if(!hudEl) return;
    var pos = (state.ui && state.ui.studioHudPos) || null;
    if(pos && typeof pos.left==='number' && typeof pos.top==='number'){
      hudEl.style.position = 'fixed';
      hudEl.style.left  = Math.round(pos.left) + 'px';
      hudEl.style.top   = Math.round(pos.top) + 'px';
      hudEl.style.right = '';
      hudEl.style.bottom= '';
    }else{
      resetStudioHudPosition(false);
    }
  }catch(_){}
}

// Hace el HUD arrastrable (asidero: el <h4> del panel)
function enableStudioHudDrag(){
  try{
    var hudEl = $('#studioHud'); if(!hudEl) return;
    var handle = hudEl.querySelector('h4') || hudEl;
    handle.style.cursor = 'move';

    var dragging = false, sx=0, sy=0, start={left:0, top:0};

    on(handle, 'pointerdown', function(e){
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      var r = hudEl.getBoundingClientRect();
      start.left = r.left; start.top = r.top;
      handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    on(window, 'pointermove', function(e){
      if(!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      var nx = start.left + dx, ny = start.top + dy;

      // Clamp dentro del viewport y bajo el header
      var header = $('#siteHeader'), footer = $('#siteFooter');
      var hh = header ? header.offsetHeight : 0;
      var fh = footer ? footer.offsetHeight : 0;
      var pad = 8;

      nx = clamp(nx, pad, Math.max(pad, window.innerWidth  - hudEl.offsetWidth  - pad));
      ny = clamp(ny, hh+8, Math.max(hh+8, window.innerHeight - hudEl.offsetHeight - fh));

      hudEl.style.position = 'fixed';
      hudEl.style.left = Math.round(nx) + 'px';
      hudEl.style.top  = Math.round(ny) + 'px';
      hudEl.style.right = '';
      hudEl.style.bottom= '';
    });

    on(window, 'pointerup', function(){
      if(!dragging) return;
      dragging = false;
      try{
        var r = hudEl.getBoundingClientRect();
        state.ui = state.ui || {};
        state.ui.studioHudPos = { left: Math.round(r.left), top: Math.round(r.top) };
        save();
      }catch(_){}
    });
  }catch(_){}
}


function removeStudioHeaderButtons(){
  var a = $('#studioHudToggleBtn'); if(a && a.parentNode) a.parentNode.removeChild(a);
  var b = $('#studioHudResetBtn');  if(b && b.parentNode) b.parentNode.removeChild(b);
}

function installStudioHeaderButtons(){
  var anchor = $('#studioImportBtn'); if(!anchor) return;
  // Limpieza preventiva por si volvemos a montar
  removeStudioHeaderButtons();

  var eye = el('button',{
    id:'studioHudToggleBtn',
    className:'btn small ghost square',
    title: (state.ui && state.ui.studioHudHidden) ? t('Mostrar panel') : t('Ocultar panel')
  }, (state.ui && state.ui.studioHudHidden) ? '👁' : '🙈');

  var rst = el('button',{
    id:'studioHudResetBtn',
    className:'btn small ghost square',
    title: t('Restaurar panel')
  }, '↺');

  // Inserta los dos botones inmediatamente a la derecha de +Importar
  anchor.insertAdjacentElement('afterend', rst);
  anchor.insertAdjacentElement('afterend', eye);

  on(eye,'click', function(){
    state.ui = state.ui || {};
    state.ui.studioHudHidden = !state.ui.studioHudHidden;
    save();
    applyStudioHudVisibility();
  });
  on(rst,'click', function(){ resetStudioHudPosition(true); });
}

// Montaje inicial del HUD de Studio (flotante y arrastrable)
installStudioHeaderButtons();
applyStudioHudVisibility();
applyStudioHudPositionFromState(); // usa guardada o la por defecto
enableStudioHudDrag();
on(window,'resize', applyStudioHudPositionFromState); // mantiene posición tras resize


// === Panel “Mandálas importadas (Mover)” ===
var movePanel = el('div',{className:'field', style:'margin-top:10px;'});
movePanel.append(el('label',{}, t('Mandálas importadas (Mover)')));

var moveList = el('div',{id:'studioMoveList'});
movePanel.append(moveList);
hud.append(movePanel);

// Estado y helpers para mover
var movingGroupId = null, movingDrag = false, movingStartUVDoc=null, movingSnapshot=null;


function removeGroup(gid){
  var doc = currentDoc();
  if(!doc || !doc.layers) return;
  doc.layers = doc.layers.filter(function(L){ return L.groupId !== gid; });
  if(movingGroupId === gid) movingGroupId = null;
  save();
  rebuildMoveList();
  drawOnce();
}

function rebuildMoveList(){
  var doc = currentDoc(), seen={}, groups=[];
  (doc.layers||[]).forEach(function(L){
    if(!L.groupId) return;
    if(!seen[L.groupId]){ seen[L.groupId]=true; groups.push({id:L.groupId, name:L.groupName||'Mandala'}); }
  });
  moveList.innerHTML='';
  groups.forEach(function(g){
   var row = el('div',{className:'check-row', style:'display:grid; grid-template-columns:auto auto 1fr; gap:8px; align-items:center;'});


    var ch  = el('input',{type:'checkbox', checked:(movingGroupId===g.id), style:'width:auto'});
    var sp  = el('span',{}, g.name+' — '+t('mover'));
    var del = el('button',{className:'btn small ghost square', title:t('Eliminar este grupo')}, '🗑');


    on(ch,'change', function(e){
      movingGroupId = e.target.checked ? g.id : null;
      // desmarca el resto
      $$('#studioMoveList input[type="checkbox"]').forEach(function(n){ if(n!==ch) n.checked=false; });
    });
    on(del,'click', function(){ removeGroup(g.id); });

    row.append(del, ch, sp);

    moveList.append(row);
  });
}

rebuildMoveList();

// Coord. normalizadas (u,v) relativas al cuadrado dibujado dentro del visor 2:1
function squareRectForStudio(sz){
  // cuadrado máximo, CENTRADO dentro del visor
  var side = Math.min(sz.w, sz.h);
  var padX = Math.floor((sz.w - side)/2);
  var padY = Math.floor((sz.h - side)/2);
  return { x: padX, y: padY, size: side };
}

function uvFromEvent(e){
  var r = visor.getBoundingClientRect();
  var sz = sizeForStudioRect();
  var sq = squareRectForStudio(sz);
  var x = (e.clientX - r.left) - sq.x;
  var y = (e.clientY - r.top)  - sq.y;
  // 🔁 Sin clamp: devolvemos coords normalizadas respecto al cuadrado,
  // pudiendo ser <0 o >1 si arrastras fuera. Así el drag funciona por TODO el rectángulo.
  var u = x/Math.max(1, sq.size);
  var v = y/Math.max(1, sq.size);
  return { u:u, v:v };
}


function getGroupAnchorUV(gid){
  var doc=currentDoc();
  for(var i=0;i<doc.layers.length;i++){
    var L=doc.layers[i]; if(L.groupId!==gid) continue;
    for(var j=0;j<(L.strokes||[]).length;j++){
      var s=L.strokes[j];
      if(s.centersUV && s.centersUV.length){ return {u:s.centersUV[0].u, v:s.centersUV[0].v}; }
    }
  }
  return {u:0.5, v:0.5};
}
function moveGroupToUV(gid, uv){
  var doc=currentDoc();
  for(var i=0;i<doc.layers.length;i++){
    var L=doc.layers[i]; if(L.groupId!==gid) continue;
    for(var j=0;j<(L.strokes||[]).length;j++){
      var s=L.strokes[j];
      s.centersUV = [{u:clamp(uv.u,0,1), v:clamp(uv.v,0,1)}];
    }
  }
  save();
}

// Drag para mover
// ——— Snapshot + translate del GRUPO (mover por TODA el área)
function snapshotGroup(gid){
  var doc = currentDoc(), out = [];
  for (var i=0;i<doc.layers.length;i++){
    var L = doc.layers[i]; if(L.groupId!==gid) continue;
    for (var j=0;j<(L.strokes||[]).length;j++){
      var s = L.strokes[j];
      out.push({
        layerIndex: i,
        strokeIndex: j,
        points: (s.points||[]).map(function(p){ return {u:p.u, v:p.v}; }),
        centers: (s.centersUV||[{u:0.5,v:0.5}]).map(function(c){ return {u:c.u, v:c.v}; })
      });
    }
  }
  return out;
}

function translateGroupUsingSnapshot(gid, snap, du, dv){
  var doc = currentDoc();
  for (var k=0;k<snap.length;k++){
    var rec = snap[k];
    var L = doc.layers[rec.layerIndex]; if(!L) continue;
    var s = (L.strokes||[])[rec.strokeIndex]; if(!s) continue;

    // Traslada PUNTOS (mueve realmente la mandala)
    s.points = rec.points.map(function(p){ return {u: p.u + du, v: p.v + dv}; });

    // Acompaña el/los centro(s) para que el pivote siga al grupo
    s.centersUV = rec.centers.map(function(c){ return {u: c.u + du, v: c.v + dv}; });
  }
}

function onMoveDown(e){
  if(waitingImport || !movingGroupId) return;
  movingDrag = true;
  // punto de partida (coords del documento, sin clamp)
  movingStartUVDoc = uvFromEvent(e);
  // snapshot de todos los trazos del grupo (puntos + centros)
  movingSnapshot   = snapshotGroup(movingGroupId);
  e.preventDefault();
}

function onMoveMove(e){
  if(!movingDrag || !movingGroupId) return;
  var now = uvFromEvent(e);
  // delta en unidades del documento (respecto al cuadrado base)
  var du = now.u - movingStartUVDoc.u;
  var dv = now.v - movingStartUVDoc.v;

  // Traslada el grupo usando el snapshot
  translateGroupUsingSnapshot(movingGroupId, movingSnapshot, du, dv);

  drawOnce();
  e.preventDefault();
}

function onMoveUp(){
  if(!movingDrag) return;
  movingDrag = false;
  movingSnapshot = null;
  save();
}


on(visor,'pointerdown', onMoveDown);
on(visor,'pointermove', onMoveMove);
on(visor,'pointerup', onMoveUp);
on(visor,'pointercancel', onMoveUp);

  workspace.append(stage);
  wrap.append(workspace);

  // ===== Helpers de tamaño (sin scroll): fijamos variables CSS con las alturas reales
  function setVHVars(){
    var header=$('#siteHeader'), footer=$('#siteFooter');
    var r = document.documentElement.style;
    r.setProperty('--hdrH', (header?header.offsetHeight:0)+'px');
    r.setProperty('--ftrH', (footer?footer.offsetHeight:0)+'px');
  }
  function layoutStage(){
    // El stage llena todo y el canvas es cuadrado máximo en ese rectángulo
    setVHVars();
    // Anchura/altura disponibles (whole viewport menos header+footer)
    var hh = $('#siteHeader') ? $('#siteHeader').offsetHeight : 0;
    var fh = $('#siteFooter') ? $('#siteFooter').offsetHeight : 0;
    stage.style.width  = window.innerWidth + 'px';
    stage.style.height = Math.max(0, window.innerHeight - hh - fh) + 'px';
    // Asegura que el contenedor también crezca (clave en móvil)
workspace.style.height = stage.style.height;

    
  }

  var dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1));
  // Lienzo 2:1 (doble de ancho que alto), sin deformar el mandala (se centra)
  // Lienzo 2:1 (W = ancho dispo, H = W/2; si no cabe en alto, ajusta a 2:1)
function sizeForStudioRect(){
  var header = $('#siteHeader'), footer = $('#siteFooter'), hud = $('.studio-hud');
  var hh = header ? header.offsetHeight : 0;
  var fh = footer ? footer.offsetHeight : 0;

  var availH = Math.max(0, window.innerHeight - hh - fh);
  var availW = Math.max(0, window.innerWidth);

  // margen entre visor y HUD
  var HUD_PAD = 12;
  var hudW = 0;
  if(hud){
    var hr = hud.getBoundingClientRect();
    hudW = Math.max(0, Math.round(hr.width)) + HUD_PAD;
  }

  // Rectángulo libre para el visor (ocupa TODO lo marcado en amarillo)
  var w = clamp(availW, 320, 4800);

  var h = clamp(availH,        320, 2400);
  return { w:w, h:h };
}




 function currentDoc(){
  // Studio usa su propio documento, independiente del editor "Crear"
  if(state && state.studioDoc) return state.studioDoc;
  // si no hay nada, crea uno vacío
  return { layers:[], activeLayer:0 };
}


  // Avanza ángulos locales (NO escribe en doc.layers[i].rotAngle)
  function stepAngles(doc, dt){
    try{
      if(!studioAngles || studioAngles.length !== doc.layers.length){
        studioAngles = doc.layers.map(function(L){ return L && L.rotAngle ? L.rotAngle : 0; });
      }
      for(var i=0;i<doc.layers.length;i++){
        var L = doc.layers[i];
        if(L && L.rotEnabled){
          var factor = (state.studio && state.studio.speedFactor) || 1;
var speedRad = ((L.rotSpeed||8) * Math.PI/180) * (L.rotDir||1) * factor;
studioAngles[i] = (studioAngles[i] + dt*speedRad) % (Math.PI*2);

        }
      }
    }catch(_){}
  }


   function drawOnce(){
  layoutStage();
  var sz = sizeForStudioRect();
  visor.width  = Math.floor(sz.w*dpr);
  visor.height = Math.floor(sz.h*dpr);
  visor.style.width  = sz.w+'px';
  visor.style.height = sz.h+'px';

  var doc  = currentDoc();
  var rect = squareRectForStudio(sz);

  // Offset UV para alinear el dominio 0..1 con el cuadrado centrado.
  // Así u<0 y u>1 quedan visibles ocupando todo el rectángulo.
  var off = renderDocToCanvas(doc, rect.size, {
    transparent: true,
    layerAngles: studioAngles,
    backgroundColor: (state && state.settings ? state.settings.background : '#ffffff') /* 🆕 */,
    canvasWidthPx:  sz.w,
    canvasHeightPx: sz.h,
    offsetU: - (rect.x / rect.size),
    offsetV: - (rect.y / rect.size)
  });

  var ctx  = visor.getContext('2d'); if(!ctx) return;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if (ctx.imageSmoothingEnabled !== undefined) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality='high'; }

    // Fondo del Studio (color/alpha/efecto)
  drawStudioBackground(ctx, sz.w, sz.h);

  // Dibuja a tamaño completo del visor (¡sin recorte!)
  ctx.drawImage(off, 0, 0, sz.w, sz.h);

}



  var raf=null, lastTs=0;
  function loop(ts){
    if(!lastTs) lastTs = ts;
    var dt = (ts - lastTs)/1000; lastTs = ts;
    var doc = currentDoc();
    stepAngles(doc, dt);
    drawOnce();
    raf = requestAnimationFrame(loop);
  }
  function start(){ if(!raf){ lastTs=0; raf=requestAnimationFrame(loop);} }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf=null; } }

on(window,'resize', drawOnce);
drawOnce(); start();
// si estaba pausado en una sesión anterior, respétalo
if(state.studio && state.studio.paused){ stop(); }
// 🔧 Redibuja tras el primer layout del HUD (asegura el margen correcto)
requestAnimationFrame(function(){ drawOnce(); });

// =====================
// Export (Studio/visor)
// =====================
function pageSize(kind){
  if(kind==='A3') return {w:842, h:1191};        // puntos (72 dpi) — A3
  if(kind==='A4') return {w:595, h:842};         // A4
  if(kind==='A5') return {w:420, h:595};         // A5
  if(kind==='6x9')return {w:432, h:648};         // 6×9" KDP
  return {w:595, h:842};
}

// Renderiza exactamente el frame visible del visor a un tamaño escalado
function renderStudioFrameToCanvas(scale){
  var sz = sizeForStudioRect();
  var rect = squareRectForStudio(sz);
  var W = Math.max(1, Math.floor(sz.w * scale));
  var H = Math.max(1, Math.floor(sz.h * scale));

  var can = document.createElement('canvas');
  can.width = W; can.height = H;
  var ctx = can.getContext('2d');
  if (ctx.imageSmoothingEnabled !== undefined) {
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  }

  // ⬇️ Fondo del Studio (mismo que en visor)
  drawStudioBackground(ctx, W, H);

  // Render del documento a todo el rectángulo (con offset UV para que el cuadrado quede centrado)
  var off = renderDocToCanvas(currentDoc(), rect.size*scale, {
    transparent: true,
    layerAngles: studioAngles,
    backgroundColor: (state && state.settings ? state.settings.background : '#ffffff') /* 🆕 */,
    canvasWidthPx:  W,
    canvasHeightPx: H,
    offsetU: - (rect.x / rect.size),
    offsetV: - (rect.y / rect.size)
  });

  ctx.drawImage(off, 0, 0, W, H);
  return can;
}

function drawStudioBackground(ctx, w, h){
  ctx.save();
  var cfg = (state.studio && state.studio.bg) || {mode:'solid', color:(state.settings&&state.settings.background)||'#ffffff', alpha:1};
  var a = clamp(typeof cfg.alpha==='number'?cfg.alpha:1, 0, 1);
  var mode = cfg.mode || 'solid';

  function fillSolid(col){
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(0,0,w,h);
  }

  if(mode==='solid'){
    fillSolid(cfg.color || '#ffffff');
  }else if(mode==='tornado'){
    // base
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
    // swirl
    var cx=w/2, cy=h/2, maxR=Math.sqrt(cx*cx+cy*cy);
    for(var i=0;i<180;i++){
      var t=i/180, r=t*maxR, ang=t*8*Math.PI;
      var x=cx+Math.cos(ang)*r, y=cy+Math.sin(ang)*r;
      var hue=(t*360*3)%360;
      var grd=ctx.createRadialGradient(x,y,0,x,y,Math.max(120,r*0.6));
      grd.addColorStop(0,'hsla('+hue+',90%,60%,0.9)');
      grd.addColorStop(1,'hsla('+hue+',90%,60%,0)');
      ctx.fillStyle=grd;
      ctx.beginPath(); ctx.arc(x,y,Math.max(60,r*0.25),0,Math.PI*2); ctx.fill();
    }
  }else if(mode==='space'){
    ctx.globalAlpha = a;
    var g=ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#030616'); g.addColorStop(1,'#0b1731');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    // nebulosas
    var neb=ctx.createRadialGradient(w*0.65,h*0.35,0,w*0.65,h*0.35,Math.max(w,h)*0.6);
    neb.addColorStop(0,'rgba(100,170,255,.35)'); neb.addColorStop(1,'rgba(100,170,255,0)');
    ctx.fillStyle=neb; ctx.beginPath(); ctx.arc(w*0.65,h*0.35,Math.max(w,h)*0.7,0,Math.PI*2); ctx.fill();
    var neb2=ctx.createRadialGradient(w*0.35,h*0.6,0,w*0.35,h*0.6,Math.max(w,h)*0.5);
    neb2.addColorStop(0,'rgba(255,90,160,.25)'); neb2.addColorStop(1,'rgba(255,90,160,0)');
    ctx.fillStyle=neb2; ctx.beginPath(); ctx.arc(w*0.35,h*0.6,Math.max(w,h)*0.6,0,Math.PI*2); ctx.fill();
    // estrellas (determinista)
    ctx.fillStyle='rgba(255,255,255,0.9)';
    for(var i=0;i<280;i++){
      var sx = (i*137.2 % 1) * w;
      var sy = (i*269.5 % 1) * h;
      var sr = ((i*13.7)%1)*1.2 + 0.3;
      ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
    }
  }else if(mode==='water'){
    ctx.globalAlpha = a;
    var g2=ctx.createLinearGradient(0,0,0,h);
    g2.addColorStop(0,'#0ea5e9'); g2.addColorStop(1,'#0369a1');
    ctx.fillStyle=g2; ctx.fillRect(0,0,w,h);
    // ondas suaves
    ctx.globalAlpha = a*0.25;
    for(var k=0;k<6;k++){
      ctx.beginPath();
      var amp=10+k*6, freq=0.012+k*0.004, y0=(h*(k+1))/7;
      ctx.moveTo(0,y0);
      for(var x=0;x<=w;x+=4){
        var y=y0+Math.sin(x*freq+k)*amp;
        ctx.lineTo(x,y);
      }
      ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath();
      ctx.fillStyle='#ffffff'; ctx.fill();
    }
  }else if(mode==='snow'){
    ctx.globalAlpha = a;
    var g3=ctx.createLinearGradient(0,0,0,h);
    g3.addColorStop(0,'#0b1226'); g3.addColorStop(1,'#12223a');
    ctx.fillStyle=g3; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,.9)';
    for(var i=0;i<180;i++){
      var sx=(i*97.9 % 1)*w, sy=(i*57.3 % 1)*h, sr=((i*19.1)%1)*1.8+0.5;
      ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
    }
  }else if(mode==='beach'){
    ctx.globalAlpha = a;
    // cielo
    var sky=ctx.createLinearGradient(0,0,0,h*0.6);
    sky.addColorStop(0,'#87ceeb'); sky.addColorStop(1,'#ffffff');
    ctx.fillStyle=sky; ctx.fillRect(0,0,w,h*0.6);
    // mar
    var sea=ctx.createLinearGradient(0,h*0.6,0,h*0.85);
    sea.addColorStop(0,'#0ea5e9'); sea.addColorStop(1,'#0369a1');
    ctx.fillStyle=sea; ctx.fillRect(0,h*0.6,w,h*0.25);
    // arena
    ctx.fillStyle='#f4d398'; ctx.fillRect(0,h*0.85,w,h*0.15);
    // sol
    ctx.globalAlpha = a*0.8;
    var sun=ctx.createRadialGradient(w*0.8,h*0.18,0,w*0.8,h*0.18,h*0.2);
    sun.addColorStop(0,'rgba(255,220,120,1)'); sun.addColorStop(1,'rgba(255,220,120,0)');
    ctx.fillStyle=sun; ctx.beginPath(); ctx.arc(w*0.8,h*0.18,h*0.22,0,Math.PI*2); ctx.fill();
  }else if(mode==='aurora'){
    ctx.globalAlpha = a;
    var night=ctx.createLinearGradient(0,0,0,h);
    night.addColorStop(0,'#0b1026'); night.addColorStop(1,'#08101f');
    ctx.fillStyle=night; ctx.fillRect(0,0,w,h);
    function band(x0,y0,x1,y1,color){
      var grd=ctx.createLinearGradient(x0,y0,x1,y1);
      grd.addColorStop(0,'rgba(0,0,0,0)'); grd.addColorStop(0.5,color); grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grd; ctx.beginPath();
      ctx.moveTo(0,y0);
      ctx.bezierCurveTo(w*0.25,y0-40, w*0.75,y1+40, w,y1);
      ctx.lineTo(w,y1+60);
      ctx.bezierCurveTo(w*0.75,y1+100, w*0.25,y0+20, 0,y0+60);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = a*0.8;
    band(0,h*0.55, w, h*0.45, 'rgba(34,215,165,0.5)');
    band(0,h*0.65, w, h*0.55, 'rgba(255,91,196,0.35)');
    band(0,h*0.50, w, h*0.40, 'rgba(140,200,255,0.45)');
  }else{
    fillSolid(cfg.color || '#ffffff');
  }
  ctx.restore();
}

function exportStudioPNGHigh(name){
  var dprLocal = Math.max(2, Math.round((window.devicePixelRatio||1)*2));
  var can = renderStudioFrameToCanvas(dprLocal);
  var url = can.toDataURL('image/png');
  var a = document.createElement('a');
  a.href = url;
a.download = smartDownloadName(name ? (name+'-studio') : '', 'mandala-studio', '.png');

  a.click();
}

function exportStudioPDF(kind, name){
  var pg = pageSize(kind);
  var MARGIN = 36; // 0.5"

  // ⬇️ Apaisado: intercambiamos ancho/alto de la página
  var Wpt = pg.h; // ancho final (horizontal)
  var Hpt = pg.w; // alto  final (horizontal)

  // Área disponible
  var availW = Wpt - 2*MARGIN;
  var availH = Hpt - 2*MARGIN;

  // Render del frame del visor *rectangular* (con fondo del Studio) a buena resolución
  var scaleRaster = 3; // calidad
  var can = renderStudioFrameToCanvas(scaleRaster);
  var ratio = can.width / can.height;

  // Encaje centrado en horizontal
  var outW = availW;
  var outH = Math.min(availH, Math.round(availW / ratio));
  if(outH > availH){
    outH = availH;
    outW = Math.round(availH * ratio);
  }
  var x = Math.round((Wpt - outW)/2);
  var y = Math.round((Hpt - outH)/2);

  var jpeg = can.toDataURL('image/jpeg', 0.98).split(',')[1];
  var imgBytes = base64ToUint8(jpeg);

  var pdfBytes = makePDF_MultiJPEG(Wpt, Hpt, [{
    ix:x, iy:y, iw:outW, ih:outH,
    imgBytes:imgBytes, pxW:can.width, pxH:can.height
  }]);

  var blob = new Blob([pdfBytes], {type:'application/pdf'});
  var url  = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
a.download = smartDownloadName(name ? (name+'-studio') : '', 'mandala-studio', '.pdf');

  a.click();
  URL.revokeObjectURL(url);
}


function exportStudioVideo20s(name){
  try{
    var cvs = document.getElementById('studioVisor');
    if(!cvs || typeof cvs.captureStream!=='function' || typeof MediaRecorder==='undefined'){
      toast('⚠️ Vídeo no soportado en este navegador.');
      return;
    }

    // Overlay de progreso (ligero)
    var ov = el('div',{id:'studioVideoOverlay'});
    ov.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99999;background:rgba(0,0,0,.7);padding:10px 14px;border-radius:8px;box-shadow:0 6px 22px rgba(0,0,0,.35)';
    var txt = el('div',{},'Generando clip (20 s — Studio)…');
    var bar = el('div'); bar.style.cssText='height:6px;background:#333;width:280px;border-radius:4px;overflow:hidden;margin-top:6px';
    var fill= el('div'); fill.style.cssText='height:100%;width:0%;background:var(--accent,#2E7AFF)';
    bar.append(fill); ov.append(txt,bar); document.body.appendChild(ov);

    var fps = 60;
    var vStream = cvs.captureStream(fps);
    var mix = new MediaStream();
    var vTrack = vStream && vStream.getVideoTracks ? vStream.getVideoTracks()[0] : null;
    if(vTrack) mix.addTrack(vTrack);

      // audio del HUD Studio (si lo hay)
    var aTrack = null;
    try{
      var aStream = (window.__studioAudio && typeof window.__studioAudio.captureStream==='function')
        ? window.__studioAudio.captureStream()
        : null;
      aTrack = aStream && aStream.getAudioTracks ? aStream.getAudioTracks()[0] : null;
      if(aTrack) mix.addTrack(aTrack);
    }catch(_){}


    var ua = navigator.userAgent || '';
    var isSafari = /Safari/.test(ua) && !/Chrome|Chromium/.test(ua);
    var candidates = isSafari
      ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4']
      : ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];

    var mime = '';
    if(typeof MediaRecorder.isTypeSupported === 'function'){
      for(var i=0;i<candidates.length;i++){ if(MediaRecorder.isTypeSupported(candidates[i])){ mime=candidates[i]; break; } }
    }
    if(!mime) mime = candidates[candidates.length-1];

    var rec;
    try{ rec = new MediaRecorder(mix, { mimeType: mime, videoBitsPerSecond: 6000000 }); }
    catch(e){ try{ rec = new MediaRecorder(mix); }catch(e2){ document.body.removeChild(ov); toast('⚠️ Este navegador no puede grabar vídeo aquí.'); return; } }

    var chunks=[];
    rec.ondataavailable=function(e){ if(e && e.data && e.data.size){ chunks.push(e.data); } };
    rec.onstop=function(){
      try{ document.body.removeChild(ov); }catch(_){}
      var ext = (mime && mime.indexOf('mp4')!==-1) ? '.mp4' : '.webm';
      var blob = new Blob(chunks, {type:mime || (ext==='.mp4'?'video/mp4':'video/webm')});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = slugify(name)+'-studio-20s'+ext;
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
      toast('Vídeo listo ✅');
    };

    // arrancar loop si estuviera parado (respetando “pausado”)
    var wasPaused = !!(state.studio && state.studio.paused);
    state.studio = state.studio || {}; state.studio.paused = false; save(); start();

    rec.start(250);
    var t0 = performance.now(), D = 20000;
    var timer = setInterval(function(){
      var dt = performance.now()-t0, p = Math.min(100, Math.round(dt/D*100));
      fill.style.width = p+'%';
      if(dt>=D){
        clearInterval(timer);
        try{ rec.stop(); }catch(_){}
        // restaura pausa si estaba pausado antes
        if(wasPaused){ state.studio.paused = true; save(); stop(); }
      }
    }, 120);
    toast('🎥 Grabando 20 s (Studio)…');
  }catch(err){
    console.error(err);
    try{ var ovm=document.getElementById('studioVideoOverlay'); if(ovm && ovm.parentNode) ovm.parentNode.removeChild(ovm); }catch(_){}
    toast('No se pudo generar el vídeo (Studio).');
  }
}

  // ==========================
  //   +Importar (panel 4×4)
  // ==========================
var waitingImport   = false;       // ¿estamos esperando el click en el lienzo?
var selectionIds    = [];          // ids seleccionados en el modal
var selectionScales = {};          // id -> factor (0.25, 0.5, 0.75, 1)


  function showNotice(msg){
    hideNotice();
    var n = el('div',{id:'studioImportNotice'}, msg);
    document.body.appendChild(n);
  }
  function hideNotice(){
    var n = $('#studioImportNotice'); if(n && n.parentNode) n.parentNode.removeChild(n);
  }
  function getSavedCentersUVForItem(item){
    var c = (item && item.center) || {};
    var pts = Array.isArray(c.points) ? c.points : [];

    if(c.mode === 'centrado' || !pts.length){
      return [{u:0.5, v:0.5}];
    }

    var active = c.active || { mode:'all', index:0 };

    if(active.mode === 'choose'){
      var idx = clamp(parseInt(active.index || 0, 10), 0, Math.max(0, pts.length - 1));
      return [{u: pts[idx].u, v: pts[idx].v}];
    }

    return pts.map(function(p){
      return {u:p.u, v:p.v};
    });
  }

  function getStrokeSourceCentersUV(stroke, item){
    if(stroke && stroke.centersUV && stroke.centersUV.length){
      return stroke.centersUV.map(function(c){
        return {u:c.u, v:c.v};
      });
    }
    return getSavedCentersUVForItem(item);
  }

  function getImportAnchorUV(item){
    var doc = (item && item.doc) || {};
    var minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
    var found = false;

    function add(u, v){
      if(!isFinite(u) || !isFinite(v)) return;
      if(u < minU) minU = u;
      if(v < minV) minV = v;
      if(u > maxU) maxU = u;
      if(v > maxV) maxV = v;
      found = true;
    }

    try{
      (doc.layers || []).forEach(function(L){
        (L.strokes || []).forEach(function(s){
          (s.points || []).forEach(function(p){
            add(p.u, p.v);
          });

          getStrokeSourceCentersUV(s, item).forEach(function(c){
            add(c.u, c.v);
          });
        });
      });
    }catch(_){}

    if(!found){
      getSavedCentersUVForItem(item).forEach(function(c){
        add(c.u, c.v);
      });
    }

    if(!found){
      return {u:0.5, v:0.5};
    }

    return {
      u: (minU + maxU) / 2,
      v: (minV + maxV) / 2
    };
  }

  function mapPointFromAnchor(pt, fromAnchor, toAnchor, factor){
    factor = (factor == null ? 1 : factor);
    return {
      u: toAnchor.u + factor * (pt.u - fromAnchor.u),
      v: toAnchor.v + factor * (pt.v - fromAnchor.v)
    };
  }

  // Importa las entradas seleccionadas centradas en (u,v) del lienzo de Studio.
  function importSelectionAt(u, v){
    var base = state.studioDoc || { layers:[], activeLayer:0 };
    state.studioDoc = base;
    var addedLayers = 0;

    var target = { u:u, v:v };

    selectionIds.forEach(function(id){
      var it = (state.gallery || []).find(function(g){ return g.id === id; });
      if(!it || !it.doc || !it.doc.layers) return;

      var factor    = (selectionScales && selectionScales[id] != null) ? selectionScales[id] : 1;
      var anchorUV  = getImportAnchorUV(it);
      var groupId   = uid();
      var groupName = it.name || 'Mandala';

      var srcLayers = it.doc.layers || [];
      for(var i=0; i<srcLayers.length; i++){
        var SL = srcLayers[i];
        var newL = {
          id: uid(),
          name: (it.name || 'Obra') + ' • ' + (SL.name || ('Capa ' + (i+1))),
          visible: true,
          outlineUnion: !!SL.outlineUnion,
          strokes: [],
          rotEnabled: !!SL.rotEnabled,
          rotSpeed: SL.rotSpeed || 8,
          rotDir: SL.rotDir || 1,
          rotAngle: SL.rotAngle || 0,
          groupId: groupId,
          groupName: groupName
        };

        var ss = SL.strokes || [];
        for(var k=0; k<ss.length; k++){
          var orig = ss[k];
          var s = clone(orig);

          // Puntos: misma transformación rígida para conservar la geometría
          if(s.points && s.points.length){
            s.points = s.points.map(function(p){
              return mapPointFromAnchor(p, anchorUV, target, factor);
            });
          }

          // Centros:
          // 1) si el trazo ya trae centersUV, usamos esos
          // 2) si no, usamos los centros guardados en item.center
          var sourceCenters = getStrokeSourceCentersUV(orig, it);

          if(sourceCenters && sourceCenters.length){
            s.centersUV = sourceCenters.map(function(c){
              return mapPointFromAnchor(c, anchorUV, target, factor);
            });
          }else{
            s.centersUV = [{ u: target.u, v: target.v }];
          }

          // Mantener proporciones del trazo
          s.size = Math.max(0.5, (orig.size || 1) * factor);

          if(s.outline && s.outlineWidth != null){
            s.outlineWidth = Math.max(1, Math.round((orig.outlineWidth || 1) * factor));
          }

          newL.strokes.push(s);
        }

        base.layers.push(newL);
        addedLayers++;
      }
    });

    studioAngles = (base.layers || []).map(function(L){
      return (L && typeof L.rotAngle === 'number') ? L.rotAngle : 0;
    });

    save();
    rebuildMoveList();

    toast(addedLayers ? (t('Capas importadas: ') + addedLayers) : t('Nada que importar.'));
  }

function scaleStrokeAround(stroke, centerUV, factor){
  factor = (factor==null?1:factor);
  if(!stroke.points || factor===1) return;
  var u0 = centerUV.u, v0 = centerUV.v;
  stroke.points = stroke.points.map(function(p){
    return {
      u: u0 + (p.u - u0)*factor,
      v: v0 + (p.v - v0)*factor
    };
  });
}

  // Click en el canvas para colocar (nombrado -> podemos desuscribir)
    function onVisorClick(e){
    if(!waitingImport) return;
    var uv = uvFromEvent(e);           // ✅ respeta padding y lado del cuadrado real
    importSelectionAt(uv.u, uv.v);
    waitingImport = false;
    selectionIds = [];
    hideNotice();
      drawOnce(); // 🔁 refresco inmediato para ver la importación

  }

  on(visor,'click', onVisorClick);


  // Modal 4×4 con paginación izquierda/derecha
  function openImportModal(){
    var per = 16, page = 0;
    var all = state.gallery || [];
    var sel = new Set(selectionIds);
     var scaleBy = Object.assign({}, selectionScales); // ⚙️ id -> factor (0.25..1) preseleccionado
    function renderModal(){
      var total = all.length;
      var pages = Math.max(1, Math.ceil(total/per));
      if(page >= pages) page = pages-1;
      var start = page*per, end = Math.min(total, start+per);

      var html = [
  '<div class="imp-modal-wrap" style="position:relative;">',
  '  <div id="impNav" class="imp-nav">',
  '    <button class="btn small ghost" id="pgPrev">‹</button>',
  '    <span class="small-note">Página '+(page+1)+' / '+pages+'</span>',
  '    <button class="btn small ghost" id="pgNext">›</button>',
  '  </div>',
  '  <div id="impWrap" class="imp-grid-4x4">'
];

      if(!total){
        html.push('<p>No hay obras en tu galería todavía.</p>');
      }else{
        for(var i=start;i<end;i++){
          var it = all[i];
var checked = sel.has(it.id) ? ' checked' : '';
var current = (scaleBy[it.id]!=null ? scaleBy[it.id] : 1);
html.push(
  '<label class="gp-card" style="display:block; border:1px solid rgba(255,255,255,.14); padding:8px; border-radius:8px; cursor:pointer;">',
    '<input type="checkbox" data-id="'+it.id+'"'+checked+' style="margin-right:6px; vertical-align:middle;"/>',
    '<span class="small-note">'+(it.name||'Obra')+'</span>',
    // selector de escala (1/4, 2/4, 3/4, 1/1)
    '<div class="row" style="margin-top:6px; gap:6px; align-items:center;">',
      '<span class="small-note">Tamaño</span>',
      '<select class="imp-scale" data-id="'+it.id+'">',
        '<option value="0.25"'+(current===0.25?' selected':'')+'>1/4</option>',
        '<option value="0.5"'+(current===0.5?' selected':'')+'>2/4</option>',
        '<option value="0.75"'+(current===0.75?' selected':'')+'>3/4</option>',
        '<option value="1"'+(current===1?' selected':'')+'>1/1</option>',
      '</select>',
    '</div>',
    '<img src="'+it.thumb+'" alt="'+(it.name||'Obra')+'" style="width:100%; height:auto; display:block; border-radius:6px; margin-top:6px;"/>',
  '</label>'
);

        }
      }
      // cierra el grid 4×4 y su wrapper
html.push('  </div>');
html.push('</div>');

// acciones (solo botones)
html.push(
  '<div class="row" style="margin-top:12px; justify-content:flex-end; gap:8px;">',
    '<button class="btn ghost" id="gpCancel">Cancelar</button>',
    '<button class="btn success" id="gpDoImport">Importar</button>',
  '</div>'
);


      modal('+Importar', html.join(''), true);

      // eventos del modal
      var wrap = $('#impWrap');
      if(wrap){
        on(wrap,'change', function(e){
  var t = e.target;
  if(t && t.matches('input[type="checkbox"]')){
    var id = t.getAttribute('data-id'); if(!id) return;
    if(t.checked) sel.add(id); else sel.delete(id);
  }
  if(t && t.matches('select.imp-scale')){
    var id = t.getAttribute('data-id'); if(!id) return;
    scaleBy[id] = parseFloat(t.value)||1;
  }
});

      }
      on($('#pgPrev'),'click', function(){ if(page>0){ page--; renderModal(); } });
      on($('#pgNext'),'click', function(){ if((page+1)*per < total){ page++; renderModal(); } });
      on($('#gpCancel'),'click', function(){ $('#modal').classList.add('hidden'); });
      on($('#gpDoImport'),'click', function(){
  selectionIds    = Array.from(sel);
  selectionScales = scaleBy; // guarda factores 0.25..1
  if(!selectionIds.length){ toast('Elige al menos una entrada.'); return; }
  $('#modal').classList.add('hidden');
  waitingImport = true;
  showNotice( t('Elige un lugar del lienzo para importar la selección') );

});

    }
    renderModal();
  }

  // Exponemos el abridor para el botón del header
  window.openStudioImport = openImportModal;

  // Ajuste inicial / resize
  setVHVars();
    // ——— Destructor: se llama al cambiar de sección
    wrap.__destroy = function(){
    try{ stop(); }catch(_){}
       try{ window.removeEventListener('resize', drawOnce); }catch(_){}
    try{ window.removeEventListener('resize', resetStudioHudPosition); }catch(_){}
    try{ window.removeEventListener('resize', applyStudioHudPositionFromState); }catch(_){}
    try{ visor.removeEventListener('click', onVisorClick); }catch(_){}

    try{ hideNotice(); }catch(_){}
    try{ removeStudioHeaderButtons(); }catch(_){}
    studioAngles = null;
  };


  // Ajuste inicial / resize
  setVHVars();

  return wrap;
}

    return StudioView();
  }

  window.MandalaStudio = {
    createView: createView
  };
})();
