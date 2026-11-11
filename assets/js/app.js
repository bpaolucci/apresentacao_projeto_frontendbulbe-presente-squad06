// =========================================================
// Código comum a todas as telas do app
// Carregado no <head> de cada página, antes do JS da tela:
//   <script type="module" src="../assets/js/app.js"></script>
//
// 1. Cliente atual: mantém o mesmo cliente ao trocar de tela
// 2. Regras dos avisos: pendências abertas e avisos não lidos
// 3. Sininho do cabeçalho: bolinha quando há pendência ou aviso novo
// =========================================================

import { buscarClientes, buscarAvisosDoCliente } from './api.js';

// ---------- 1. Cliente atual (dados fictícios) ----------
// - Se a URL tem ?cliente=N, esse cliente passa a ser o atual.
// - Se não tem, usa o último cliente escolhido e coloca ?cliente=N
//   na URL. Assim o JS de cada tela continua lendo da URL.
// Este trecho roda antes do JS de cada tela, porque o app.js vem
// primeiro no HTML. Para trocar de cliente: index.html ou ?cliente=N.
const CHAVE_CLIENTE = 'bulbe-cliente-atual';

function guardarClienteAtual() {
  const url = new URL(window.location.href);
  const daUrl = Number(url.searchParams.get('cliente'));

  try {
    if (daUrl) {
      localStorage.setItem(CHAVE_CLIENTE, String(daUrl));
      return;
    }

    const salvo = Number(localStorage.getItem(CHAVE_CLIENTE));
    if (salvo) {
      url.searchParams.set('cliente', salvo);
      history.replaceState(null, '', url);
    }
  } catch {
    // Sem localStorage, cada tela usa o cliente padrão.
  }
}

guardarClienteAtual();

// ---------- 2. Regras dos avisos ----------
// Usadas pela Central de avisos (HU03) e pelo sininho, para os dois
// sempre mostrarem a mesma coisa.

// Avisos lidos ficam salvos no navegador (a Central de avisos grava aqui)
const CHAVE_LIDOS = 'bulbe-avisos-lidos';

// O try/catch evita erro quando o navegador bloqueia o localStorage.
export function lerIdsLidos() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_LIDOS)) ?? []);
  } catch {
    return new Set();
  }
}

export function salvarIdsLidos(ids) {
  try {
    localStorage.setItem(CHAVE_LIDOS, JSON.stringify([...ids]));
  } catch {
    // Sem localStorage, o aviso fica lido só até recarregar a página.
  }
}

// Uma pendência de contato ("contato": "whatsapp" ou "email" no avisos.json)
// some quando o contato já está confirmado no clientes.json ou quando a
// cliente confirmou os dados na tela "Confirme seus contatos" (HU02).
// A chave abaixo precisa ser a mesma usada em confirmar-contatos.js.
function confirmouNaHU02(clienteId) {
  try {
    return Boolean(localStorage.getItem(`bulbe:hu02:contatos:cliente:${clienteId}:demo:v2`));
  } catch {
    return false;
  }
}

function contatoConfirmado(cliente, contato) {
  if (confirmouNaHU02(cliente.id)) return true;
  if (contato === 'whatsapp') return cliente.whatsappConfirmado === true;
  if (contato === 'email') return cliente.emailConfirmado === true;
  return false;
}

// Pendências que ainda valem (as de contato já confirmado saem)
export function pendenciasAbertas(itens, cliente) {
  return itens.filter((item) =>
    item.tipo === 'pendencia' &&
    !(item.contato && cliente && contatoConfirmado(cliente, item.contato))
  );
}

// Avisos que a cliente ainda não leu (pelo JSON ou pela Central de avisos)
export function avisosNaoLidos(itens, idsLidos = lerIdsLidos()) {
  return itens.filter((item) => item.tipo === 'aviso' && !item.lido && !idsLidos.has(item.id));
}

// ---------- 3. Sininho do cabeçalho ----------
// Fica em todas as telas com cabeçalho, menos na Central de avisos
// (lá a pessoa já está vendo tudo). O estilo está no bulbe-ui.css.
async function mostrarSino() {
  const sino = document.querySelector('.topo a[href^="central-de-avisos.html"]');
  if (!sino || location.pathname.endsWith('central-de-avisos.html')) return;

  const clienteId = Number(new URLSearchParams(location.search).get('cliente')) || 1;

  try {
    const [clientes, itens] = await Promise.all([
      buscarClientes(),
      buscarAvisosDoCliente(clienteId)
    ]);
    const cliente = clientes.find((c) => c.id === clienteId);

    const pendencias = pendenciasAbertas(itens, cliente).length;
    const novos = avisosNaoLidos(itens).length;

    sino.classList.add('topo-sino');
    sino.classList.toggle('tem-novo', pendencias + novos > 0);

    // Para o leitor de tela, diz o que tem de novo
    const partes = [];
    if (pendencias) partes.push(pendencias === 1 ? '1 pendência' : `${pendencias} pendências`);
    if (novos) partes.push(novos === 1 ? '1 aviso novo' : `${novos} avisos novos`);
    sino.setAttribute('aria-label', partes.length ? `Avisos: ${partes.join(' e ')}` : 'Avisos');
  } catch (erro) {
    // Sem os dados, o sininho só fica sem a bolinha
    console.error(erro);
  }
}

// ---------- 4. Regra de navegação: Tela Primeira Fatura ----------
// Intercepta o clique no ícone "Fatura" do menu inferior.
// Se a pessoa já passou pela introdução, manda direto para a central.
document.addEventListener('DOMContentLoaded', () => {
  // Pega qualquer link que vá para a primeira fatura (como o do menu inferior)
  const linksFatura = document.querySelectorAll('a[href^="primeira-fatura.html"]');

  linksFatura.forEach(link => {
    link.addEventListener('click', (evento) => {
      try {
        if (localStorage.getItem('primeiraFaturaVista') === 'true') {
          evento.preventDefault(); // Cancela a ida para a tela azul

          // Vai para a tela definitiva repassando o ID do cliente atual na URL
          const url = new URL('central-orientacoes.html', window.location.href);
          url.search = window.location.search;
          window.location.href = url.toString();
        }
      } catch (erro) {
        // Se der erro no localStorage, deixa o link seguir normalmente
      }
    });
  });
});

mostrarSino();
