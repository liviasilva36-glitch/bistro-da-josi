import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    onSnapshot,
    query,
    orderBy
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
const auth = getAuth(app);

const STATUS_LISTA = [
    "Pedido recebido",
    "Em preparação",
    "Saiu para entrega",
    "Entregue"
];

function dataMais30DiasISO() {
    const data = new Date();
    data.setDate(data.getDate() + 30);
    return data.toISOString().split("T")[0];
}

function formatarDataBR(dataISO) {
    if (!dataISO) return "Sem validade";
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

function cupomEstaExpirado(validadeISO) {
    if (!validadeISO) return false;
    const hojeISO = new Date().toISOString().split("T")[0];
    return hojeISO > validadeISO;
}

const CONFIG_INICIAL = {
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
        { codigo: "JOSI10", tipo: "percentual", valor: 10, validade: dataMais30DiasISO(), ativo: true },
        { codigo: "BISTRO5", tipo: "fixo", valor: 5, validade: dataMais30DiasISO(), ativo: true }
    ]
};

let configAtual = JSON.parse(JSON.stringify(CONFIG_INICIAL));
let pedidosEmMemoria = [];
let escutaAtiva = false;

async function carregarConfigNuvem() {
    const ref = doc(db, "configuracoes", "cardapio");
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, CONFIG_INICIAL);
        configAtual = JSON.parse(JSON.stringify(CONFIG_INICIAL));
    } else {
        configAtual = snap.data();
    }
    return configAtual;
}

async function salvarConfigNuvem(novaConfig) {
    configAtual = novaConfig;
    localStorage.setItem("bistro_config", JSON.stringify(novaConfig));
    await setDoc(doc(db, "configuracoes", "cardapio"), novaConfig);
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// LOGIN PRIVADO COM FIREBASE AUTH
const telaLogin = document.getElementById("tela-login");
const conteudoAdmin = document.getElementById("conteudo-admin");
const btnEntrar = document.getElementById("btn-entrar-admin");
const inputEmail = document.getElementById("email-admin");
const inputSenha = document.getElementById("senha-admin");

async function liberarPainel() {
    telaLogin.style.display = "none";
    conteudoAdmin.style.display = "block";

    const campoDataCupom = document.getElementById("novo-cupom-validade");
    if (campoDataCupom && !campoDataCupom.value) {
        campoDataCupom.value = dataMais30DiasISO();
    }

    await carregarConfigNuvem();
    carregarPrecosAdmin();
    renderizarListasCardapioAdmin();
    renderizarCuponsAdmin();
    iniciarEscutaPedidos();
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        liberarPainel();
    }
});

btnEntrar.addEventListener("click", async () => {
    const email = inputEmail.value.trim();
    const senha = inputSenha.value;

    if (!email || !senha) {
        alert("Preencha o e-mail e a senha.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (erro) {
        console.error(erro);
        alert("E-mail ou senha incorretos!");
        inputSenha.value = "";
    }
});

inputSenha.addEventListener("keypress", (e) => {
    if (e.key === "Enter") btnEntrar.click();
});

// ESCUTAR PEDIDOS EM TEMPO REAL
function iniciarEscutaPedidos() {
    if (escutaAtiva) return;
    escutaAtiva = true;

    const q = query(collection(db, "pedidos"), orderBy("timestamp", "asc"));
    onSnapshot(q, (snapshot) => {
        pedidosEmMemoria = snapshot.docs.map((documento) => ({
            idDoc: documento.id,
            ...documento.data()
        }));
        renderizarPedidosAdmin(pedidosEmMemoria);
    }, (erro) => {
        console.error("Erro ao escutar pedidos:", erro);
    });
}

function renderizarPedidosAdmin(pedidos) {
    const listaEl = document.getElementById("lista-pedidos-admin");
    const contadorEl = document.getElementById("contador-pedidos");

    contadorEl.textContent = `${pedidos.length} PEDIDO(S)`;
    listaEl.innerHTML = "";

    if (pedidos.length === 0) {
        listaEl.innerHTML = '<p class="carrinho-vazio">Nenhum pedido registrado ainda.</p>';
        return;
    }

    [...pedidos].reverse().forEach((pedido) => {
        const card = document.createElement("div");
        card.className = "card-pedido-admin";

        const itensHtml = (pedido.itens || []).map((item) => {
            let detalhe = `<strong>${item.quantidade}x ${item.nome}</strong> (${formatarMoeda(item.subtotal)})`;
            if (item.proteinas) {
                detalhe += `<br><small>Proteínas: ${item.proteinas.join(", ")}</small>`;
                detalhe += `<br><small>Acomp.: ${item.acompanhamentos.join(", ")}</small>`;
            }
            return `<li>${detalhe}</li>`;
        }).join("");

        const concluido = pedido.statusIndex >= STATUS_LISTA.length - 1;
        const identificador = pedido.idDoc || pedido.numero;

        card.innerHTML = `
            <div class="topo-card-pedido">
                <div>
                    <h3>Pedido ${pedido.numero}</h3>
                    <small>Recebido às ${pedido.criadoEm || "--:--"}</small>
                </div>
                <span class="badge-status">${STATUS_LISTA[pedido.statusIndex] || "Pedido recebido"}</span>
            </div>
            <ul class="lista-itens-pedido">${itensHtml}</ul>
            <div class="rodape-card-pedido">
                <strong>Total: ${formatarMoeda(pedido.total)}</strong>
                ${concluido
                    ? '<span class="tag-concluido">Finalizado</span>'
                    : `<button type="button" class="botao-avancar-pedido" data-id="${identificador}">
                        Avançar para: ${STATUS_LISTA[pedido.statusIndex + 1]} →
                       </button>`
                }
            </div>
        `;

        listaEl.appendChild(card);
    });

    document.querySelectorAll(".botao-avancar-pedido").forEach((btn) => {
        btn.addEventListener("click", () => {
            avancarStatusPedido(btn.dataset.id);
        });
    });
}

async function avancarStatusPedido(identificador) {
    const pedido = pedidosEmMemoria.find(p => (p.idDoc || p.numero) === identificador);
    if (!pedido || pedido.statusIndex >= STATUS_LISTA.length - 1) return;

    const novoStatus = pedido.statusIndex + 1;
    await updateDoc(doc(db, "pedidos", pedido.idDoc), {
        statusIndex: novoStatus
    });
}

document.getElementById("btn-limpar-entregues").addEventListener("click", async () => {
    const entregues = pedidosEmMemoria.filter(p => p.statusIndex >= STATUS_LISTA.length - 1);
    for (const p of entregues) {
        if (p.idDoc) await deleteDoc(doc(db, "pedidos", p.idDoc));
    }
});

// GERENCIAR PREÇOS
function carregarPrecosAdmin() {
    document.getElementById("preco-1-prot").value = configAtual.preco1Proteina;
    document.getElementById("preco-2-prot").value = configAtual.preco2Proteinas;
}

document.getElementById("btn-salvar-precos").addEventListener("click", async () => {
    const p1 = Number(document.getElementById("preco-1-prot").value);
    const p2 = Number(document.getElementById("preco-2-prot").value);

    if (p1 <= 0 || p2 <= 0) {
        alert("Informe valores válidos maiores que zero.");
        return;
    }

    configAtual.preco1Proteina = p1;
    configAtual.preco2Proteinas = p2;
    await salvarConfigNuvem(configAtual);
    alert("Preços atualizados com sucesso no cardápio!");
});

// GERENCIAR ITENS DO CARDÁPIO
function renderizarListasCardapioAdmin() {
    const elProt = document.getElementById("admin-lista-proteinas");
    elProt.innerHTML = "";
    configAtual.proteinas.forEach((item, idx) => {
        elProt.appendChild(criarLinhaItemAdmin(item.rotulo, item.ativo, async () => {
            configAtual.proteinas[idx].ativo = !configAtual.proteinas[idx].ativo;
            await salvarConfigNuvem(configAtual);
            renderizarListasCardapioAdmin();
        }, async () => {
            configAtual.proteinas.splice(idx, 1);
            await salvarConfigNuvem(configAtual);
            renderizarListasCardapioAdmin();
        }));
    });

    const elAcomp = document.getElementById("admin-lista-acompanhamentos");
    elAcomp.innerHTML = "";
    configAtual.acompanhamentos.forEach((item, idx) => {
        elAcomp.appendChild(criarLinhaItemAdmin(item.rotulo, item.ativo, async () => {
            configAtual.acompanhamentos[idx].ativo = !configAtual.acompanhamentos[idx].ativo;
            await salvarConfigNuvem(configAtual);
            renderizarListasCardapioAdmin();
        }, async () => {
            configAtual.acompanhamentos.splice(idx, 1);
            await salvarConfigNuvem(configAtual);
            renderizarListasCardapioAdmin();
        }));
    });

    const elBeb = document.getElementById("admin-lista-bebidas");
    elBeb.innerHTML = "";
    configAtual.bebidas.forEach((item, idx) => {
        const texto = `${item.nome} — ${formatarMoeda(item.preco)}`;
        elBeb.appendChild(criarLinhaItemAdmin(texto, item.ativo, async () => {
            configAtual.bebidas[idx].ativo = !configAtual.bebidas[idx].ativo;
            await salvarConfigNuvem(configAtual);
            renderizarListasCardapioAdmin();
        }, async () => {
            configAtual.bebidas.splice(idx, 1);
            await salvarConfigNuvem(configAtual);
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

document.getElementById("btn-add-proteina").addEventListener("click", async () => {
    const input = document.getElementById("nova-proteina");
    const rotulo = input.value.trim();
    if (!rotulo) return;

    configAtual.proteinas.push({ nome: rotulo, rotulo, ativo: true });
    await salvarConfigNuvem(configAtual);
    input.value = "";
    renderizarListasCardapioAdmin();
});

document.getElementById("btn-add-acompanhamento").addEventListener("click", async () => {
    const input = document.getElementById("novo-acompanhamento");
    const rotulo = input.value.trim();
    if (!rotulo) return;

    configAtual.acompanhamentos.push({ nome: rotulo, rotulo, ativo: true });
    await salvarConfigNuvem(configAtual);
    input.value = "";
    renderizarListasCardapioAdmin();
});

document.getElementById("btn-add-bebida").addEventListener("click", async () => {
    const inputNome = document.getElementById("nova-bebida-nome");
    const inputPreco = document.getElementById("nova-bebida-preco");
    const nome = inputNome.value.trim();
    const preco = Number(inputPreco.value);

    if (!nome || preco <= 0) {
        alert("Preencha o nome e um preço válido para a bebida.");
        return;
    }

    configAtual.bebidas.push({ nome, preco, ativo: true });
    await salvarConfigNuvem(configAtual);
    inputNome.value = "";
    inputPreco.value = "";
    renderizarListasCardapioAdmin();
});

// GERENCIAR CUPONS
function renderizarCuponsAdmin() {
    if (!configAtual.cupons) configAtual.cupons = [];

    const elCupons = document.getElementById("admin-lista-cupons");
    if (!elCupons) return;

    elCupons.innerHTML = "";
    configAtual.cupons.forEach((cupom, idx) => {
        const desc = cupom.tipo === "percentual"
            ? `${cupom.valor}% OFF`
            : `${formatarMoeda(cupom.valor)} OFF`;

        const expirado = cupomEstaExpirado(cupom.validade);
        const textoValidade = cupom.validade
            ? ` • Válido até ${formatarDataBR(cupom.validade)}${expirado ? " <strong style='color:#c0392b;'>(EXPIRADO)</strong>" : ""}`
            : "";

        elCupons.appendChild(
            criarLinhaItemAdmin(
                `<strong>${cupom.codigo}</strong> (${desc})${textoValidade}`,
                cupom.ativo && !expirado,
                async () => {
                    configAtual.cupons[idx].ativo = !configAtual.cupons[idx].ativo;
                    await salvarConfigNuvem(configAtual);
                    renderizarCuponsAdmin();
                },
                async () => {
                    configAtual.cupons.splice(idx, 1);
                    await salvarConfigNuvem(configAtual);
                    renderizarCuponsAdmin();
                }
            )
        );
    });
}

document.getElementById("btn-add-cupom").addEventListener("click", async () => {
    const codigo = document.getElementById("novo-cupom-codigo").value.trim().toUpperCase();
    const tipo = document.getElementById("novo-cupom-tipo").value;
    const valor = Number(document.getElementById("novo-cupom-valor").value);
    const campoData = document.getElementById("novo-cupom-validade");
    const validade = (campoData && campoData.value) ? campoData.value : dataMais30DiasISO();

    if (!codigo || valor <= 0) {
        alert("Preencha o código e um valor válido para o cupom.");
        return;
    }

    if (!configAtual.cupons) configAtual.cupons = [];

    configAtual.cupons.push({
        codigo,
        tipo,
        valor,
        validade,
        ativo: true
    });

    await salvarConfigNuvem(configAtual);

    document.getElementById("novo-cupom-codigo").value = "";
    document.getElementById("novo-cupom-valor").value = "";
    if (campoData) campoData.value = dataMais30DiasISO();
    renderizarCuponsAdmin();
});