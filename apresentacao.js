// =========================================================
// Apresentação: 1 celular + carrossel de cards
// - Trocar de card (setas, abas ou teclado) abre a tela no celular
// - Navegar dentro do celular atualiza o card do carrossel
// =========================================================

const trilho = document.getElementById('carrossel-trilho');
const cards = document.querySelectorAll('.card');
const abas = document.querySelectorAll('[data-ir]');
const contador = document.getElementById('contador');
const tela = document.getElementById('celular-tela');

let atual = 0;

// Mostra o card de número "indice". Se abrirTela for true, troca a tela do celular.
function mostrarCard(indice, abrirTela) {
  atual = (indice + cards.length) % cards.length; // dá a volta nas pontas

  trilho.style.transform = `translateX(-${atual * 100}%)`;
  contador.textContent = `${atual + 1} / ${cards.length}`;

  abas.forEach((aba, i) => aba.classList.toggle('ativa', i === atual));
  cards.forEach((card, i) => card.setAttribute('aria-hidden', i !== atual));

  if (abrirTela) {
    tela.src = cards[atual].dataset.tela + '?cliente=1';
  }
}

// Setas
document.getElementById('anterior').addEventListener('click', () => mostrarCard(atual - 1, true));
document.getElementById('proxima').addEventListener('click', () => mostrarCard(atual + 1, true));

// Abas HU01...HU05
abas.forEach((aba) => {
  aba.addEventListener('click', () => mostrarCard(Number(aba.dataset.ir), true));
});

// Setas do teclado (← e →)
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'ArrowLeft') mostrarCard(atual - 1, true);
  if (evento.key === 'ArrowRight') mostrarCard(atual + 1, true);
});

// Quando a pessoa navega dentro do celular, descobre qual tela abriu
// e mostra o card dela (sem recarregar o celular).
tela.addEventListener('load', () => {
  let arquivo;
  try {
    arquivo = tela.contentWindow.location.pathname.split('/').pop();
  } catch {
    return; // não conseguiu ler a página do celular
  }

  cards.forEach((card, i) => {
    const arquivosDoCard = card.dataset.arquivos.split(' ');
    if (arquivosDoCard.includes(arquivo) && i !== atual) {
      mostrarCard(i, false);
    }
  });
});

mostrarCard(0, false);
