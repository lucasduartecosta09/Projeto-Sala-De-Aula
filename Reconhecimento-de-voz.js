let controleVoz = null;

class VozController {
  static suportado() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  constructor({ onStatus, onTranscript, onSpeech, onCommand } = {}) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      throw new Error("Reconhecimento de voz não suportado neste navegador.");
    }

    this.reconhecimento = new Recognition();
    this.reconhecimento.lang = "pt-BR";
    this.reconhecimento.continuous = false;
    this.reconhecimento.interimResults = true;

    this.ativo = false;
    this.iniciando = false;
    this.preservarStatusNoFim = false;
    this.onStatus = onStatus || (() => {});
    this.onTranscript = onTranscript || (() => {});
    this.onSpeech = onSpeech || (() => {});
    this.onCommand = onCommand || (() => {});

    this.reconhecimento.onstart = () => {
      this.iniciando = false;
      this.ativo = true;
      this.onStatus("Ouvindo...");
      this.onSpeech(true);
    };

    this.reconhecimento.onend = () => {
      this.iniciando = false;
      this.ativo = false;
      this.onSpeech(false);
      this.onStatus(this.preservarStatusNoFim ? null : "Pronto para ouvir");
    };

    this.reconhecimento.onerror = (evento) => {
      this.iniciando = false;
      this.ativo = false;
      this.preservarStatusNoFim = true;
      this.onSpeech(false);
      this.onStatus(`Erro no microfone: ${evento.error}`);
    };

    this.reconhecimento.onresult = (evento) => {
      const resultados = Array.from(evento.results);
      const texto = resultados
        .map((resultado) => resultado[0].transcript)
        .join(" ");

      this.onTranscript(texto);

      const inicio = Number.isInteger(evento.resultIndex)
        ? evento.resultIndex
        : 0;

      const finais = resultados
        .slice(inicio)
        .filter((resultado) => resultado.isFinal);

      if (!finais.length) return;

      const falaFinal = finais
        .map((resultado) => resultado[0].transcript)
        .join(" ");

      const comando = VozController.identificarComando(falaFinal);
      this.preservarStatusNoFim = true;

      if (comando) {
        this.onCommand(comando);
        this.onStatus(`Comando recebido: ${falaFinal.trim()}`);
      } else {
        this.onStatus("Comando não reconhecido");
      }
    };
  }

  static identificarComando(texto) {
    const frase = texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const fraseDelimitada = ` ${frase} `;
    const tem = (...termos) => termos.some(
      (termo) => fraseDelimitada.includes(` ${termo} `)
    );

    const desligar = tem(
      "desligar", "desliga", "desligue", "desative", "desativar",
      "apagar", "apaga", "apague", "parar", "pare", "desabilitar"
    );

    const ligar = tem(
      "ligar", "liga", "ligue", "ative", "ativar", "acender",
      "acenda", "acende", "habilitar", "iniciar"
    );

    const historico = tem("historico", "historia", "csv", "registros");
    const atualizacao = tem(
      "atualizacao",
      "atualizacoes",
      "atualizar automaticamente",
      "atualizacao automatica"
    );

    const modoAutomatico = tem(
      "automatico",
      "automatica",
      "automacao"
    ) || (tem("modo") && tem("auto"));

    if (tem("nao", "nunca") && (ligar || desligar)) return null;

    if (historico && tem("baixar", "baixa", "exportar", "exporte", "download")) {
      return "baixar_historico";
    }

    if (historico && tem("limpar", "limpa", "apagar", "apague", "excluir", "remover")) {
      return "limpar_historico";
    }

    if (atualizacao && desligar) return "desligar_atualizacao";
    if (atualizacao && ligar) return "ligar_atualizacao";

    if (modoAutomatico && desligar) return "desligar_modo_auto";
    if (modoAutomatico && ligar) return "ligar_modo_auto";

    if (desligar && tem("tudo", "todos", "equipamentos")) {
      return "desligar_tudo";
    }

    const ar = tem(
      "ar",
      "condicionado",
      "climatizacao",
      "climatizador",
      "ar-condicionado",
      "arcondicionado"
    );

    const luz = tem(
      "luz",
      "luzes",
      "iluminacao",
      "liz",
      "lis",
      "luiz",
      "lampada",
      "lampadas",
      "led",
      "leds"
    );

    if (desligar && ar) return "desligar_ar";
    if (desligar && luz) return "desligar_luz";
    if (ligar && ar) return "ligar_ar";
    if (ligar && luz) return "ligar_luz";

    if (tem("simular", "simule", "simulacao", "nova deteccao")) {
      return "simular";
    }

    return null;
  }

  iniciar() {
    if (this.ativo || this.iniciando) return;

    this.iniciando = true;
    this.preservarStatusNoFim = false;

    try {
      this.onStatus("Solicitando microfone...");
      this.reconhecimento.start();
    } catch (erro) {
      this.iniciando = false;
      this.preservarStatusNoFim = true;
      this.onStatus(`Não foi possível iniciar: ${erro.message}`);
    }
  }

  parar() {
    if (!this.ativo && !this.iniciando) return;

    try {
      this.reconhecimento.stop();
    } catch (erro) {
      this.onStatus(`Não foi possível parar: ${erro.message}`);
    }
  }
}

function configurarVoz() {
  const widget = $("voz-widget");
  const botaoToggle = $("btn-toggle-voz");
  const botao = $("btn-voz");
  const status = $("voz-status");
  const transcricao = $("voz-texto");
  const botaoTexto = $("btn-voz-texto");
  const icoEstado = $("ico-voz-estado");
  const statusDot = $("voz-status-dot");

  if (!widget || !botaoToggle || !botao || !status || !transcricao) return;

  const alternarPainelVoz = (aberto) => {
    widget.hidden = !aberto;
    botaoToggle.setAttribute("aria-expanded", String(aberto));
    botaoToggle.setAttribute(
      "aria-label",
      aberto ? "Ocultar assistente de voz" : "Abrir assistente de voz"
    );

    botaoToggle.title = aberto
      ? "Ocultar assistente de voz"
      : "Assistente de voz";

    if (!aberto && controleVoz) controleVoz.parar();
  };

  botaoToggle.addEventListener("click", () => {
    alternarPainelVoz(widget.hidden);
  });

  if (!VozController.suportado()) {
    botao.disabled = true;
    status.textContent = "Voz não suportada neste navegador";
    return;
  }

  controleVoz = new VozController({
    onStatus(mensagem) {
      if (mensagem) status.textContent = mensagem;

      const iniciando = controleVoz.iniciando;
      const ativo = controleVoz.ativo;

      botao.disabled = iniciando;

      if (botaoTexto) {
        botaoTexto.textContent = iniciando
          ? "Solicitando..."
          : ativo
            ? "Ouvindo... (clique para parar)"
            : "Iniciar comando de voz";
      }

      if (icoEstado) {
        icoEstado.querySelector("use").setAttribute(
          "href",
          ativo ? "#i-stop" : "#i-mic"
        );
      }

      if (statusDot) {
        statusDot.className = `voz-status-dot ${ativo ? "ativo" : ""}`;
      }

      botao.classList.toggle("ativo", ativo);
      botao.setAttribute("aria-pressed", String(ativo));
    },

    onTranscript(texto) {
      transcricao.textContent = texto;
    },

    onSpeech(falando) {
      widget.classList.toggle("falando", falando);
    },

    onCommand(comando) {
      const comandosManuais = [
        "ligar_ar",
        "desligar_ar",
        "ligar_luz",
        "desligar_luz"
      ];

      if (comandosManuais.includes(comando) && estado.modoAuto) {
        mudarModoAuto(false, "comando de voz");
      }

      switch (comando) {
        case "ligar_ar":
          definir("arLigado", true, "comando de voz");
          desenhar();
          break;

        case "desligar_ar":
          definir("arLigado", false, "comando de voz");
          desenhar();
          break;

        case "ligar_luz":
          definir("luzLigada", true, "comando de voz");
          desenhar();
          break;

        case "desligar_luz":
          definir("luzLigada", false, "comando de voz");
          desenhar();
          break;

        case "ligar_modo_auto":
          mudarModoAuto(true, "comando de voz");
          break;

        case "desligar_modo_auto":
          mudarModoAuto(false, "comando de voz");
          break;

        case "ligar_atualizacao":
          mudarAtualizacaoAutomatica(true, "comando de voz");
          break;

        case "desligar_atualizacao":
          mudarAtualizacaoAutomatica(false, "comando de voz");
          break;

        case "desligar_tudo":
          desligarTudo();
          break;

        case "baixar_historico":
          baixarHistoricoExcel();
          break;

        case "limpar_historico":
          limparHistorico();
          break;

        case "simular":
          atualizarAgora();
          break;
      }
    }
  });

  botao.addEventListener("click", () => {
    if (controleVoz.ativo) {
      controleVoz.parar();
    } else {
      controleVoz.iniciar();
    }
  });
}
