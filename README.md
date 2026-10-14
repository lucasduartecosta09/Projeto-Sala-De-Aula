#  RECONHECIMENTO DE VOZ


🎙️ Controlador de Voz Inteligente (VozController)

Uma solução JavaScript de alta performance, leve, autônoma e pronta para produção, desenvolvida sobre a Web Speech API. Este módulo transforma o navegador em um receptor de comandos por voz em tempo real para o idioma Português (pt-BR). Ele abstrai toda a complexidade de gerenciamento de hardware, instabilidade de rede e variações linguísticas, entregando uma interface de eventos limpa e resiliente.

⚡ Diferenciais e Engenharia do Módulo

O VozController foi projetado com foco em UX fluida e estabilidade, trazendo recursos avançados que superam as limitações nativas da API do navegador:

🧠 Pipeline de Normalização Fonética

O cérebro do módulo. Ele aplica um tratamento rigoroso a cada palavra capturada antes de validar qualquer comando:
• Imunidade a Acentos e Sotaques: Converte caracteres especiais e remove diacríticos (transforma açúcar em acucar, atenção em atencao).
• Sanitização de Ruídos de Texto: Elimina pontuações, caracteres especiais e colapsa múltiplos espaços em branco gerados pelo motor de transcrição.
• Busca por Inclusão Flexível: Isola os termos gramaticais para garantir que o comando seja identificado mesmo se o usuário disser palavras antes ou depois da frase-chave.

🔄 Resiliência Máxima (Auto-Healing)

A Web Speech API nativa costuma encerrar a sessão por inatividade ou pequenas oscilações de sinal. O módulo implementa um mecanismo de recuperação inteligente:
• Reconecta o microfone de forma assíncrona após pausas na fala.
• Possui debounce de segurança (timer de 350ms) para evitar loops de erro que travam a aba do navegador.
• Sabe diferenciar um erro de silêncio (que exige reinicialização) de um erro de permissão bloqueada (onde ele interrompe o ciclo para poupar processamento).

⏱️ Transcrição em Duplo Canal

Garante feedback visual instantâneo para a interface do usuário:
• Canal Parcial (Interim): Entrega o texto enquanto o usuário ainda está formulando a frase (ideal para gerar legendas ou barras de carregamento dinâmicas).
• Canal Definitivo (Final): Processa o bloco fechado de texto apenas quando o usuário conclui o pensamento, disparando a engine de comandos.

🛡️ Gestão de Falhas e Hardware

O módulo monitora o ciclo de vida do hardware de áudio e traduz eventos obscuros do sistema operacional em diagnósticos claros e humanizados em português:
• Bloqueio de Segurança (not-allowed / service-not-allowed): Identifica quando o usuário ou a política da empresa negou o acesso à câmera/microfone no navegador.
• Falha de Infraestrutura (network): Trata quedas na conexão com os servidores de nuvem responsáveis pelo processamento pesado de voz do Google/Microsoft.
• Ausência de Captura (audio-capture / no-speech): Filtra ruídos brancos do ambiente e avisa se o hardware de áudio falhar fisicamente ou se o usuário permanecer em silêncio.

🌐 Arquitetura e Escopo

• Zero Dependências: Código puro (Vanilla JS), sem necessidade de Webpack, Vite, Babel ou bibliotecas de terceiros.
• Injeção Não-Invasiva: Acopla-se de forma limpa ao escopo global através do objeto window, facilitando a integração em arquiteturas monolíticas ou legadas.
• Pronto para o Ecossistema Chromium: Compatibilidade estendida com os motores de reconhecimento mais maduros do mercado (Google Chrome e Microsoft Edge).
Se desejar, posso ajudar a expandir este README incluindo:
• Uma tabela técnica detalhando todos os métodos públicos da classe (iniciar, parar, etc.)
• Uma seção explicando como customizar e adicionar novos comandos no dicionário de sinônimos
• Orientações de boas práticas de UX para lidar com estados de gravação
Qual dessas melhorias você prefere aplicar agora?
