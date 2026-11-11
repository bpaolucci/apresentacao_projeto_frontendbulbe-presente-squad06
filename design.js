// =========================================================
// Apresentação de Design: slides em carrossel, sem rolagem
// - Setas na tela, ← → do teclado, espaço e PageUp/PageDown
// - Atalhos por seção na barra de baixo
// - O número do slide fica na URL (#5), para voltar ao mesmo ponto
// - Clicar numa tela abre ela inteira
// =========================================================

const palco = document.getElementById('palco');
const trilho = document.getElementById('trilho');
const slides = [...document.querySelectorAll('.slide')];
const contador = document.getElementById('contador');
const progresso = document.getElementById('progresso');
const botoesSecao = document.querySelectorAll('[data-secao-ir]');

let atual = 0;

// Redimensiona o slide (1600×900) para caber no palco
function ajustarTamanho() {
  const escala = Math.min(palco.clientWidth / 1600, palco.clientHeight / 900);
  trilho.style.transform = `translate(-50%, -50%) scale(${escala})`;
}

function mostrar(indice) {
  atual = Math.max(0, Math.min(indice, slides.length - 1));

  slides.forEach((slide, i) => {
    slide.classList.toggle('ativo', i === atual);
    slide.classList.toggle('antes', i < atual);
    slide.setAttribute('aria-hidden', i !== atual);
    // botões de slides escondidos saem da ordem do Tab
    slide.querySelectorAll('button, a').forEach((el) => (el.tabIndex = i === atual ? 0 : -1));
  });

  contador.textContent = `${atual + 1} / ${slides.length}`;
  progresso.style.width = `${((atual + 1) / slides.length) * 100}%`;

  const secao = slides[atual].dataset.secao;
  botoesSecao.forEach((b) => b.classList.toggle('ativa', b.dataset.secaoIr === secao));

  history.replaceState(null, '', `#${atual + 1}`);
}

// Setas da barra
document.getElementById('anterior').addEventListener('click', () => mostrar(atual - 1));
document.getElementById('proxima').addEventListener('click', () => mostrar(atual + 1));

// Atalhos por seção: vai para o 1º slide da seção
botoesSecao.forEach((botao) => {
  botao.addEventListener('click', () => {
    const indice = slides.findIndex((s) => s.dataset.secao === botao.dataset.secaoIr);
    if (indice >= 0) mostrar(indice);
  });
});

// Teclado
document.addEventListener('keydown', (evento) => {
  if (!ampliada.hidden) {
    if (evento.key === 'Escape') fecharAmpliada();
    return;
  }
  if (['ArrowRight', 'PageDown', ' '].includes(evento.key)) {
    evento.preventDefault();
    mostrar(atual + 1);
  }
  if (['ArrowLeft', 'PageUp'].includes(evento.key)) {
    evento.preventDefault();
    mostrar(atual - 1);
  }
  if (evento.key === 'Home') mostrar(0);
  if (evento.key === 'End') mostrar(slides.length - 1);
});

// Deslizar o dedo no celular
let toqueX = null;
palco.addEventListener('touchstart', (e) => (toqueX = e.touches[0].clientX), { passive: true });
palco.addEventListener('touchend', (e) => {
  if (toqueX === null) return;
  const distancia = e.changedTouches[0].clientX - toqueX;
  if (Math.abs(distancia) > 50) mostrar(atual + (distancia < 0 ? 1 : -1));
  toqueX = null;
});

// Tela ampliada
const ampliada = document.getElementById('ampliada');
const ampliadaImg = document.getElementById('ampliada-img');
let ultimoFoco = null;

document.querySelectorAll('[data-ampliar]').forEach((botao) => {
  botao.addEventListener('click', () => {
    ultimoFoco = botao;
    ampliadaImg.src = botao.dataset.ampliar;
    ampliadaImg.alt = botao.querySelector('img').alt;
    ampliada.classList.toggle('larga', 'largo' in botao.dataset);
    ampliada.hidden = false;
    ampliada.querySelector('.ampliada-rolagem').scrollTop = 0;
    document.getElementById('ampliada-fechar').focus();
  });
});

function fecharAmpliada() {
  ampliada.hidden = true;
  if (ultimoFoco) ultimoFoco.focus();
}

document.getElementById('ampliada-fechar').addEventListener('click', fecharAmpliada);
ampliada.addEventListener('click', (e) => {
  if (e.target === ampliada || e.target.classList.contains('ampliada-rolagem')) fecharAmpliada();
});

// Início
window.addEventListener('resize', ajustarTamanho);
ajustarTamanho();
const doLink = parseInt(location.hash.slice(1), 10);
mostrar(Number.isNaN(doLink) ? 0 : doLink - 1);
