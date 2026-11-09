/*
 * narrator.js — Fachada (Facade) da narração.
 * Tenta tocar audio/<CODIGO>.mp3; se não existir, usa speechSynthesis (pt-BR).
 * Também cuida da legenda (#legenda) e do timer de inatividade.
 */
(function () {
  'use strict';

  var MS_POR_CARACTERE = 90;
  var MS_FOLGA = 3000;
  var MS_LIMITE_MP3 = 30000;

  var mp3Existe = {};        // cache: codigo -> true/false
  var ultimaFala = [];       // códigos da última chamada de speak()
  var geracao = 0;           // invalida sequências antigas ao chamar stop()
  var falando = false;
  var audioAtual = null;
  var encerrarAtual = null;  // resolve o item que está tocando agora
  var vozPtBr = null;

  // ---------- utilidades ----------
  function texto(codigo) {
    var falas = (window.GAME_DATA && window.GAME_DATA.falas) || {};
    return falas[codigo] || '';
  }

  function legenda(txt) {
    var el = document.getElementById('legenda');
    if (el) el.textContent = txt || '';
  }

  function escolherVoz() {
    try {
      var vozes = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
      vozPtBr = vozes.filter(function (v) { return /^pt[-_]BR/i.test(v.lang); })[0] ||
        vozes.filter(function (v) { return /^pt/i.test(v.lang); })[0] || null;
    } catch (e) {
      vozPtBr = null;
    }
  }

  // Cria um "item" que só resolve uma vez (fim, erro, timeout ou stop).
  function criarItem(executor) {
    return new Promise(function (resolve) {
      var feito = false;
      var timer = null;
      function fim() {
        if (feito) return;
        feito = true;
        clearTimeout(timer);
        if (encerrarAtual === fim) encerrarAtual = null;
        resolve();
      }
      encerrarAtual = fim;
      timer = executor(fim);
    });
  }

  // ---------- síntese de voz (fallback) ----------
  function falarTTS(codigo) {
    var txt = texto(codigo);
    return criarItem(function (fim) {
      var limite = txt.length * MS_POR_CARACTERE + MS_FOLGA;
      try {
        var synth = window.speechSynthesis;
        if (!synth || !txt) return setTimeout(fim, txt ? txt.length * 60 : 0);
        var fala = new SpeechSynthesisUtterance(txt);
        fala.lang = 'pt-BR';
        fala.rate = 0.9;
        if (!vozPtBr) escolherVoz();
        if (vozPtBr) fala.voice = vozPtBr;
        fala.onend = fim;
        fala.onerror = fim;
        synth.speak(fala);
      } catch (e) {
        return setTimeout(fim, 0);
      }
      return setTimeout(fim, limite); // segurança: bug do Chrome sem onend
    });
  }

  // ---------- mp3 ----------
  function tocarMp3(codigo) {
    return new Promise(function (resolve) {
      var usouFallback = false;
      var minhaGeracao = geracao;
      var fimMp3 = null;
      function fallback() {
        if (usouFallback || minhaGeracao !== geracao) return; // já parado: não fala
        usouFallback = true;
        mp3Existe[codigo] = false;
        pararAudio();
        if (fimMp3) fimMp3();
        falarTTS(codigo).then(resolve);
      }
      criarItem(function (fim) {
        fimMp3 = fim;
        try {
          var audio = new Audio('audio/' + codigo + '.mp3');
          audioAtual = audio;
          audio.onplaying = function () { mp3Existe[codigo] = true; };
          audio.onended = fim;
          audio.onerror = function () { if (!mp3Existe[codigo]) fallback(); else fim(); };
          var p = audio.play();
          if (p && p.catch) p.catch(function () { if (!mp3Existe[codigo]) fallback(); });
        } catch (e) {
          setTimeout(fallback, 0);
        }
        return setTimeout(fim, MS_LIMITE_MP3);
      }).then(function () { if (!usouFallback) resolve(); });
    });
  }

  function falarUm(codigo) {
    if (mp3Existe[codigo] === false) return falarTTS(codigo);
    return tocarMp3(codigo);
  }

  function pararAudio() {
    if (!audioAtual) return;
    try {
      audioAtual.onended = null;
      audioAtual.onerror = null;
      audioAtual.pause();
    } catch (e) { /* ignora */ }
    audioAtual = null;
  }

  // ---------- API pública ----------
  function stop() {
    geracao += 1;
    pararAudio();
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignora */ }
    if (encerrarAtual) encerrarAtual();
    falando = false;
    legenda('');
  }

  function normalizar(codigos) {
    if (!codigos) return [];
    return (Array.isArray(codigos) ? codigos : [codigos]).filter(Boolean);
  }

  function speak(codigos) {
    stop();
    var lista = normalizar(codigos);
    ultimaFala = lista.slice();
    var minha = geracao;
    falando = lista.length > 0;
    pausarIdle();

    return lista.reduce(function (cadeia, codigo) {
      return cadeia.then(function () {
        if (minha !== geracao) return null;
        legenda(texto(codigo));
        return falarUm(codigo);
      });
    }, Promise.resolve()).then(function () {
      if (minha !== geracao) return;
      falando = false;
      legenda('');
      retomarIdle();
    }).catch(function (e) {
      console.error('Narrator.speak', e);
      falando = false;
      retomarIdle();
    });
  }

  function repeat() {
    return speak(ultimaFala.slice());
  }

  function unlock() {
    try { if (window.Sfx) window.Sfx.unlock(); } catch (e) { /* ignora */ }
    try {
      var synth = window.speechSynthesis;
      if (!synth) return;
      escolherVoz();
      if (typeof synth.onvoiceschanged !== 'undefined') synth.onvoiceschanged = escolherVoz;
      var aquecer = new SpeechSynthesisUtterance(' ');
      aquecer.volume = 0;
      synth.speak(aquecer);
    } catch (e) { /* ignora */ }
  }

  // ---------- inatividade ----------
  var idle = { callback: null, timer: null };

  function limparTimerIdle() {
    clearTimeout(idle.timer);
    idle.timer = null;
  }

  function armarIdle() {
    limparTimerIdle();
    if (!idle.callback || falando) return;
    var ms = (window.GAME_DATA && window.GAME_DATA.tempoInatividadeMs) || 10000;
    idle.timer = setTimeout(function () {
      idle.timer = null;
      var cb = idle.callback;
      try { if (cb) cb(); } catch (e) { console.error('Narrator idle', e); }
      armarIdle(); // reinicia (se a callback falar, só volta a contar após a fala)
    }, ms);
  }

  function pausarIdle() { limparTimerIdle(); }
  function retomarIdle() { if (idle.callback) armarIdle(); }

  function aoTocarTela() { if (idle.callback) armarIdle(); }

  function startIdle(callback) {
    idle.callback = typeof callback === 'function' ? callback : null;
    armarIdle();
  }

  function stopIdle() {
    idle.callback = null;
    limparTimerIdle();
  }

  document.addEventListener('pointerdown', aoTocarTela, true);

  window.Narrator = {
    unlock: unlock,
    speak: speak,
    repeat: repeat,
    stop: stop,
    startIdle: startIdle,
    stopIdle: stopIdle,
    get isSpeaking() { return falando; }
  };
})();
