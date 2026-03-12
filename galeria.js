/* Mand△L@s — módulo Galería + Creador de Libro */
(function(){
  'use strict';

  function fallbackView(message){
    var wrap = document.createElement('section');
    wrap.className = 'card';
    var h2 = document.createElement('h2');
    h2.textContent = 'Galería';
    var p = document.createElement('p');
    p.textContent = message || 'No se pudo cargar la galería.';
    wrap.appendChild(h2);
    wrap.appendChild(p);
    return wrap;
  }

  function createView(api){
    api = api || window.MandalaAppAPI || null;
    if(!api || typeof api.el !== 'function' || typeof api.getState !== 'function'){
      return fallbackView('No se pudo inicializar galeria.js');
    }

    var $ = api.$;
    var $$ = api.$$;
    var el = api.el;
    var on = api.on;
    var t = api.t || function(key){ return key; };
    var toast = api.toast;
    var modal = api.modal;
    var slugify = api.slugify;
    var smartDownloadName = api.smartDownloadName;
    var clone = api.clone;
    var calcCanvasSquare = api.calcCanvasSquare;
    var renderDocToCanvas = api.renderDocToCanvas;
    var base64ToUint8 = api.base64ToUint8;
    var makePDF_MultiJPEG = api.makePDF_MultiJPEG;
    var setTheme = api.setTheme;
    var applySkin = api.applySkin;
    var state = api.getState();

    function load(){
      var next = (api.loadState ? api.loadState() : state);
      if(api.replaceState) api.replaceState(next);
      return next;
    }
    function save(){ if(api.saveState) api.saveState(); }

    var SafeLS = {
      del: function(){ if(api.deleteStorageKey) api.deleteStorageKey(); }
    };
    var KEY = 'mandalas-state-v9';
    var router = {
      resolve: function(){ if(api.resolveRoute) api.resolveRoute(); }
    };

function galleryExportPNG(item){
  // Emula el tamaño del lienzo en "Crear" a 100% (CSS) × DPR actual
   var cssSide = calcCanvasSquare().w;                // lado CSS estimado del lienzo
  var dpr     = Math.max(1, Math.min(2, window.devicePixelRatio||1)); // asegura DPR local
  var side    = Math.floor(cssSide * dpr);           // píxeles reales (retina, etc.)
  var transparent = !!(item.settings && item.settings.transparentBg);

  var bgc = (item.settings && item.settings.background) || '#ffffff'; /* 🆕 */

  var can = renderDocToCanvas(item.doc, side, { transparent: transparent, backgroundColor: bgc }); /* 🆕 */

  var url = can.toDataURL('image/png');
  var a = document.createElement('a');
  a.href = url;
  a.download = smartDownloadName(item && item.name, 'mandala', '.png');
  a.click();
}

function galleryExportPDF(item, kind){
  var page={w:595, h:842}; if(kind==='A5') page={w:420, h:595};
  var margin=36, maxW=page.w-2*margin, maxH=page.h-2*margin, side=Math.min(maxW,maxH);

  // Render a 300 DPI manteniendo grosor relativo al visor
  var px = Math.round(side/72*300);
  var dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1));
  var baseRef = Math.max(1, Math.floor((typeof calcCanvasSquare==='function' ? calcCanvasSquare().w : side) * dpr));
  var k = Math.max(0.01, px / baseRef);

  var tr  = !!(item.settings && item.settings.transparentBg);
  var bgc = (item.settings && item.settings.background) || '#ffffff';

  // Render del mandala con fondo opcional y escala de trazo
  var can = renderDocToCanvas(item.doc, px, {
    transparent: tr,
    backgroundColor: bgc,
    strokeScale: k
  });

  // Componer página
  var x=(page.w-side)/2, y=(page.h-side)/2;

  // Canvas de página para “blindar” el área del mandala con el color de fondo (por si es transparente)
  var pw = Math.round(page.w), ph = Math.round(page.h);
  var pageCan = document.createElement('canvas'); pageCan.width = Math.round(px * (page.w/side)); pageCan.height = Math.round(px * (page.h/side));
  var pctx = pageCan.getContext('2d');
  if (pctx.imageSmoothingEnabled !== undefined) { pctx.imageSmoothingEnabled = true; pctx.imageSmoothingQuality = 'high'; }

  // Pinta el rectángulo donde va la imagen con el mismo fondo del mandala
  (function __fill(){
    // Normalizamos por si el color viene en #RRGGBBAA
    function _norm(c){
      var m = String(c||'').match(/^#([0-9a-f]{8})$/i);
      if(m){
        var R=parseInt(c.slice(1,3),16),G=parseInt(c.slice(3,5),16),B=parseInt(c.slice(5,7),16),A=parseInt(c.slice(7,9),16)/255;
        return 'rgba('+R+','+G+','+B+','+A+')';
      }
      return c||'#ffffff';
    }
    pctx.fillStyle = _norm(bgc);
    // Escalado a la resolución del pageCan
    var scale = pageCan.width / page.w;
    pctx.fillRect(x*scale, y*scale, side*scale, side*scale);
  })();

  // Coloca la imagen del mandala
  (function __drawMandala(){
    var scale = pageCan.width / page.w;
    pctx.drawImage(can, x*scale, y*scale, side*scale, side*scale);
  })();

  var jpeg = pageCan.toDataURL('image/jpeg', 0.98).split(',')[1];
  var imgBytes = base64ToUint8(jpeg);

  var pdfBytes = makePDF_MultiJPEG(page.w, page.h, [{
    ix:x, iy:y, iw:side, ih:side,
    imgBytes: imgBytes, pxW: pageCan.width, pxH: pageCan.height
  }]);

  var blob=new Blob([pdfBytes],{type:'application/pdf'}); var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href = url; a.download = smartDownloadName(item && item.name, 'mandala', '.pdf'); a.click(); URL.revokeObjectURL(url);

}

function GalleryView(){
    var wrap = el('section',{className:'card'});
    wrap.append(el('h2',{},t('Galería')));

    // Toolbar superior
    var head = el('div',{className:'row', style:'margin:10px 0 14px;justify-content:space-between'});

    // Izquierda: Crear Libro + contador seleccionado
    var left  = el('div',{className:'row'},[]);
    var btnBook = el('button',{className:'btn'},t('Crear Libro'));
    var selNote = el('span',{className:'small-note'},t('Seleccionadas: '));
    var selCount = el('b',{textContent:'0'});
    left.append(btnBook, selNote, selCount);

    // Derecha: Borrar todo
    var right = el('div',{className:'row'},[]);
    var btnResetAll = el('button',{className:'btn danger'},t('Borrar Galería y Ajustes'));
    right.append(btnResetAll);

    head.append(left,right);
    wrap.append(head);

    function updateSelectedCount(){
      var c = state.gallery.filter(function(it){ return !!it.selected; }).length;
      selCount.textContent = String(c);
    }

    // Acción de borrado (igual que tenías)
    on(btnResetAll,'click',function(){
      modal(t('Confirmar'), '<p>'+t('¿Seguro que quieres borrar tu galería y ajustes?')+'</p>');
      $('#modal-close').textContent=t('Cancelar');
      var ok=el('button',{className:'btn danger'},t('Sí, borrar'));
      on(ok,'click',function(){
        SafeLS.del(KEY);
        state = load();
        setTheme(state.theme); applySkin(state.skin);
        toast(t('Datos borrados'));
        $('#modal').classList.add('hidden');
        router.resolve();
      });
      var actions=$('.modal-actions'); if(actions) actions.append(ok);
    });

    // Si no hay obras…
    if(!state.gallery.length){
      wrap.append(el('p',{},t('No hay obras guardadas todavía. Crea una en "Crear".')));
      on(btnBook,'click', function(){ openBookCreator(1); });
      updateSelectedCount();
      return wrap;
    }

    // === GRID de la galería
    var grid = el('div',{className:'gallery-grid gallery-scroll', id:'galleryGrid'});
    wrap.append(grid);

    // --- DnD por puntero (móvil/desktop) ---
    var dragging = null, ghost = null, placeholder = null;
    var startIndex = -1, startRect = null, startPointer = {x:0,y:0};

    function makeGhost(fromCard){
      var r = fromCard.getBoundingClientRect();
      var g = fromCard.cloneNode(true);
      g.classList.add('drag-ghost');
      g.style.width  = r.width + 'px';
      g.style.height = r.height + 'px';
      document.body.appendChild(g);
      return g;
    }
    function makePlaceholder(fromCard){
      var r = fromCard.getBoundingClientRect();
      var p = el('div',{className:'gallery-card placeholder'});
      p.style.width  = r.width  + 'px';
      p.style.height = r.height + 'px';
      return p;
    }

    function pointerDownCard(card, idx, e){
  // Evitar arrastre si toca controles interactivos o el popover
  var targetEl = e.target, tag = (targetEl.tagName||'').toLowerCase();
  if(
    tag==='button' || tag==='input' || tag==='textarea' || tag==='select' || tag==='a' ||
    targetEl.closest('.row') || targetEl.closest('.gallery-meta-pop')
  ) return;
  dragging = card;

      startIndex = idx;
      startRect = card.getBoundingClientRect();
      startPointer = {x:e.clientX, y:e.clientY};
      card.setPointerCapture && card.setPointerCapture(e.pointerId);
      e.preventDefault();
    }

    function pointerMoveCard(e){
      if(!dragging) return;

      var dx = e.clientX - startPointer.x;
      var dy = e.clientY - startPointer.y;

      // No crear fantasma hasta que realmente se mueva
      if(!ghost && Math.abs(dx)+Math.abs(dy) < 4) return;

      if(!ghost){
        ghost = makeGhost(dragging);
        placeholder = makePlaceholder(dragging);
        grid.insertBefore(placeholder, dragging);
        dragging.style.display='none';
      }
      // Mover ghost
      var gx = startRect.left + dx;
      var gy = startRect.top  + dy;
      ghost.style.transform = 'translate3d('+gx+'px,'+gy+'px,0)';

      // Colocar placeholder según posición del puntero
      var children = Array.prototype.slice.call(grid.children);
      var targetIndex = children.indexOf(placeholder);
      var inserted = false;

      for(var j=0;j<children.length;j++){
        var node = children[j];
        if(node===placeholder) continue;
        var rc = node.getBoundingClientRect();
        var midY = rc.top + rc.height/2;
        var midX = rc.left + rc.width/2;

        // Heurística: si el puntero pasa por encima de la mitad superior o "antes"
        if(e.clientY < midY || (Math.abs(e.clientY-midY) < rc.height/2 && e.clientX < midX)){
          if(j < targetIndex){
            grid.insertBefore(placeholder, node);
          }else{
            grid.insertBefore(placeholder, node);
          }
          inserted = true;
          break;
        }
      }
      if(!inserted){
        grid.appendChild(placeholder);
      }
      e.preventDefault();
    }

    function pointerUpCard(e){
      if(!dragging){ return; }

      // Si no se movió, soltar sin cambios
      if(!ghost){
        dragging.releasePointerCapture && dragging.releasePointerCapture(e.pointerId);
        dragging = null; startIndex = -1;
        return;
      }

      // Índice final
      var finalIndex = Array.prototype.indexOf.call(grid.children, placeholder);

      // Limpieza visual
      placeholder && placeholder.parentNode && placeholder.parentNode.removeChild(placeholder);
      ghost && ghost.parentNode && ghost.parentNode.removeChild(ghost);
      dragging.style.display='';

      // Reordenar estado
      // Ojo: si partíamos de startIndex y hemos insertado placeholder antes de sacar la tarjeta,
      // el índice del drop ya tiene en cuenta el hueco real que queda.
      var moved = state.gallery.splice(startIndex,1)[0];
      state.gallery.splice(finalIndex,0,moved);
      save();

      dragging.releasePointerCapture && dragging.releasePointerCapture(e.pointerId);
      dragging = null; startIndex = -1; ghost = null; placeholder = null;

      // Re-render para actualizar badges y listeners
      router.resolve();
    }

    // Construye tarjeta
    function cardFor(item, idx){
      var card   = el('div',{className:'gallery-card'+(item.selected?' selected':''), 'data-index':String(idx)});
      var img    = el('img',{src:item.thumb, alt:item.name, className:'gallery-thumb'});
      var title  = el('div',{className:'gallery-title'}, item.name);

      // Overlays: check + botón 📄 + badge de orden
var checkWrap = el('label',{className:'gallery-check', title:t('Seleccionar obra')});
var check = el('input',{type:'checkbox', checked:!!item.selected});
checkWrap.append(check);

var metaBtn  = el('button',{className:'gallery-meta-btn', title:t('Metadatos'), textContent:'📄'});
var badge    = el('div',{className:'gallery-order'}, String(idx+1));

// Panel emergente de metadatos
var metaPop  = el('div',{className:'gallery-meta-pop'});
var dt       = new Date(item.date||Date.now());
function fmt2(n){ return (n<10?'0':'')+n; }
var fechaTxt = fmt2(dt.getDate())+'/'+fmt2(dt.getMonth()+1)+'/'+dt.getFullYear()+' '+fmt2(dt.getHours())+':'+fmt2(dt.getMinutes());

var inAutor  = el('input',{type:'text', value:(item.meta&&item.meta.author)||'', placeholder:t('Autor')});
var taNotas  = el('textarea',{placeholder:t('Notas'), rows:3}, (item.meta&&item.meta.notes)||'');

metaPop.append(
  el('div',{className:'field'},[ el('label',{},t('Fecha')), el('div',{className:'small-note'}, fechaTxt) ]),
  el('div',{className:'field'},[ el('label',{},t('Autor')), inAutor ]),
  el('div',{className:'field'},[ el('label',{},t('Notas')), taNotas ]),
  el('div',{className:'row'},[
    (function(){ var b=el('button',{className:'btn small ghost'},t('Cerrar')); on(b,'click', function(){ metaPop.style.display='none'; }); return b; })(),
    (function(){
      var b=el('button',{className:'btn small success'},t('Guardar'));
      on(b,'click', function(){
        item.meta = item.meta || {};
        item.meta.date  = item.date || Date.now();     // se guarda la de creación
        item.meta.author= inAutor.value.trim();
        item.meta.notes = taNotas.value.trim();
        save();
        toast(t('Metadatos guardados'));
        metaPop.style.display='none';
      });
      return b;
    })()
  ])
);

on(metaBtn,'click', function(e){
  e.stopPropagation();
  // Refresca fecha por si acaso
  var dt2 = new Date(item.date||Date.now());
  var f   = fmt2(dt2.getDate())+'/'+fmt2(dt2.getMonth()+1)+'/'+dt2.getFullYear()+' '+fmt2(dt2.getHours())+':'+fmt2(dt2.getMinutes());
  metaPop.querySelector('.small-note').textContent = f;
  metaPop.style.display = (metaPop.style.display==='block'?'none':'block');
});


      on(check,'change', function(e){
        item.selected = !!e.target.checked;
        card.classList.toggle('selected', item.selected);
        save();
        updateSelectedCount();
      });

      // Acciones
      var actions= el('div',{className:'row'});
      var bOpen   = el('button',{className:'btn small'},t('Abrir'));
      var bDel    = el('button',{className:'btn small ghost'},t('Eliminar'));
      var bPNG    = el('button',{className:'btn small ghost'},t('PNG'));
      var bPDFa4  = el('button',{className:'btn small ghost'},t('PDF A4'));
      var bPDFa5  = el('button',{className:'btn small ghost'},t('PDF A5'));
      var bRen    = el('button',{className:'btn small ghost'},t('Renombrar'));

      on(bOpen,'click',function(){
  state.pendingDoc = clone(item.doc);
  state.currentName = item.name;
  if(item && item.settings){
    // mezcla suave por si hay campos nuevos en tu estado actual
    state.settings = Object.assign(clone(state.settings), item.settings);
  }
  if(item && item.center){
    state.center = clone(item.center);
  }
  save();
  location.hash='/crear';
});


      on(bDel,'click',function(){
        var i=state.gallery.findIndex(function(g){return g.id===item.id;});
        if(i>=0){ state.gallery.splice(i,1); save(); router.resolve(); }
      });
      on(bPNG,'click', function(){ galleryExportPNG(item); });
      on(bPDFa4,'click',function(){ galleryExportPDF(item,'A4'); });
      on(bPDFa5,'click',function(){ galleryExportPDF(item,'A5'); });
      on(bRen,'click', function(){
        var nuevo = prompt(t('Nuevo nombre:'), item.name);
        if(nuevo && nuevo.trim()){ item.name = nuevo.trim(); save(); title.textContent=item.name; toast(t('Renombrado')); }
      });

      actions.append(bOpen,bDel,bPNG,bPDFa4,bPDFa5,bRen);

      // Orden: listeners de DnD por puntero
      on(card,'pointerdown', function(e){ pointerDownCard(card, idx, e); });
      on(card,'pointermove', pointerMoveCard);
      on(card,'pointerup',   pointerUpCard);
      on(card,'pointercancel', pointerUpCard);

      card.append(checkWrap, metaBtn, badge, img, title, actions, metaPop);

      return card;
    }

    // Render inicial
    state.gallery.forEach(function(item,i){
      grid.append(cardFor(item, i));
    });
    updateSelectedCount();

    // === Creador de Libro (wizard) ===
   on(btnBook,'click', function(){ openBookCreator(1); });

    function createBookSection(title, subtitle){
      var body = el('div',{className:'book-card-body'});
      var sec = el('section',{className:'book-card'},[
        el('div',{className:'book-card-head'},[
          el('h4',{className:'book-card-title'}, title),
          subtitle ? el('p',{className:'book-card-copy'}, subtitle) : null
        ]),
        body
      ]);
      return { root: sec, body: body };
    }

    function bookField(labelText, control, hintText, extraClass){
      var cls = 'book-field' + (extraClass ? (' ' + extraClass) : '');
      var box = el('div',{className:cls});
      if(labelText){
        box.append(el('label',{className:'book-label'}, labelText));
      }
      if(control) box.append(control);
      if(hintText){
        box.append(el('div',{className:'book-hint'}, hintText));
      }
      return box;
    }

    function bookInput(type, placeholder, value, cls){
      var input = el('input',{
        type: type || 'text',
        placeholder: placeholder || '',
        className: cls || 'book-input'
      });
      if(value != null) input.value = value;
      return input;
    }

    function bookTextarea(placeholder, value, rows){
      var ta = el('textarea',{
        placeholder: placeholder || '',
        className:'book-textarea',
        rows: String(rows || 4)
      });
      ta.value = value || '';
      return ta;
    }

    function bookSelect(options, value, cls){
      var sel = el('select',{className: cls || 'book-select'});
      options.forEach(function(opt){
        sel.append(el('option',{value:opt[0]}, opt[1]));
      });
      if(value != null && value !== '') sel.value = value;
      return sel;
    }

    function bookCheck(text, checked){
      var input = el('input',{type:'checkbox'});
      input.checked = !!checked;
      return el('label',{className:'book-check'},[
        input,
        el('span',{}, text)
      ]);
    }

    function bookStat(label, value){
      return el('div',{className:'book-stat'},[
        el('span',{className:'book-stat-label'}, label),
        el('strong',{className:'book-stat-value'}, String(value))
      ]);
    }

    function bookMetaStyleBlock(title, defaultColor, initial){
      initial = initial || {};
      var fontSel = bookSelect([
        ['system-ui',t('Sistema')],
        ['serif',t('Serif')],
        ['sans-serif',t('Sans-Serif')],
        ['Georgia',t('Georgia')],
        ['Times New Roman',t('Times')],
        ['Arial',t('Arial')],
        ['Roboto',t('Roboto')],
        ['Courier New',t('Courier New')]
      ], initial.font || 'system-ui');

      var sizeNum = bookInput('number','', (initial.size != null ? initial.size : 12), 'book-number');
      sizeNum.min = '8';
      sizeNum.max = '72';
      sizeNum.step = '1';

      var colorInp = bookInput('color','', initial.color || defaultColor || '#000000', 'book-color');

      var boldChk = bookCheck(t('Negrita'), !!initial.bold);
      var italicChk = bookCheck(t('Cursiva'), !!initial.italic);
      var underChk = bookCheck(t('Subrayado'), !!initial.underline);

      var alignSel = bookSelect([
        ['left',t('Izquierda')],
        ['center',t('Centro')],
        ['right',t('Derecha')],
        ['justify',t('Ajustada')]
      ], initial.align || 'center');

      var sec = createBookSection(title, t('Controla fuente, color, estilo y alineación de este bloque.'));
      var grid = el('div',{className:'book-grid-2'});
      grid.append(
        bookField(t('Fuente'), fontSel),
        bookField(t('Tamaño (pt)'), sizeNum),
        bookField(t('Color'), colorInp),
        bookField(t('Alineación'), alignSel),
        el('div',{className:'book-check-grid is-span-2'},[
          boldChk,
          italicChk,
          underChk
        ])
      );
      sec.body.append(grid);

      return {
        root: sec.root,
        get: function(){
          return {
            font: fontSel.value,
            size: parseInt(sizeNum.value || '12', 10),
            color: colorInp.value || defaultColor || '#000000',
            bold: !!boldChk.querySelector('input').checked,
            italic: !!italicChk.querySelector('input').checked,
            underline: !!underChk.querySelector('input').checked,
            align: alignSel.value || 'center'
          };
        }
      };
    }

    function pageSize(kind){
      if(kind==='A5') return {w:420, h:595};
      if(kind==='6x9') return {w:432, h:648};
      return {w:595, h:842};
    }

    function fontCSS(f){
      return f.bold ? (f.italic ? 'italic bold' : 'bold') : (f.italic ? 'italic' : 'normal');
    }

    function drawParagraph(ctx, text, xLeft, startY, maxW, lineH, align, bottomY){
      text = (text == null ? '' : String(text));
      if(!text.trim()) return startY;

      align = align || 'left';
      var words = text.split(/\s+/);
      var line = '';
      var i = 0;

      function drawLine(lineText, justify){
        var xCenter = xLeft + maxW/2;
        var xRight  = xLeft + maxW;

        if(justify && align === 'justify'){
          var parts = lineText.trim().split(/\s+/);
          if(parts.length > 1){
            var total = 0;
            for(var k=0;k<parts.length;k++){
              total += ctx.measureText(parts[k]).width;
            }
            var gaps = parts.length - 1;
            var extra = Math.max(0, (maxW - total) / gaps);
            var px = xLeft;
            ctx.textAlign = 'left';
            for(var m=0;m<parts.length;m++){
              ctx.fillText(parts[m], px, startY);
              if(m < gaps) px += ctx.measureText(parts[m]).width + extra;
            }
            return;
          }
        }

        if(align === 'center'){
          ctx.textAlign = 'center';
          ctx.fillText(lineText, xCenter, startY);
        }else if(align === 'right'){
          ctx.textAlign = 'right';
          ctx.fillText(lineText, xRight, startY);
        }else{
          ctx.textAlign = 'left';
          ctx.fillText(lineText, xLeft, startY);
        }
      }

      while(i < words.length){
        var test = line ? (line + ' ' + words[i]) : words[i];
        var w = ctx.measureText(test).width;

        if(w <= maxW){
          line = test;
          i++;
          continue;
        }

        drawLine(line, true);
        startY += lineH;
        if(bottomY != null && startY > bottomY) return startY;
        line = words[i];
        i++;
      }

      if(line){
        drawLine(line, false);
        startY += lineH;
      }

      return startY;
    }

    function drawUnderline(ctx, text, x, y, size){
      var m = ctx.measureText(text);
      var underlineY = y + Math.round(size*0.25);
      ctx.beginPath();
      ctx.moveTo(x - m.width/2, underlineY);
      ctx.lineTo(x + m.width/2, underlineY);
      ctx.lineWidth = Math.max(1, Math.round(size/12));
      ctx.stroke();
    }

      function openBookCreator(forceStep){
      if(forceStep && typeof forceStep === 'object' && typeof forceStep.preventDefault === 'function'){
        forceStep = 1;
      }

      modal(t('Crear libro'), '', true);

      var mbody = $('#modal-body');
      if(!mbody) return;

      var draft = state.bookDraft || {};
      var meta = clone(draft.meta || {});
      var step = (typeof forceStep === 'number' && forceStep >= 1 && forceStep <= 3) ? forceStep : 1;
      var selectedNow = state.gallery.filter(function(it){ return !!it.selected; });
      var selectedCount = selectedNow.length;
      var persistCurrentStep = function(){ return true; };

      function stepLabelText(n){
        if(n === 1) return t('Paso 1 de 3 · Datos del libro');
        if(n === 2) return t('Paso 2 de 3 · Formato y título');
        return t('Paso 3 de 3 · Estilos');
      }

      function stepProgressWidth(n){
        if(n === 1) return '33.333%';
        if(n === 2) return '66.666%';
        return '100%';
      }

      function getSelectedIds(){
        return state.gallery
          .filter(function(it){ return !!it.selected; })
          .map(function(it){ return it.id; });
      }

      function ensureBookDraft(){
        state.bookDraft = state.bookDraft || {};
        return state.bookDraft;
      }

      function getDefaultPdfDraft(){
        return {
          format: 'A4',
          interleaveBlack: false,
          showImageTitle: true,
          showNotes: false,
          useBackground: false,
          titleStyle: {
            font: 'serif',
            size: 20,
            color: '#000000',
            bold: true,
            italic: false,
            underline: false,
            outline: false,
            outlineColor: '#000000',
            outlineWidth: 2
          },
          noteStyles: {
            fecha: {
              font: 'system-ui',
              size: 12,
              color: '#444444',
              bold: false,
              italic: false,
              underline: false,
              align: 'center'
            },
            autor: {
              font: 'system-ui',
              size: 12,
              color: '#222222',
              bold: false,
              italic: false,
              underline: false,
              align: 'center'
            },
            notas: {
              font: 'system-ui',
              size: 12,
              color: '#222222',
              bold: false,
              italic: false,
              underline: false,
              align: 'center'
            }
          }
        };
      }

      function buildPdfDraft(partial){
        var base = getDefaultPdfDraft();
        var prev = clone((state.bookDraft && state.bookDraft.pdf) || {});
        var next = Object.assign({}, base, prev, partial || {});

        next.titleStyle = Object.assign(
          {},
          base.titleStyle,
          prev.titleStyle || {},
          (partial && partial.titleStyle) || {}
        );

        next.noteStyles = {
          fecha: Object.assign(
            {},
            base.noteStyles.fecha,
            (prev.noteStyles && prev.noteStyles.fecha) || {},
            (partial && partial.noteStyles && partial.noteStyles.fecha) || {}
          ),
          autor: Object.assign(
            {},
            base.noteStyles.autor,
            (prev.noteStyles && prev.noteStyles.autor) || {},
            (partial && partial.noteStyles && partial.noteStyles.autor) || {}
          ),
          notas: Object.assign(
            {},
            base.noteStyles.notas,
            (prev.noteStyles && prev.noteStyles.notas) || {},
            (partial && partial.noteStyles && partial.noteStyles.notas) || {}
          )
        };

        return next;
      }

      function saveMetaDraft(targetStep, refs){
        var selectedIds = getSelectedIds();
        var nextMeta = {
          title: refs.iTitle.value.trim(),
          subtitle: refs.iSub.value.trim(),
          author: refs.iAut.value.trim(),
          license: refs.iLic.value.trim(),
          email: refs.iMail.value.trim(),
          pubDate: refs.iDate.value || '',
          safeCreative: refs.iSC.value.trim(),
          doi: refs.iDOI.value.trim(),
          note: refs.iNota.value.trim(),
          abstract: refs.iRes.value.trim(),
          keywords: refs.iKW.value.trim(),
          align: refs.ddAlign.value
        };

        var book = ensureBookDraft();
        book.meta = nextMeta;
        book.selectedIds = selectedIds;
        book.step = targetStep;
        book.savedAt = Date.now();
        save();
        meta = clone(nextMeta);

        if(targetStep > 1 && !selectedIds.length){
          toast(t('Selecciona al menos una obra en la galería'));
          return false;
        }
        return true;
      }

      function savePdfDraft(partial, targetStep){
        var book = ensureBookDraft();
        var next = buildPdfDraft(partial || {});
        book.meta = clone(meta || {});
        book.selectedIds = getSelectedIds();
        book.pdf = next;
        book.step = targetStep;
        book.savedAt = Date.now();
        save();
        return next;
      }

      function goToStep(targetStep){
        if(targetStep === step) return;
        if(persistCurrentStep(targetStep) === false) return;
        openBookCreator(targetStep);
      }

      mbody.innerHTML = '';

      var wrap = el('div',{className:'book-wizard'});
      var header = el('header',{className:'book-wizard-header'},[
        el('div',{className:'book-wizard-title-wrap'},[
          el('h3',{className:'book-wizard-title'}, t('Crear libro')),
          el('p',{className:'book-wizard-subtitle'}, t('Diseña la portada y el estilo del PDF multipágina con pasos separados para que no tengas que hacer scroll vertical innecesario.'))
        ]),
        el('div',{className:'book-wizard-badges'},[
          bookStat(t('Paso'), step + ' / 3'),
          bookStat(t('Obras'), selectedCount)
        ])
      ]);

      var progress = el('div',{className:'book-wizard-progress'},[
        el('span',{className:'book-step-label'}, stepLabelText(step)),
        (function(){
          var bar = el('div',{className:'book-progress-bar'});
          var fill = el('div',{className:'book-progress-fill'});
          fill.style.width = stepProgressWidth(step);
          bar.append(fill);
          return bar;
        })()
      ]);

      var tabs = el('div',{className:'book-wizard-tabs'},[
        el('button',{
          type:'button',
          className:'book-wizard-tab' + (step===1 ? ' is-active' : '')
        }, t('1 · Datos del libro')),
        el('button',{
          type:'button',
          className:'book-wizard-tab' + (step===2 ? ' is-active' : '')
        }, t('2 · Formato y título')),
        el('button',{
          type:'button',
          className:'book-wizard-tab' + (step===3 ? ' is-active' : '')
        }, t('3 · Estilos'))
      ]);

      wrap.append(header, tabs, progress);

      function renderStep1(){
        var panel = el('div',{className:'book-step-panel'});
        var layout = el('div',{className:'book-layout book-layout-2'});

        var iTitle = bookInput('text', t('Título del libro'), meta.title || '');
        var iSub   = bookInput('text', t('Subtítulo'), meta.subtitle || '');
        var iAut   = bookInput('text', t('Autor'), meta.author || '');
        var iLic   = bookInput('text', t('Licencia'), meta.license || '');
        var iMail  = bookInput('email', t('Correspondencia / Email'), meta.email || '');
        var iDate  = bookInput('date', '', meta.pubDate || '');
        var iSC    = bookInput('text', t('Safe Creative ID (opcional)'), meta.safeCreative || '');
        var iDOI   = bookInput('text', t('DOI (Zenodo)'), meta.doi || '');
        var iNota  = bookTextarea(t('Nota breve de apertura'), meta.note || '', 4);
        var iRes   = bookTextarea(t('Resumen del libro'), meta.abstract || '', 6);
        var iKW    = bookInput('text', t('palabra 1, palabra 2, palabra 3'), meta.keywords || '');
        var ddAlign = bookSelect([
          ['left',t('Izquierda')],
          ['center',t('Centro')],
          ['right',t('Derecha')],
          ['justify',t('Ajustada')]
        ], meta.align || 'left');

        var refs = {
          iTitle: iTitle,
          iSub: iSub,
          iAut: iAut,
          iLic: iLic,
          iMail: iMail,
          iDate: iDate,
          iSC: iSC,
          iDOI: iDOI,
          iNota: iNota,
          iRes: iRes,
          iKW: iKW,
          ddAlign: ddAlign
        };

        persistCurrentStep = function(targetStep){
          return saveMetaDraft(targetStep || 1, refs);
        };

        var secA = createBookSection(t('Portada y autoría'), t('La primera página del PDF usará estos datos como portada y ficha básica.'));
        var gridA = el('div',{className:'book-grid-2'});
        gridA.append(
          bookField(t('Título'), iTitle, t('Será el encabezado principal de la portada.'), 'is-span-2'),
          bookField(t('Subtítulo'), iSub, '', 'is-span-2'),
          bookField(t('Autor'), iAut),
          bookField(t('Licencia'), iLic),
          bookField(t('Correspondencia / Email'), iMail),
          bookField(t('Fecha de publicación'), iDate),
          bookField(t('Safe Creative ID'), iSC),
          bookField(t('DOI (Zenodo)'), iDOI)
        );
        secA.body.append(gridA);

        var secB = createBookSection(t('Resumen y texto inicial'), t('Bloques amplios, respirados y con jerarquía clara.'));
        secB.body.append(
          bookField(t('Nota'), iNota, t('Un texto corto para abrir o contextualizar el libro.')),
          bookField(t('Resumen'), iRes, t('Se dibuja como párrafo en la portada con la alineación elegida.')),
          el('div',{className:'book-grid-2'},[
            bookField(t('Palabras clave'), iKW, t('Sepáralas con comas.')),
            bookField(t('Alineación del texto de portada'), ddAlign)
          ]),
          el('div',{className:'book-inline-stats'},[
            bookStat(t('Obras seleccionadas'), selectedCount),
            bookStat(t('Estado'), selectedCount ? t('Listo') : t('Falta seleccionar'))
          ])
        );

        layout.append(secA.root, secB.root);

        var btnNext = el('button',{className:'btn success', type:'button'}, t('Siguiente'));
        on(btnNext,'click', function(){
          if(persistCurrentStep(2) === false) return;
          openBookCreator(2);
        });

        panel.append(
          layout,
          el('div',{className:'book-wizard-nav'},[
            el('div',{className:'book-nav-note'}, selectedCount
              ? t('Perfecto: ya tienes obras marcadas. Ahora toca definir el formato y el aspecto del PDF.')
              : t('Aún no hay obras seleccionadas. Marca una o varias tarjetas en la galería antes de continuar.')),
            el('div',{className:'book-nav-actions'},[
              btnNext
            ])
          ])
        );

        return panel;
      }

      function renderStep2(){
        var panel = el('div',{className:'book-step-panel'});
        var selectedIds = (state.bookDraft && state.bookDraft.selectedIds && state.bookDraft.selectedIds.length)
          ? state.bookDraft.selectedIds.slice()
          : getSelectedIds();

        var pdfDraft = buildPdfDraft();
        var titleStyle = pdfDraft.titleStyle || {};

        var fmt = bookSelect([
          ['A4',t('A4')],
          ['A5',t('A5')],
          ['6x9',t('KDP 6×9"')]
        ], pdfDraft.format || 'A4');

        var chInter = bookCheck(t('Intercalar con fondo negro'), !!pdfDraft.interleaveBlack);
        var chTitle = bookCheck(t('Mostrar título de las imágenes'), pdfDraft.showImageTitle !== false);
        var chNotes = bookCheck(t('Mostrar notas (Fecha / Autor / Notas)'), !!pdfDraft.showNotes);
        var chUseBg = bookCheck(t('Usar color de fondo guardado'), !!pdfDraft.useBackground);

        var fsTitle = bookSelect([
          ['system-ui',t('Sistema')],
          ['serif',t('Serif')],
          ['sans-serif',t('Sans-Serif')],
          ['Georgia',t('Georgia')],
          ['Times New Roman',t('Times')],
          ['Arial',t('Arial')],
          ['Roboto',t('Roboto')],
          ['Courier New',t('Courier New')]
        ], titleStyle.font || 'serif');

        var szTitle = bookInput('number','', (titleStyle.size != null ? titleStyle.size : 20), 'book-number');
        szTitle.min = '8';
        szTitle.max = '72';
        szTitle.step = '1';

        var colTitle = bookInput('color','', titleStyle.color || '#000000', 'book-color');
        var boldTitle = bookCheck(t('Negrita'), titleStyle.bold !== false);
        var italicTitle = bookCheck(t('Cursiva'), !!titleStyle.italic);
        var underTitle = bookCheck(t('Subrayado'), !!titleStyle.underline);
        var chOutline = bookCheck(t('Contorno del título'), !!titleStyle.outline);
        var colOutline = bookInput('color','', titleStyle.outlineColor || '#000000', 'book-color');

        var widthOutline = bookInput('number','', (titleStyle.outlineWidth != null ? titleStyle.outlineWidth : 2), 'book-number');
        widthOutline.min = '0';
        widthOutline.max = '10';
        widthOutline.step = '1';

        function collectStep2Draft(){
          return {
            format: fmt.value,
            interleaveBlack: !!chInter.querySelector('input').checked,
            showImageTitle: !!chTitle.querySelector('input').checked,
            showNotes: !!chNotes.querySelector('input').checked,
            useBackground: !!chUseBg.querySelector('input').checked,
            titleStyle: {
              font: fsTitle.value,
              size: parseInt(szTitle.value || '20', 10),
              color: colTitle.value || '#000000',
              bold: !!boldTitle.querySelector('input').checked,
              italic: !!italicTitle.querySelector('input').checked,
              underline: !!underTitle.querySelector('input').checked,
              outline: !!chOutline.querySelector('input').checked,
              outlineColor: colOutline.value || '#000000',
              outlineWidth: parseInt(widthOutline.value || '0', 10)
            }
          };
        }

        persistCurrentStep = function(targetStep){
          savePdfDraft(collectStep2Draft(), targetStep || 2);
          return true;
        };

        var top = el('div',{className:'book-layout book-layout-2'});

        var secCfg = createBookSection(t('Formato y maquetación'), t('Opciones generales del PDF final.'));
        secCfg.body.append(
          el('div',{className:'book-grid-2'},[
            bookField(t('Formato'), fmt),
            el('div',{className:'book-inline-stats'},[
              bookStat(t('Obras'), selectedIds.length),
              bookStat(t('Salida'), t('PDF'))
            ])
          ]),
          el('div',{className:'book-check-grid'},[
            chInter,
            chTitle,
            chNotes,
            chUseBg
          ])
        );

        var secTitle = createBookSection(t('Título de cada obra'), t('Tipografía y acabado del título que aparecerá sobre la imagen.'));
        secTitle.body.append(
          el('div',{className:'book-grid-2'},[
            bookField(t('Fuente'), fsTitle),
            bookField(t('Tamaño (pt)'), szTitle),
            bookField(t('Color del título'), colTitle),
            bookField(t('Ancho del contorno (px)'), widthOutline),
            bookField(t('Color del contorno'), colOutline),
            el('div',{className:'book-check-grid is-span-2'},[
              boldTitle,
              italicTitle,
              underTitle,
              chOutline
            ])
          ])
        );

        top.append(secCfg.root, secTitle.root);

        var btnBack = el('button',{className:'btn ghost', type:'button'}, t('Atrás'));
        var btnNext = el('button',{className:'btn success', type:'button'}, t('Siguiente'));

        on(btnBack,'click', function(){
          persistCurrentStep(1);
          openBookCreator(1);
        });

        on(btnNext,'click', function(){
          persistCurrentStep(3);
          openBookCreator(3);
        });

        panel.append(
          top,
          el('div',{className:'book-wizard-nav'},[
            el('div',{className:'book-nav-note'}, t('Aquí solo decides el formato final y el estilo del título de cada obra.')),
            el('div',{className:'book-nav-actions'},[
              btnBack,
              btnNext
            ])
          ])
        );

        return panel;
      }

      function renderStep3(){
        var panel = el('div',{className:'book-step-panel'});
        var selectedIds = (state.bookDraft && state.bookDraft.selectedIds && state.bookDraft.selectedIds.length)
          ? state.bookDraft.selectedIds.slice()
          : getSelectedIds();

        var pdfDraft = buildPdfDraft();
        var noteStyles = pdfDraft.noteStyles || {};

        var styFecha = bookMetaStyleBlock(t('Fecha'), '#444444', noteStyles.fecha || {});
        var styAutor = bookMetaStyleBlock(t('Autor'), '#222222', noteStyles.autor || {});
        var styNotas = bookMetaStyleBlock(t('Notas'), '#222222', noteStyles.notas || {});

        function collectStep3Draft(){
          return {
            noteStyles: {
              fecha: styFecha.get(),
              autor: styAutor.get(),
              notas: styNotas.get()
            }
          };
        }

        persistCurrentStep = function(targetStep){
          savePdfDraft(collectStep3Draft(), targetStep || 3);
          return true;
        };

        var stylesGrid = el('div',{className:'book-layout book-layout-3'});
        stylesGrid.append(styFecha.root, styAutor.root, styNotas.root);

        var btnBack = el('button',{className:'btn ghost', type:'button'}, t('Atrás'));
        var btnGen  = el('button',{className:'btn success', type:'button'}, t('Generar PDF'));

        on(btnBack,'click', function(){
          persistCurrentStep(2);
          openBookCreator(2);
        });

        on(btnGen,'click', function(){
          if(!selectedIds.length){
            toast(t('Selecciona obras en la galería'));
            return;
          }

          var pdfCfg = savePdfDraft(collectStep3Draft(), 3);
          var pg = pageSize(pdfCfg.format);
          var MARGIN = 36;
          var TOP_TITLE_PAD = Math.round(2 * 28.346);
          var SCALE = 2;
          var pages = [];

          (function(){
            var pw = pg.w * SCALE, ph = pg.h * SCALE;
            var can = document.createElement('canvas');
            can.width = pw;
            can.height = ph;
            var ctx = can.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0,0,pw,ph);

            ctx.fillStyle = '#111';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold ' + Math.round(28*SCALE) + 'px serif';
            ctx.fillText(meta.title || t('Libro'), pw/2, Math.round(ph*0.22));

            if(meta.subtitle){
              ctx.font = 'italic ' + Math.round(18*SCALE) + 'px serif';
              ctx.fillText(meta.subtitle, pw/2, Math.round(ph*0.28));
            }

            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.font = Math.round(12*SCALE) + 'px system-ui';

            var y = Math.round(ph*0.38);
            var lh = Math.round(18*SCALE);
            var x = Math.round(MARGIN*SCALE);

            function line(lbl, val){
              if(!val) return;
              ctx.fillText(lbl + ': ' + val, x, y);
              y += lh;
            }

            line(t('Autor'), meta.author);
            line(t('Licencia'), meta.license);
            line(t('Email'), meta.email);
            line(t('Fecha'), meta.pubDate);
            line(t('Safe Creative ID'), meta.safeCreative);
            line(t('DOI'), meta.doi);

            y += lh/2;

            var align = meta.align || 'left';
            var contentMaxW = Math.round(pw - 2*MARGIN*SCALE);
            var bottomY = Math.round(ph - MARGIN*SCALE);
            var paraLH = Math.round(16*SCALE);

            if(meta.note){
              ctx.textAlign = 'left';
              ctx.textBaseline = 'alphabetic';
              ctx.font = Math.round(12*SCALE) + 'px system-ui';
              ctx.fillText(t('Nota:'), x, y);
              y += Math.round(12*SCALE);
              ctx.font = Math.round(12*SCALE) + 'px system-ui';
              y = drawParagraph(ctx, meta.note, x, y, contentMaxW, paraLH, align, bottomY);
            }

            if(meta.abstract){
              y += Math.round(8*SCALE);
              ctx.textAlign = 'left';
              ctx.textBaseline = 'alphabetic';
              ctx.font = 'italic ' + Math.round(12*SCALE) + 'px system-ui';
              ctx.fillText(t('Resumen:'), x, y);
              y += Math.round(12*SCALE);
              ctx.font = 'italic ' + Math.round(12*SCALE) + 'px system-ui';
              y = drawParagraph(ctx, meta.abstract, x, y, contentMaxW, paraLH, align, bottomY);
            }

            if(meta.keywords){
              ctx.font = Math.round(12*SCALE) + 'px system-ui';
              ctx.fillText(t('Palabras clave: ') + meta.keywords, x, y);
            }

            var jpg = can.toDataURL('image/jpeg', 0.95).split(',')[1];
            pages.push({
              ix:0, iy:0, iw:pg.w, ih:pg.h,
              imgBytes: base64ToUint8(jpg),
              pxW: can.width,
              pxH: can.height
            });
          })();

          selectedIds.forEach(function(id, idx){
            var it = state.gallery.find(function(g){ return g.id === id; });
            if(!it) return;

            var pw = pg.w * SCALE;
            var ph = pg.h * SCALE;
            var can = document.createElement('canvas');
            can.width = pw;
            can.height = ph;
            var ctx = can.getContext('2d');

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0,0,pw,ph);

            var titleH = 0;
            if(pdfCfg.showImageTitle){
              titleH = Math.round((TOP_TITLE_PAD + pdfCfg.titleStyle.size) * SCALE);

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.font = fontCSS(pdfCfg.titleStyle) + ' ' + Math.round(pdfCfg.titleStyle.size*SCALE) + 'px ' + pdfCfg.titleStyle.font;

              var tx = pw/2;
              var ty = Math.round((MARGIN + TOP_TITLE_PAD) * SCALE);
              var imageTitleText = it.name || (t('Imagen ') + (idx+1));

              if(pdfCfg.titleStyle.outline && pdfCfg.titleStyle.outlineWidth > 0){
                ctx.lineWidth = Math.max(1, pdfCfg.titleStyle.outlineWidth);
                ctx.strokeStyle = pdfCfg.titleStyle.outlineColor;
                ctx.strokeText(imageTitleText, tx, ty);
              }

              ctx.fillStyle = pdfCfg.titleStyle.color;
              ctx.fillText(imageTitleText, tx, ty);

              if(pdfCfg.titleStyle.underline){
                ctx.strokeStyle = pdfCfg.titleStyle.color;
                drawUnderline(ctx, imageTitleText, tx, ty, pdfCfg.titleStyle.size * SCALE);
              }
            }

            var notesH = 0;
            var lines = [];
            if(pdfCfg.showNotes){
              var dt = new Date((it.meta && it.meta.date) || it.date || Date.now());
              function pad(n){ return (n<10 ? '0' : '') + n; }
              var fecha = pad(dt.getDate()) + '/' + pad(dt.getMonth()+1) + '/' + dt.getFullYear();

              if(fecha) lines.push({ txt:t('Fecha: ') + fecha, sty: pdfCfg.noteStyles.fecha });
              if(it.meta && it.meta.author) lines.push({ txt:t('Autor: ') + it.meta.author, sty: pdfCfg.noteStyles.autor });
              if(it.meta && it.meta.notes)  lines.push({ txt:t('Notas: ') + it.meta.notes,  sty: pdfCfg.noteStyles.notas });

              lines.forEach(function(L){
                notesH += Math.round((L.sty.size + 6) * SCALE);
              });
            }

            var availW = (pg.w - 2*MARGIN) * SCALE;
            var availH = (pg.h - 2*MARGIN) * SCALE - titleH - notesH;
            var side = Math.max(1, Math.min(availW, availH));
            var ix = Math.round((pw - side)/2);
            var iy = Math.round((MARGIN*SCALE) + titleH + ((availH - side)/2));

            var useBg = !!pdfCfg.useBackground;
            var tr = !useBg;
            var bgc = (it.settings && it.settings.background) || '#ffffff';

            var mand = renderDocToCanvas(it.doc, Math.floor(side), {
              transparent: tr,
              backgroundColor: bgc
            });

            (function(){
              function _norm(c){
                var m = String(c || '').match(/^#([0-9a-f]{8})$/i);
                if(m){
                  var R = parseInt(c.slice(1,3),16);
                  var G = parseInt(c.slice(3,5),16);
                  var B = parseInt(c.slice(5,7),16);
                  var A = parseInt(c.slice(7,9),16)/255;
                  return 'rgba(' + R + ',' + G + ',' + B + ',' + A + ')';
                }
                return c || '#ffffff';
              }
              if(useBg){
                ctx.fillStyle = _norm(bgc);
                ctx.fillRect(ix, iy, side, side);
              }
            })();

            ctx.drawImage(mand, ix, iy, side, side);

            if(pdfCfg.showNotes && lines.length){
              var y = iy + side + Math.round(10*SCALE);
              var maxW = (pg.w - 2*MARGIN) * SCALE;
              var leftX = Math.round(MARGIN*SCALE);
              var bottom = Math.round(ph - MARGIN*SCALE);

              lines.forEach(function(L){
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.font = fontCSS(L.sty) + ' ' + Math.round(L.sty.size*SCALE) + 'px ' + L.sty.font;
                ctx.fillStyle = L.sty.color;

                var lh = Math.round((L.sty.size + 6) * SCALE);
                y = drawParagraph(ctx, L.txt, leftX, y, maxW, lh, (L.sty.align || 'center'), bottom);
              });
            }

            var jpg = can.toDataURL('image/jpeg', 0.95).split(',')[1];
            pages.push({
              ix:0, iy:0, iw:pg.w, ih:pg.h,
              imgBytes: base64ToUint8(jpg),
              pxW: can.width,
              pxH: can.height
            });

            if(pdfCfg.interleaveBlack){
              var can2 = document.createElement('canvas');
              can2.width = pw;
              can2.height = ph;
              var cx2 = can2.getContext('2d');
              cx2.fillStyle = '#ffffff';
              cx2.fillRect(0,0,pw,ph);
              cx2.fillStyle = '#000000';
              cx2.fillRect(ix, iy, side, side);

              var jpg2 = can2.toDataURL('image/jpeg', 0.95).split(',')[1];
              pages.push({
                ix:0, iy:0, iw:pg.w, ih:pg.h,
                imgBytes: base64ToUint8(jpg2),
                pxW: can2.width,
                pxH: can2.height
              });
            }
          });

          var pdfBytes = makePDF_MultiJPEG(pg.w, pg.h, pages);
          var blob = new Blob([pdfBytes], {type:'application/pdf'});
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;

          (function(){
            var title = (meta && meta.title || '').trim();
            var author = (meta && meta.author || '').trim();
            var base = (title && author) ? (title + ' - ' + author) : '';
            a.download = smartDownloadName(base, 'libro', '.pdf');
          })();

          a.click();
          URL.revokeObjectURL(url);
          toast(t('PDF generado ✅'));
        });

        panel.append(
          stylesGrid,
          el('div',{className:'book-wizard-nav'},[
            el('div',{className:'book-nav-note'}, t('Aquí solo ajustas los estilos de Fecha, Autor y Notas. Así la pestaña anterior queda limpia y no obliga a hacer scroll vertical.')),
            el('div',{className:'book-nav-actions'},[
              btnBack,
              btnGen
            ])
          ])
        );

        return panel;
      }

      if(step === 1){
        wrap.append(renderStep1());
      }else if(step === 2){
        wrap.append(renderStep2());
      }else{
        wrap.append(renderStep3());
      }

      mbody.append(wrap);

      var tabButtons = tabs.querySelectorAll('button');
      if(tabButtons[0]) on(tabButtons[0], 'click', function(){ goToStep(1); });
      if(tabButtons[1]) on(tabButtons[1], 'click', function(){ goToStep(2); });
      if(tabButtons[2]) on(tabButtons[2], 'click', function(){ goToStep(3); });
    }

    return wrap;
  }
    return GalleryView();
  }

  window.MandalaGaleria = {
    createView: createView
  };
})();