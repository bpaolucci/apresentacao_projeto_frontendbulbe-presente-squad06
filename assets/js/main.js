// Página de entrada da demonstração (index.html)
// Lista os clientes fictícios de data/clientes.json. Cada um abre o app
// com ?cliente=N, e o app.js mantém esse cliente ao trocar de tela.

import { buscarClientes } from './api.js';

const STATUS = {
  aguardando_qualificacao: 'Aguardando análise',
  em_conexao: 'Em conexão',
  conectado: 'Conectado'
};

async function iniciar() {
  const lista = document.querySelector('#lista-clientes');
  try {
    const clientes = await buscarClientes();
    lista.innerHTML = clientes
      .map((c) => `
        <li>
          <a class="cliente" href="pages/acompanhe-sua-energia.html?cliente=${c.id}">
            <span><strong>${c.nome}</strong><small>${c.cidade}</small></span>
            <span class="selo">${STATUS[c.status] ?? c.status}</span>
          </a>
        </li>`)
      .join('');
  } catch (erro) {
    lista.innerHTML = '<li>Não foi possível carregar os dados. O projeto está aberto pelo Live Server?</li>';
    console.error(erro);
  }
}

iniciar();
