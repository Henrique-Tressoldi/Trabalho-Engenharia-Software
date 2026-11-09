/*
 * data.js — Dados do jogo "Na Medida Certa" (fonte única de conteúdo).
 * Tudo vem do "Roteiro do Jogo ES.docx". Para mudar uma fala, rodada ou
 * situação, altere só este arquivo: as telas leem daqui (design data-driven).
 */
(function () {
  'use strict';

  // Falas da narração. A chave é o código do áudio (audio/<CODIGO>.mp3).
  var falas = {
    N01: 'Olá! Bem-vindo ao jogo Na Medida Certa. Toque em COMEÇAR.',
    N01B: 'Quem vai jogar agora? Toque na sua foto.',
    N02: 'Às vezes, compramos comida demais.',
    N03: 'A comida que sobra pode estragar.',
    N04: 'Comida estragada vai para o lixo. Isso é desperdício.',
    N05: 'Hoje, vamos aprender a usar a comida na medida certa. Vamos juntos!',
    N06: 'Estamos no mercado. Vamos comprar só o que precisamos.',
    N07: 'Um.',
    N08: 'Dois.',
    N09: 'Três.',
    N10: 'Quatro.',
    N11: 'Cinco.',
    N12: 'Vamos tentar? Ouça de novo.', // dica de inatividade: antecede a instrução da rodada
    N13: 'Já temos o suficiente. Comprar demais pode estragar.',
    N14: 'Vamos fazer um sanduíche. Precisamos de 2 pães. Toque em 2 pães.',
    N15: 'Muito bem! 2 pães. Só o que precisamos.',
    N16: 'Vamos fazer suco. Precisamos de 3 laranjas. Toque em 3 laranjas.',
    N17: 'Isso mesmo! 3 laranjas.',
    N18: 'Vamos fazer salada. Precisamos de 1 alface. Toque em 1 alface.',
    N19: 'Conseguiu! Só 1 alface.',
    N20: 'A salada também leva tomate. Precisamos de 4 tomates. Toque em 4 tomates.',
    N21: 'Muito bem! 4 tomates.',
    N22: 'Para a semana, precisamos de 5 bananas. Toque em 5 bananas.',
    N23: 'Isso mesmo! 5 bananas. Compra feita na medida certa!',
    N24: 'Você terminou as compras! Agora vamos para a cozinha.',
    N25: 'Estamos na cozinha. Vamos usar a comida sem desperdiçar.',
    N26: 'Vamos tentar? Ouça a pergunta de novo.', // dica de inatividade: antecede a pergunta
    N27: 'Vamos almoçar em 2 pessoas. Quantos pratos colocamos na mesa?',
    N28: 'Isso mesmo! 2 pessoas, 2 pratos.',
    N29: 'Somos 2 pessoas. Conte comigo: um, dois. Tente de novo.',
    N30: 'Qual prato tem comida para uma pessoa?',
    N31: 'Muito bem! Coloque no prato só o que vai comer.',
    N32: 'Esse prato tem comida demais. Pode sobrar. Tente de novo.',
    N33: 'Sobrou arroz do almoço. O que vamos fazer?',
    N34: 'Conseguiu! Guardado na geladeira, o arroz serve para amanhã.',
    N35: 'O arroz ainda está bom. Podemos guardar. Tente de novo.',
    N36: 'O pão ficou durinho. O que vamos fazer?',
    N37: 'Isso mesmo! Pão durinho vira torrada.',
    N38: 'O pão ainda pode ser usado. Tente de novo.',
    N39: 'As bananas ficaram bem maduras. O que vamos fazer?',
    N40: 'Muito bem! Banana madura fica ótima na vitamina.',
    N41: 'A banana madura ainda é boa. Tente de novo.',
    N42: 'Parabéns! Você terminou o jogo.',
    N43: 'Hoje você aprendeu: comprar só o que precisa, servir só o que vai comer e guardar o que sobra.',
    N44: 'Assim, a comida não vai para o lixo. Quer jogar de novo?'
  };

  // Vídeo de abertura: 4 quadros (foto + fala).
  var abertura = [
    { fala: 'N02', img: 'img/carrinho-lotado.png', rotulo: 'COMPRAMOS DEMAIS' },
    { fala: 'N03', img: 'img/banana-passada.png', rotulo: 'A COMIDA ESTRAGA' },
    { fala: 'N04', img: 'img/lixeira-com-comida.png', rotulo: 'DESPERDÍCIO' },
    { fala: 'N05', img: 'img/familia-feliz.jpg', rotulo: 'VAMOS JUNTOS!' }
  ];

  // Fase 1 — No mercado: 5 rodadas de contagem (sempre 6 itens na prateleira).
  var fase1 = [
    { rodada: 1, rotulo: 'PÃO', img: 'img/paof-fresco.png', quantidade: 2, instrucao: 'N14', acerto: 'N15' },
    { rodada: 2, rotulo: 'LARANJA', img: 'img/laranja-fresca.png', quantidade: 3, instrucao: 'N16', acerto: 'N17' },
    { rodada: 3, rotulo: 'ALFACE', img: 'img/alface-fresco.png', quantidade: 1, instrucao: 'N18', acerto: 'N19' },
    { rodada: 4, rotulo: 'TOMATE', img: 'img/tomate-fresco.png', quantidade: 4, instrucao: 'N20', acerto: 'N21' },
    { rodada: 5, rotulo: 'BANANA', img: 'img/banana-madura.png', quantidade: 5, instrucao: 'N22', acerto: 'N23' }
  ];
  var fase1Config = {
    itensNaPrateleira: 6,
    falasNumeros: ['N07', 'N08', 'N09', 'N10', 'N11'],          // índice = quantidade - 1
    imgNumeros: ['img/transicao1.png', 'img/transicao2.png', 'img/transicao3.png', 'img/transicao4.png', 'img/transicao5.png'],
    entrada: 'N06',
    cestaCheia: 'N13',
    dicaInatividade: 'N12',
    cesta: 'img/cesta-de-compra.png',
    fundo: 'img/corredor-mercado.jpg'
  };

  // Fase 2 — Na cozinha: 5 situações de escolha entre 2 opções.
  // "emoji"/"qtdEmoji" substituem a foto quando ela não existe (ex.: 5 pratos).
  var fase2 = [
    {
      situacao: 1, pergunta: 'N27', acerto: 'N28', erro: 'N29', ladoCerto: 'esquerda',
      cena: null, cenaEmoji: '🧑🧑', cenaRotulo: '2 PESSOAS',
      certa: { rotulo: '2 PRATOS', img: 'img/mesa-certa.jpg' },
      errada: { rotulo: '5 PRATOS', img: null, emoji: '🍽️', qtdEmoji: 5 }
    },
    {
      situacao: 2, pergunta: 'N30', acerto: 'N31', erro: 'N32', ladoCerto: 'direita',
      cena: null, cenaEmoji: '🧑', cenaRotulo: '1 PESSOA',
      certa: { rotulo: 'UMA PORÇÃO', img: 'img/prato-com-quantia-certa.jpg' },
      errada: { rotulo: 'MUITA COMIDA', img: 'img/fogao-excesso-de-comida.png' }
    },
    {
      situacao: 3, pergunta: 'N33', acerto: 'N34', erro: 'N35', ladoCerto: 'direita',
      cena: 'img/sobra-de-arroz.png', cenaRotulo: 'SOBROU ARROZ',
      certa: { rotulo: 'GUARDAR NA GELADEIRA', img: 'img/arroz-armazenado.jpg' },
      errada: { rotulo: 'JOGAR FORA', img: 'img/lixeira-com-comida.png' }
    },
    {
      situacao: 4, pergunta: 'N36', acerto: 'N37', erro: 'N38', ladoCerto: 'esquerda',
      cena: 'img/pao-amanhecido.png', cenaRotulo: 'PÃO DURINHO',
      certa: { rotulo: 'FAZER TORRADA', img: 'img/torradas.png' },
      errada: { rotulo: 'JOGAR FORA', img: 'img/lixeira-com-comida.png' }
    },
    {
      situacao: 5, pergunta: 'N39', acerto: 'N40', erro: 'N41', ladoCerto: 'direita',
      cena: 'img/banana-passada.png', cenaRotulo: 'BANANAS MADURAS',
      certa: { rotulo: 'FAZER VITAMINA', img: 'img/copo-de-vitamina.png' },
      errada: { rotulo: 'JOGAR FORA', img: 'img/lixeira-com-comida.png' }
    }
  ];
  var fase2Config = {
    entrada: 'N25',
    dicaInatividade: 'N26',
    fundo: 'img/cozinha.jpg'
  };

  // Transição e encerramento.
  var transicao = { fala: 'N24', img: 'img/cesta-compra-certa.png', titulo: 'VOCÊ TERMINOU AS COMPRAS!' };
  var encerramento = {
    parabens: 'N42', resumo: 'N43', convite: 'N44',
    img: 'img/familia-feliz.jpg', icone: 'img/icon-comemoracao.png',
    atitudes: [
      { rotulo: 'COMPRAR SÓ O QUE PRECISA', img: 'img/cesta-compra-certa.png' },
      { rotulo: 'SERVIR SÓ O QUE VAI COMER', img: 'img/prato-com-quantia-certa.jpg' },
      { rotulo: 'GUARDAR O QUE SOBRA', img: 'img/arroz-armazenado.jpg' }
    ]
  };

  // Botões em imagem (assets da equipe).
  var botoes = {
    comecar: 'img/btn-comecar.png',
    continuar: 'img/btn-continuar.png',
    proximo: 'img/btn-proximo.png',
    ouvir: 'img/btn-ouvirdenovo.png',
    jogarDeNovo: 'img/btn-jogardenovo.png',
    sair: 'img/btn-sair.png',
    pular: 'img/btn-pular.png',
    professora: 'img/btn-professora.png',
    imprimir: 'img/btn-impremir.png',
    enviar: 'img/btn-enviar.png'
  };

  window.GAME_DATA = Object.freeze({
    falas: falas,
    abertura: abertura,
    fase1: fase1,
    fase1Config: fase1Config,
    fase2: fase2,
    fase2Config: fase2Config,
    transicao: transicao,
    encerramento: encerramento,
    botoes: botoes,
    logo: 'img/logo-3d-na-medida-certa.png',
    cardJogador: 'img/card-jogador.png',
    tempoInatividadeMs: 10000,
    senhaProfessora: '1234'
  });
})();
