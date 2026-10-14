"use strict";

(() => {
  const Reconhecimento =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  const COMANDOS = {
    ligar_ar: [
      "ligar ar condicionado",
      "ligar o ar condicionado",
      "liga ar condicionado",
      "liga o ar condicionado",
      "ligue o ar",
      "ligar ar",
    ],
    desligar_ar: [
      "desligar ar condicionado",
      "desligar o ar condicionado",
      "desliga ar condicionado",
      "desliga o ar condicionado",
      "desligue o ar",
      "desligar o ar",
    ],
    ligar_luz: [
      "ligar luz",
      "ligar a luz",
      "liga a luz",
      "ligue a luz",
      "acender a luz",
      "acenda a luz",
    ],
    desligar_luz: [
      "desligar luz",
      "desligar a luz",
      "desliga a luz",
      "desligue a luz",
      "apagar a luz",
      "apague a luz",
    ],
    simular: [
      "simular nova deteccao",
      "simular nova deteccao dos sensores",
      "nova deteccao",
      "gerar nova deteccao",
      "fazer nova deteccao",
      "simular",
      "simula",
      "simule",
    ],
  };

  const ERROS = {
    "not-allowed": "Permissão de microfone negada no navegador.",
    "service-not-allowed": "Serviço de reconhecimento bloqueado.",
    "audio-capture": "Microfone indisponível. Confira o dispositivo.",
    network: "Falha de rede no serviço de reconhecimento.",
    "no-speech": "Não detectei fala.",
    "language-not-supported": "Português não está disponível no reconhecimento.",
  };

  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function identificarComando(texto) {
    const fala = ` ${normalizar(texto)} `;

    for (const [comando, frases] of Object.entries(COMANDOS)) {
      for (const frase of frases) {
        const fraseNormalizada = ` ${normalizar(frase)} `;
        if (fala.includes(fraseNormalizada)) return comando;
      }
    }

    return null;
  }

  class VozController {
    constructor({
      onStatus = () => {},
      onTranscript = () => {},
      onSpeech = () => {},
      onCommand = () => {},
      onError = () => {},
    } = {}) {
      this.onStatus = onStatus;
      this.onTranscript = onTranscript;
      this.onSpeech = onSpeech;
      this.onCommand = onCommand;
      this.onError = onError;

      this.ativo = false;
      this.timerReinicio = null;
      this.reconhecimento = null;

      if (!Reconhecimento) {
        const mensagem = "Reconhecimento de voz não disponível neste navegador.";
        this.onStatus(mensagem);
        this.onError(mensagem);
        return;
      }

      this.reconhecimento = new Reconhecimento();
      this.reconhecimento.lang = "pt-BR";
      this.reconhecimento.continuous = true;
      this.reconhecimento.interimResults = true;
      this.reconhecimento.maxAlternatives = 1;

      this.reconhecimento.onstart = () => {
        this.onStatus("Microfone ativo · aguardando fala");
      };

      this.reconhecimento.onspeechstart = () => {
        this.onSpeech(true);
        this.onStatus("Captando voz…");
      };

      this.reconhecimento.onspeechend = () => {
        this.onSpeech(false);
        this.onStatus("Processando fala…");
      };

      this.reconhecimento.onresult = (evento) => {
        const parciais = [];

        for (let i = evento.resultIndex; i < evento.results.length; i += 1) {
          const resultado = evento.results[i];
          const texto = resultado[0].transcript.trim();

          if (resultado.isFinal) {
            this.onTranscript(texto, true);

            const comando = identificarComando(texto);
            if (comando) this.onCommand(comando, texto);
          } else if (texto) {
            parciais.push(texto);
          }
        }

        if (parciais.length) {
          this.onTranscript(parciais.join(" "), false);
        }
      };

      this.reconhecimento.onerror = (evento) => {
        this.onSpeech(false);

        if (evento.error === "aborted" && !this.ativo) return;

        const mensagem =
          ERROS[evento.error] || `Erro de reconhecimento: ${evento.error}`;

        this.onStatus(mensagem);
        this.onError(mensagem);

        // Erros que exigem uma nova ação do usuário não devem reiniciar sozinhos.
        if (
          [
            "not-allowed",
            "service-not-allowed",
            "audio-capture",
            "network",
            "language-not-supported",
          ].includes(evento.error)
        ) {
          this.ativo = false;
        }
      };

      this.reconhecimento.onend = () => {
        this.onSpeech(false);

        if (!this.ativo) {
          this.onStatus("Microfone desligado");
          return;
        }

        this.onStatus("Reconectando ao microfone…");
        this.timerReinicio = window.setTimeout(() => {
          this.timerReinicio = null;
          if (!this.ativo) return;

          try {
            this.reconhecimento.start();
          } catch (erro) {
            if (erro.name !== "InvalidStateError") {
              this.ativo = false;
              this.onStatus("Não foi possível reiniciar o microfone.");
              this.onError(erro.message);
            }
          }
        }, 350);
      };
    }

    iniciar() {
      if (!this.reconhecimento) return;
      if (this.ativo) return;

      this.ativo = true;
      this.onStatus("Solicitando acesso ao microfone…");

      try {
        this.reconhecimento.start();
      } catch (erro) {
        if (erro.name !== "InvalidStateError") {
          this.ativo = false;
          this.onStatus("Não foi possível iniciar o microfone.");
          this.onError(erro.message);
        }
      }
    }

    parar() {
      this.ativo = false;
      this.onSpeech(false);

      if (this.timerReinicio) {
        window.clearTimeout(this.timerReinicio);
        this.timerReinicio = null;
      }

      if (this.reconhecimento) {
        try {
          this.reconhecimento.stop();
        } catch (_) {
          // O reconhecimento pode já estar parado.
        }
      }

      this.onStatus("Microfone desligado");
    }
  }

  // Permite usar o controlador no APP.js sem configurar módulos ES.
  window.VozController = VozController;
})();
