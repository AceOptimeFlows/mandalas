(function(){
  'use strict';

  function exportVideo20s(ctx){
    ctx = ctx || {};

    var name = ctx.name || '';
    var canvas = ctx.canvas;
    var audioEl = ctx.audioEl;
    var state = ctx.state;
    var save = typeof ctx.save === 'function' ? ctx.save : function(){};
    var ensureAnim = typeof ctx.ensureAnim === 'function' ? ctx.ensureAnim : function(){};
    var smartDownloadName = ctx.smartDownloadName;
    var toast = typeof ctx.toast === 'function' ? ctx.toast : function(){};
    var el = ctx.el;
 try{
    // Compatibilidad básica
    if(!canvas || typeof canvas.captureStream!=='function' || typeof MediaRecorder==='undefined'){
      toast('⚠️ Vídeo no soportado en este navegador.'); 
      return;
    }

    // Overlay de progreso (forzado via cssText por robustez)
    var ov = el('div',{id:'videoGenOverlay'});
    ov.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99999;background:rgba(0,0,0,.7);padding:10px 14px;border-radius:8px;box-shadow:0 6px 22px rgba(0,0,0,.35)';
    var txt = el('div',{},'Generando clip (20 s)…');
    var bar = el('div'); bar.style.cssText='height:6px;background:#333;width:280px;border-radius:4px;overflow:hidden;margin-top:6px';
    var fill= el('div'); fill.style.cssText='height:100%;width:0%;background:var(--accent,#2E7AFF)';
    bar.append(fill); ov.append(txt,bar); document.body.appendChild(ov);

    // Stream de canvas (vídeo) + posible audio
    var fps = 60;
    var vStream = canvas.captureStream(fps);
    var mix = new MediaStream();
    var vTrack = vStream && vStream.getVideoTracks ? vStream.getVideoTracks()[0] : null;
    if(vTrack) mix.addTrack(vTrack);

    // Audio (si hay audio importado)
    try{
      if(audioEl && (audioEl.captureStream || audioEl.mozCaptureStream)){
        var aStream = audioEl.captureStream ? audioEl.captureStream() : audioEl.mozCaptureStream();
        var aTrack = aStream && aStream.getAudioTracks && aStream.getAudioTracks()[0];
        if(aTrack) mix.addTrack(aTrack);
      }
    }catch(_){}

    // Elección de MIME robusta (Safari => MP4, resto => WEBM)
    var ua = navigator.userAgent || '';
    var isSafari = /Safari/.test(ua) && !/Chrome|Chromium/.test(ua);
    var candidates = isSafari
      ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'] // Safari
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

    var mime = '';
    if(typeof MediaRecorder.isTypeSupported === 'function'){
      for(var i=0;i<candidates.length;i++){
        if(MediaRecorder.isTypeSupported(candidates[i])){ mime = candidates[i]; break; }
      }
    }
    if(!mime) mime = candidates[candidates.length-1];

    // ⚠️ Evita separadores en números (algunos motores los tratan como syntax error)
    var rec;
    try{
      rec = new MediaRecorder(mix, { mimeType: mime, videoBitsPerSecond: 6000000 });
    }catch(e){
      // Último intento sin opciones (por si el objeto options falla)
      try{ rec = new MediaRecorder(mix); }
      catch(e2){
        try{ document.body.removeChild(ov); }catch(_){}
        console.error('MediaRecorder init error:', e2);
        toast('⚠️ Este navegador no puede grabar vídeo aquí.');
        return;
      }
    }

    var chunks = [];
    rec.ondataavailable = function(e){ if(e && e.data && e.data.size){ chunks.push(e.data); } };
    rec.onerror = function(ev){ console.error('MediaRecorder error:', ev); };

    rec.onstop = function(){
      try{ document.body.removeChild(ov); }catch(_){}
      var ext = (mime && mime.indexOf('mp4')!==-1) ? '.mp4' : '.webm';
      var blob = new Blob(chunks, {type:mime || (ext==='.mp4'?'video/mp4':'video/webm')});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href=url; a.download = smartDownloadName(name ? (name+'-20s') : '', 'mandala-20s', ext);

      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);

      // Restaura animación y audio
      state.anim.enabled = wasPlaying; save(); ensureAnim();
      try{ if(audioEl){ audioEl.pause(); audioEl.currentTime=0; } }catch(_){}
      toast('Vídeo listo ✅');
    };

    // Arranque de animación y audio durante la grabación
    var wasPlaying = !!state.anim.enabled;
    state.anim.enabled = true; save(); ensureAnim();
    try{ if(audioEl && audioEl.src){ audioEl.currentTime=0; audioEl.play(); } }catch(_){}

    // Comienza la grabación con time-slice para ir vaciando buffers
    rec.start(250);

    var t0 = performance.now(), D = 20000; // 20 s
    var timer = setInterval(function(){
      var dt = performance.now() - t0;
      var p = Math.min(100, Math.round(dt / D * 100));
      fill.style.width = p + '%';
      if(dt >= D){
        clearInterval(timer);
        try{ rec.stop(); }catch(_){}
      }
    }, 120);

    toast('🎥 Grabando 20 s…');
  }catch(err){
    console.error(err);
    try{ var ovm=document.getElementById('videoGenOverlay'); if(ovm && ovm.parentNode) ovm.parentNode.removeChild(ovm); }catch(_){}
    toast('No se pudo generar el vídeo.');
  }

}

  window.MandalaExport = window.MandalaExport || {};
  window.MandalaExport.exportVideo20s = exportVideo20s;
})();