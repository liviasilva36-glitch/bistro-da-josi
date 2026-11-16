const SENHA_PADRAO = "josi2026";

const STATUS_LISTA = [
    "Pedido recebido",
    "Em preparação",
    "Saiu para entrega",
    "Entregue"
];

const CONFIG_INICIAL = {
    preco1Proteina: 15,
    preco2Proteinas: 20,
    proteinas: [
        { nome: "Linguiça assada", rotulo: "Linguiça assada", ativo: true },
        { nome: "Frango assado", rotulo: "Frango assado", ativo: true },
        { nome: "Galinha torrada", rotulo: "Galinha torrada", ativo: true },
        { nome: "Carne de sol", rotulo: "Carne de sol", ativo: true },
        { nome: "Strogonoff de frango", rotulo: "Strogonoff de frango", ativo: true }
    ],
    acompanhamentos: [
        { nome: "Arroz branco", rotulo: "Arroz branco", ativo: true },
        { nome: "Arroz refogado", rotulo: "Arroz refogado", ativo: true },
        { nome: "Feijão carioca", rotulo: "Feijão carioca", ativo: true },
        { nome: "Macarrão ao alho e óleo", rotulo: "Macarrão ao alho e óleo", ativo: true },
        { nome: "Salada verde", rotulo: "Salada verde", ativo: true },
        { nome: "Farofa", rotulo: "Farofa", ativo: true }
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

function obterConfig() {
    const salva = JSON.parse(localStorage.getItem("bistro_config"));
    if (!salva) {
        localStorage.setItem("bistro_config", JSON.stringify(CONFIG_INICIAL));
        return JSON.parse(JSON.stringify(CONFIG_INICIAL));
    }
    return salva;
}

function salvarConfig(config) {
    localStorage.setItem("bistro_config", JSON.stringify(config));
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// LOGIN PRIVADO
const telaLogin = document.getElementById("tela-login");
const conteudoAdmin = document.getElementById("conteudo-admin");
const btnEntrar = document.getElementById("btn-entrar-admin");
const inputSenha = document.getElementById("senha-admin");

function liberarPainel() {
    telaLogin.style.display = "none";
    conteudoAdmin.style.display = "block";
    carregarTudoAdmin();
}

if (sessionStorage.getItem("josi_logada") === "true") {
    liberarPainel();
}

btnEntrar.addEventListener("click", () => {
    if (inputSenha.value === SENHA_PADRAO) {
        sessionStorage.setItem("josi_logada", "true");
        liberarPainel();
    } else {
        alert("Senha incorreta.");
        inputSenha.value = "";
    }
});

inputSenha.addEventListener("keypress", (e) => {
    if (e.key === "Enter") btnEntrar.click();
});

// RENDERIZAR PEDIDOS NO PAINEL
function renderizarPedidosAdmin() {
    const listaEl = document.getElementById("lista-pedidos-admin");
    const contadorEl = document.getElementById("contador-pedidos");
    const pedidos = JSON.parse(localStorage.getItem("bistro_pedidos") || "[]");

    contadorEl.textContent = `${pedidos.length} PEDIDO(S)`;
    listaEl.innerHTML = "";

    if (pedidos.length === 0) {
        listaEl.innerHTML = '<p class="carrinho-vazio">Nenhum pedido registrado ainda.</p>';
        return;
    }

    [...pedidos].reverse().forEach((pedido) => {
        const card = document.createElement("div");
        card.className = "card-pedido-admin";

        const itensHtml = pedido.itens.map((item) => {
            let detalhe = `<strong>${item.quantidade}x ${item.nome}</strong> (${formatarMoeda(item.subtotal)})`;
            if (item.proteinas) {
                detalhe += `<br><small>Proteínas: ${item.proteinas.join(", ")}</small>`;
                detalhe += `<br><small>Acomp.: ${item.acompanhamentos.join(", ")}</small>`;
            }
            return `<li>${detalhe}</li>`;
        }).join("");

        const concluido = pedido.statusIndex >= STATUS_LISTA.length - 1;

        card.innerHTML = `
            <div class="topo-card-pedido">
                <div>
                    <h3>Pedido ${pedido.numero}</h3>
                    <small>Recebido às ${pedido.criadoEm || "--:--"}</small>
                </div>
                <span class="badge-status">${STATUS_LISTA[pedido.statusIndex]}</span>
            </div>
            <ul class="lista-itens-pedido">${itensHtml}</ul>
            <div class="rodape-card-pedido">
                <strong>Total: ${formatarMoeda(pedido.total)}</strong>
                ${concluido
                    ? '<span class="tag-concluido">Finalizado</span>'
                    : `<button type="button" class="botao-avancar-pedido" data-numero="${pedido.numero}">
                        Avançar para: ${STATUS_LISTA[pedido.statusIndex + 1]} →
                       </button>`
                }
            </div>
        `;

        listaEl.appendChild(card);
    });

    document.querySelectorAll(".botao-avancar-pedido").forEach((btn) => {
        btn.addEventListener("click", () => {
            avancarStatusPedido(btn.dataset.numero);
        });
    });
}

function avancarStatusPedido(numeroPedido) {
    const pedidos = JSON.parse(localStorage.getItem("bistro_pedidos") || "[]");
    const index = pedidos.findIndex(p => p.numero === numeroPedido);

    if (index !== -1 && pedidos[index].statusIndex < STATUS_LISTA.length - 1) {
        pedidos[index].statusIndex += 1;
        localStorage.setItem("bistro_pedidos", JSON.stringify(pedidos));

        const pedidoAtual = JSON.parse(localStorage.getItem("bistro_pedido_atual"));
        if (pedidoAtual && pedidoAtual.numero === numeroPedido) {
            pedidoAtual.statusIndex = pedidos[index].statusIndex;
            localStorage.setItem("bistro_pedido_atual", JSON.stringify(pedidoAtual));
        }

        renderizarPedidosAdmin();
    }
}

document.getElementById("btn-limpar-entregues").addEventListener("click", () => {
    const pedidos = JSON.parse(localStorage.getItem("bistro_pedidos") || "[]");
    const pendentes = pedidos.filter(p => p.statusIndex < STATUS_LISTA.length - 1);
    localStorage.setItem("bistro_pedidos", JSON.stringify(pendentes));
    renderizarPedidosAdmin();
});

// GERENCIAR PREÇOS
function carregarPrecosAdmin() {
    const config = obterConfig();
    document.getElementById("preco-1-prot").value = config.preco1Proteina;
    document.getElementById("preco-2-prot").value = config.preco2Proteinas;
}

document.getElementById("btn-salvar-precos").addEventListener("click", () => {
    const p1 = Number(document.getElementById("preco-1-prot").value);
    const p2 = Number(document.getElementById("preco-2-prot").value);

    if (p1 <= 0 || p2 <= 0) {
        alert("Informe valores válidos maiores que zero.");
        return;
    }

    const config = obterConfig();
    config.preco1Proteina = p1;
    config.preco2Proteinas = p2;
    salvarConfig(config);
    alert("Preços atualizados com sucesso no cardápio.");
});

// GERENCIAR ITENS DO CARDÁPIO
function renderizarListasCardapioAdmin() {
    const config = obterConfig();

    const elProt = document.getElementById("admin-lista-proteinas");
    elProt.innerHTML = "";
    config.proteinas.forEach((item, idx) => {
        elProt.appendChild(criarLinhaItemAdmin(item.rotulo, item.ativo, () => {
            config.proteinas[idx].ativo = !config.proteinas[idx].ativo;
            salvarConfig(config);
            renderizarListasCardapioAdmin();
        }, () => {
            config.proteinas.splice(idx, 1);
            salvarConfig(config);
            renderizarListasCardapioAdmin();
        }));
    });

    const elAcomp = document.getElementById("admin-lista-acompanhamentos");
    elAcomp.innerHTML = "";
    config.acompanhamentos.forEach((item, idx) => {
        elAcomp.appendChild(criarLinhaItemAdmin(item.rotulo, item.ativo, () => {
            config.acompanhamentos[idx].ativo = !config.acompanhamentos[idx].ativo;
            salvarConfig(config);
            renderizarListasCardapioAdmin();
        }, () => {
            config.acompanhamentos.splice(idx, 1);
            salvarConfig(config);
            renderizarListasCardapioAdmin();
        }));
    });

    const elBeb = document.getElementById("admin-lista-bebidas");
    elBeb.innerHTML = "";
    config.bebidas.forEach((item, idx) => {
        const texto = `${item.nome} — ${formatarMoeda(item.preco)}`;
        elBeb.appendChild(criarLinhaItemAdmin(texto, item.ativo, () => {
            config.bebidas[idx].ativo = !config.bebidas[idx].ativo;
            salvarConfig(config);
            renderizarListasCardapioAdmin();
        }, () => {
            config.bebidas.splice(idx, 1);
            salvarConfig(config);
            renderizarListasCardapioAdmin();
        }));
    });
}

function criarLinhaItemAdmin(texto, ativo, onToggle, onExcluir) {
    const div = document.createElement("div");
    div.className = `item-admin-row ${ativo ? "" : "pausado"}`;

    div.innerHTML = `
        <span>${texto} ${ativo ? "" : "<em>(Pausado)</em>"}</span>
        <div class="acoes-item-admin">
            <button type="button" class="btn-toggle-status">${ativo ? "Pausar" : "Ativar"}</button>
            <button type="button" class="remover-item">Excluir</button>
        </div>
    `;

    div.querySelector(".btn-toggle-status").addEventListener("click", onToggle);
    div.querySelector(".remover-item").addEventListener("click", onExcluir);
    return div;
}

document.getElementById("btn-add-proteina").addEventListener("click", () => {
    const input = document.getElementById("nova-proteina");
    const rotulo = input.value.trim();
    if (!rotulo) return;

    const config = obterConfig();
    config.proteinas.push({ nome: rotulo, rotulo, ativo: true });
    salvarConfig(config);
    input.value = "";
    renderizarListasCardapioAdmin();
});

document.getElementById("btn-add-acompanhamento").addEventListener("click", () => {
    const input = document.getElementById("novo-acompanhamento");
    const rotulo = input.value.trim();
    if (!rotulo) return;

    const config = obterConfig();
    config.acompanhamentos.push({ nome: rotulo, rotulo, ativo: true });
    salvarConfig(config);
    input.value = "";
    renderizarListasCardapioAdmin();
});

document.getElementById("btn-add-bebida").addEventListener("click", () => {
    const inputNome = document.getElementById("nova-bebida-nome");
    const inputPreco = document.getElementById("nova-bebida-preco");
    const nome = inputNome.value.trim();
    const preco = Number(inputPreco.value);

    if (!nome || preco <= 0) {
        alert("Preencha o nome e um preço válido para a bebida.");
        return;
    }

    const config = obterConfig();
    config.bebidas.push({ nome, preco, ativo: true });
    salvarConfig(config);
    inputNome.value = "";
    inputPreco.value = "";
    renderizarListasCardapioAdmin();
});

// GERENCIAR CUPONS
function renderizarCuponsAdmin() {
    const config = obterConfig();
    if (!config.cupons) {
        config.cupons = [
            { codigo: "JOSI10", tipo: "percentual", valor: 10, ativo: true },
            { codigo: "BISTRO5", tipo: "fixo", valor: 5, ativo: true }
        ];
        salvarConfig(config);
    }

    const elCupons = document.getElementById("admin-lista-cupons");
    if (!elCupons) return;

    elCupons.innerHTML = "";
    config.cupons.forEach((cupom, idx) => {
        const desc = cupom.tipo === "percentual"
            ? `${cupom.valor}% OFF`
            : `${formatarMoeda(cupom.valor)} OFF`;

        elCupons.appendChild(
            criarLinhaItemAdmin(
                `<strong>${cupom.codigo}</strong> (${desc})`,
                cupom.ativo,
                () => {
                    config.cupons[idx].ativo = !config.cupons[idx].ativo;
                    salvarConfig(config);
                    renderizarCuponsAdmin();
                },
                () => {
                    config.cupons.splice(idx, 1);
                    salvarConfig(config);
                    renderizarCuponsAdmin();
                }
            )
        );
    });
}

document.getElementById("btn-add-cupom").addEventListener("click", () => {
    const codigo = document.getElementById("novo-cupom-codigo").value.trim().toUpperCase();
    const tipo = document.getElementById("novo-cupom-tipo").value;
    const valor = Number(document.getElementById("novo-cupom-valor").value);

    if (!codigo || valor <= 0) {
        alert("Preencha o código e um valor válido para o cupom.");
        return;
    }

    const config = obterConfig();
    if (!config.cupons) config.cupons = [];

    config.cupons.push({ codigo, tipo, valor, ativo: true });
    salvarConfig(config);

    document.getElementById("novo-cupom-codigo").value = "";
    document.getElementById("novo-cupom-valor").value = "";
    renderizarCuponsAdmin();
});

function carregarTudoAdmin() {
    renderizarPedidosAdmin();
    carregarPrecosAdmin();
    renderizarListasCardapioAdmin();
    renderizarCuponsAdmin();
}

window.addEventListener("storage", () => {
    if (sessionStorage.getItem("josi_logada") === "true") {
        renderizarPedidosAdmin();
    }
});