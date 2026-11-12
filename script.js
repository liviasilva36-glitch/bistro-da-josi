
const telefoneWhatsApp = "558488629560";

let carrinho = [];

const campoQuantidade = document.getElementById("quantidade-quentinha");
const campoValor = document.getElementById("valor-quentinha");
const listaCarrinho = document.getElementById("lista-carrinho");
const totalPedido = document.getElementById("total-pedido");

// FORMATAR VALORES EM REAIS
function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// PEGAR PROTEÍNAS SELECIONADAS
function pegarProteinas() {
    return [...document.querySelectorAll('input[name="proteina"]:checked')]
        .map(item => item.value);
}

// PEGAR ACOMPANHAMENTOS SELECIONADOS
function pegarAcompanhamentos() {
    return [...document.querySelectorAll('input[name="acompanhamento"]:checked')]
        .map(item => item.value);
}

// CALCULAR PREÇO DA QUENTINHA
function calcularPreco() {
    const quantidadeProteinas = pegarProteinas().length;

    if (quantidadeProteinas === 1) return 15;
    if (quantidadeProteinas === 2) return 20;

    return 0;
}

// ATUALIZAR PREÇO NA TELA
function atualizarPreco() {
    if (!campoValor) return;

    campoValor.textContent = formatarMoeda(calcularPreco());
}

// LIMITAR ESCOLHA A DUAS PROTEÍNAS
document.querySelectorAll('input[name="proteina"]').forEach(input => {
    input.addEventListener("change", () => {
        const selecionadas = pegarProteinas();

        if (selecionadas.length > 2) {
            input.checked = false;
            alert("Você pode escolher no máximo 2 proteínas por quentinha.");
        }

        atualizarPreco();
    });
});

// ATUALIZAR PREÇO QUANDO ALTERAR QUANTIDADE
if (campoQuantidade) {
    campoQuantidade.addEventListener("change", atualizarPreco);
}

// ADICIONAR QUENTINHA AO CARRINHO
const botaoAdicionar = document.getElementById("adicionar-quentinha");

if (botaoAdicionar) {
    botaoAdicionar.addEventListener("click", () => {
        const proteinas = pegarProteinas();
        const acompanhamentos = pegarAcompanhamentos();
        const quantidade = Number(campoQuantidade.value);
        const preco = calcularPreco();

        if (proteinas.length === 0) {
            alert("Escolha pelo menos uma proteína!");
            return;
        }

        if (!Number.isInteger(quantidade) || quantidade < 1) {
            alert("Informe uma quantidade válida.");
            return;
        }

        if (acompanhamentos.length === 0) {
            alert("Escolha pelo menos um acompanhamento!");
            return;
        }

        carrinho.push({
            nome: "Quentinha",
            proteinas,
            acompanhamentos,
            quantidade,
            preco,
            subtotal: preco * quantidade
        });

        renderizarCarrinho();

        document.querySelectorAll(
            'input[name="proteina"], input[name="acompanhamento"]'
        ).forEach(input => {
            input.checked = false;
        });

        campoQuantidade.value = 1;
        atualizarPreco();

        alert("Quentinha adicionada ao carrinho!");
    });
}

// ADICIONAR BEBIDAS
document.querySelectorAll("[data-bebida]").forEach(botao => {
    botao.addEventListener("click", () => {
        const nome = botao.dataset.bebida;

        carrinho.push({
            nome,
            quantidade: 1,
            preco: 6,
            subtotal: 6
        });

        renderizarCarrinho();

        alert(nome + " adicionado ao carrinho!");
    });
});

// EXIBIR CARRINHO
function renderizarCarrinho() {
    if (!listaCarrinho || !totalPedido) return;

    listaCarrinho.innerHTML = "";

    if (carrinho.length === 0) {
        listaCarrinho.innerHTML =
            '<p class="carrinho-vazio">Seu carrinho está vazio.</p>';
    }

    carrinho.forEach((item, indice) => {
        const div = document.createElement("div");
        div.className = "item-carrinho";

        const descricao = document.createElement("div");

        const titulo = document.createElement("strong");
        titulo.textContent = `${item.quantidade}x ${item.nome}`;

        descricao.appendChild(titulo);

        if (item.proteinas) {
            const proteinas = document.createElement("p");
            proteinas.textContent =
                "Proteínas: " + item.proteinas.join(", ");

            descricao.appendChild(proteinas);

            const acompanhamentos = document.createElement("p");
            acompanhamentos.textContent =
                "Acompanhamentos: " + item.acompanhamentos.join(", ");

            descricao.appendChild(acompanhamentos);
        }

        const preco = document.createElement("strong");
        preco.textContent = formatarMoeda(item.subtotal);

        const remover = document.createElement("button");
        remover.className = "remover-item";
        remover.textContent = "Remover";

        remover.addEventListener("click", () => {
            carrinho.splice(indice, 1);
            renderizarCarrinho();
        });

        div.append(descricao, preco, remover);
        listaCarrinho.appendChild(div);
    });

    const total = carrinho.reduce(
        (soma, item) => soma + item.subtotal,
        0
    );

    totalPedido.textContent = formatarMoeda(total);
}

// FINALIZAR PELO WHATSAPP
const botaoFinalizar = document.getElementById("finalizar-pedido");

if (botaoFinalizar) {
    botaoFinalizar.addEventListener("click", () => {
        if (carrinho.length === 0) {
            alert("Adicione algum produto ao seu pedido!");
            return;
        }

        const total = carrinho.reduce(
            (soma, item) => soma + item.subtotal,
            0
        );

        let mensagem =
            "Olá! Gostaria de fazer um pedido no Bistrô da Josi.\n\n";

        carrinho.forEach((item, indice) => {
            mensagem += `${indice + 1}. ${item.quantidade}x ${item.nome}\n`;

            if (item.proteinas) {
                mensagem +=
                    `Proteínas: ${item.proteinas.join(", ")}\n`;

                mensagem +=
                    `Acompanhamentos: ${item.acompanhamentos.join(", ")}\n`;
            }

            mensagem +=
                `Subtotal: ${formatarMoeda(item.subtotal)}\n\n`;
        });

        mensagem += `TOTAL: ${formatarMoeda(total)}`;
        mensagem += "\n\nAguardo a confirmação. Obrigado!";

        const link =
            `https://wa.me/${telefoneWhatsApp}?text=${encodeURIComponent(mensagem)}`;

        window.open(link, "_blank");
    });
}

// INICIALIZAÇÃO
atualizarPreco();
renderizarCarrinho();
