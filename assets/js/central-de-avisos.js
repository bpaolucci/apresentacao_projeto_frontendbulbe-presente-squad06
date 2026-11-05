// =========================================================
// HU03 · Central de avisos
// Lê os avisos e as pendências do cliente em data/avisos.json
// e monta a tela: pendências no topo, avisos do mais recente
// para o mais antigo.
//
// Para testar outros clientes:
//   central-de-avisos.html?cliente=1  → com 1 pendência (WhatsApp)
//   central-de-avisos.html?cliente=3  → com 2 pendências
//   central-de-avisos.html?cliente=4  → sem pendências
// =========================================================

import { buscarClientes, buscarAvisosDoCliente } from './api.js';
import { lerIdsLidos, salvarIdsLidos, pendenciasAbertas } from './app.js';

const CLIENTE_PADRAO = 1;

const CANAIS = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  app: 'App'
};

const tela = {
  erro: document.querySelector('#mensagem-erro'),
  contadorPendencias: document.querySelector('#contador-pendencias'),
  contadorNaoLidos: document.querySelector('#contador-nao-lidos'),
  listaPendencias: document.querySelector('#lista-pendencias'),
  semPendencias: document.querySelector('#sem-pendencias'),
  listaAvisos: document.querySelector('#lista-avisos')
};

// Avisos lidos e pendências abertas: regras em app.js

// ---------- Datas ----------
// As datas do JSON vêm como "2026-11-12". O T12:00 evita erro de fuso horário.
function paraData(texto) {
  return new Date(`${texto}T12:00:00`);
}

function formatarData(texto) {
  return paraData(texto).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function diasAte(texto) {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  return Math.round((paraData(texto) - hoje) / 86400000);
}

function textoDoPrazo(prazo) {
  const dias = diasAte(prazo);
  if (dias < 0) return `Prazo encerrado em ${formatarData(prazo)}`;
  if (dias === 0) return 'Prazo termina hoje';
  if (dias === 1) return `Até ${formatarData(prazo)} · falta 1 dia`;
  return `Até ${formatarData(prazo)} · faltam ${dias} dias`;
}

// ---------- Elementos ----------
// Função pequena para criar um elemento com classe e texto.
function criar(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function montarPendencia(pendencia, clienteId) {
  const item = criar('li', 'pendencia');

  item.append(
    criar('p', 'pendencia-titulo', pendencia.titulo),
    criar('p', 'pendencia-texto', pendencia.texto)
  );

  const rodape = criar('div', 'pendencia-rodape');
  rodape.append(criar('p', 'pendencia-prazo', textoDoPrazo(pendencia.prazo)));

  if (pendencia.acao) {
    const botao = criar('a', 'botao', pendencia.acao.rotulo);
    // Leva o cliente junto, para a outra tela abrir os dados da pessoa certa
    botao.href = `${pendencia.acao.link}?cliente=${clienteId}`;
    botao.setAttribute('aria-label', `${pendencia.acao.rotulo}: ${pendencia.titulo}`);
    rodape.append(botao);
  }

  item.append(rodape);
  return item;
}

// Cada aviso é um <details>: abre e fecha ao tocar, sem precisar de JS.
function montarAviso(aviso, idsLidos) {
  const item = criar('li');
  const detalhes = criar('details', 'aviso');
  const lido = aviso.lido || idsLidos.has(aviso.id);
  if (!lido) detalhes.classList.add('nao-lido');

  const resumo = criar('summary', 'aviso-resumo');
  const topo = criar('span', 'aviso-topo');
  const data = criar('time', 'aviso-data', formatarData(aviso.data));
  data.dateTime = aviso.data;
  topo.append(data, criar('span', `aviso-canal canal-${aviso.canal}`, CANAIS[aviso.canal] ?? aviso.canal));

  resumo.append(topo, criar('span', 'aviso-titulo', aviso.titulo));
  if (!lido) resumo.append(criar('span', 'visualmente-oculto', ' (não lido)'));

  detalhes.append(resumo, criar('p', 'aviso-texto', aviso.texto));

  // Ao abrir pela primeira vez, o aviso passa a contar como lido.
  detalhes.addEventListener('toggle', () => {
    if (!detalhes.open || !detalhes.classList.contains('nao-lido')) return;
    detalhes.classList.remove('nao-lido');
    resumo.querySelector('.visualmente-oculto')?.remove();
    idsLidos.add(aviso.id);
    salvarIdsLidos(idsLidos);
    atualizarContadorNaoLidos();
  });

  item.append(detalhes);
  return item;
}

function atualizarContadorNaoLidos() {
  tela.contadorNaoLidos.textContent = tela.listaAvisos.querySelectorAll('.nao-lido').length;
}

// ---------- Tela ----------
function mostrarPendencias(pendencias, clienteId) {
  // A que vence primeiro fica em cima
  pendencias.sort((a, b) => paraData(a.prazo) - paraData(b.prazo));
  tela.listaPendencias.replaceChildren(...pendencias.map((p) => montarPendencia(p, clienteId)));
  tela.listaPendencias.hidden = pendencias.length === 0;
  tela.semPendencias.hidden = pendencias.length > 0;
  tela.contadorPendencias.textContent = pendencias.length;
  tela.contadorPendencias.closest('.resumo-item').classList.toggle('tem-pendencia', pendencias.length > 0);
}

function mostrarAvisos(avisos) {
  const idsLidos = lerIdsLidos();
  // Do mais recente para o mais antigo
  avisos.sort((a, b) => paraData(b.data) - paraData(a.data));
  tela.listaAvisos.replaceChildren(...avisos.map((aviso) => montarAviso(aviso, idsLidos)));
  atualizarContadorNaoLidos();
}

async function iniciar() {
  const parametro = Number(new URLSearchParams(location.search).get('cliente'));
  const clienteId = parametro || CLIENTE_PADRAO;

  try {
    const [clientes, itens] = await Promise.all([
      buscarClientes(),
      buscarAvisosDoCliente(clienteId)
    ]);

    const cliente = clientes.find((c) => c.id === clienteId);

    // Pendência de contato já confirmado não aparece mais
    mostrarPendencias(pendenciasAbertas(itens, cliente), clienteId);
    mostrarAvisos(itens.filter((item) => item.tipo === 'aviso'));
  } catch (erro) {
    tela.erro.hidden = false;
    console.error(erro);
  }
}

iniciar();
