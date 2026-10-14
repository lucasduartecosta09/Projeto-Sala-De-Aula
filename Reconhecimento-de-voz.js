"use strict";

// voz.js
// Requer no HTML os elementos: #voz-widget, #btn-voz, #voz-status e #voz-texto.
// Emite o evento "voz:comando" com { comando, transcricao } para o app.js.

(() => {
  const normalizar = (texto) => texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  function identificarComando(texto) {
    const frase = normalizar(texto);
    const contem = (...termos) =>
      termos.some((termo) => frase.includes(termo));

    const desligar = contem(
      "desligar", "desliga", "desativar", "desative",
      "parar", "pare", "apagar", "apague"
    );

    const ligar = contem(
      "ligar", "liga", "ativar", "ative", "iniciar"
    );

    const historico = contem("historico", "csv", "registros");

    const modoAutomatico =
      contem("automatico", "automatica", "automacao") ||
      (contem("modo") && contem("auto"));

    const atualizacaoAutomatica =
      contem("atualizacao", "atualizar automaticamente") &&
      contem("automatica", "automaticamente", "auto");

    if (
      historico &&
      contem("baixar", "baixa", "exportar", "exporte", "download")
    ) {
      return "baixar_historico";
    }

    if (
      historico &&
      contem("limpar", "limpa", "apagar", "apague", "excluir", "remover")
    ) {
      return "limpar_historico";
    }

    if (atualizacaoAutomatica && desligar) {
      return "desligar_atualizacao";
    }

    if (atualizacaoAutomatica && ligar) {
      return "ligar_atualizacao";
    }

    if (modoAutomatico && desligar) {
      return "desligar_modo_auto";
    }

    if (modoAutomatico && ligar) {
      return "ligar_modo_auto";
    }

    const ar = contem("ar", "condicionado", "climatizacao");
    const luz = contem("luz", "luzes", "iluminacao");

    if (desligar && ar) return "desligar_ar";
    if (desligar && luz) return "desligar_luz";
    if (ligar && ar) return "ligar_ar";
    if (ligar && luz) return "ligar_luz";

    if (contem("simular", "simule", "simulacao", "nova deteccao")) {
      return "simular";
    }

    return null;
  }

  function iniciarVoz() {
    const widget = document.getElementById("voz-widget");
    const botao = document.getElementById("btn-voz");
    const status = document.getElementById("voz-status");
    const transcricao = document.getElementById("voz-texto");

    if (!widget || !botao || !status || !transcricao) return;

    const Reconhecimento =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Reconhecimento) {
      botao.disabled = true;
      status.textContent = "Reconhecimento de voz não suportado neste navegador";
      return;
    }

    const reconhecimento = new Reconhecimento();
    reconhecimento.lang = "pt-BR";
    reconhecimento.continuous = false;
    reconhecimento.interimResults = true;
    reconhecimento.maxAlternatives = 1;

    let ativo = false;

    function atualizarBotao() {
      botao.textContent = ativo ? "⏹ Parar voz" : "🎙️ Iniciar voz";
      botao.setAttribute("aria-pressed", String(ativo));
    }

    reconhecimento.onstart = () => {
      ativo = true;
      status.textContent = "Ouvindo...";
      atualizarBotao();
    };

    reconhecimento.onspeechstart = () => {
      widget.classList.add("falando");
    };

    reconhecimento.onspeechend = () => {
      widget.classList.remove("falando");
    };

    reconhecimento.onresult = (evento) => {
      const resultados = Array.from(evento.results);
      const textoAtual = resultados
        .map((resultado) => resultado[0].transcript)
        .join(" ")
        .trim();

      transcricao.textContent = textoAtual;

      const finais = resultados.filter((resultado) => resultado.isFinal);
      if (!finais.length) return;

      const falaFinal = finais
        .map((resultado) => resultado[0].transcript)
        .join(" ")
        .trim();

      const comando = identificarComando(falaFinal);

      if (!comando) {
        status.textContent = "Comando não reconhecido";
        return;
      }

      document.dispatchEvent(new CustomEvent("voz:comando", {
        detail: {
          comando,
          transcricao: falaFinal
        }
      }));

      status.textContent = `Comando recebido: ${falaFinal}`;
    };

    reconhecimento.onerror = (evento) => {
      ativo = false;
      widget.classList.remove("falando");
      atualizarBotao();

      const mensagens = {
        "not-allowed": "Permissão do microfone negada",
        "service-not-allowed": "Serviço de voz bloqueado pelo navegador",
        "no-speech": "Nenhuma fala detectada",
        "audio-capture": "Microfone não encontrado"
      };

      status.textContent =
        mensagens[evento.error] || `Erro no reconhecimento: ${evento.error}`;
    };

    reconhecimento.onend = () => {
      ativo = false;
      widget.classList.remove("falando");
      atualizarBotao();

      if (status.textContent === "Ouvindo...") {
        status.textContent = "Microfone desligado";
      }
    };

    botao.addEventListener("click", () => {
      if (ativo) {
        reconhecimento.stop();
        return;
      }

      transcricao.textContent = "";
      status.textContent = "Solicitando microfone...";

      try {
        reconhecimento.start();
      } catch (erro) {
        status.textContent = `Não foi possível iniciar: ${erro.message}`;
      }
    });

    atualizarBotao();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarVoz, { once: true });
  } else {
    iniciarVoz();
  }
})();
