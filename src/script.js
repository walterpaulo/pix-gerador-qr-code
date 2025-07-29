function limitarCasasDecimais(input) {
    const valor = input.value;
    if (valor.includes(".")) {
        const partes = valor.split(".");
        if (partes[1] && partes[1].length > 2) {
            input.value = `${partes[0]}.${partes[1].substring(0, 2)}`;
        }
    }
}

// Função para remover acentos e caracteres especiais
function removerAcentos(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Função que ajusta o valor do input para remover acentos e caracteres especiais,
// mantendo só letras A-Z (maiúsculas/minúsculas) e espaços
function ajustarTexto(input) {
    let valor = input.value;
    valor = removerAcentos(valor);
    valor = valor.replace(/[^a-zA-Z\s]/g, "");
    input.value = valor;
}

function format(id, value) {
    const size = String(value.length).padStart(2, '0');
    return id + size + value;
}

// Função que monta o payload completo com CRC16 correto
function formatarPix(chave, nome, cidade, valor, txid = "***") {
    const payloadFormat = format("00", "01");
    const merchantAccount = format("26", format("00", "BR.GOV.BCB.PIX") + format("01", chave));
    const merchantCategoryCode = format("52", "0000");
    const transactionCurrency = format("53", "986");
    const transactionAmount = valor ? format("54", Number(valor).toFixed(2)) : "";
    const countryCode = format("58", "BR");
    const merchantName = format("59", nome.toUpperCase());
    const merchantCity = format("60", cidade.toUpperCase());
    const additionalDataField = format("62", format("05", txid));

    let payloadSemCRC = payloadFormat + merchantAccount + merchantCategoryCode +
        transactionCurrency + transactionAmount + countryCode + merchantName + merchantCity + additionalDataField;

    // Adiciona campo 63 com tamanho 04 e valor CRC (placeholder para calcular CRC)
    payloadSemCRC += "6304";

    // Calcula CRC do payload (sem os 4 últimos caracteres "6304")
    const crc = crc16(payloadSemCRC);

    return payloadSemCRC + crc;
}

// CRC16-CCITT (XModem) - conforme especificação do PIX
function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

function limparErros() {
    ['erroChave', 'erroNome', 'erroCidade', 'erroValor', 'erroTxid'].forEach(id => {
        document.getElementById(id).textContent = "";
    });
    document.getElementById("codigoPix").textContent = "";
    document.getElementById("qrcode").innerHTML = "";
}

function gerarPix() {
    limparErros();

    const chave = document.getElementById("chave").value.trim();
    const nome = document.getElementById("nome").value.trim();
    const cidade = document.getElementById("cidade").value.trim();
    const valor = document.getElementById("valor").value.trim();
    const txid = document.getElementById("txid").value.trim() || "***";

    let temErro = false;

    if (!chave) {
        document.getElementById("erroChave").textContent = "Preencha a Chave PIX.";
        temErro = true;
    }

    if (!nome) {
        document.getElementById("erroNome").textContent = "Preencha o Nome do beneficiário.";
        temErro = true;
    }

    if (!cidade) {
        document.getElementById("erroCidade").textContent = "Preencha a Cidade.";
        temErro = true;
    }

    if (valor) {
        const valorNum = Number(valor);
        const casasDecimais = valor.includes(".") ? valor.split(".")[1].length : 0;

        if (isNaN(valorNum) || valorNum <= 0) {
            document.getElementById("erroValor").textContent = "Informe um valor válido maior que zero.";
            temErro = true;
        } else if (valorNum > 2222222.00) {
            document.getElementById("erroValor").textContent = "Valor máximo permitido é R$ 2.222.222,00.";
            temErro = true;
        } else if (casasDecimais > 2) {
            document.getElementById("erroValor").textContent = "Máximo de 2 casas decimais permitido.";
            temErro = true;
        }
    }

    if (temErro) {
        return;
    }

    const pixCode = formatarPix(chave, nome, cidade, valor, txid);

    const qrcodeDiv = document.getElementById("qrcode");
    const btnDownload = document.getElementById("btnDownload");
    const btnCopiar = document.getElementById("btnCopiarPix");

    qrcodeDiv.innerHTML = "";
    document.getElementById("codigoPix").textContent = pixCode;
    btnDownload.style.display = "none";

    if (codigoPix) {
        btnCopiar.style.display = "inline-block";
    } else {
        btnCopiar.style.display = "none";
    }

    QRCode.toCanvas(document.createElement('canvas'), pixCode, { width: 256 }, function (err, canvas) {
        if (err) {
            console.error(err);
            return;
        }
        qrcodeDiv.appendChild(canvas);
        btnDownload.style.display = "block";

        btnDownload.onclick = () => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL("image/png");
            link.download = "qrcode-pix.png";
            link.click();
        };
    });

}

function copiarPix() {
    const pixCode = document.getElementById("codigoPix").textContent;
    if (!pixCode) {
        alert("Gere um código PIX antes de copiar.");
        return;
    }
    navigator.clipboard.writeText(pixCode).then(() => {
        alert("Código PIX copiado para a área de transferência!");
    }, () => {
        alert("Falha ao copiar o código PIX.");
    });
}