/*
 * professora.js — Área da Professora do jogo "Na Medida Certa".
 * Senha por teclado numérico na tela, cadastro de alunos, relatórios
 * (desempenho da partida e evolução da turma) e backup dos dados (JSON).
 * Dados do usuário são sempre inseridos com textContent (nunca innerHTML).
 */
(function () {
  'use strict';

  var D = window.GAME_DATA;
  var TAM_FOTO = 200;          // lado da foto do aluno (px), em JPEG
  var QUALIDADE_FOTO = 0.8;
  var TAM_SENHA = String(D.senhaProfessora).length;
  var ABAS = [
    { id: 'alunos', rotulo: 'ALUNOS' },
    { id: 'rel1', rotulo: 'RELATÓRIO 1' },
    { id: 'rel2', rotulo: 'RELATÓRIO 2' },
    { id: 'dados', rotulo: 'DADOS' }
  ];

  /* ---------- utilidades de DOM ---------- */

  // Cria elemento com classe e texto (texto sempre via textContent).
  function h(tag, cls, texto) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    return el;
  }

  function anexar(pai, filhos) {
    filhos.forEach(function (f) { if (f) pai.appendChild(f); });
    return pai;
  }

  function aoTocar(el, fn) {
    if (window.App && typeof App.onTap === 'function') App.onTap(el, fn);
    else el.addEventListener('click', fn);
    return el;
  }

  function botao(texto, cls, fn) {
    var b = h('button', 'btn-texto prof-btn ' + (cls || ''), texto);
    b.type = 'button';
    return aoTocar(b, fn);
  }

  function limpar(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // Mostra mensagem amigável (tipo: 'ok' | 'erro').
  function mensagem(el, texto, tipo) {
    el.textContent = texto || '';
    el.className = 'prof-msg' + (tipo ? ' prof-msg--' + tipo : '');
  }

  /* ---------- formatação ---------- */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function formatarData(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function formatarDataHora(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return formatarData(iso) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function simNao(v) { return v ? 'SIM' : 'NÃO'; }

  function formatarPct(v) { return v === null ? '—' : v + '%'; }

  /* ---------- cálculos dos relatórios (funções puras) ---------- */

  // Nome legível da rodada (Fase 1) ou situação (Fase 2).
  function nomeRodada(fase, rodada) {
    if (fase === 1) {
      var r = D.fase1.filter(function (x) { return x.rodada === rodada; })[0];
      return 'RODADA ' + rodada + (r ? ' — ' + r.rotulo : '');
    }
    var s = D.fase2.filter(function (x) { return x.situacao === rodada; })[0];
    return 'SITUAÇÃO ' + rodada + (s ? ' — ' + s.certa.rotulo : '');
  }

  function ordenarRegistros(registros) {
    return (registros || []).slice().sort(function (a, b) {
      return a.fase !== b.fase ? a.fase - b.fase : a.rodada - b.rodada;
    });
  }

  // Relatório 1: uma linha por rodada/situação da partida.
  function calcularRelatorio1(partida) {
    var linhas = ordenarRegistros(partida && partida.registros).map(function (r) {
      return {
        fase: r.fase,
        rodada: r.rodada,
        nome: nomeRodada(r.fase, r.rodada),
        acertouPrimeira: !!r.acertouPrimeira,
        erros: Number(r.erros) || 0,
        usouDica: !!r.usouDica,
        tempoS: Math.round((Number(r.tempoMs) || 0) / 100) / 10
      };
    });
    var acertos = linhas.filter(function (l) { return l.acertouPrimeira; }).length;
    return { linhas: linhas, totalAcertos: acertos, total: linhas.length };
  }

  // % de acertos de primeira de uma fase (null se não houver registros).
  function pctAcertos(registros, fase) {
    var daFase = registros.filter(function (r) { return r.fase === fase; });
    if (!daFase.length) return null;
    var ok = daFase.filter(function (r) { return r.acertouPrimeira; }).length;
    return Math.round((ok / daFase.length) * 100);
  }

  // Rodada/situação com mais erros somados ('—' se nenhum erro).
  function ondeMaisErrou(registros) {
    var soma = {};
    registros.forEach(function (r) {
      var chave = r.fase + '-' + r.rodada;
      soma[chave] = (soma[chave] || 0) + (Number(r.erros) || 0);
    });
    var pior = null;
    Object.keys(soma).sort().forEach(function (k) {
      if (soma[k] > 0 && (!pior || soma[k] > soma[pior])) pior = k;
    });
    if (!pior) return '—';
    var partes = pior.split('-');
    var qtd = soma[pior] + (soma[pior] === 1 ? ' ERRO' : ' ERROS');
    return nomeRodada(Number(partes[0]), Number(partes[1])) + ' (' + qtd + ')';
  }

  function agruparPorAluno(partidas) {
    var grupos = {};
    var ordem = [];
    (partidas || []).forEach(function (p) {
      if (!grupos[p.alunoId]) { grupos[p.alunoId] = []; ordem.push(p.alunoId); }
      grupos[p.alunoId].push(p);
    });
    return { grupos: grupos, ordem: ordem };
  }

  // Relatório 2: uma linha por aluno que tenha partidas.
  function calcularRelatorio2(partidas, alunos) {
    var nomes = {};
    (alunos || []).forEach(function (a) { nomes[a.id] = a.nome; });
    var g = agruparPorAluno(partidas);
    var linhas = g.ordem.map(function (id) {
      var lista = g.grupos[id];
      var registros = [];
      lista.forEach(function (p) { registros = registros.concat(p.registros || []); });
      var ultima = lista.map(function (p) { return p.inicio; }).sort().pop();
      return {
        alunoId: id,
        nome: nomes[id] || lista[0].alunoNome || '—',
        partidas: lista.length,
        ultimaPartida: ultima,
        pctFase1: pctAcertos(registros, 1),
        pctFase2: pctAcertos(registros, 2),
        ondeMaisErrou: ondeMaisErrou(registros)
      };
    });
    return linhas.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  }

  window.Relatorios = Object.freeze({
    calcularRelatorio1: calcularRelatorio1,
    calcularRelatorio2: calcularRelatorio2
  });

  /* ---------- tela de senha ---------- */

  function criarBolinhas(qtd) {
    var caixa = h('div', 'prof-bolinhas');
    caixa.setAttribute('aria-label', 'DÍGITOS DA SENHA');
    for (var i = 0; i < TAM_SENHA; i++) {
      caixa.appendChild(h('span', 'prof-bolinha' + (i < qtd ? ' prof-bolinha--cheia' : '')));
    }
    return caixa;
  }

  function criarTeclado(aoDigito, aoApagar, aoEntrar) {
    var grade = h('div', 'prof-teclado');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(function (n) {
      grade.appendChild(botao(n, 'prof-tecla', function () { aoDigito(n); }));
    });
    grade.appendChild(botao('APAGAR', 'prof-tecla prof-tecla--acao', aoApagar));
    grade.appendChild(botao('0', 'prof-tecla', function () { aoDigito('0'); }));
    grade.appendChild(botao('ENTRAR', 'prof-tecla prof-tecla--entrar', aoEntrar));
    return grade;
  }

  function mostrarSenha(root) {
    var digitado = '';
    var tela = h('div', 'tela tela--creme prof-tela prof-senha');
    var bolinhasBox = h('div', 'prof-bolinhas-box');
    var msg = h('p', 'prof-msg');
    msg.setAttribute('role', 'status');
    function atualizar() {
      limpar(bolinhasBox);
      bolinhasBox.appendChild(criarBolinhas(digitado.length));
    }
    function entrar() {
      if (digitado === String(D.senhaProfessora)) { mostrarPainel(root); return; }
      digitado = '';
      atualizar();
      mensagem(msg, 'SENHA INCORRETA. TENTE DE NOVO.', 'erro');
    }
    var teclado = criarTeclado(
      function (n) { if (digitado.length < TAM_SENHA) { digitado += n; mensagem(msg, ''); atualizar(); } },
      function () { digitado = digitado.slice(0, -1); atualizar(); },
      entrar
    );
    atualizar();
    anexar(tela, [
      h('h1', 'titulo', 'ÁREA DA PROFESSORA'),
      h('p', 'subtitulo', 'DIGITE A SENHA'),
      bolinhasBox, msg, teclado,
      botao('VOLTAR', 'prof-btn--voltar', function () { App.go('inicio'); })
    ]);
    limpar(root);
    root.appendChild(tela);
  }

  /* ---------- painel com abas ---------- */

  function mostrarPainel(root) {
    var tela = h('div', 'tela tela--creme prof-tela prof-painel');
    var abas = h('nav', 'prof-abas prof-nao-imprimir');
    var conteudo = h('section', 'prof-conteudo');
    var botoesAba = {};
    function abrir(id) {
      Object.keys(botoesAba).forEach(function (k) {
        botoesAba[k].classList.toggle('prof-aba--ativa', k === id);
        botoesAba[k].setAttribute('aria-pressed', String(k === id));
      });
      limpar(conteudo);
      RENDER_ABA[id](conteudo);
    }
    ABAS.forEach(function (a) {
      botoesAba[a.id] = botao(a.rotulo, 'prof-aba', function () { abrir(a.id); });
      abas.appendChild(botoesAba[a.id]);
    });
    abas.appendChild(botao('VOLTAR AO JOGO', 'prof-aba prof-aba--sair', function () { App.go('inicio'); }));
    anexar(tela, [abas, conteudo]);
    limpar(root);
    root.appendChild(tela);
    abrir('alunos');
  }

  /* ---------- aba ALUNOS ---------- */

  // Redimensiona a imagem para 200×200 (recorte central) em JPEG dataURL.
  function redimensionarFoto(arquivo) {
    return new Promise(function (resolve, reject) {
      var leitor = new FileReader();
      leitor.onerror = function () { reject(new Error('FOTO_INVALIDA')); };
      leitor.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('FOTO_INVALIDA')); };
        img.onload = function () {
          var lado = Math.min(img.width, img.height);
          var canvas = document.createElement('canvas');
          canvas.width = TAM_FOTO;
          canvas.height = TAM_FOTO;
          canvas.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2,
            lado, lado, 0, 0, TAM_FOTO, TAM_FOTO);
          resolve(canvas.toDataURL('image/jpeg', QUALIDADE_FOTO));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function criarAvatar(aluno) {
    if (aluno.foto) {
      var img = h('img', 'prof-avatar');
      img.src = aluno.foto;
      img.alt = '';
      return img;
    }
    var inicial = (aluno.nome || '?').trim().charAt(0).toUpperCase() || '?';
    return h('span', 'prof-avatar prof-avatar--inicial', inicial);
  }

  function criarListaAlunos(aoMudar) {
    var lista = h('ul', 'prof-lista-alunos');
    var alunos = Repo.getAlunos();
    if (!alunos.length) lista.appendChild(h('li', 'prof-vazio', 'NENHUM ALUNO CADASTRADO AINDA.'));
    alunos.forEach(function (a) {
      var item = h('li', 'prof-aluno');
      anexar(item, [criarAvatar(a), h('span', 'prof-aluno-nome', a.nome),
        botao('REMOVER', 'prof-btn--perigo', function () {
          if (!window.confirm('REMOVER O ALUNO "' + a.nome + '"?')) return;
          Repo.removeAluno(a.id);
          aoMudar('ALUNO REMOVIDO.');
        })]);
      lista.appendChild(item);
    });
    return lista;
  }

  function textoErroCadastro(e) {
    if (e && e.message === 'NOME_OBRIGATORIO') return 'DIGITE O NOME DO ALUNO.';
    if (e && e.message === 'FOTO_INVALIDA') return 'NÃO FOI POSSÍVEL LER A FOTO. TENTE OUTRA IMAGEM.';
    return 'NÃO FOI POSSÍVEL CADASTRAR. TENTE NOVAMENTE.';
  }

  function criarCampoFoto(estado, msg) {
    var rotulo = h('label', 'prof-campo', 'FOTO (OPCIONAL)');
    var arquivo = h('input', 'prof-input-arquivo');
    var previa = h('img', 'prof-avatar prof-previa oculto');
    previa.alt = 'PRÉVIA DA FOTO';
    arquivo.type = 'file';
    arquivo.accept = 'image/*';
    arquivo.addEventListener('change', function () {
      var f = arquivo.files && arquivo.files[0];
      estado.foto = null;
      previa.classList.add('oculto');
      if (!f) { estado.pendente = null; return; }
      estado.pendente = redimensionarFoto(f).then(function (url) {
        estado.foto = url;
        previa.src = url;
        previa.classList.remove('oculto');
        return url;
      }, function (e) { mensagem(msg, textoErroCadastro(e), 'erro'); return null; });
    });
    anexar(rotulo, [arquivo]);
    return { elementos: [rotulo, previa], input: arquivo };
  }

  function criarFormAluno(aoMudar, msg) {
    var form = h('form', 'painel prof-cartao prof-form');
    var estado = { foto: null, pendente: null };
    var rotuloNome = h('label', 'prof-campo', 'NOME DO ALUNO');
    var nome = h('input', 'prof-input');
    nome.type = 'text';
    nome.maxLength = 40;
    nome.autocomplete = 'off';
    anexar(rotuloNome, [nome]);
    var campoFoto = criarCampoFoto(estado, msg);
    var enviar = h('button', 'btn-texto prof-btn prof-btn--principal', 'CADASTRAR');
    enviar.type = 'submit';
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      Promise.resolve(estado.pendente).then(function () {
        try {
          Repo.addAluno(nome.value.trim(), estado.foto);
        } catch (e) { mensagem(msg, textoErroCadastro(e), 'erro'); return; }
        aoMudar('ALUNO CADASTRADO COM SUCESSO!');
      });
    });
    return anexar(form, [h('h2', 'prof-titulo-secao', 'CADASTRAR ALUNO'), rotuloNome]
      .concat(campoFoto.elementos, [enviar]));
  }

  // Redesenha a aba; a mensagem de sucesso é mostrada depois do redesenho.
  function renderAlunos(cont, aviso) {
    var msg = h('p', 'prof-msg');
    msg.setAttribute('role', 'status');
    function recarregar(textoOk) { limpar(cont); renderAlunos(cont, textoOk); }
    var areaLista = h('div', 'painel prof-cartao');
    anexar(areaLista, [h('h2', 'prof-titulo-secao', 'ALUNOS CADASTRADOS'), criarListaAlunos(recarregar)]);
    anexar(cont, [msg, criarFormAluno(recarregar, msg), areaLista]);
    if (aviso) mensagem(msg, aviso, 'ok');
  }

  /* ---------- tabelas e impressão ---------- */

  function criarTabela(cabecalhos, linhas) {
    var tabela = h('table', 'prof-tabela');
    var thead = h('thead');
    var trh = h('tr');
    cabecalhos.forEach(function (c) { var th = h('th', null, c); th.scope = 'col'; trh.appendChild(th); });
    thead.appendChild(trh);
    var tbody = h('tbody');
    linhas.forEach(function (cels) {
      var tr = h('tr');
      cels.forEach(function (c) { tr.appendChild(h('td', null, c)); });
      tbody.appendChild(tr);
    });
    return anexar(tabela, [thead, tbody]);
  }

  function botaoImprimir() {
    var fn = function () { window.print(); };
    var b = (window.App && typeof App.imgBtn === 'function')
      ? App.imgBtn(D.botoes.imprimir, 'IMPRIMIR', fn, 'btn-img--pequeno prof-btn-imprimir')
      : botao('IMPRIMIR', 'prof-btn-imprimir', fn);
    b.classList.add('prof-nao-imprimir');
    return b;
  }

  /* ---------- aba RELATÓRIO 1 ---------- */

  function partidasRecentes() {
    return Repo.getPartidas().slice().sort(function (a, b) {
      return String(b.inicio).localeCompare(String(a.inicio));
    });
  }

  function tabelaRelatorio1(partida) {
    var rel = calcularRelatorio1(partida);
    var caixa = h('div', 'prof-relatorio');
    anexar(caixa, [
      h('h2', 'prof-titulo-secao', 'DESEMPENHO DO ALUNO NA PARTIDA'),
      h('p', 'prof-info', 'ALUNO: ' + (partida.alunoNome || '—') + ' — ' + formatarDataHora(partida.inicio))
    ]);
    if (!rel.total) {
      caixa.appendChild(h('p', 'prof-vazio', 'ESTA PARTIDA AINDA NÃO TEM RODADAS REGISTRADAS.'));
      return caixa;
    }
    var linhas = rel.linhas.map(function (l) {
      return ['FASE ' + l.fase, l.nome, simNao(l.acertouPrimeira), l.erros,
        simNao(l.usouDica), l.tempoS.toFixed(1).replace('.', ',') + ' s'];
    });
    anexar(caixa, [
      criarTabela(['FASE', 'RODADA / SITUAÇÃO', 'ACERTOU DE PRIMEIRA', 'Nº DE ERROS', 'USOU DICA', 'TEMPO'], linhas),
      h('p', 'prof-rodape', 'TOTAL DE ACERTOS DE PRIMEIRA: ' + rel.totalAcertos + ' DE ' + rel.total)
    ]);
    return caixa;
  }

  function renderRelatorio1(cont) {
    var partidas = partidasRecentes();
    var cartao = h('div', 'painel prof-cartao');
    cont.appendChild(cartao);
    if (!partidas.length) {
      cartao.appendChild(h('p', 'prof-vazio', 'NENHUMA PARTIDA REGISTRADA AINDA.'));
      return;
    }
    var rotulo = h('label', 'prof-campo prof-nao-imprimir', 'ESCOLHA A PARTIDA');
    var select = h('select', 'prof-select');
    partidas.forEach(function (p) {
      var op = h('option', null, (p.alunoNome || '—') + ' — ' + formatarDataHora(p.inicio));
      op.value = p.id;
      select.appendChild(op);
    });
    rotulo.appendChild(select);
    var area = h('div');
    function mostrar() {
      var p = partidas.filter(function (x) { return String(x.id) === select.value; })[0];
      limpar(area);
      if (p) area.appendChild(tabelaRelatorio1(p));
    }
    select.addEventListener('change', mostrar);
    anexar(cartao, [rotulo, area, botaoImprimir()]);
    mostrar();
  }

  /* ---------- aba RELATÓRIO 2 ---------- */

  function renderRelatorio2(cont) {
    var cartao = h('div', 'painel prof-cartao prof-relatorio');
    cartao.appendChild(h('h2', 'prof-titulo-secao', 'EVOLUÇÃO DA TURMA'));
    var linhas = calcularRelatorio2(Repo.getPartidas(), Repo.getAlunos());
    cont.appendChild(cartao);
    if (!linhas.length) {
      cartao.appendChild(h('p', 'prof-vazio', 'NENHUMA PARTIDA REGISTRADA AINDA.'));
      return;
    }
    var dados = linhas.map(function (l) {
      return [l.nome, l.partidas, formatarData(l.ultimaPartida),
        formatarPct(l.pctFase1), formatarPct(l.pctFase2), l.ondeMaisErrou];
    });
    anexar(cartao, [
      h('p', 'prof-info', 'GERADO EM ' + formatarDataHora(new Date().toISOString())),
      criarTabela(['ALUNO', 'PARTIDAS JOGADAS', 'ÚLTIMA PARTIDA', '% ACERTOS DE PRIMEIRA FASE 1',
        '% ACERTOS DE PRIMEIRA FASE 2', 'ONDE MAIS ERROU'], dados),
      botaoImprimir()
    ]);
  }

  /* ---------- aba DADOS ---------- */

  function nomeArquivoBackup() {
    var d = new Date();
    return 'na-medida-certa-dados-' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.json';
  }

  function exportar(msg) {
    try {
      var blob = new Blob([Repo.exportJSON()], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = h('a');
      a.href = url;
      a.download = nomeArquivoBackup();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      mensagem(msg, 'ARQUIVO SALVO: ' + a.download, 'ok');
    } catch (e) {
      mensagem(msg, 'NÃO FOI POSSÍVEL EXPORTAR OS DADOS.', 'erro');
    }
  }

  function criarImportar(msg) {
    var rotulo = h('label', 'btn-texto prof-btn prof-btn--arquivo', 'IMPORTAR JSON');
    var input = h('input', 'prof-input-escondido');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      input.value = '';
      if (!f) return;
      if (!window.confirm('IMPORTAR VAI SUBSTITUIR TODOS OS DADOS ATUAIS. CONTINUAR?')) return;
      var leitor = new FileReader();
      leitor.onerror = function () { mensagem(msg, 'NÃO FOI POSSÍVEL LER O ARQUIVO.', 'erro'); };
      leitor.onload = function () {
        try {
          Repo.importJSON(String(leitor.result));
          mensagem(msg, 'DADOS IMPORTADOS COM SUCESSO!', 'ok');
        } catch (e) {
          mensagem(msg, 'ARQUIVO INVÁLIDO. ESCOLHA UM ARQUIVO EXPORTADO PELO JOGO.', 'erro');
        }
      };
      leitor.readAsText(f);
    });
    rotulo.appendChild(input);
    return rotulo;
  }

  function carregarExemplo(msg) {
    if (!window.confirm('CARREGAR DADOS DE EXEMPLO? OS DADOS ATUAIS SERÃO SUBSTITUÍDOS.')) return;
    try {
      Repo.carregarExemplo();
      mensagem(msg, 'DADOS DE EXEMPLO CARREGADOS!', 'ok');
    } catch (e) { mensagem(msg, 'NÃO FOI POSSÍVEL CARREGAR O EXEMPLO.', 'erro'); }
  }

  function apagarTudo(msg) {
    if (!window.confirm('APAGAR TODOS OS ALUNOS E RESULTADOS?')) return;
    if (!window.confirm('TEM CERTEZA? ISSO NÃO PODE SER DESFEITO. FAÇA UM BACKUP ANTES.')) return;
    try {
      Repo.limparTudo();
      mensagem(msg, 'TODOS OS DADOS FORAM APAGADOS.', 'ok');
    } catch (e) { mensagem(msg, 'NÃO FOI POSSÍVEL APAGAR OS DADOS.', 'erro'); }
  }

  function renderDados(cont) {
    var cartao = h('div', 'painel prof-cartao');
    var msg = h('p', 'prof-msg');
    msg.setAttribute('role', 'status');
    var acoes = h('div', 'linha-botoes prof-acoes');
    anexar(acoes, [
      botao('EXPORTAR JSON', 'prof-btn--principal', function () { exportar(msg); }),
      criarImportar(msg),
      botao('CARREGAR DADOS DE EXEMPLO', '', function () { carregarExemplo(msg); }),
      botao('APAGAR TUDO', 'prof-btn--perigo', function () { apagarTudo(msg); })
    ]);
    anexar(cartao, [
      h('h2', 'prof-titulo-secao', 'BACKUP DOS DADOS'),
      h('p', 'prof-info', 'OS DADOS FICAM SALVOS SÓ NESTE NAVEGADOR. EXPORTE O ARQUIVO JSON PARA FAZER BACKUP OU LEVAR PARA OUTRO APARELHO.'),
      acoes, msg
    ]);
    cont.appendChild(cartao);
  }

  var RENDER_ABA = {
    alunos: renderAlunos,
    rel1: renderRelatorio1,
    rel2: renderRelatorio2,
    dados: renderDados
  };

  /* ---------- registro da tela ---------- */

  function botaoOuvir() { return document.getElementById('btn-ouvir'); }

  if (!window.App || typeof App.registerScreen !== 'function') return;
  App.registerScreen('professora', {
    render: function (root) {
      var b = botaoOuvir();
      if (b) b.classList.add('oculto');
      document.body.classList.add('prof-ativa');
      mostrarSenha(root);
    },
    leave: function () {
      var b = botaoOuvir();
      if (b) b.classList.remove('oculto');
      document.body.classList.remove('prof-ativa');
    }
  });
})();
