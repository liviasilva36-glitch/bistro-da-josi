import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    doc,
    addDoc,
    collection,
    onSnapshot,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB1V9Iaam67xmjlqigbmvDuuT8yTbNz6jw",
    authDomain: "bistro-da-josi.firebaseapp.com",
    projectId: "bistro-da-josi",
    storageBucket: "bistro-da-josi.firebasestorage.app",
    messagingSenderId: "721975524073",
    appId: "1:721975524073:web:34203b3e403de7a25b8e78",
    measurementId: "G-VBG1TV9DGG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const telefoneWhatsApp = "558488629560";
const DIAS_VALIDADE_FIDELIDADE = 30;

// =========================================
// HORÁRIO DE FUNCIONAMENTO - NATAL/RN
// Segunda a sexta: 11h às 12h30
// Sábado e domingo: 11h30 às 15h
// =========================================

function obterHorarioLocalBistro() {
    const partes = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Fortaleza",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());

    const dia = partes.find(parte => parte.type === "weekday")?.value || "";
    const hora = Number(partes.find(parte => parte.type === "hour")?.value);
    const minuto = Number(partes.find(parte => parte.type === "minute")?.value);

    return { dia, minutosAtuais: hora * 60 + minuto };
}

function verificarHorarioFuncionamento() {
    const { dia, minutosAtuais } = obterHorarioLocalBistro();
    const fimDeSemana = dia === "sáb." || dia === "dom.";

    const abertura = fimDeSemana ? (11 * 60 + 30) : (11 * 60);
    const fechamento = fimDeSemana ? (15 * 60) : (12 * 60 + 30);

    return minutosAtuais >= abertura && minutosAtuais < fechamento;
}

  
function atualizarAvisoFuncionamento() {
    let aviso = document.getElementById("aviso-funcionamento");

    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = "aviso-funcionamento";
        aviso.setAttribute("role", "status");
        document.body.prepend(aviso);
    }

    const aberto = verificarHorarioFuncionamento();
    const cor = aberto ? "#38c878" : "#e45b52";

    const mensagem = aberto
        ? "Estamos abertos! Recebendo pedidos."
        : "Estamos fechados no momento. Funcionamos de segunda a sexta, das 11h às 12h30, e aos sábados e domingos, das 11h30 às 15h.";

    aviso.style.cssText = `
        width: 100%;
        min-height: 75px;
        padding: 20px 35px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 14px;
        text-align: center;
        background: linear-gradient(90deg, #080808, #1c1a14, #080808);
        color: #f2ce65;
        border-bottom: 3px solid #c9a43b;
        font-family: Arial, sans-serif;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.7;
        letter-spacing: 0.4px;
        position: relative;
        z-index: 100;
    `;

    aviso.innerHTML = `
        <span style="
            display: inline-block;
            width: 12px;
            height: 12px;
            min-width: 12px;
            border-radius: 50%;
            background: ${cor};
            box-shadow: 0 0 12px ${cor};
        "></span>
        <span>${mensagem}</span>
    `;
}

 

function dataMais30DiasISO() {
    const data = new Date();
    data.setDate(data.getDate() + 30);
    return data.toISOString().split("T")[0];
}

function formatarDataBR(dataISO) {
    if (!dataISO) return "";

    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

function cupomEstaExpirado(validadeISO) {
    if (!validadeISO) return false;

    const hojeISO = new Date().toISOString().split("T")[0];
    return hojeISO > validadeISO;
}

const CONFIG_PADRAO = {
    preco1Proteina: 15,
    preco2Proteinas: 20,

    marmitasEspeciais: [],

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
        {
            codigo: "JOSI10",
            tipo: "percentual",
            valor: 10,
            validade: dataMais30DiasISO(),
            ativo: true
        },
        {
            codigo: "BISTRO5",
            tipo: "fixo",
            valor: 5,
            validade: dataMais30DiasISO(),
            ativo: true
        }
    ]
};

let configCardapioAtual =
    JSON.parse(localStorage.getItem("bistro_config")) || CONFIG_PADRAO;

const RECOMPENSAS_FIDELIDADE = [
    {
        id: "rec_bebida",
        titulo: "🥤 Refrigerante Lata Grátis",
        descricao: "Na compra de 10 marmitas (dentro de 1 mês), ganhe 1 refrigerante lata por conta da casa.",
        pontosNecessarios: 10,
        itemCarrinho: "Recompensa Fidelidade (10 marmitas): Refrigerante Lata Grátis"
    },
    {
        id: "rec_quentinha1",
        titulo: "🍱 Marmita Média (1 Proteína) Grátis",
        descricao: "Na compra de 20 marmitas (dentro de 1 mês), ganhe 1 marmita média (R$ 15,00) à sua escolha.",
        pontosNecessarios: 20,
        itemCarrinho: "Recompensa Fidelidade (20 marmitas): Marmita Média (1 Proteína) Grátis"
    }
];

function obterConfigCardapio() {
    return configCardapioAtual;
}

onSnapshot(doc(db, "configuracoes", "cardapio"), (snap) => {
    if (snap.exists()) {
        configCardapioAtual = snap.data();

        localStorage.setItem(
            "bistro_config",
            JSON.stringify(configCardapioAtual)
        );

        renderizarCardapio();
        atualizarPreco();
    }
});

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

function dispararEfeitoCompra(
    titulo,
    subtitulo,
    emoji = "🍱",
    elementoOrigem = null
) {
    if (elementoOrigem && listaCarrinho) {
        const rectOrigem = elementoOrigem.getBoundingClientRect();
        const rectDestino = listaCarrinho.getBoundingClientRect();

        const voador = document.createElement("div");
        voador.className = "item-voando-carrinho";
        voador.textContent = emoji;

        voador.style.left =
            `${rectOrigem.left + rectOrigem.width / 2 - 14}px`;

        voador.style.top =
            `${rectOrigem.top + rectOrigem.height / 2 - 14}px`;

        document.body.appendChild(voador);

        const deltaX =
            (rectDestino.left + rectDestino.width / 2) -
            (rectOrigem.left + rectOrigem.width / 2);

        const deltaY =
            Math.min(rectDestino.top, window.innerHeight - 80) -
            rectOrigem.top;

        requestAnimationFrame(() => {
            voador.style.transform =
                `translate(${deltaX}px, ${deltaY}px) scale(0.4) rotate(25deg)`;

            voador.style.opacity = "0";
        });

        setTimeout(() => voador.remove(), 800);
    }

    if (totalPedido) {
        totalPedido.classList.remove("pulsar-total");
        void totalPedido.offsetWidth;
        totalPedido.classList.add("pulsar-total");
    }

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
                listaCarrinho.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
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
// FIDELIDADE POR MARMITAS (VALIDADE DE 1 MÊS)
// =========================================

function obterDadosFidelidade() {
    const pontos = Number(
        localStorage.getItem("bistro_pontos_cliente") || 0
    );

    const validadeISO =
        localStorage.getItem("bistro_pontos_validade");

    if (pontos > 0 && validadeISO && cupomEstaExpirado(validadeISO)) {
        localStorage.setItem("bistro_pontos_cliente", "0");
        localStorage.removeItem("bistro_pontos_validade");

        return {
            pontos: 0,
            validadeISO: null
        };
    }

    return { pontos, validadeISO };
}

function obterPontosCliente() {
    return obterDadosFidelidade().pontos;
}

function salvarPontosCliente(novoSaldo, renovarValidade = false) {
    const saldoFinal = Math.max(0, Math.floor(novoSaldo));

    localStorage.setItem("bistro_pontos_cliente", saldoFinal);

    if (saldoFinal === 0) {
        localStorage.removeItem("bistro_pontos_validade");
    } else if (
        renovarValidade ||
        !localStorage.getItem("bistro_pontos_validade")
    ) {
        const expira = new Date();
        expira.setDate(expira.getDate() + DIAS_VALIDADE_FIDELIDADE);

        localStorage.setItem(
            "bistro_pontos_validade",
            expira.toISOString().split("T")[0]
        );
    }
}
function renderizarFidelidade() {
    const { pontos: marmitasAcumuladas, validadeISO } = obterDadosFidelidade();
    const saldoEl = document.getElementById("saldo-pontos");
    const nivelEl = document.getElementById("nivel-fidelidade");
    const barraEl = document.getElementById("barra-pontos");
    const metaEl = document.getElementById("texto-meta-pontos");
    const listaRecEl = document.getElementById("lista-recompensas");

    if (!saldoEl || !listaRecEl) return;

    const textoValidade = (marmitasAcumuladas > 0 && validadeISO)
        ? ` (válido até ${formatarDataBR(validadeISO)})`
        : " (validade de 1 mês)";

    saldoEl.textContent = `${marmitasAcumuladas} marmita${marmitasAcumuladas === 1 ? "" : "s"}${textoValidade}`;

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
                <span class="custo-pontos">${rec.pontosNecessarios} marmitas • Validade 1 mês</span>
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

            salvarPontosCliente(obterPontosCliente() - rec.pontosNecessarios, false);

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
            c => c.codigo.toUpperCase() === codigoDigitado
        );

        if (!cupomEncontrado || !cupomEncontrado.ativo) {
            cupomAplicado = null;
            msgCupom.textContent = "Cupom inválido ou desativado.";
            msgCupom.className = "mensagem-cupom erro";
            renderizarCarrinho();
            return;
        }

        if (cupomEstaExpirado(cupomEncontrado.validade)) {
            cupomAplicado = null;
            msgCupom.textContent = `Este cupom expirou em ${formatarDataBR(cupomEncontrado.validade)}.`;
            msgCupom.className = "mensagem-cupom erro";
            renderizarCarrinho();
            return;
        }

        cupomAplicado = cupomEncontrado;

        const descTexto = cupomEncontrado.tipo === "percentual"
            ? `${cupomEncontrado.valor}% de desconto`
            : `${formatarMoeda(cupomEncontrado.valor)} de desconto`;

        const validadeTexto = cupomEncontrado.validade
            ? ` (válido até ${formatarDataBR(cupomEncontrado.validade)})`
            : "";

        msgCupom.textContent = `Cupom ${cupomEncontrado.codigo} aplicado: ${descTexto}${validadeTexto}!`;
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
        if ((item.nome === "Quentinha" || item.ehMarmitaEspecial) && !item.ehRecompensa) {
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

    // MARMITAS ESPECIAIS
    const secaoEspeciais = document.getElementById("secao-especiais");
    const containerEspeciais = document.getElementById("lista-especiais");
    const especiaisAtivas = (config.marmitasEspeciais || []).filter(e => e.ativo);

    if (secaoEspeciais && containerEspeciais) {
        if (especiaisAtivas.length === 0) {
            secaoEspeciais.style.display = "none";
        } else {
            secaoEspeciais.style.display = "block";
            containerEspeciais.innerHTML = "";

            especiaisAtivas.forEach((esp) => {
                const precoItem = Number(esp.preco || 25);
                const article = document.createElement("article");

                article.className = "bebida";

                article.innerHTML = `
                    <h3>${esp.nome}</h3>
                    ${esp.descricao ? `<p style="font-size: 0.9rem; opacity: 0.85; margin: 6px 0;">${esp.descricao}</p>` : ""}
                    <strong>${formatarMoeda(precoItem)}</strong>
                    <button type="button">+ Adicionar</button>
                `;

                const btnAddEsp = article.querySelector("button");

                btnAddEsp.addEventListener("click", () => {
                    carrinho.push({
                        nome: `Marmita Especial: ${esp.nome}`,
                        descricao: esp.descricao || "",
                        quantidade: 1,
                        preco: precoItem,
                        subtotal: precoItem,
                        ehMarmitaEspecial: true
                    });

                    animarUltimoItem = true;
                    renderizarCarrinho();

                    dispararEfeitoCompra(
                        "Marmita especial adicionada!",
                        `1x ${esp.nome}`,
                        "⭐",
                        btnAddEsp
                    );
                });

                containerEspeciais.appendChild(article);
            });
        }
    }

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

                dispararEfeitoCompra(
                    "Bebida adicionada!",
                    `1x ${bebida.nome}`,
                    "🥤",
                    btnBebida
                );
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

        if (item.descricao) {
            const descP = document.createElement("p");
            descP.textContent = item.descricao;
            descricao.appendChild(descP);
        }

        if (item.proteinas) {
            const proteinas = document.createElement("p");
            proteinas.textContent = "Proteínas: " + item.proteinas.join(", ");
            descricao.appendChild(proteinas);

            const acompanhamentos = document.createElement("p");
            acompanhamentos.textContent = "Acompanhamentos: " + item.acompanhamentos.join(", ");
            descricao.appendChild(acompanhamentos);
        }

        const preco = document.createElement("strong");
        preco.textContent = item.ehRecompensa
            ? "GRÁTIS (Fidelidade)"
            : formatarMoeda(item.subtotal);

        const remover = document.createElement("button");
        remover.className = "remover-item";
        remover.textContent = "Remover";

        remover.addEventListener("click", () => {
            if (item.ehRecompensa && item.pontosGastos) {
                salvarPontosCliente(
                    obterPontosCliente() + item.pontosGastos,
                    false
                );

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

            document.getElementById("nome-cupom-ativo").textContent =
                cupomAplicado.codigo;

            document.getElementById("valor-desconto").textContent =
                `- ${formatarMoeda(desconto)}`;
        } else {
            linhaDesconto.style.display = "none";
        }
    }

    totalPedido.textContent = formatarMoeda(totalFinal);

    const avisoPontos = document.getElementById("aviso-pontos-ganhos");

    if (avisoPontos) {
        avisoPontos.innerHTML =
            `✨ Você vai acumular <strong>+${pontosGanhos} marmita${pontosGanhos === 1 ? "" : "s"}</strong> no cartão fidelidade (válidas por 1 mês)!`;
    }
}
// =========================================
// RASTREAMENTO DE PEDIDOS EM TEMPO REAL
// =========================================

const STATUS_LISTA = [
    "Pedido recebido",
    "Em preparação",
    "Saiu para entrega",
    "Entregue"
];

let unsubscribeRastreamento = null;

async function gerarNumeroPedido() {
    const contadorRef = doc(db, "configuracoes", "contador_pedidos");

    const novoNumero = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(contadorRef);
        const atual = snap.exists() ? (snap.data().ultimo || 0) + 1 : 1;

        transaction.set(contadorRef, { ultimo: atual });

        return atual;
    });

    return `#${String(novoNumero).padStart(3, "0")}`;
}

function exibirDadosRastreamento(pedidoSalvo) {
    const secaoRastreamento = document.getElementById("secao-rastreamento");

    if (!pedidoSalvo || !secaoRastreamento) return;

    secaoRastreamento.style.display = "block";

    document.getElementById("numero-pedido").textContent =
        `Pedido ${pedidoSalvo.numero}`;

    document.getElementById("badge-status").textContent =
        STATUS_LISTA[pedidoSalvo.statusIndex];

    document.querySelectorAll(".etapa-timeline").forEach((el, idx) => {
        el.classList.remove("ativo", "concluido");

        if (idx < pedidoSalvo.statusIndex) {
            el.classList.add("concluido");
        } else if (idx === pedidoSalvo.statusIndex) {
            el.classList.add("ativo");
        }
    });
}

function atualizarTelaRastreamento() {
    const pedidoSalvo = JSON.parse(
        localStorage.getItem("bistro_pedido_atual")
    );

    if (!pedidoSalvo) return;

    exibirDadosRastreamento(pedidoSalvo);

    if (pedidoSalvo.idDoc) {
        if (unsubscribeRastreamento) {
            unsubscribeRastreamento();
        }

        unsubscribeRastreamento = onSnapshot(
            doc(db, "pedidos", pedidoSalvo.idDoc),
            (snap) => {
                if (snap.exists()) {
                    const atualizado = {
                        idDoc: snap.id,
                        ...snap.data()
                    };

                    localStorage.setItem(
                        "bistro_pedido_atual",
                        JSON.stringify(atualizado)
                    );

                    exibirDadosRastreamento(atualizado);
                }
            }
        );
    }
}

// =========================================
// FINALIZAR PELO WHATSAPP E SALVAR NO PAINEL
// =========================================

const botaoFinalizar = document.getElementById("finalizar-pedido");

if (botaoFinalizar) {
    botaoFinalizar.addEventListener("click", async () => {

        // BLOQUEIA PEDIDOS FORA DO HORÁRIO
        if (!verificarHorarioFuncionamento()) {
            atualizarAvisoFuncionamento();

            alert(
                "O Bistrô da Josi está fechado no momento. Volte durante nosso horário de funcionamento para finalizar seu pedido!"
            );

            return;
        }

        if (carrinho.length === 0) {
            alert("Adicione algum produto ao seu pedido!");
            return;
        }

        // Abre a janela imediatamente para evitar bloqueio do navegador.
        const janelaWhatsApp = window.open("about:blank", "_blank");

        botaoFinalizar.disabled = true;

        try {
            const {
                desconto,
                totalFinal,
                pontosGanhos
            } = calcularValoresCarrinho();

            const itensPedido = carrinho.map(item => ({
                ...item,

                ...(item.proteinas
                    ? { proteinas: [...item.proteinas] }
                    : {}),

                ...(item.acompanhamentos
                    ? { acompanhamentos: [...item.acompanhamentos] }
                    : {})
            }));

            const cupomPedido = cupomAplicado
                ? cupomAplicado.codigo
                : null;

            const numeroPedido = await gerarNumeroPedido();

            const novoPedido = {
                numero: numeroPedido,
                itens: itensPedido,
                total: totalFinal,
                cupom: cupomPedido,
                desconto,
                pontosGanhos,
                statusIndex: 0,
                timestamp: Date.now(),

                criadoEm: new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            };

            // SALVA O PEDIDO NO FIREBASE
            const docRef = await addDoc(
                collection(db, "pedidos"),
                novoPedido
            );

            novoPedido.idDoc = docRef.id;

            localStorage.setItem(
                "bistro_pedido_atual",
                JSON.stringify(novoPedido)
            );

            // ATUALIZA A FIDELIDADE APÓS SALVAR O PEDIDO
            salvarPontosCliente(
                obterPontosCliente() + pontosGanhos,
                pontosGanhos > 0
            );

            // MENSAGEM DO WHATSAPP SEM O NÚMERO INTERNO DO PEDIDO
            let mensagem =
                `Olá! Gostaria de fazer um pedido no *Bistrô da Josi*.\n\n`;

            itensPedido.forEach((item, indice) => {
                mensagem += `${indice + 1}. ${item.quantidade}x ${item.nome}\n`;

                if (item.descricao) {
                    mensagem += `Detalhes: ${item.descricao}\n`;
                }

                if (item.proteinas && item.proteinas.length) {
                    mensagem += `Proteínas: ${item.proteinas.join(", ")}\n`;

                    mensagem +=
                        `Acompanhamentos: ${(item.acompanhamentos || []).join(", ")}\n`;
                }

                mensagem +=
                    `Subtotal: ${item.ehRecompensa
                        ? "GRÁTIS (Fidelidade)"
                        : formatarMoeda(item.subtotal)}\n\n`;
            });

            if (desconto > 0 && cupomPedido) {
                mensagem +=
                    `Cupom (${cupomPedido}): -${formatarMoeda(desconto)}\n`;
            }

            mensagem += `TOTAL: ${formatarMoeda(totalFinal)}\n`;

            mensagem +=
                `Cartão Fidelidade: +${pontosGanhos} marmita${pontosGanhos === 1 ? "" : "s"} acumulada${pontosGanhos === 1 ? "" : "s"} (validade 1 mês)`;

            mensagem += "\n\nAguardo a confirmação. Obrigado!";

            const linkWhatsApp =
                `https://wa.me/${telefoneWhatsApp}?text=${encodeURIComponent(mensagem)}`;

            // LIMPA O CARRINHO APÓS REGISTRAR O PEDIDO
            carrinho = [];
            cupomAplicado = null;

            if (inputCupom) {
                inputCupom.value = "";
            }

            if (msgCupom) {
                msgCupom.textContent = "";
                msgCupom.className = "mensagem-cupom";
            }

            renderizarFidelidade();
            renderizarCarrinho();
            atualizarTelaRastreamento();

            const secaoRastreamento =
                document.getElementById("secao-rastreamento");

            if (secaoRastreamento) {
                secaoRastreamento.scrollIntoView({
                    behavior: "smooth"
                });
            }

            // ABRE O WHATSAPP
            if (janelaWhatsApp && !janelaWhatsApp.closed) {
                janelaWhatsApp.location.href = linkWhatsApp;
            } else {
                window.location.href = linkWhatsApp;
            }

        } catch (erro) {
            console.error("Erro ao finalizar pedido:", erro);

            if (janelaWhatsApp && !janelaWhatsApp.closed) {
                janelaWhatsApp.close();
            }

            alert(
                "Não foi possível registrar seu pedido. Verifique sua conexão e tente novamente. Se o problema continuar, avise o Bistrô da Josi."
            );

        } finally {
            botaoFinalizar.disabled = false;
        }
    });
}
// =========================================
// ACESSO SECRETO AO PAINEL DA JOSI
// =========================================

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

// =========================================
// INICIALIZAÇÃO
// =========================================

atualizarAvisoFuncionamento();

setInterval(atualizarAvisoFuncionamento, 30000);

renderizarCardapio();
atualizarPreco();
renderizarFidelidade();
renderizarCarrinho();
atualizarTelaRastreamento();