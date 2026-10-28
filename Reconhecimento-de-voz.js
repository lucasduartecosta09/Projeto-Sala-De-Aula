// voz.js
"use strict";

const botao = document.getElementById("btn-voz");
const status = document.getElementById("voz-status");
const texto = document.getElementById("voz-texto");
const widget = document.querySelector(".voz-widget");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  botao.disabled = true;
  status.textContent = "Reconhecimento de voz não suportado neste navegador.";
} else {
  const reconhecimento = new SpeechRecognition();

  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = false;
  reconhecimento.interimResults = true;

  reconhecimento.onstart = () => {
    status.textContent = "Ouvindo...";
    botao.textContent = "■ Parar reconhecimento";
    botao.classList.add("ativo");
    botao.setAttribute("aria-pressed", "true");
    widget.classList.add("falando");
  };

  reconhecimento.onresult = (evento) => {
    const transcricao = Array.from(evento.results)
      .map((resultado) => resultado[0].transcript)
      .join(" ");

    texto.textContent = transcricao;
  };

  reconhecimento.onerror = (evento) => {
    status.textContent = `Erro: ${evento.error}`;
  };

  reconhecimento.onend = () => {
    status.textContent = "Pronto para ouvir";
    botao.textContent = "🎙️ Iniciar voz";
    botao.classList.remove("ativo");
    botao.setAttribute("aria-pressed", "false");
    widget.classList.remove("falando");
  };

  botao.addEventListener("click", () => {
    if (botao.classList.contains("ativo")) {
      reconhecimento.stop();
    } else {
      texto.textContent = "Escutando...";
      reconhecimento.start();
    }
  });
}
