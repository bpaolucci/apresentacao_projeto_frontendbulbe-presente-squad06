// =========================================================
// HU04 · Acompanhe sua energia
// Lê o cliente do data/clientes.json e monta a tela de acordo
// com o status da adesão.
//
// Um cliente para cada estado da tela:
//   ?cliente=1 → em conexão          ?cliente=4 → aguardando análise
//   ?cliente=2 → conectado           ?cliente=5 → atrasado
//   ?cliente=3 → pendência (falta a conta de luz)
// Também dá para forçar um estado: ?estado=atrasado ou ?estado=pendencia
// =========================================================

import { buscarClientes, buscarFaturasDoCliente, buscarAvisosDoCliente } from './api.js';

// ---------- Valores fictícios usados nos cálculos ----------
const PRAZO_CONEXAO_DIAS = 90; // prazo previsto da adesão até a conexão
const DIAS_EXTRA_ATRASO = 7;   // nova previsão quando atrasa
const TARIFA_KWH = 0.95;       // R$ por kWh (valor fictício da Cemig)
const PARTE_BULBE = 0.9;       // depois da conexão, 90% da energia vem da Bulbe

const TITULOS_ETAPAS = [
  'Adesão recebida',
  'Análise da conta de luz',
  'Conexão com a Cemig',
  '1ª fatura Bulbe'
];

// Situação de cada uma das 4 etapas em cada estado da tela
const SITUACOES = {
  pendencia:               ['concluida', 'pendente', 'futura', 'futura'],
  aguardando_qualificacao: ['concluida', 'atual', 'futura', 'futura'],
  em_conexao:              ['concluida', 'concluida', 'atual', 'futura'],
  atrasado:                ['concluida', 'concluida', 'atrasada', 'futura'],
  conectado:               ['concluida', 'concluida', 'concluida', 'atual']
};

// Como fica a ilustração usina → Cemig → casa em cada estado
// pontos: classe de cada ponto · conector1/2: quanto da linha está verde
// raio: em qual conector o raio fica e em que posição
const CAMINHO = {
  pendencia:               { usina: 'pendente',  cemig: '',          casa: '',      conector1: 0,   conector2: 0,   raio: [1, 0],  parado: true },
  aguardando_qualificacao: { usina: 'atual',     cemig: '',          casa: '',      conector1: 0,   conector2: 0,   raio: [1, 0],  parado: false },
  em_conexao:              { usina: 'concluido', cemig: 'atual',     casa: '',      conector1: 100, conector2: 15,  raio: [2, 15], parado: false },
  atrasado:                { usina: 'concluido', cemig: 'atual',     casa: '',      conector1: 100, conector2: 15,  raio: [2, 15], parado: false },
  conectado:               { usina: 'concluido', cemig: 'concluido', casa: 'atual', conector1: 100, conector2: 100, raio: [2, 85], parado: false }
};

const TEXTO_CAMINHO = {
  pendencia: 'A energia está pronta, mas a análise parou: falta um documento.',
  aguardando_qualificacao: 'A energia está pronta na usina, esperando a análise da sua conta.',
  em_conexao: 'A energia está na rede da Cemig, a caminho da sua casa.',
  atrasado: 'A energia está na rede da Cemig, a caminho da sua casa.',
  conectado: 'Sua energia já chega em casa como crédito.'
};

const SUBTITULOS = {
  pendencia: 'Falta um documento para continuar',
  conectado: 'Sua energia Bulbe já chegou'
};

// Ícones dos marcadores das etapas
const ICONES = {
  concluida: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  atual: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
  pendente: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 6v8M12 18h.01"/></svg>',
  futura: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>',
  relogio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
};
ICONES.atrasada = ICONES.atual;

const SELOS = {
  atual: '<span class="selo selo-agora">Agora</span>',
  atrasada: '<span class="selo selo-atrasada">Atrasada</span>',
  pendente: '<span class="selo selo-pendente">Pendente</span>'
};

const NOMES_SITUACAO = {
  concluida: 'concluída',
  atual: 'etapa atual',
  atrasada: 'etapa atual, atrasada',
  pendente: 'etapa atual, parada por pendência',
  futura: 'próxima etapa'
};

// ---------- Funções de apoio ----------

// "2026-09-02" vira uma data (sem problema de fuso horário)
function lerData(texto) {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function somarDias(data, dias) {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

// 05/11
function diaMes(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// 05/11 (quinta-feira)
function dataComDiaDaSemana(data) {
  const semana = data.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${diaMes(data)} (${semana})`;
}

function reais(valor, comCentavos = false) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: comCentavos ? 2 : 0,
    maximumFractionDigits: comCentavos ? 2 : 0
  });
}

// Descrição de cada etapa, de acordo com a situação dela
function descricaoDaEtapa(indice, situacao, dados) {
  if (indice === 0) return `Cadastro recebido em ${diaMes(dados.adesao)}.`;

  if (indice === 1) {
    if (situacao === 'concluida') return 'Desconto aprovado.';
    if (situacao === 'pendente') return 'Parada: falta um documento.';
    return 'Estamos conferindo sua conta.';
  }

  if (indice === 2) {
    if (situacao === 'concluida') return `Sua casa está ligada desde ${diaMes(dados.previsao)}.`;
    if (situacao === 'futura') return 'A Cemig liga sua casa à usina.';
    return 'A Cemig está ligando sua casa à usina. Leva algumas semanas.';
  }

  if (situacao === 'atual') return 'Chega pelo WhatsApp no próximo mês.';
  return 'Chega pelo WhatsApp, com desconto.';
}

// HTML de uma etapa da trilha
function etapaHTML(indice, situacao, dados) {
  const aviso = situacao === 'atrasada'
    ? `<p class="aviso-atraso texto-p2">${ICONES.relogio} Atrasou. Nova previsão: ${diaMes(dados.novaPrevisao)}.</p>`
    : '';

  return `
    <li class="etapa etapa-${situacao}">
      <span class="etapa-marcador" aria-hidden="true">${ICONES[situacao]}</span>
      <div class="etapa-conteudo">
        <p class="etapa-titulo">
          <span class="texto-p1">${TITULOS_ETAPAS[indice]}</span>
          ${SELOS[situacao] || ''}
          <span class="visualmente-oculto">(${NOMES_SITUACAO[situacao]})</span>
        </p>
        <p class="etapa-descricao texto-p2">${descricaoDaEtapa(indice, situacao, dados)}</p>
        ${aviso}
      </div>
    </li>`;
}

// ---------- Partes da tela ----------

function mostrarSaudacao(cliente, estado) {
  document.querySelector('#primeiro-nome').textContent = cliente.nome.split(' ')[0];
  document.querySelector('#subtitulo').textContent = SUBTITULOS[estado] || 'Sua adesão está em andamento';

  const agora = new Date();
  document.querySelector('#atualizado-em').textContent =
    `Atualizado em ${diaMes(agora)} às ${agora.getHours()}h`;
}

function mostrarAvisos(estado) {
  document.querySelector('#aviso-pendencia').hidden = estado !== 'pendencia';
  document.querySelector('#aviso-cemig').hidden = estado === 'conectado';
}

function mostrarCaminho(estado) {
  const config = CAMINHO[estado];

  document.querySelectorAll('.ponto').forEach((ponto) => {
    ponto.className = `ponto ${config[ponto.dataset.ponto]}`;
  });

  document.querySelector('[data-conector="1"]').style.setProperty('--progresso', `${config.conector1}%`);
  document.querySelector('[data-conector="2"]').style.setProperty('--progresso', `${config.conector2}%`);

  // Coloca o raio dentro do conector certo
  const [numeroConector, posicao] = config.raio;
  const raio = document.querySelector('#raio');
  document.querySelector(`[data-conector="${numeroConector}"]`).appendChild(raio);
  raio.style.setProperty('--progresso', `${posicao}%`);
  raio.classList.toggle('parado', config.parado);

  document.querySelector('#caminho-texto').textContent = TEXTO_CAMINHO[estado];
}

function mostrarTrilha(estado, dados) {
  const situacoes = SITUACOES[estado];
  const indiceAtual = situacoes.findIndex((s) => s !== 'concluida');

  document.querySelector('#contador-etapa').textContent =
    `Etapa ${indiceAtual + 1} de ${situacoes.length}`;

  document.querySelector('#indicadores').innerHTML = situacoes
    .map((situacao) => `<span class="${situacao}"></span>`)
    .join('');

  // "Você não precisa fazer nada" só não aparece quando há pendência
  document.querySelector('#nada-a-fazer').hidden = estado === 'pendencia';
  document.querySelector('#nada-a-fazer-texto').textContent =
    estado === 'conectado' ? 'Por enquanto, nada a fazer.' : 'Você não precisa fazer nada.';

  document.querySelector('#etapa-atual').innerHTML =
    etapaHTML(indiceAtual, situacoes[indiceAtual], dados);

  document.querySelector('#lista-etapas').innerHTML = situacoes
    .map((situacao, indice) => etapaHTML(indice, situacao, dados))
    .join('');
}

function mostrarEconomia(cliente, estado, dados) {
  const conectado = estado === 'conectado';
  document.querySelector('#card-economia').hidden = conectado;
  if (conectado) return;

  const contaMedia = cliente.consumoMedioKwh * TARIFA_KWH;
  const economia = contaMedia * cliente.descontoPercentual / 100;

  document.querySelector('#economia-mensal').textContent = reais(economia);
  document.querySelector('#economia-detalhe').textContent =
    `Conta média de ${reais(contaMedia)} com ${cliente.descontoPercentual}% de desconto.`;

  const atrasado = estado === 'atrasado';
  document.querySelector('#previsao-rotulo').textContent =
    atrasado ? 'Nova previsão de conexão' : 'Conexão prevista';
  document.querySelector('#previsao-data').textContent =
    dataComDiaDaSemana(atrasado ? dados.novaPrevisao : dados.previsao);
}

function mostrarEnergiaRecebida(cliente, estado, faturas) {
  const conectado = estado === 'conectado';
  document.querySelector('#card-recebido').hidden = !conectado;
  document.querySelector('#cta-fatura').hidden = !conectado;
  if (!conectado) return;

  const total = cliente.consumoMedioKwh;
  const daBulbe = Math.round(total * PARTE_BULBE);

  document.querySelector('#rosca').style.setProperty('--parte-bulbe', `${PARTE_BULBE * 100}%`);
  document.querySelector('#kwh-total').textContent = total;
  document.querySelector('#kwh-bulbe').textContent = `${daBulbe} kWh`;
  document.querySelector('#kwh-cemig').textContent = `${total - daBulbe} kWh`;

  // Soma a economia das faturas do cliente (faturas.json)
  const economiaTotal = faturas.reduce((soma, fatura) => soma + fatura.economia, 0);
  document.querySelector('#economia-acumulada').textContent = reais(economiaTotal, true);
}

// ---------- Início ----------

async function iniciar() {
  const parametros = new URLSearchParams(window.location.search);
  const idCliente = Number(parametros.get('cliente')) || 1;

  try {
    const clientes = await buscarClientes();
    const cliente = clientes.find((c) => c.id === idCliente) || clientes[0];
    const [faturas, avisos] = await Promise.all([
      buscarFaturasDoCliente(cliente.id),
      buscarAvisosDoCliente(cliente.id)
    ]);

    const hoje = new Date();
    const adesao = lerData(cliente.dataAdesao);
    const previsao = somarDias(adesao, PRAZO_CONEXAO_DIAS);
    const baseNovaPrevisao = hoje > previsao ? hoje : previsao;
    const dados = {
      adesao,
      previsao,
      novaPrevisao: somarDias(baseNovaPrevisao, DIAS_EXTRA_ATRASO)
    };

    // O estado vem do JSON. Se passou do prazo, a conexão está atrasada.
    let estado = cliente.status;
    if (estado === 'em_conexao' && hoje > previsao) estado = 'atrasado';

    // Uma pendência marcada com "bloqueiaAdesao" no avisos.json (ex.: falta a
    // conta de luz) para a análise: a tela mostra o estado "pendencia".
    const adesaoTravada = avisos.some((item) => item.tipo === 'pendencia' && item.bloqueiaAdesao);
    if (estado === 'aguardando_qualificacao' && adesaoTravada) estado = 'pendencia';

    // Estados de demonstração pela URL (?estado=atrasado ou ?estado=pendencia)
    const estadoDaUrl = parametros.get('estado');
    if (SITUACOES[estadoDaUrl]) estado = estadoDaUrl;

    document.querySelector('#tela').dataset.estado = estado;
    mostrarSaudacao(cliente, estado);
    mostrarAvisos(estado);
    mostrarCaminho(estado);
    mostrarTrilha(estado, dados);
    mostrarEconomia(cliente, estado, dados);
    mostrarEnergiaRecebida(cliente, estado, faturas);
  } catch (erro) {
    document.querySelector('#mensagem-erro').hidden = false;
    console.error(erro);
  }
}

iniciar();
