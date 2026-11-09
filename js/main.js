/*
 * main.js — Núcleo do app: roteador de telas (máquina de estados),
 * estado da partida, helpers de DOM e tela de desbloqueio de áudio.
 */
(function () {
  'use strict';

  var MS_ANTI_DUPLO = 350;
  var telas = {};
  var telaAtual = null;

  // ---------- helpers de DOM ----------
  function aplicarAttr(el, chave, valor) {
    if (valor == null || valor === false) return;
    switch (chave) {
      case 'className': el.className = valor; break;
      case 'text': el.textContent = valor; break;
      case 'html': break; // não suportado de propósito (evita XSS)
      case 'onclick': onTap(el, valor); break;
      case 'ariaLabel': el.setAttribute('aria-label', valor); break;
      case 'dataset': Object.keys(valor).forEach(function (k) { el.dataset[k] = valor[k]; }); break;
      case 'style':
        if (typeof valor === 'string') el.style.cssText = valor;
        else Object.keys(valor).forEach(function (k) { el.style[k] = valor[k]; });
        break;
      default:
        if (chave in el && typeof valor !== 'string') el[chave] = valor;
        else el.setAttribute(chave, valor === true ? '' : valor);
    }
  }

  function el(tag, attrs) {
    var no = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { aplicarAttr(no, k, attrs[k]); });
    Array.prototype.slice.call(arguments, 2).forEach(function anexar(filho) {
      if (filho == null || filho === false) return;
      if (Array.isArray(filho)) { filho.forEach(anexar); return; }
      no.appendChild(typeof filho === 'string' || typeof filho === 'number'
        ? document.createTextNode(String(filho)) : filho);
    });
    return no;
  }

  // Clique/toque com proteção contra duplo disparo.
  function onTap(alvo, fn) {
    var ultimo = 0;
    alvo.addEventListener('click', function (ev) {
      var agora = Date.now();
      if (agora - ultimo < MS_ANTI_DUPLO) return;
      ultimo = agora;
      try { fn(ev); } catch (e) { console.error('App.onTap', e); }
    });
    return alvo;
  }

  function imgBtn(src, label, onclick, extraClass) {
    var botao = el('button', {
      type: 'button',
      className: 'btn-img' + (extraClass ? ' ' + extraClass : ''),
      ariaLabel: label
    }, el('img', { src: src, alt: '', draggable: 'false' }));
    if (onclick) onTap(botao, onclick);
    return botao;
  }

  // ---------- roteador ----------
  function registerScreen(nome, def) {
    if (!def || typeof def.render !== 'function') {
      console.error('App.registerScreen: tela inválida', nome);
      return;
    }
    telas[nome] = def;
  }

  function sairDaTelaAtual() {
    var atual = telaAtual && telas[telaAtual];
    if (atual && typeof atual.leave === 'function') {
      try { atual.leave(); } catch (e) { console.error('App.leave', e); }
    }
  }

  function mostrarErro(root) {
    root.innerHTML = '';
    var botao = el('button', { type: 'button', className: 'btn-texto' }, 'ALGO DEU ERRADO. TOQUE PARA VOLTAR AO INÍCIO.');
    onTap(botao, function () { go('inicio'); });
    root.appendChild(el('div', { className: 'tela tela--creme' }, botao));
  }

  function go(nome, params) {
    var root = App.root || document.getElementById('app');
    App.root = root;
    sairDaTelaAtual();
    window.Narrator.stop();
    window.Narrator.stopIdle();
    root.innerHTML = '';
    root.classList.remove('fade-in');
    void root.offsetWidth; // reinicia a animação
    root.classList.add('fade-in');
    telaAtual = nome;
    var def = telas[nome];
    try {
      if (!def) throw new Error('Tela não registrada: ' + nome);
      def.render(root, params || {});
    } catch (e) {
      console.error('App.go', nome, e);
      if (nome === 'inicio') { root.textContent = 'ALGO DEU ERRADO.'; return; }
      mostrarErro(root);
    }
  }

  // ---------- estado da partida ----------
  function salvar() {
    if (App.state.partida) window.Repo.salvarPartida(App.state.partida);
  }

  function iniciarPartida(aluno) {
    var partida = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      alunoId: aluno ? aluno.id : null,
      alunoNome: aluno ? aluno.nome : '',
      inicio: new Date().toISOString(),
      fim: null,
      registros: []
    };
    App.state = { aluno: aluno || null, partida: partida };
    salvar();
    return partida;
  }

  function registrar(dados) {
    var partida = App.state.partida;
    if (!partida) return;
    var erros = Number(dados.erros) || 0;
    var registro = {
      fase: dados.fase,
      rodada: dados.rodada,
      erros: erros,
      usouDica: !!dados.usouDica,
      acertouPrimeira: erros === 0,
      tempoMs: Number(dados.tempoMs) || 0,
      dataHora: new Date().toISOString()
    };
    var nova = Object.assign({}, partida, { registros: partida.registros.concat([registro]) });
    App.state = { aluno: App.state.aluno, partida: nova };
    salvar();
  }

  function finalizarPartida() {
    var partida = App.state.partida;
    if (!partida) return;
    App.state = { aluno: App.state.aluno, partida: Object.assign({}, partida, { fim: new Date().toISOString() }) };
    salvar();
  }

  // ---------- desbloqueio de áudio (risco R08) ----------
  function liberarAudio() {
    window.Narrator.unlock();
    App.audioLiberado = true;
    var ouvir = document.getElementById('btn-ouvir');
    if (ouvir) ouvir.classList.remove('oculto');
    go('inicio');
  }

  function renderDesbloqueio(root) {
    var botao = el('button', { type: 'button', className: 'btn-tocar', ariaLabel: 'Tocar para começar' },
      el('span', { className: 'btn-tocar__icone', 'aria-hidden': 'true' }, '▶'),
      el('span', { className: 'btn-tocar__texto' }, 'TOCAR PARA COMEÇAR'));
    onTap(botao, liberarAudio);
    root.appendChild(el('div', { className: 'tela tela--creme tela-desbloqueio' },
      el('img', { className: 'logo-grande flutuar', src: window.GAME_DATA.logo, alt: 'Na Medida Certa' }),
      botao));
  }

  function iniciar() {
    App.root = document.getElementById('app');
    var ouvir = document.getElementById('btn-ouvir');
    if (ouvir) onTap(ouvir, function () { window.Narrator.repeat(); });
    if (App.audioLiberado) go('inicio');
    else go('desbloqueio');
  }

  var App = {
    root: null,
    state: { aluno: null, partida: null },
    audioLiberado: false,
    registerScreen: registerScreen,
    go: go,
    el: el,
    imgBtn: imgBtn,
    onTap: onTap,
    iniciarPartida: iniciarPartida,
    registrar: registrar,
    finalizarPartida: finalizarPartida,
    get telaAtual() { return telaAtual; }
  };

  registerScreen('desbloqueio', { render: renderDesbloqueio });
  window.App = App;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
