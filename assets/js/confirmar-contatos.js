
// =========================================================
// HU02 - CONFIRME SEUS CONTATOS
// Usa api.js e data/clientes.json, como a HU04.
// Testes: ?cliente=1, ?cliente=2, ?cliente=3
// =========================================================

import { buscarClientes } from './api.js';

// ELEMENTOS

const form = document.querySelector('#hu02-form');
const celular = document.querySelector('#hu02-celular');
const email = document.querySelector('#hu02-email');

const success = document.querySelector('#hu02-success');
const successDetail = document.querySelector('#hu02-success-detail');
const saveError = document.querySelector('#hu02-save-error');
const loadError = document.querySelector('#hu02-load-error');
const clienteLine = document.querySelector('#hu02-cliente');

const options = Array.from(
  form.querySelectorAll('input[name="preferencia"]')
);

// CLIENTE ATUAL

const params = new URLSearchParams(window.location.search);

const clienteId = Number(params.get('cliente')) || 1;

const storageKey =
  `bulbe:hu02:contatos:cliente:${clienteId}:demo:v2`;

// FORMATAÇÃO DO CELULAR

function somenteDigitos(valor) {
  return String(valor).replace(/\D/g, '');
}

function formatarCelular(valor) {
  let digitos = somenteDigitos(valor);

  if (digitos.length === 13 && digitos.startsWith('55')) {
    digitos = digitos.slice(2);
  }

  if (digitos.length > 11) {
    return digitos;
  }

  if (!digitos) {
    return '';
  }

  if (digitos.length <= 2) {
    return `(${digitos}`;
  }

  if (digitos.length <= 7) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

// MOSTRA ERROS

function erroCampo(campo, mensagem) {
  const grupo = campo.closest('.hu02__field');

  grupo.querySelector('.hu02__error').textContent =
    mensagem;

  grupo.querySelector('.hu02__field-shell')
    .classList.toggle('has-error', Boolean(mensagem));

  campo.setAttribute(
    'aria-invalid',
    mensagem ? 'true' : 'false'
  );
}

// VALIDA TELEFONE

function validarCelular() {
  const valor = somenteDigitos(celular.value);

  const valido =
    /^[1-9][0-9]9[0-9]{8}$/.test(valor) &&
    !/^([0-9])\1{10}$/.test(valor);

  erroCampo(
    celular,
    !valor
      ? 'Informe seu celular com DDD.'
      : valido
        ? ''
        : 'Digite um celular válido com DDD e 11 dígitos.'
  );

  return valido;
}

// VALIDA E-MAIL

function validarEmail() {
  const valor = email.value.trim();
  const local = valor.split('@')[0] || '';

  const valido =
    valor.length <= 254 &&
    /^[^\s@.][^\s@]*@[^\s@.]+(?:\.[^\s@.]+)+$/.test(valor) &&
    !valor.includes('..') &&
    !local.endsWith('.');

  erroCampo(
    email,
    !valor
      ? 'Informe seu e-mail.'
      : valido
        ? ''
        : 'Digite um e-mail válido, como nome@exemplo.com.'
  );

  return valido;
}

// CONTROLE DAS MENSAGENS

function esconderMensagens() {
  success.hidden = true;
  saveError.hidden = true;
}

// CANAL PREFERIDO

function escolherCanal(preferencia) {
  const canal =
    ['whatsapp', 'email', 'ambos'].includes(preferencia)
      ? preferencia
      : 'ambos';

  options.forEach(opcao => {
    opcao.checked = opcao.value === canal;
  });
}

// BOTÕES DE EDIÇÃO

function focarInput(botao) {
  const campo = document.getElementById(
    botao.dataset.target
  );

  campo.focus();
  campo.select();
}

// CARREGAR OS CLIENTES DO JSON

async function inicializar() {
  try {
    const clientes = await buscarClientes();

    const cliente = clientes.find(
      pessoa => Number(pessoa.id) === clienteId
    );

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    // O título já diz onde a pessoa está; a saudação fica só na tela principal.
    clienteLine.hidden = true;

    // Dados reais do arquivo JSON do projeto.
    // Neste MVP, o JSON contém contatos de exemplo.

    const telefoneCadastrado =
      cliente.telefone || cliente.celular;

    const emailCadastrado = cliente.email;

    if (
      typeof telefoneCadastrado !== 'string' ||
      !telefoneCadastrado.trim() ||
      typeof emailCadastrado !== 'string' ||
      !emailCadastrado.trim()
    ) {
      throw new Error(
        'Telefone ou e-mail ausente em data/clientes.json'
      );
    }

    celular.value = formatarCelular(telefoneCadastrado);
    email.value = emailCadastrado;

    escolherCanal(cliente.canalPreferido);

    form.querySelector('button[type="submit"]')
      .disabled = false;

    // Recupera confirmações anteriores no navegador.

    try {
      const salvo = JSON.parse(
        localStorage.getItem(storageKey) || 'null'
      );

      if (salvo && typeof salvo === 'object') {
        if (typeof salvo.celular === 'string') {
          celular.value = formatarCelular(salvo.celular);
        }

        if (typeof salvo.email === 'string') {
          email.value = salvo.email;
        }

        escolherCanal(salvo.preferencia);
      }
    } catch (_) {
      // Continua funcionando sem dados anteriores.
    }

  } catch (error) {
    clienteLine.textContent =
      'Não foi possível carregar os dados da adesão.';

    loadError.hidden = false;

    celular.value = '';
    email.value = '';

    form.querySelector('button[type="submit"]')
      .disabled = true;

    console.error(
      'HU02: falha ao buscar clientes:',
      error
    );
  }
}

// EVENTOS DO CELULAR

celular.addEventListener('input', () => {
  const antes = celular.value;

  const cursor = somenteDigitos(
    antes.slice(
      0,
      celular.selectionStart ?? antes.length
    )
  ).length;

  celular.value = formatarCelular(antes);

  if (cursor > 0) {
    let pos = 0;
    let vistos = 0;

    while (
      pos < celular.value.length &&
      vistos < cursor
    ) {
      if (/\d/.test(celular.value[pos])) {
        vistos++;
      }

      pos++;
    }

    celular.setSelectionRange(pos, pos);
  }

  if (
    celular.getAttribute('aria-invalid') === 'true'
  ) {
    validarCelular();
  }

  esconderMensagens();
});

// EVENTOS DO E-MAIL

email.addEventListener('input', () => {
  if (
    email.getAttribute('aria-invalid') === 'true'
  ) {
    validarEmail();
  }

  esconderMensagens();
});

// VALIDAÇÃO AO SAIR DO CAMPO

celular.addEventListener('blur', () => {
  if (celular.value.trim()) {
    validarCelular();
  }
});

email.addEventListener('blur', () => {
  if (email.value.trim()) {
    validarEmail();
  }
});

// ALTERAÇÃO DAS OPÇÕES

options.forEach(opcao => {
  opcao.addEventListener('change', esconderMensagens);
});

// CLIQUE NOS ÍCONES DE LÁPIS

form.querySelectorAll('.hu02__edit')
  .forEach(botao => {
    botao.addEventListener('click', () => {
      focarInput(botao);
    });
  });

// INICIALIZAÇÃO

void inicializar();

// SALVAR E CONFIRMAR

form.addEventListener('submit', event => {
  event.preventDefault();

  saveError.hidden = true;

  const celularValido = validarCelular();
  const emailValido = validarEmail();

  if (!celularValido || !emailValido) {
    esconderMensagens();

    (celularValido ? email : celular).focus();

    return;
  }

  email.value = email.value.trim().toLowerCase();

  const preferencia =
    options.find(opcao => opcao.checked)?.value ||
    'ambos';

  const dados = {
    celular: celular.value,
    email: email.value,
    preferencia
  };

  // SALVA LOCALMENTE PARA O MVP

  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify(dados)
    );

  } catch (_) {
    esconderMensagens();

    saveError.textContent =
      'Não foi possível salvar neste navegador. Confira as permissões do Safari ou use o Live Server.';

    saveError.hidden = false;

    saveError.scrollIntoView({
      block: 'center',
      behavior: 'auto'
    });

    return;
  }

  // MENSAGEM DE SUCESSO

  const nomes = {
    ambos: 'WhatsApp e e-mail',
    whatsapp: 'WhatsApp',
    email: 'e-mail'
  };

  successDetail.textContent =
    `Dados confirmados neste navegador. Canal escolhido: ${nomes[preferencia]}.`;

  success.hidden = false;

  success.focus({
    preventScroll: true
  });

  success.scrollIntoView({
    block: 'start',
    behavior: 'auto'
  });
});

// EDITAR NOVAMENTE

document.querySelector('#hu02-edit-again')
  .addEventListener('click', () => {
    success.hidden = true;
    celular.focus();
  });
