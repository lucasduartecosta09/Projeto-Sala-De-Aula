// ==========================================
// RECONHECIMENTO DE VOZ
// ==========================================

class VozController {
  static suportado() {
    return Boolean(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );
  }

  constructor({ onStatus, onTranscript, onSpeech, onCommand }) {
    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      throw new Error("Reconhecimento de voz indisponível");
    }

    this.reconhecimento = new Recognition();
    this.reconhecimento.lang = "pt-BR";
    this.reconhecimento.continuous = false;
    this.reconhecimento.interimResults = true;

    this.ativo = false;
    this.onStatus = onStatus;
    this.onTranscript = onTranscript;
    this.onSpeech = onSpeech;
    this.onCommand = onCommand;

    this.reconhecimento.onstart = () => {
      this.ativo = true;
      this.onStatus("Ouvindo...");
      this.onSpeech(true);
    };

    this.reconhecimento.onend = () => {
      this.ativo = false;
      this.onSpeech(false);
      this.onStatus("Microfone desligado");
    };

    this.reconhecimento.onerror = (evento) => {
      this.ativo = false;
      this.onSpeech(false);
      this.onStatus(`Erro no microfone: ${evento.error}`);
    };

    this.reconhecimento.onresult = (evento) => {
      const resultados = Array.from(evento.results);

      const texto = resultados
        .map((resultado) => resultado[0].transcript)
        .join(" ");

      this.onTranscript(texto);

      const finais = resultados.filter(
        (resultado) => resultado.isFinal
      );

      if (!finais.length) return;

      const falaFinal = finais
        .map((resultado) => resultado[0].transcript)
        .join(" ")
        .trim();

      const comando = VozController.identificarComando(falaFinal);

      if (comando) {
        this.onCommand(comando);
        this.onStatus(`Comando recebido: ${falaFinal}`);
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

    const palavras = frase.split(" ");

    // Compara palavras inteiras: "ar" não será encontrado dentro de "ligar".
    const tem = (...termos) => termos.some((termo) => {
      if (termo.includes(" ")) {
        return ` ${frase} `.includes(` ${termo} `);
      }

      return palavras.includes(termo);
    });

    const desligar = tem(
      "desligar",
      "desliga",
      "desative",
      "desativar",
      "parar",
      "pare",
      "desabilitar"
    );

    const ligar = tem(
      "ligar",
      "liga",
      "ative",
      "ativar",
      "habilitar",
      "iniciar"
    );

    const historico = tem(
      "historico",
      "historia",
      "csv",
      "registros"
    );

    const atualizacao = tem(
      "atualizacao",
      "atualizacoes",
      "atualizar automaticamente",
      "atualizacao automatica"
    );

    const modoAutomatico =
      tem("automatico", "automatica", "automacao") ||
      (tem("modo") && tem("auto"));

    if (
      historico &&
      tem("baixar", "baixa", "exportar", "exporte", "download")
    ) {
      return "baixar_historico";
    }

    if (
      historico &&
      tem("limpar", "limpa", "apagar", "apague", "excluir", "remover")
    ) {
      return "limpar_historico";
    }

    if (atualizacao && desligar) {
      return "desligar_atualizacao";
    }

    if (atualizacao && ligar) {
      return "ligar_atualizacao";
    }

    if (modoAutomatico && desligar) {
      return "desligar_modo_auto";
    }

    if (modoAutomatico && ligar) {
      return "ligar_modo_auto";
    }

    const ar = tem("ar", "condicionado", "climatizacao");
    const luz = tem("luz", "luzes", "iluminacao");

    // Se a frase mencionar os dois dispositivos, não escolhe um por prioridade.
    if (ar && luz) return null;

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
    if (this.ativo) return;

    try {
      this.reconhecimento.start();
      this.onStatus("Solicitando microfone...");
    } catch (erro) {
      this.onStatus(`Não foi possível iniciar: ${erro.message}`);
    }
  }

  parar() {
    if (!this.ativo) return;

    try {
      this.reconhecimento.stop();
    } catch (erro) {
      this.onStatus(`Não foi possível parar: ${erro.message}`);
    }
  }
}

// ==========================================
// INTEGRAÇÃO DA VOZ COM O DASHBOARD
// ==========================================

function configurarVoz() {
  const widget = $("voz-widget");
  const botao = $("btn-voz");
  const status = $("voz-status");
  const transcricao = $("voz-texto");

  if (!botao || !status || !transcricao) return;

  if (!VozController.suportado()) {
    botao.disabled = true;
    status.textContent = "Voz não suportada neste navegador";
    return;
  }

  controleVoz = new VozController({
    onStatus(mensagem) {
      status.textContent = mensagem;
      botao.textContent = controleVoz.ativo
        ? "⏹ Parar voz"
        : "🎙️ Iniciar voz";

      botao.setAttribute(
        "aria-pressed",
        String(controleVoz.ativo)
      );
    },

    onTranscript(texto) {
      transcricao.textContent = texto;
    },

    onSpeech(falando) {
      if (widget) {
        widget.classList.toggle("falando", falando);
      }
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

        case "baixar_historico":
          baixarCsv();
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
