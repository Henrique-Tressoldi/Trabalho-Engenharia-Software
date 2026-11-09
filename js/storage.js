/*
 * storage.js — Repositório (Repository) sobre localStorage.
 * Chave 'nmc_dados_v1' guarda { alunos: [], partidas: [] }.
 * Sempre devolve cópias (imutável para quem chama).
 */
(function () {
  'use strict';

  var CHAVE = 'nmc_dados_v1';
  var DIA_MS = 24 * 60 * 60 * 1000;

  function novoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function copiar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function vazio() {
    return { alunos: [], partidas: [] };
  }

  function valido(dados) {
    return !!dados && Array.isArray(dados.alunos) && Array.isArray(dados.partidas);
  }

  function ler() {
    try {
      var bruto = window.localStorage.getItem(CHAVE);
      if (!bruto) return vazio();
      var dados = JSON.parse(bruto);
      return valido(dados) ? dados : vazio();
    } catch (e) {
      return vazio();
    }
  }

  function gravar(dados) {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch (e) {
      console.error('Repo: não foi possível salvar', e);
    }
  }

  // ---------- alunos ----------
  function getAlunos() {
    return copiar(ler().alunos);
  }

  function addAluno(nome, foto) {
    var limpo = String(nome == null ? '' : nome).trim().toUpperCase();
    if (!limpo) throw new Error('NOME_OBRIGATORIO');
    var aluno = { id: novoId(), nome: limpo, foto: foto || null, criadoEm: new Date().toISOString() };
    var dados = ler();
    gravar({ alunos: dados.alunos.concat([aluno]), partidas: dados.partidas });
    return copiar(aluno);
  }

  function removeAluno(id) {
    var dados = ler();
    gravar({
      alunos: dados.alunos.filter(function (a) { return a.id !== id; }),
      partidas: dados.partidas
    });
  }

  // ---------- partidas ----------
  function getPartidas() {
    return copiar(ler().partidas);
  }

  function salvarPartida(partida) {
    if (!partida || !partida.id) return;
    var dados = ler();
    var nova = copiar(partida);
    var existe = dados.partidas.some(function (p) { return p.id === nova.id; });
    var partidas = existe
      ? dados.partidas.map(function (p) { return p.id === nova.id ? nova : p; })
      : dados.partidas.concat([nova]);
    gravar({ alunos: dados.alunos, partidas: partidas });
  }

  // ---------- importar / exportar ----------
  function exportJSON() {
    return JSON.stringify(ler(), null, 2);
  }

  function importJSON(str) {
    var dados;
    try {
      dados = JSON.parse(str);
    } catch (e) {
      throw new Error('ARQUIVO_INVALIDO');
    }
    if (!valido(dados)) throw new Error('ARQUIVO_INVALIDO');
    gravar({ alunos: dados.alunos, partidas: dados.partidas });
  }

  function limparTudo() {
    try {
      window.localStorage.removeItem(CHAVE);
    } catch (e) {
      console.error('Repo: não foi possível limpar', e);
    }
  }

  // ---------- dados de exemplo ----------
  function registroExemplo(fase, rodada, quando, nivel) {
    var erros = Math.random() < nivel ? 1 + Math.floor(Math.random() * 2) : 0;
    return {
      fase: fase,
      rodada: rodada,
      erros: erros,
      usouDica: erros > 0 && Math.random() < 0.6,
      acertouPrimeira: erros === 0,
      tempoMs: 4000 + Math.floor(Math.random() * 9000) + erros * 4000,
      dataHora: new Date(quando).toISOString()
    };
  }

  function partidaExemplo(aluno, diasAtras, nivel) {
    var inicio = Date.now() - diasAtras * DIA_MS - Math.floor(Math.random() * 6) * 3600000;
    var t = inicio + 60000;
    var registros = [];
    [1, 2].forEach(function (fase) {
      [1, 2, 3, 4, 5].forEach(function (rodada) {
        var reg = registroExemplo(fase, rodada, t, nivel);
        registros.push(reg);
        t += reg.tempoMs + 15000;
      });
    });
    return {
      id: novoId(),
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      inicio: new Date(inicio).toISOString(),
      fim: new Date(t).toISOString(),
      registros: registros
    };
  }

  function carregarExemplo() {
    var base = Date.now() - 14 * DIA_MS;
    var alunos = ['ANA', 'BRUNO', 'CARLA'].map(function (nome, i) {
      return { id: novoId() + i, nome: nome, foto: null, criadoEm: new Date(base + i * 3600000).toISOString() };
    });
    // Cada aluno joga 2 vezes; a segunda com menos erros (evolução).
    var plano = [[0, 13, 0.5], [0, 4, 0.2], [1, 11, 0.6], [1, 2, 0.35], [2, 9, 0.3], [2, 1, 0.1]];
    var partidas = plano.map(function (p) { return partidaExemplo(alunos[p[0]], p[1], p[2]); });
    var dados = ler();
    gravar({ alunos: dados.alunos.concat(alunos), partidas: dados.partidas.concat(partidas) });
  }

  window.Repo = Object.freeze({
    getAlunos: getAlunos,
    addAluno: addAluno,
    removeAluno: removeAluno,
    getPartidas: getPartidas,
    salvarPartida: salvarPartida,
    exportJSON: exportJSON,
    importJSON: importJSON,
    carregarExemplo: carregarExemplo,
    limparTudo: limparTudo
  });
})();
