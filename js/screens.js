/*
 * screens.js — Telas do jogo "Na Medida Certa".
 * Cada tela é registrada em App.registerScreen e lê o conteúdo de GAME_DATA.
 * Regra de ouro: toda tela fala, as opções ficam bloqueadas durante a fala,
 * sem game over, sem cronômetro e sem pontos negativos.
 */
(function () {
  'use strict';

  var D = window.GAME_DATA;
  var B = D.botoes;
  var POR_PAGINA = 6;
  var PAUSA_QUADRO_MS = 600;
  var TOTAL_CONFETES = 40;
  var CORES_CONFETE = ['#f9c6c9', '#fde2a7', '#c7e9c0', '#bfdcf5', '#e3d0f5', '#ffd8b1'];

  /* ---------- Helpers gerais ---------- */

  // Sessão de tela: evita mexer no DOM antigo depois de trocar de tela.
  function novaSessao() {
    return { ativa: true };
  }

  // Fala e devolve true se a tela ainda estiver ativa ao terminar.
  function falar(sessao, codigo) {
    return Narrator.speak(codigo).then(function () {
      return sessao.ativa;
    });
  }

  function esperar(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function bloquear(els) {
    els.forEach(function (el) { el.classList.add('bloqueado'); });
  }

  function desbloquear(els) {
    els.forEach(function (el) { el.classList.remove('bloqueado'); });
  }

  function estaBloqueado(el) {
    return el.classList.contains('bloqueado');
  }

  function rotulo(texto) {
    return App.el('div', { className: 'rotulo', text: texto });
  }

  function criarTela(classeExtra) {
    return App.el('div', { className: 'tela ' + classeExtra });
  }

  // Cabeçalho das fases: nome da fase + progresso.
  function criarCabecalho(titulo, progresso) {
    return App.el('div', { className: 'painel' },
      App.el('div', { className: 'subtitulo', text: titulo }),
      App.el('div', { className: 'rotulo', text: progresso })
    );
  }

  // Botão CONTINUAR (começa oculto).
  function criarContinuar(acao) {
    var btn = App.imgBtn(B.continuar, 'CONTINUAR', acao, 'btn-continuar');
    btn.classList.add('oculto');
    return btn;
  }

  function mostrar(el) {
    el.classList.remove('oculto');
    el.classList.add('bounce-in');
  }

  // Cria um botão com imagem e palavra em CAIXA ALTA abaixo.
  function criarItemImagem(classe, src, texto, acao) {
    var btn = App.el('button', { className: classe, ariaLabel: texto },
      App.el('img', { src: src, alt: texto }),
      rotulo(texto)
    );
    App.onTap(btn, function () {
      if (!estaBloqueado(btn)) { acao(btn); }
    });
    return btn;
  }

  /* ---------- 1. Início ---------- */

  var inicio = (function () {
    var sessao = novaSessao();

    function render(root) {
      sessao = novaSessao();
      var tela = criarTela('tela--creme');
      var logo = App.el('img', { className: 'logo-grande flutuar', src: D.logo, alt: 'NA MEDIDA CERTA' });
      var comecar = App.imgBtn(B.comecar, 'COMEÇAR', function () {
        if (!estaBloqueado(comecar)) { App.go('quemJoga'); }
      }, 'btn-img--grande');
      var prof = App.imgBtn(B.professora, 'PROFESSORA', function () {
        App.go('professora');
      }, 'btn-img--pequeno canto-inf-dir');
      tela.appendChild(logo);
      tela.appendChild(comecar);
      tela.appendChild(prof);
      root.appendChild(tela);
      bloquear([comecar]);
      falar(sessao, 'N01').then(function (ativa) {
        if (!ativa) { return; }
        desbloquear([comecar]);
        Narrator.startIdle(function () { Narrator.repeat(); });
      });
    }

    return { render: render, leave: function () { sessao.ativa = false; } };
  })();

  /* ---------- 2. Quem vai jogar ---------- */

  var quemJoga = (function () {
    var sessao = novaSessao();
    var VISITANTE = { id: 'visitante', nome: 'VISITANTE', foto: null };

    function criarAvatar(aluno) {
      if (aluno.foto) {
        return App.el('img', { className: 'card-aluno__foto', src: aluno.foto, alt: aluno.nome });
      }
      return App.el('div', { className: 'card-aluno__inicial', text: (aluno.nome || '?').charAt(0).toUpperCase() });
    }

    function criarCardAluno(aluno) {
      var card = App.el('button', { className: 'card-aluno', ariaLabel: aluno.nome },
        criarAvatar(aluno),
        App.el('span', { className: 'card-aluno__nome', text: String(aluno.nome).toUpperCase() })
      );
      App.onTap(card, function () {
        if (estaBloqueado(card)) { return; }
        Sfx.toque();
        App.iniciarPartida(aluno);
        App.go('abertura');
      });
      return card;
    }

    function criarSeta(voltar, acao) {
      var seta = App.imgBtn(B.proximo, voltar ? 'VOLTAR' : 'PRÓXIMO', acao, 'btn-img--grande');
      if (voltar) { seta.style.transform = 'scaleX(-1)'; }
      return seta;
    }

    // Monta uma página da grade e as setas de navegação.
    function desenharPagina(ctx) {
      var inicioPag = ctx.pagina * POR_PAGINA;
      var visiveis = ctx.alunos.slice(inicioPag, inicioPag + POR_PAGINA);
      ctx.grade.innerHTML = '';
      visiveis.forEach(function (a) { ctx.grade.appendChild(criarCardAluno(a)); });
      ctx.voltar.classList.toggle('oculto', ctx.pagina === 0);
      ctx.avancar.classList.toggle('oculto', inicioPag + POR_PAGINA >= ctx.alunos.length);
      if (ctx.travado) { bloquear(Array.prototype.slice.call(ctx.grade.children)); }
    }

    function criarContexto(alunos) {
      var ctx = { alunos: alunos, pagina: 0, travado: true, grade: App.el('div', { className: 'grade-alunos' }) };
      ctx.voltar = criarSeta(true, function () {
        if (ctx.pagina > 0) { ctx.pagina -= 1; desenharPagina(ctx); }
      });
      ctx.avancar = criarSeta(false, function () {
        ctx.pagina += 1;
        desenharPagina(ctx);
      });
      return ctx;
    }

    function render(root) {
      sessao = novaSessao();
      var cadastrados = Repo.getAlunos() || [];
      var ctx = criarContexto(cadastrados.length ? cadastrados : [VISITANTE]);
      var tela = criarTela('tela--creme');
      tela.appendChild(App.el('h1', { className: 'titulo', text: 'QUEM VAI JOGAR?' }));
      tela.appendChild(App.el('div', { className: 'linha-botoes' }, ctx.voltar, ctx.grade, ctx.avancar));
      if (!cadastrados.length) {
        tela.appendChild(App.el('p', { className: 'subtitulo', text: 'A PROFESSORA PODE CADASTRAR ALUNOS' }));
      }
      root.appendChild(tela);
      desenharPagina(ctx);
      bloquear([ctx.voltar, ctx.avancar]);
      falar(sessao, 'N01B').then(function (ativa) {
        if (!ativa) { return; }
        ctx.travado = false;
        desbloquear([ctx.voltar, ctx.avancar].concat(Array.prototype.slice.call(ctx.grade.children)));
        Narrator.startIdle(function () { Narrator.repeat(); });
      });
    }

    return { render: render, leave: function () { sessao.ativa = false; } };
  })();

  /* ---------- 3. Abertura ---------- */

  var abertura = (function () {
    var sessao = novaSessao();

    function irParaFase1() {
      App.go('fase1', { indice: 0 });
    }

    function desenharQuadro(palco, quadro) {
      palco.innerHTML = '';
      palco.appendChild(App.el('div', { className: 'quadro-abertura fade-in' },
        App.el('img', { src: quadro.img, alt: quadro.rotulo }),
        rotulo(quadro.rotulo)
      ));
    }

    // Toca os quadros em sequência; para se a tela for trocada.
    function tocarQuadros(palco, i) {
      if (!sessao.ativa) { return Promise.resolve(false); }
      if (i >= D.abertura.length) { return Promise.resolve(true); }
      var quadro = D.abertura[i];
      var minhaSessao = sessao;
      desenharQuadro(palco, quadro);
      return falar(minhaSessao, quadro.fala)
        .then(function () { return esperar(PAUSA_QUADRO_MS); })
        .then(function () {
          return minhaSessao.ativa ? tocarQuadros(palco, i + 1) : false;
        });
    }

    function render(root) {
      sessao = novaSessao();
      var tela = criarTela('tela--creme');
      var palco = App.el('div', { className: 'cena' });
      var continuar = criarContinuar(irParaFase1);
      var pular = App.imgBtn(B.pular, 'PULAR', irParaFase1, 'btn-img--pequeno canto-inf-dir');
      tela.appendChild(palco);
      tela.appendChild(continuar);
      tela.appendChild(pular);
      root.appendChild(tela);
      tocarQuadros(palco, 0).then(function (terminou) {
        if (!terminou || !sessao.ativa) { return; }
        mostrar(continuar);
        Narrator.startIdle(function () { continuar.classList.add('dica'); });
      });
    }

    return { render: render, leave: function () { sessao.ativa = false; } };
  })();

  /* ---------- 4. Fase 1 — No mercado ---------- */

  var fase1 = (function () {
    var cfg = D.fase1Config;
    var sessao = novaSessao();
    var st = null; // estado da rodada atual

    function itensDisponiveis() {
      return st.itens.filter(function (it) { return !it.classList.contains('item--usado'); });
    }

    function mostrarNumero(contagem) {
      st.numero.innerHTML = '';
      st.numero.appendChild(App.el('img', { className: 'pop', src: cfg.imgNumeros[contagem - 1], alt: String(contagem) }));
      st.numero.classList.remove('oculto');
    }

    function encherSlot(contagem) {
      var slot = st.slots[contagem - 1];
      slot.classList.add('slot--cheio');
      slot.appendChild(App.el('img', { className: 'pop', src: st.rodada.img, alt: st.rodada.rotulo }));
    }

    // Cesta completa: elogio e libera CONTINUAR.
    function completarCesta() {
      Sfx.acerto();
      bloquear(st.itens);
      falar(sessao, st.rodada.acerto).then(function (ativa) {
        if (!ativa) { return; }
        desbloquear(itensDisponiveis());
        mostrar(st.continuar);
      });
    }

    // Toque depois da cesta cheia: o item fica na prateleira.
    function tocarComCestaCheia() {
      st.erros += 1;
      Sfx.erro();
      if (st.erros >= 2) {
        st.continuar.classList.add('dica');
        st.usouDica = true;
      }
      Narrator.speak(cfg.cestaCheia);
    }

    function aoTocarItem(item) {
      if (st.contagem >= st.rodada.quantidade) { tocarComCestaCheia(); return; }
      st.contagem += 1;
      var contagem = st.contagem;
      item.classList.add('item--usado');
      item.classList.remove('dica');
      encherSlot(contagem);
      Sfx.toque();
      mostrarNumero(contagem);
      var fala = falar(sessao, cfg.falasNumeros[contagem - 1]);
      if (contagem === st.rodada.quantidade) {
        bloquear(st.itens);
        fala.then(function (ativa) { if (ativa) { completarCesta(); } });
      }
    }

    function aoFicarParado() {
      st.usouDica = true;
      if (st.contagem >= st.rodada.quantidade) {
        st.continuar.classList.add('dica');
        return;
      }
      var livres = itensDisponiveis();
      if (livres.length) { livres[0].classList.add('dica'); }
      Narrator.speak([cfg.dicaInatividade, st.rodada.instrucao]);
    }

    function aoContinuar() {
      App.registrar({
        fase: 1, rodada: st.rodada.rodada, erros: st.erros,
        usouDica: st.usouDica, tempoMs: Date.now() - (st.inicio || Date.now())
      });
      var proximo = st.indice + 1;
      if (proximo < D.fase1.length) { App.go('fase1', { indice: proximo }); } else { App.go('transicao'); }
    }

    function criarPrateleira() {
      var prat = App.el('div', { className: 'prateleira' });
      for (var i = 0; i < cfg.itensNaPrateleira; i++) {
        var item = criarItemImagem('item', st.rodada.img, st.rodada.rotulo, aoTocarItem);
        st.itens.push(item);
        prat.appendChild(item);
      }
      return prat;
    }

    function criarCesta() {
      var slots = App.el('div', { className: 'slots' });
      for (var i = 0; i < st.rodada.quantidade; i++) {
        var slot = App.el('div', { className: 'slot' });
        st.slots.push(slot);
        slots.appendChild(slot);
      }
      return App.el('div', { className: 'cesta' },
        App.el('img', { className: 'cesta__img', src: cfg.cesta, alt: 'CESTA' }), slots);
    }

    function montarTela(root) {
      var tela = criarTela('tela--mercado');
      tela.appendChild(criarCabecalho('FASE 1 — NO MERCADO', 'RODADA ' + (st.indice + 1) + ' DE ' + D.fase1.length));
      tela.appendChild(criarPrateleira());
      st.numero = App.el('div', { className: 'numero-grande oculto' });
      tela.appendChild(st.numero);
      tela.appendChild(criarCesta());
      st.continuar = criarContinuar(aoContinuar);
      tela.appendChild(st.continuar);
      root.appendChild(tela);
    }

    function render(root, params) {
      sessao = novaSessao();
      var indice = (params && params.indice) || 0;
      st = { indice: indice, rodada: D.fase1[indice], contagem: 0, erros: 0,
        usouDica: false, inicio: 0, itens: [], slots: [] };
      montarTela(root);
      bloquear(st.itens);
      var falas = indice === 0 ? [cfg.entrada, st.rodada.instrucao] : st.rodada.instrucao;
      falar(sessao, falas).then(function (ativa) {
        if (!ativa) { return; }
        st.inicio = Date.now();
        desbloquear(st.itens);
        Narrator.startIdle(aoFicarParado);
      });
    }

    return { render: render, leave: function () { sessao.ativa = false; } };
  })();

  /* ---------- 5. Transição ---------- */

  var transicao = (function () {
    var sessao = novaSessao();

    function render(root) {
      sessao = novaSessao();
      var t = D.transicao;
      var tela = criarTela('tela--creme');
      var continuar = criarContinuar(function () { App.go('fase2', { indice: 0 }); });
      tela.appendChild(App.el('h1', { className: 'titulo', text: t.titulo }));
      tela.appendChild(App.el('img', { className: 'bounce-in', src: t.img, alt: t.titulo }));
      tela.appendChild(continuar);
      root.appendChild(tela);
      falar(sessao, t.fala).then(function (ativa) {
        if (!ativa) { return; }
        mostrar(continuar);
        Narrator.startIdle(function () { Narrator.repeat(); continuar.classList.add('dica'); });
      });
    }

    return { render: render, leave: function () { sessao.ativa = false; } };
  })();

  /* ---------- 6. Fase 2 — Na cozinha ---------- */

  var fase2 = (function () {
    var cfg = D.fase2Config;
    var sessao = novaSessao();
    var st = null;

    // Opção sem foto: emoji repetido (ex.: 5 pratos).
    function criarEmojiRepetido(opcao) {
      var texto = new Array((opcao.qtdEmoji || 1) + 1).join(opcao.emoji);
      var span = App.el('div', { className: 'cena-emoji', text: texto, ariaLabel: opcao.rotulo });
      span.style.fontSize = '48px';
      return span;
    }

    function criarCardOpcao(opcao, certa) {
      var visual = opcao.img
        ? App.el('img', { src: opcao.img, alt: opcao.rotulo })
        : criarEmojiRepetido(opcao);
      var card = App.el('button', { className: 'card-opcao', ariaLabel: opcao.rotulo }, visual, rotulo(opcao.rotulo));
      App.onTap(card, function () {
        if (estaBloqueado(card)) { return; }
        if (certa) { aoAcertar(card); } else { aoErrar(); }
      });
      return card;
    }

    function criarCena(situ) {
      var visual = situ.cena
        ? App.el('img', { src: situ.cena, alt: situ.cenaRotulo })
        : App.el('div', { className: 'cena-emoji', text: situ.cenaEmoji, ariaLabel: situ.cenaRotulo });
      return App.el('div', { className: 'cena' }, visual, rotulo(situ.cenaRotulo));
    }

    function aoAcertar(card) {
      Sfx.acerto();
      bloquear(st.cards);
      card.classList.remove('dica', 'bloqueado');
      card.classList.add('card-opcao--certa', 'pop');
      card.style.background = '#c7e9c0';
      card.style.borderColor = '#3a9a3a';
      falar(sessao, st.situ.acerto).then(function (ativa) {
        if (ativa) { mostrar(st.continuar); }
      });
    }

    function aoErrar() {
      st.erros += 1;
      Sfx.erro();
      if (st.erros >= 2) {
        st.cardCerto.classList.add('dica');
        st.usouDica = true;
      }
      Narrator.speak(st.situ.erro);
    }

    function aoFicarParado() {
      st.usouDica = true;
      if (!st.continuar.classList.contains('oculto')) {
        st.continuar.classList.add('dica');
        return;
      }
      st.cardCerto.classList.add('dica');
      Narrator.speak([cfg.dicaInatividade, st.situ.pergunta]);
    }

    function aoContinuar() {
      App.registrar({
        fase: 2, rodada: st.situ.situacao, erros: st.erros,
        usouDica: st.usouDica, tempoMs: Date.now() - (st.inicio || Date.now())
      });
      var proximo = st.indice + 1;
      if (proximo < D.fase2.length) { App.go('fase2', { indice: proximo }); } else { App.go('fim'); }
    }

    function montarTela(root) {
      var situ = st.situ;
      var tela = criarTela('tela--cozinha');
      st.cardCerto = criarCardOpcao(situ.certa, true);
      var errado = criarCardOpcao(situ.errada, false);
      st.cards = situ.ladoCerto === 'esquerda' ? [st.cardCerto, errado] : [errado, st.cardCerto];
      st.continuar = criarContinuar(aoContinuar);
      tela.appendChild(criarCabecalho('FASE 2 — NA COZINHA', 'SITUAÇÃO ' + situ.situacao + ' DE ' + D.fase2.length));
      tela.appendChild(criarCena(situ));
      tela.appendChild(App.el('div', { className: 'opcoes' }, st.cards[0], st.cards[1]));
      tela.appendChild(st.continuar);
      root.appendChild(tela);
    }

    function render(root, params) {
      sessao = novaSessao();
      var indice = (params && params.indice) || 0;
      st = { indice: indice, situ: D.fase2[indice], erros: 0, usouDica: false, inicio: 0 };
      montarTela(root);
      bloquear(st.cards);
      var falas = indice === 0 ? [cfg.entrada, st.situ.pergunta] : st.situ.pergunta;
      falar(sessao, falas).then(function (ativa) {
        if (!ativa) { return; }
        st.inicio = Date.now();
        desbloquear(st.cards);
        Narrator.startIdle(aoFicarParado);
      });
    }

    return { render: render, leave: function () { sessao.ativa = false; } };
  })();

  /* ---------- 7. Fim ---------- */

  var fim = (function () {
    var E = D.encerramento;
    var sessao = novaSessao();

    function criarConfete() {
      var caixa = App.el('div', { className: 'confete' });
      for (var i = 0; i < TOTAL_CONFETES; i++) {
        var pedaco = App.el('i', {});
        pedaco.style.left = Math.floor(Math.random() * 100) + '%';
        pedaco.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
        pedaco.style.background = CORES_CONFETE[i % CORES_CONFETE.length];
        caixa.appendChild(pedaco);
      }
      return caixa;
    }

    function criarResumo() {
      var resumo = App.el('div', { className: 'resumo-atitudes oculto' });
      E.atitudes.forEach(function (a) {
        resumo.appendChild(App.el('div', { className: 'card-opcao' },
          App.el('img', { src: a.img, alt: a.rotulo }), rotulo(a.rotulo)));
      });
      return resumo;
    }

    function criarBotoesFinais() {
      return App.el('div', { className: 'linha-botoes oculto' },
        App.imgBtn(B.jogarDeNovo, 'JOGAR DE NOVO', function () { App.go('inicio'); }, 'btn-continuar'),
        App.imgBtn(B.sair, 'SAIR', function () { App.go('inicio'); }, 'btn-continuar')
      );
    }

    // Sequência: parabéns → resumo → convite.
    function narrar(resumo, botoes) {
      falar(sessao, E.parabens)
        .then(function (ativa) {
          if (!ativa) { return false; }
          mostrar(resumo);
          return falar(sessao, E.resumo);
        })
        .then(function (ativa) {
          if (!ativa) { return false; }
          mostrar(botoes);
          return falar(sessao, E.convite);
        })
        .then(function (ativa) {
          if (ativa) { Narrator.startIdle(function () { Narrator.repeat(); }); }
        });
    }

    function render(root) {
      sessao = novaSessao();
      App.finalizarPartida();
      var aluno = (App.state && App.state.aluno) || { nome: '' };
      var tela = criarTela('tela--creme');
      var resumo = criarResumo();
      var botoes = criarBotoesFinais();
      tela.appendChild(criarConfete());
      tela.appendChild(App.el('img', { className: 'bounce-in', src: E.icone, alt: 'COMEMORAÇÃO' }));
      tela.appendChild(App.el('h1', { className: 'titulo', text: 'PARABÉNS!' }));
      tela.appendChild(App.el('div', { className: 'subtitulo', text: String(aluno.nome || '').toUpperCase() }));
      tela.appendChild(resumo);
      tela.appendChild(botoes);
      root.appendChild(tela);
      narrar(resumo, botoes);
    }

    return { render: render, leave: function () { sessao.ativa = false; } };
  })();

  /* ---------- Registro ---------- */

  App.registerScreen('inicio', inicio);
  App.registerScreen('quemJoga', quemJoga);
  App.registerScreen('abertura', abertura);
  App.registerScreen('fase1', fase1);
  App.registerScreen('transicao', transicao);
  App.registerScreen('fase2', fase2);
  App.registerScreen('fim', fim);
})();
