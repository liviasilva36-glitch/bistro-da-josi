const telefoneWhatsApp = "558488629560";

const CONFIG_PADRAO = {
    preco1Proteina: 15,
    preco2Proteinas: 20,
    proteinas: [
        { nome: "Linguiça assada", rotulo: "🌭 Linguiça assada", ativo: true },
        { nome: "Frango assado", rotulo: "🍗 Frango assado", ativo: true },
        { nome: "Galinha torrada", rotulo: "🍗 Galinha torrada", ativo: true },
        { nome: "Carne de sol", rotulo: "🥩 Carne de sol", ativo: true },
        { nome: "Strogonoff de frango", rotulo: "🍛 Strogonoff de frango", ativo: true }
    ],
    acompanhamentos: [
        { nome: "Arroz branco", rotulo: "🍚 Arroz branco", ativo: true },
        { nome: "Arroz refogado", rotulo: "🍚 Arroz refogado", ativo: true },
        { nome: "Feijão carioca", rotulo: "🫘 Feijão carioca", ativo: true },
        { nome: "Macarrão ao alho e óleo", rotulo: "🍝 Macarrão ao alho e óleo", ativo: true },
        { nome: "Salada verde", rotulo: "🥗 Salada verde", ativo: true },
        { nome: "Farofa", rotulo: "🥣 Farofa", ativo: true }
    ],
    bebidas: [
        { nome: "Guaraná Kuat lata", preco: 6, ativo: true },
        { nome: "Fanta Uva lata", preco: 6, ativo: true },
        { nome: "Coca-Cola Zero lata", preco: 6, ativo: true },
        { nome: "Guaraná Zero lata", preco: 6, ativo: true },
        { nome: "Coca-Cola lata", preco: 6, ativo: true }
    ],
    cupons: [
        { codigo: "JOSI10", tipo: "percentual", valor: 10, ativo: true },
        { codigo: "BISTRO5", tipo: "fixo", valor: 5, ativo: true }
    ]
};

const RECOMPENSAS_FIDELIDADE = [
    {
        id: "rec_bebida",
        titulo: "🥤 Refrigerante Lata Grátis",
        descricao: "Na compra de 10 marmitas, ganhe 1 refrigerante lata por conta da casa.",
        pontosNecessarios: 10,
        itemCarrinho: "Recompensa Fidelidade (10 marmitas): Refrigerante Lata Grátis"
    },
    {
        id: "rec_quentinha1",
        titulo: "🍱 Marmita Média (1 Proteína) Grátis",
        descricao: "Na compra de 20 marmitas, ganhe 1 marmita média (R$ 15,00) à sua escolha.",
        pontosNecessarios: 20,
        itemCarrinho: "Recompensa Fidelidade (20 marmitas): Marmita Média (1 Proteína) Grátis"
    }
];

function obterConfigCardapio() {
    const salva = JSON.parse(localStorage.getItem("bistro_config"));
    if (!salva) {
        localStorage.setItem("bistro_config", JSON.stringify(CONFIG_PADRAO));
        return CONFIG_PADRAO;
    }
    if (!salva.cupons) {
        salva.cupons = CONFIG_PADRAO.cupons;
        localStorage.setItem("bistro_config", JSON.stringify(salva));
    }
    return salva;
}

let carrinho = [];
let cupomAplicado = null;
let animarUltimoItem = false;

const campoQuantidade = document.getElementById("quantidade-quentinha");
const campoValor = document.getElementById("valor-quentinha");
const listaCarrinho = document.getElementById("lista-carrinho");
const totalPedido = document.getElementById("total-pedido");

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// =========================================
// EFEITO VISUAL DE ADIÇÃO AO CARRINHO
// =========================================
let timerToast;

function dispararEfeitoCompra(titulo, subtitulo, emoji = "🍱", elementoOrigem = null) {
    // 1. Ícone voando do botão clicado até a seção do pedido
    if (elementoOrigem && listaCarrinho) {
        const rectOrigem = elementoOrigem.getBoundingClientRect();
        const rectDestino = listaCarrinho.getBoundingClientRect();

        const voador = document.createElement("div");
        voador.className = "item-voando-carrinho";
        voador.textContent = emoji;
        voador.style.left = `${rectOrigem.left + rectOrigem.width / 2 - 14}px`;
        voador.style.top = `${rectOrigem.top + rectOrigem.height / 2 - 14}px`;
        document.body.appendChild(voador);

        const deltaX = (rectDestino.left + rectDestino.width / 2) - (rectOrigem.left + rectOrigem.width / 2);
        const deltaY = Math.min(rectDestino.top, window.innerHeight - 80) - rectOrigem.top;

        requestAnimationFrame(() => {
            voador.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.4) rotate(25deg)`;
            voador.style.opacity = "0";
        });

        setTimeout(() => voador.remove(), 800);
    }

    // 2. Pulso no valor total do pedido
    if (totalPedido) {
        totalPedido.classList.remove("pulsar-total");
        void totalPedido.offsetWidth;
        totalPedido.classList.add("pulsar-total");
    }

    // 3. Notificação Toast flutuante
    let toast = document.getElementById("toast-compra");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-compra";
        toast.className = "toast-compra";
        toast.innerHTML = `
            <div class="toast-icone" id="toast-icone">🍱</div>
            <div class="toast-texto">
                <strong id="toast-titulo"></strong>
                <span id="toast-subtitulo"></span>
            </div>
            <button type="button" class="toast-ver-carrinho" id="toast-ver-carrinho">Ver pedido</button>
        `;
        document.body.appendChild(toast);

        toast.querySelector("#toast-ver-carrinho").addEventListener("click", () => {
            toast.classList.remove("visivel");
            if (listaCarrinho) {
                listaCarrinho.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    }

    document.getElementById("toast-icone").textContent = emoji;
    document.getElementById("toast-titulo").textContent = titulo;
    document.getElementById("toast-subtitulo").textContent = subtitulo;

    toast.classList.remove("visivel");
    void toast.offsetWidth;
    toast.classList.add("visivel");

    clearTimeout(timerToast);
    timerToast = setTimeout(() => {
        toast.classList.remove("visivel");
    }, 3200);
}

// =========================================
// FIDELIDADE POR MARMITAS (1 MARMITA = 1 PONTO)
// =========================================
function obterPontosCliente() {
    return Number(localStorage.getItem("bistro_pontos_cliente") || 0);
}

function salvarPontosCliente(novoSaldo) {
    localStorage.setItem("bistro_pontos_cliente", Math.max(0, Math.floor(novoSaldo)));
}

function renderizarFidelidade() {
    const marmitasAcumuladas = obterPontosCliente();
    const saldoEl = document.getElementById("saldo-pontos");
    const nivelEl = document.getElementById("nivel-fidelidade");
    const barraEl = document.getElementById("barra-pontos");
    const metaEl = document.getElementById("texto-meta-pontos");
    const listaRecEl = document.getElementById("lista-recompensas");

    if (!saldoEl || !listaRecEl) return;

    saldoEl.textContent = `${marmitasAcumuladas} marmita${marmitasAcumuladas === 1 ? "" : "s"}`;

    if (marmitasAcumuladas >= 20) {
        nivelEl.textContent = "👑 Cliente Ouro";
    } else if (marmitasAcumuladas >= 10) {
        nivelEl.textContent = "⭐ Cliente Prata";
    } else {
        nivelEl.textContent = "🎖️ Cliente VIP";
    }

    const proximaMeta = RECOMPENSAS_FIDELIDADE.find(r => marmitasAcumuladas < r.pontosNecessarios);
    if (proximaMeta) {
        const faltam = proximaMeta.pontosNecessarios - marmitasAcumuladas;
        const porcentagem = Math.min(100, Math.round((marmitasAcumuladas / proximaMeta.pontosNecessarios) * 100));
        barraEl.style.width = `${porcentagem}%`;
        metaEl.textContent = `Falta${faltam === 1 ? "" : "m"} ${faltam} marmita${faltam === 1 ? "" : "s"} para resgatar: ${proximaMeta.titulo}`;
    } else {
        barraEl.style.width = "100%";
        metaEl.textContent = "Parabéns! Você já atingiu 20 marmitas e pode resgatar qualquer prêmio!";
    }

    listaRecEl.innerHTML = "";
    RECOMPENSAS_FIDELIDADE.forEach((rec) => {
        const podeResgatar = marmitasAcumuladas >= rec.pontosNecessarios;
        const card = document.createElement("article");
        card.className = `card-recompensa ${podeResgatar ? "disponivel" : ""}`;

        const faltam = rec.pontosNecessarios - marmitasAcumuladas;

        card.innerHTML = `
            <div>
                <span class="custo-pontos">${rec.pontosNecessarios} marmitas</span>
                <h4>${rec.titulo}</h4>
                <p>${rec.descricao}</p>
            </div>
            <button type="button" ${podeResgatar ? "" : "disabled"}>
                ${podeResgatar ? "Resgatar Prêmio" : `Faltam ${faltam} marmita${faltam === 1 ? "" : "s"}`}
            </button>
        `;

        const btnResgatar = card.querySelector("button");
        btnResgatar.addEventListener("click", () => {
            if (obterPontosCliente() < rec.pontosNecessarios) return;

            salvarPontosCliente(obterPontosCliente() - rec.pontosNecessarios);

            carrinho.push({
                nome: rec.itemCarrinho,
                quantidade: 1,
                preco: 0,
                subtotal: 0,
                ehRecompensa: true,
                pontosGastos: rec.pontosNecessarios
            });

            animarUltimoItem = true;
            renderizarFidelidade();
            renderizarCarrinho();
            dispararEfeitoCompra("Prêmio resgatado!", rec.titulo, "🎁", btnResgatar);
        });

        listaRecEl.appendChild(card);
    });
}

// =========================================
// CUPONS DE DESCONTO
// =========================================
const btnAplicarCupom = document.getElementById("btn-aplicar-cupom");
const inputCupom = document.getElementById("input-cupom");
const msgCupom = document.getElementById("mensagem-cupom");

if (btnAplicarCupom) {
    btnAplicarCupom.addEventListener("click", () => {
        const codigoDigitado = inputCupom.value.trim().toUpperCase();
        if (!codigoDigitado) {
            msgCupom.textContent = "Digite um código de cupom.";
            msgCupom.className = "mensagem-cupom erro";
            return;
        }

        const config = obterConfigCardapio();
        const cupomEncontrado = (config.cupons || []).find(
            c => c.codigo.toUpperCase() === codigoDigitado && c.ativo
        );

        if (!cupomEncontrado) {
            cupomAplicado = null;
            msgCupom.textContent = "Cupom inválido ou expirado.";
            msgCupom.className = "mensagem-cupom erro";
            renderizarCarrinho();
            return;
        }

        cupomAplicado = cupomEncontrado;
        const descTexto = cupomEncontrado.tipo === "percentual"
            ? `${cupomEncontrado.valor}% de desconto`
            : `${formatarMoeda(cupomEncontrado.valor)} de desconto`;

        msgCupom.textContent = `Cupom ${cupomEncontrado.codigo} aplicado (${descTexto})!`;
        msgCupom.className = "mensagem-cupom sucesso";
        renderizarCarrinho();
    });
}

function calcularValoresCarrinho() {
    const subtotal = carrinho.reduce((soma, item) => soma + item.subtotal, 0);
    let desconto = 0;

    if (cupomAplicado && subtotal > 0) {
        if (cupomAplicado.tipo === "percentual") {
            desconto = subtotal * (Number(cupomAplicado.valor) / 100);
        } else {
            desconto = Math.min(subtotal, Number(cupomAplicado.valor));
        }
    }

    const totalFinal = Math.max(0, subtotal - desconto);

    const pontosGanhos = carrinho.reduce((soma, item) => {
        if (item.nome === "Quentinha" && !item.ehRecompensa) {
            return soma + Number(item.quantidade);
        }
        return soma;
    }, 0);

    return { subtotal, desconto, totalFinal, pontosGanhos };
}

// =========================================
// RENDERIZAR CARDÁPIO DINÂMICO
// =========================================
function renderizarCardapio() {
    const config = obterConfigCardapio();

    const elPreco1 = document.getElementById("exibir-preco-1");
    const elPreco2 = document.getElementById("exibir-preco-2");
    if (elPreco1) elPreco1.textContent = formatarMoeda(config.preco1Proteina);
    if (elPreco2) elPreco2.textContent = formatarMoeda(config.preco2Proteinas);

    const containerProteinas = document.getElementById("lista-proteinas");
    if (containerProteinas) {
        containerProteinas.innerHTML = "";
        config.proteinas.filter(p => p.ativo).forEach((prot) => {
            const label = document.createElement("label");
            label.className = "opcao";
            label.innerHTML = `
                <input type="checkbox" name="proteina" value="${prot.nome}">
                <span>${prot.rotulo}</span>
            `;
            containerProteinas.appendChild(label);
        });

        containerProteinas.querySelectorAll('input[name="proteina"]').forEach(input => {
            input.addEventListener("change", () => {
                if (pegarProteinas().length > 2) {
                    input.checked = false;
                    alert("Você pode escolher no máximo 2 proteínas por quentinha.");
                }
                atualizarPreco();
            });
        });
    }

    const containerAcomp = document.getElementById("lista-acompanhamentos");
    if (containerAcomp) {
        containerAcomp.innerHTML = "";
        config.acompanhamentos.filter(a => a.ativo).forEach((acomp) => {
            const label = document.createElement("label");
            label.className = "opcao";
            label.innerHTML = `
                <input type="checkbox" name="acompanhamento" value="${acomp.nome}">
                <span>${acomp.rotulo}</span>
            `;
            containerAcomp.appendChild(label);
        });
    }

    const containerBebidas = document.getElementById("lista-bebidas");
    if (containerBebidas) {
        containerBebidas.innerHTML = "";
        config.bebidas.filter(b => b.ativo).forEach((bebida) => {
            const article = document.createElement("article");
            article.className = "bebida";
            article.innerHTML = `
                <h3>${bebida.nome}</h3>
                <strong>${formatarMoeda(bebida.preco)}</strong>
                <button type="button">Adicionar</button>
            `;

            const btnBebida = article.querySelector("button");
            btnBebida.addEventListener("click", () => {
                carrinho.push({
                    nome: bebida.nome,
                    quantidade: 1,
                    preco: Number(bebida.preco),
                    subtotal: Number(bebida.preco)
                });
                animarUltimoItem = true;
                renderizarCarrinho();
                dispararEfeitoCompra("Bebida adicionada!", `1x ${bebida.nome}`, "🥤", btnBebida);
            });

            containerBebidas.appendChild(article);
        });
    }
}

function pegarProteinas() {
    return [...document.querySelectorAll('input[name="proteina"]:checked')]
        .map(item => item.value);
}

function pegarAcompanhamentos() {
    return [...document.querySelectorAll('input[name="acompanhamento"]:checked')]
        .map(item => item.value);
}

function calcularPreco() {
    const config = obterConfigCardapio();
    const quantidadeProteinas = pegarProteinas().length;

    if (quantidadeProteinas === 1) return Number(config.preco1Proteina);
    if (quantidadeProteinas === 2) return Number(config.preco2Proteinas);

    return 0;
}

function atualizarPreco() {
    if (!campoValor) return;
    campoValor.textContent = formatarMoeda(calcularPreco());
}

if (campoQuantidade) {
    campoQuantidade.addEventListener("change", atualizarPreco);
}

// =========================================
// CONTROLE ANIMADO DE QUANTIDADE
// =========================================
const btnDiminuirQtd = document.getElementById("btn-diminuir-qtd");
const btnAumentarQtd = document.getElementById("btn-aumentar-qtd");

function animarNumeroQuantidade() {
    if (!campoQuantidade) return;
    campoQuantidade.classList.remove("animar-qtd");
    void campoQuantidade.offsetWidth;
    campoQuantidade.classList.add("animar-qtd");
    campoQuantidade.dispatchEvent(new Event("change"));
}

if (btnDiminuirQtd && btnAumentarQtd && campoQuantidade) {
    btnDiminuirQtd.addEventListener("click", () => {
        const atual = parseInt(campoQuantidade.value, 10) || 1;
        if (atual > 1) {
            campoQuantidade.value = atual - 1;
            animarNumeroQuantidade();
        }
    });

    btnAumentarQtd.addEventListener("click", () => {
        const atual = parseInt(campoQuantidade.value, 10) || 1;
        campoQuantidade.value = atual + 1;
        animarNumeroQuantidade();
    });
}

// ADICIONAR QUENTINHA
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

        animarUltimoItem = true;
        renderizarCarrinho();

        dispararEfeitoCompra(
            "Adicionado ao pedido!",
            `${quantidade}x Quentinha (${proteinas.join(" + ")})`,
            "🍱",
            botaoAdicionar
        );

        document.querySelectorAll(
            'input[name="proteina"], input[name="acompanhamento"]'
        ).forEach(input => {
            input.checked = false;
        });

        campoQuantidade.value = 1;
        atualizarPreco();
    });
}

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
        const ehUltimo = animarUltimoItem && indice === carrinho.length - 1;
        div.className = `item-carrinho${ehUltimo ? " novo-item" : ""}`;

        const descricao = document.createElement("div");

        const titulo = document.createElement("strong");
        titulo.textContent = `${item.quantidade}x ${item.nome}`;

        descricao.appendChild(titulo);

        if (item.proteinas) {
            const proteinas = document.createElement("p");
            proteinas.textContent = "Proteínas: " + item.proteinas.join(", ");
            descricao.appendChild(proteinas);

            const acompanhamentos = document.createElement("p");
            acompanhamentos.textContent = "Acompanhamentos: " + item.acompanhamentos.join(", ");
            descricao.appendChild(acompanhamentos);
        }

        const preco = document.createElement("strong");
        preco.textContent = item.ehRecompensa ? "GRÁTIS (Fidelidade)" : formatarMoeda(item.subtotal);

        const remover = document.createElement("button");
        remover.className = "remover-item";
        remover.textContent = "Remover";

        remover.addEventListener("click", () => {
            if (item.ehRecompensa && item.pontosGastos) {
                salvarPontosCliente(obterPontosCliente() + item.pontosGastos);
                renderizarFidelidade();
            }
            carrinho.splice(indice, 1);
            renderizarCarrinho();
        });

        div.append(descricao, preco, remover);
        listaCarrinho.appendChild(div);
    });

    animarUltimoItem = false;

    const { desconto, totalFinal, pontosGanhos } = calcularValoresCarrinho();

    const linhaDesconto = document.getElementById("linha-desconto");
    if (linhaDesconto) {
        if (desconto > 0 && cupomAplicado) {
            linhaDesconto.style.display = "flex";
            document.getElementById("nome-cupom-ativo").textContent = cupomAplicado.codigo;
            document.getElementById("valor-desconto").textContent = `- ${formatarMoeda(desconto)}`;
        } else {
            linhaDesconto.style.display = "none";
        }
    }

    totalPedido.textContent = formatarMoeda(totalFinal);

    const avisoPontos = document.getElementById("aviso-pontos-ganhos");
    if (avisoPontos) {
        avisoPontos.innerHTML = `✨ Você vai acumular <strong>+${pontosGanhos} marmita${pontosGanhos === 1 ? "" : "s"}</strong> no cartão fidelidade com este pedido!`;
    }
}

// RASTREAMENTO DE PEDIDOS
const STATUS_LISTA = [
    "Pedido recebido",
    "Em preparação",
    "Saiu para entrega",
    "Entregue"
];

function gerarNumeroPedido() {
    const ultimo = Number(localStorage.getItem("bistro_ultimo_numero") || 0) + 1;
    localStorage.setItem("bistro_ultimo_numero", ultimo);
    return `#${String(ultimo).padStart(3, "0")}`;
}

function atualizarTelaRastreamento() {
    const pedidoSalvo = JSON.parse(localStorage.getItem("bistro_pedido_atual"));
    const secaoRastreamento = document.getElementById("secao-rastreamento");

    if (!pedidoSalvo || !secaoRastreamento) return;

    secaoRastreamento.style.display = "block";
    document.getElementById("numero-pedido").textContent = `Pedido ${pedidoSalvo.numero}`;
    document.getElementById("badge-status").textContent = STATUS_LISTA[pedidoSalvo.statusIndex];

    document.querySelectorAll(".etapa-timeline").forEach((el, idx) => {
        el.classList.remove("ativo", "concluido");
        if (idx < pedidoSalvo.statusIndex) {
            el.classList.add("concluido");
        } else if (idx === pedidoSalvo.statusIndex) {
            el.classList.add("ativo");
        }
    });
}

// FINALIZAR PELO WHATSAPP
const botaoFinalizar = document.getElementById("finalizar-pedido");

if (botaoFinalizar) {
    botaoFinalizar.addEventListener("click", () => {
        if (carrinho.length === 0) {
            alert("Adicione algum produto ao seu pedido!");
            return;
        }

        const { desconto, totalFinal, pontosGanhos } = calcularValoresCarrinho();
        const numeroPedido = gerarNumeroPedido();

        salvarPontosCliente(obterPontosCliente() + pontosGanhos);

        const novoPedido = {
            numero: numeroPedido,
            itens: [...carrinho],
            total: totalFinal,
            cupom: cupomAplicado ? cupomAplicado.codigo : null,
            desconto,
            pontosGanhos,
            statusIndex: 0,
            criadoEm: new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            })
        };

        localStorage.setItem("bistro_pedido_atual", JSON.stringify(novoPedido));

        const historico = JSON.parse(localStorage.getItem("bistro_pedidos") || "[]");
        historico.push(novoPedido);
        localStorage.setItem("bistro_pedidos", JSON.stringify(historico));

        let mensagem = `Olá! Gostaria de fazer o *Pedido ${numeroPedido}* no Bistrô da Josi.\n\n`;

        carrinho.forEach((item, indice) => {
            mensagem += `${indice + 1}. ${item.quantidade}x ${item.nome}\n`;

            if (item.proteinas) {
                mensagem += `Proteínas: ${item.proteinas.join(", ")}\n`;
                mensagem += `Acompanhamentos: ${item.acompanhamentos.join(", ")}\n`;
            }

            mensagem += `Subtotal: ${item.ehRecompensa ? "GRÁTIS (Fidelidade)" : formatarMoeda(item.subtotal)}\n\n`;
        });

        if (desconto > 0 && cupomAplicado) {
            mensagem += `Cupom (${cupomAplicado.codigo}): -${formatarMoeda(desconto)}\n`;
        }

        mensagem += `TOTAL: ${formatarMoeda(totalFinal)}\n`;
        mensagem += `Cartão Fidelidade: +${pontosGanhos} marmita${pontosGanhos === 1 ? "" : "s"} acumulada${pontosGanhos === 1 ? "" : "s"}`;
        mensagem += "\n\nAguardo a confirmação. Obrigado!";

        const link = `https://wa.me/${telefoneWhatsApp}?text=${encodeURIComponent(mensagem)}`;

        carrinho = [];
        cupomAplicado = null;
        if (inputCupom) inputCupom.value = "";
        if (msgCupom) msgCupom.textContent = "";

        renderizarFidelidade();
        renderizarCarrinho();
        atualizarTelaRastreamento();

        document.getElementById("secao-rastreamento").scrollIntoView({ behavior: "smooth" });
        window.open(link, "_blank");
    });
}

// SINCRONIZAÇÃO EM TEMPO REAL
window.addEventListener("storage", () => {
    renderizarCardapio();
    atualizarPreco();
    renderizarFidelidade();
    atualizarTelaRastreamento();
});

// ACESSO SECRETO AO PAINEL DA JOSI
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        window.location.href = "admin.html";
    }
});

const tituloRodape = document.querySelector("footer h2");
if (tituloRodape) {
    let toques = 0;
    let timerToques;

    tituloRodape.addEventListener("click", () => {
        toques += 1;
        clearTimeout(timerToques);

        if (toques >= 5) {
            toques = 0;
            window.location.href = "admin.html";
        } else {
            timerToques = setTimeout(() => {
                toques = 0;
            }, 1500);
        }
    });
}

// INICIALIZAÇÃO
renderizarCardapio();
atualizarPreco();
renderizarFidelidade();
renderizarCarrinho();
atualizarTelaRastreamento();