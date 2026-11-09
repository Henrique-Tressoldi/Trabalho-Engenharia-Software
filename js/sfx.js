/*
 * sfx.js — Efeitos sonoros gerados com WebAudio (sem arquivos).
 * Expõe window.Sfx = { unlock, toque, acerto, erro }. Nunca lança erro.
 */
(function () {
  'use strict';

  var ctx = null;

  // Cria (ou retoma) o AudioContext. Precisa de gesto do usuário.
  function unlock() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }

  // Toca uma nota com envelope suave (ataque e decaimento curtos).
  function nota(freq, inicio, duracao, tipo, volume) {
    var c = unlock();
    if (!c) return;
    var t0 = c.currentTime + inicio;
    var osc = c.createOscillator();
    var ganho = c.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    ganho.gain.setValueAtTime(0.0001, t0);
    ganho.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
    osc.connect(ganho);
    ganho.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duracao + 0.05);
  }

  function seguro(fn) {
    return function () {
      try { fn(); } catch (e) { /* som é opcional: ignora falhas */ }
    };
  }

  window.Sfx = Object.freeze({
    unlock: function () { unlock(); },
    // Blip curto e suave
    toque: seguro(function () { nota(520, 0, 0.09, 'sine', 0.12); }),
    // Duas notas ascendentes agradáveis
    acerto: seguro(function () {
      nota(660, 0, 0.18, 'sine', 0.18);
      nota(880, 0.15, 0.22, 'sine', 0.18);
    }),
    // Nota neutra grave e baixa (nunca buzina)
    erro: seguro(function () { nota(220, 0, 0.25, 'triangle', 0.08); })
  });
})();
