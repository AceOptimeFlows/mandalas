(function(){
  'use strict';

  function $(sel, ctx){ if(!ctx) ctx=document; return ctx.querySelector(sel); }
  function $$(sel, ctx){ if(!ctx) ctx=document; return Array.prototype.slice.call(ctx.querySelectorAll(sel)); }

  function Router(){
    this.routes = {};
    this.notFoundHandler = null;

    var self = this;
    window.addEventListener('hashchange', function(){ self.resolve(); });
    window.addEventListener('DOMContentLoaded', function(){ self.resolve(); });
  }

  Router.prototype.register = function(path, handler){
    this.routes[path] = handler;
    return this;
  };

  Router.prototype.notFound = function(handler){
    this.notFoundHandler = handler;
    return this;
  };

  Router.prototype.navigate = function(path){
    location.hash = path;
  };

  Object.defineProperty(Router.prototype, 'params', {
    get: function(){
      var hash = location.hash.slice(1);
      var parts = hash.split('?');
      var path = parts[0];
      var query = parts[1] || '';
      return {
        path: path,
        query: query,
        qp: new URLSearchParams(query)
      };
    }
  });

  Router.prototype.resolve = function(){
    var p = this.params.path;
    var h = this.routes[p] || this.notFoundHandler;

    try{
      var mm = $('#modal');
      if(mm) mm.classList.add('hidden');
    }catch(_){}

    if(h) h();

    $$('.nav [data-link]').forEach(function(a){
      a.classList.toggle('active', a.getAttribute('href') === '#' + p);
    });

    document.body.classList.toggle('is-crear',  p === '/crear');
    document.body.classList.toggle('is-studio', p === '/studio');

    if (p === '/crear') {
      try{
        var st = (this._deps && typeof this._deps.getState === 'function')
          ? this._deps.getState()
          : null;

        if (st && st.ui && st.ui.panelsHidden) {
          st.ui.panelsHidden = false;
          if (this._deps && typeof this._deps.saveState === 'function') {
            this._deps.saveState();
          }
        }

        document.body.classList.remove('panels-hidden');

        if (typeof window.ensurePanelsVisibleNow === 'function') {
          window.ensurePanelsVisibleNow();
        }

        if (typeof window.positionAnimDock === 'function') {
          window.positionAnimDock();
        }

        var eye = $('#viewToggle');
        if (eye) {
          eye.setAttribute('aria-pressed', 'false');
          eye.textContent = '🙈';
        }
      }catch(_){}
    }

    var main = $('#app');
    if (main) main.focus();
  };

  function createApp(opts){
    opts = opts || {};

    var app = opts.app || $('#app');
    var el = opts.el;
    var t = opts.t || function(s){ return s; };
    var toast = opts.toast || function(){};
    var on = opts.on || function(node, ev, fn, options){
      if(node && node.addEventListener) node.addEventListener(ev, fn, options);
    };
    var api = opts.api || window.MandalaAppAPI || {};
    var createCrearView = opts.createCrearView;

    var __unmountCurrentView = null;
    var router = new Router();

    router._deps = {
      getState: api.getState,
      saveState: api.saveState
    };

    function unmountCurrent(){
      if (typeof __unmountCurrentView === 'function') {
        try{ __unmountCurrentView(); }catch(_){}
      }
      __unmountCurrentView = null;
    }

    function mountView(view){
      __unmountCurrentView = (view && view.__destroy) ? view.__destroy : null;
      if(app){
        app.innerHTML = '';
        if(view) app.append(view);
      }
    }

    function renderCrear(){
      unmountCurrent();

      var view;
      if(typeof createCrearView === 'function'){
        view = createCrearView();
      }else{
        view = el('section',{className:'card'},[
          el('h2',{}, t('Lienzo')),
          el('p',{}, t('No se pudo crear la vista de dibujo'))
        ]);
      }

      mountView(view);

      setTimeout(function(){
        if(document.body.classList.contains('is-crear') && typeof window.ensurePanelsVisibleNow === 'function'){
          window.ensurePanelsVisibleNow();
        }
      }, 0);
    }

    function renderGaleria(){
      unmountCurrent();

      var view;
      if(window.MandalaGaleria && typeof window.MandalaGaleria.createView === 'function'){
        view = window.MandalaGaleria.createView(api);
      }else{
        view = el('section',{className:'card'},[
          el('h2',{}, t('Galería')),
          el('p',{}, t('No se pudo cargar galeria.js'))
        ]);
      }

      mountView(view);
    }

    function renderStudio(){
      unmountCurrent();

      var view;
      if(window.MandalaStudio && typeof window.MandalaStudio.createView === 'function'){
        view = window.MandalaStudio.createView(api);
      }else{
        view = el('section',{className:'card'},[
          el('h2',{}, t('Studio')),
          el('p',{}, t('No se pudo cargar studio.js'))
        ]);
      }

      mountView(view);
    }

    router
      .register('/crear', renderCrear)
      .register('/studio', renderStudio)
      .register('/galeria', renderGaleria)
      .notFound(function(){
        location.hash = '/crear';
      });

    if(!location.hash) location.hash = '/crear';
    router.resolve();

    on($('#studioImportBtn'), 'click', function(){
      if(location.hash.indexOf('/studio') === -1){
        location.hash = '/studio';
        return;
      }

      if (typeof window.openStudioImport === 'function') {
        window.openStudioImport();
      } else {
        toast('Cargando Studio…');
      }
    });

    return router;
  }

  window.MandalaRouter = {
    createApp: createApp
  };
})();