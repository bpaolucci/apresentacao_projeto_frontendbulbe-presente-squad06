const orientacao = document.querySelector("#orientacao");
const confirmacao = document.querySelector("#leitura-confirmada");
const continuar = document.querySelector("#continuar");
const aviso = document.querySelector("#aviso-importante");

continuar.addEventListener("click", function (evento) {
    if (!confirmacao.checked) {
        evento.preventDefault();
        orientacao.open = true;
        aviso.hidden = false;
        orientacao.scrollIntoView({ behavior: "smooth", block: "start" });
    }
});

confirmacao.addEventListener("change", function () {
    if (confirmacao.checked) aviso.hidden = true;
});
