/**
 * Super Mario Jump - Lógica do Jogo e Integração com Ranking MySQL (Laragon)
 */

document.addEventListener('DOMContentLoaded', () => {   
    // Elementos do Jogo
    const mario = document.querySelector('.mario');
    const pipe = document.querySelector('.pipe');
    const gameBoard = document.getElementById('game-board');
    const coin = document.getElementById('coin');
    const clouds = document.querySelector('.clouds');
    const levelDisplay = document.getElementById('level-display');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const jumpTip = document.getElementById('jump-tip');
    const difficultyNotice = document.getElementById('difficulty-notice');
    let difficultyNoticeTimer = null;

    // Modais e Telas
    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const characterSelect = document.getElementById('character-select');
    const themeSelect = document.getElementById('theme-select');
    const btnViewRanking = document.getElementById('btn-view-ranking');

    const gameoverModal = document.getElementById('gameover-modal');
    const finalScoreValue = document.getElementById('final-score-value');
    const saveStatusMsg = document.getElementById('save-status-msg');
    const rankingBody = document.getElementById('ranking-body');
    const btnRestart = document.getElementById('btn-restart');
    const btnChangePlayer = document.getElementById('btn-change-player');

    // Variáveis de Estado
    let currentPlayer = '';
    let score = 0;
    let isPlaying = false;
    let isPaused = false;
    const maxVidas = 4; // limite máximo de vidas
    let vidas = 3;
    let proximaVidaExtra = 500;
    let collisionCooldown = false;
    let isJumping = false;
    let personagemAtual = '';
    let obstaculoAtual = '';
    let itemAtual = '';
    let fundoAtual = '';
    let temaAtual = '';

    const livesDisplay = document.getElementById('lives-display');
    // ELEMENTOS DE ÁUDIO
    const somFundo = document.getElementById('som-fundo');
    const somPulo = document.getElementById('som-pulo');
    const somColeta = document.getElementById('som-coleta');
    const somDano = document.getElementById('som-dano');
    const somGameOver = document.getElementById('som-gameover');

    // FUNÇÃO PARA REPRODUZIR EFEITOS
    function tocarSom(audio) {
        if (!audio) return;

        audio.pause();
        audio.currentTime = 0;

        const reproducao = audio.play();

        if (reproducao) {
            reproducao.catch(erro => {
                console.warn('Erro ao reproduzir áudio:', erro);
            });
        }
    }

    // INICIA A MÚSICA DE FUNDO
    function iniciarSomFundo() {
        if (!somFundo) return;

        somFundo.volume = 0.25;
        somFundo.currentTime = 0;

        const reproducao = somFundo.play();

        if (reproducao) {
            reproducao.catch(erro => {
                console.warn('Erro ao iniciar música de fundo:', erro);
            });
        }
    }

    let gameLoop = null;
    let scoreLoop = null;
    let jumpTimer = null;   

    // Configurações da dificuldade
    // Velocidades em pixels por segundo
    const velocidadeInicial = 330;   // velocidade do obstáculo no início
    const aumentoPorNivel = 130;     // quanto acelera a cada 150 pontos
    const velocidadeMaxima = 2800;   // limite máximo de velocidade
    const pontosPorNivel = 150;

    let nivelAtual = 0;
    let velocidadeAtual = velocidadeInicial;

    // Posição horizontal (distância da borda direita) de obstáculo e moeda
    let pipeX = 0;
    let coinX = 0;
    let rafId = null;
    let ultimoFrame = 0;

    // Posiciona o elemento totalmente fora da tela (à direita),
    // com uma distância extra aleatória, para nunca "aparecer do nada"
    function posicaoInicialPipe(extra = 0) {
        return -(pipe.offsetWidth || 115) - extra;
    }

    function posicaoInicialMoeda(extra = 0) {
        return -(coin.offsetWidth || 65) - extra;
    }

    function aplicarPosicoes() {
        pipe.style.right = `${pipeX}px`;
        if (coin) coin.style.right = `${coinX}px`;
    }

    // Loop de movimento (roda a cada frame da tela)
    function loopMovimento(agora) {
        if (!isPlaying) {
            rafId = null;
            return;
        }

        // Tempo desde o último frame (limitado para evitar saltos ao trocar de aba)
        const dt = Math.min((agora - ultimoFrame) / 1000, 0.05);
        ultimoFrame = agora;

        if (!isPaused) {
            const larguraTela = gameBoard.clientWidth;

            // Obstáculo
            pipeX += velocidadeAtual * dt;
            if (pipeX > larguraTela) {
                // Reaparece sempre fora da tela, com distância variável
                pipeX = posicaoInicialPipe(Math.random() * 250);
            }

            // Moeda (um pouco mais rápida que o obstáculo)
            if (coin) {
                coinX += velocidadeAtual * 1.1 * dt;
                if (coinX > larguraTela) {
                    coin.style.visibility = 'visible';
                    coinX = posicaoInicialMoeda(Math.random() * 400);
                }
            }

            aplicarPosicoes();
            checkCollision();
        }

        rafId = requestAnimationFrame(loopMovimento);
    }

    function iniciarMovimento() {
        cancelAnimationFrame(rafId);
        ultimoFrame = performance.now();
        rafId = requestAnimationFrame(loopMovimento);
    }

    function pararMovimento() {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
   // Configurações dos temas, personagens e obstáculos
const configuracaoTemas = {

    // TEMA 1: ALICE NO PAÍS DAS MARAVILHAS
    alice: {
        fundo: 'paisMaravilhasImg/maravilhasFundo.jpg',

        personagens: [
            {
                id: 'rainha',
                nome: 'Rainha de Copas',
                imagem: 'paisMaravilhasImg/RainhaCopas.gif',
                obstaculo: 'paisMaravilhasImg/Cogumelo.png',
                item: 'paisMaravilhasImg/Cartas.png'
            },

            {
                id: 'chapeleiro',
                nome: 'Chapeleiro Maluco',
                imagem: 'paisMaravilhasImg/ChapeleiroMaluco.gif',
                obstaculo: 'paisMaravilhasImg/Cogumelo.png',
                item: 'paisMaravilhasImg/Chapeu.png'
            },

            {
                id: 'coelho',
                nome: 'Coelho Branco',
                imagem: 'paisMaravilhasImg/CoelhoBranco.gif',
                obstaculo: 'paisMaravilhasImg/Cogumelo.png',
                item: 'paisMaravilhasImg/Relogio.png'
            }
        ]
    },

    // TEMA 2: HARRY POTTER
    harry: {
        fundo: 'hpImg/hpFundo.jpg',

        personagens: [
            {
                id: 'harry',
                nome: 'Harry Potter',
                imagem: 'hpImg/HarryPotter.gif',
                obstaculo: 'hpImg/ChapeuSeletor.png',
                item: 'hpImg/PedraFilosofal.png'
            },

            {
                id: 'voldemort',
                nome: 'Voldemort',
                imagem: 'hpImg/Voldemort.gif',
                obstaculo: 'hpImg/ChapeuSeletor.png',
                item: 'hpImg/VarinhaDasVarinhas.png'
            },  

            {
                id: 'draco',
                nome: 'Draco Malfoy',
                imagem: 'hpImg/Draco.gif',
                obstaculo: 'hpImg/ChapeuSeletor.png',
                item: 'hpImg/Maca.png'
            }
        ]
    },

    // TEMA 3: BLUEY
    bluey: {
        fundo: 'blueyImg/fundoBluey.jpg',

        personagens: [
            {
                id: 'bluey',
                nome: 'Bluey',
                imagem: 'blueyImg/Bluey.gif',
                obstaculo: 'blueyImg/Vigneta.png',
                item: 'blueyImg/coruja.png'
            },

            {
                id: 'mackenzie',
                nome: 'Mackenzie',
                imagem: 'blueyImg/Mackenzie.gif',
                obstaculo: 'blueyImg/Vigneta.png',
                item: 'blueyImg/Pinha.png'
            },

            {
                id: 'bingo',
                nome: 'Bingo',
                imagem: 'blueyImg/Bingo.gif',
                obstaculo: 'blueyImg/Vigneta.png',
                item: 'blueyImg/Balao.png'
            }
        ]
    }

};

    // PERSONAGENS SECRETOS
    const personagensSecretos = {
        roberto: {
            nome: 'Roberto',
            imagem: 'easterEggsImg/roberto.gif',
            obstaculo: 'easterEggsImg/Provas.png',
            item: 'easterEggsImg/yoda.png'
        },

        daniel: {
            nome: 'Daniel',
            imagem: 'easterEggsImg/daniel.gif',
            obstaculo: 'easterEggsImg/Provas.png',
            item: 'easterEggsImg/Frango.png'
        }
    };

    // Recupera último nome utilizado caso exista
    const savedName = localStorage.getItem('mario_jump_player');
    if (savedName && playerInput) {
        playerInput.value = savedName;
    }

    /**
     * Inicia uma nova rodada
     */

    // Controla a dificuldade do jogo
// Atualiza o nível mostrado na interface
function atualizarNivelInterface() {
    if (!levelDisplay) return;

    if (score < 1000) {
        levelDisplay.textContent = '1 - FÁCIL';
    } else if (score < 3000) {
        levelDisplay.textContent = '2 - MÉDIO';
    } else {
        levelDisplay.textContent = '3 - DIFÍCIL';
    }
}


    // Mostra aviso quando a dificuldade aumenta
    function mostrarAvisoDificuldade() {
        if (!difficultyNotice) return;

        difficultyNotice.textContent = '⚠️ A DIFICULDADE AUMENTOU!';

        difficultyNotice.classList.add('show');

        clearTimeout(difficultyNoticeTimer);

        difficultyNoticeTimer = setTimeout(() => {
            difficultyNotice.classList.remove('show');
        }, 2000);
    }   

// Controla a dificuldade do jogo
function atualizarDificuldade() {
    // A cada 150 pontos, aumenta um nível
    const novoNivel = Math.floor(score / pontosPorNivel);

    // Só atualiza quando alcançar um novo nível
    if (novoNivel === nivelAtual) return;

    nivelAtual = novoNivel;

    mostrarAvisoDificuldade();

    // Mais nível = mais pixels por segundo (com limite máximo)
    velocidadeAtual = Math.min(
        velocidadeMaxima,
        velocidadeInicial + nivelAtual * aumentoPorNivel
    );
}

    function atualizarVidas() {
        if (!livesDisplay) return;

        livesDisplay.textContent = '🤎 '.repeat(vidas).trim();
    }

    // Concede uma vida extra a cada 500 pontos
    function verificarVidaExtra() {
        while (score >= proximaVidaExtra) {
            // Nunca passa do limite de vidas
            vidas = Math.min(maxVidas, vidas + 1);

            proximaVidaExtra += 500;

            atualizarVidas();

            console.log('Vida extra conquistada!');
        }
    }

    function startGame() {
        // Limpa loops anteriores se existirem
        pararMovimento();
        clearInterval(scoreLoop);
    

        // Reseta posições e visuais
        resetElements();

        // Inicia a música de fundo
        iniciarSomFundo();

        isPlaying = true;
        isPaused = false;
        score = 0;
        vidas = 3;
        proximaVidaExtra = 500;
        collisionCooldown = false;

        scoreDisplay.textContent = '0';
        atualizarNivelInterface();
        atualizarVidas();
        // Reinicia a dificuldade
        nivelAtual = 0;
        velocidadeAtual = velocidadeInicial;
        hudPlayerName.textContent = currentPlayer || 'Jogador';

        // Ativa animações CSS do jogo
        gameBoard.classList.add('running');

        // Loop de pontuação progressiva (1 ponto a cada 100ms)
        
 // Loop de pontuação progressiva (1 ponto a cada 250ms)
        scoreLoop = setInterval(() => {
        if (isPlaying && !isPaused) {
            score += 1;

            verificarVidaExtra();

            scoreDisplay.textContent = score;

            atualizarNivelInterface();
            atualizarDificuldade();
        }
    }, 100);


        // Loop de movimento + colisão (a cada frame)
        iniciarMovimento();
    }


    function resetElements() {
        isPaused = false;
        gameBoard.classList.remove('paused');
        // Reseta o obstáculo: começa fora da tela, com uma distância extra
        // para o jogador ter tempo de reagir no início
        pipe.style.animation = 'none';
        pipe.style.left = '';
        pipeX = posicaoInicialPipe(250);
        coinX = posicaoInicialMoeda(500);
        aplicarPosicoes();

        // Reseta Mario
        mario.src = personagemAtual;
        pipe.src = obstaculoAtual;
        mario.style.visibility = 'visible';
        mario.style.animation = ''; 
        mario.style.bottom = '0px';
        mario.style.width = '';
        mario.style.marginLeft = '';
        clearTimeout(jumpTimer);
        jumpTimer = null;
        mario.classList.remove('jump');
        isJumping = false;

        if (coin) {
    coin.style.visibility = 'visible';
    coin.style.animation = 'none';
}

        if (jumpTip) {
            jumpTip.style.opacity = '1';
        }
    }

function finalizarPulo() {
    clearTimeout(jumpTimer);
    jumpTimer = null;

    mario.classList.remove('jump');
    isJumping = false;
}

// Controla o pulo
function jump() {

    if (!isPlaying || isPaused) return;

    // Só bloqueia outro pulo enquanto a animação estiver ativa
    if (mario.classList.contains('jump')) return;

    clearTimeout(jumpTimer);

    mario.style.animation = '';
    mario.classList.remove('jump');

    // Força o navegador a reiniciar a animação
    void mario.offsetWidth;

    mario.classList.add('jump');
    isJumping = true;
    tocarSom(somPulo);

    if (jumpTip) {
        jumpTip.style.opacity = '0';
    }

    // Segurança para liberar o próximo pulo
    jumpTimer = setTimeout(finalizarPulo, 700);
}

// Finaliza o pulo quando a animação CSS termina
mario.addEventListener('animationend', (event) => {
    if (
        event.target === mario &&
        event.animationName === 'jump-animation'
    ) {
        finalizarPulo();
    }
});

    function checkCollision() {
    if (!isPlaying || isPaused) return;

    // Pega as posições reais dos elementos na tela
    const marioRect = mario.getBoundingClientRect();
    const pipeRect = pipe.getBoundingClientRect();

    const marioPosition = parseFloat(
        window.getComputedStyle(mario).bottom
    ) || 0;

    // Hitbox menor do cavaleiro
    const marioLeft = marioRect.left + marioRect.width * 0.25;
    const marioRight = marioRect.right - marioRect.width * 0.25;

    // Hitbox ampliada do obstáculo
    const pipeLeft = pipeRect.left + pipeRect.width * 0.10;
    const pipeRight = pipeRect.right - pipeRect.width * 0.10;

    // Só existe colisão quando as áreas horizontais se encontram
    const colisaoHorizontal =
        marioRight > pipeLeft &&
        marioLeft < pipeRight;

    // Se o cavaleiro estiver baixo e tocar o pilar, encerra a partida
    // Libera uma nova colisão quando o pilar sair da hitbox
if (!colisaoHorizontal) {
    collisionCooldown = false;
}

// Perde uma vida ao colidir com o pilar
if (
    colisaoHorizontal &&
    marioPosition < 20 &&
    !collisionCooldown &&
    !isJumping
) {
    collisionCooldown = true;

    vidas--;
    atualizarVidas();

    if (vidas > 0) {
        tocarSom(somDano);
    }

    // Pausa o jogo após a colisão
    isPaused = true;
    gameBoard.classList.add('paused');
    finalizarPulo();
    mario.style.visibility = 'hidden';

    // Game Over somente quando as vidas acabarem
    if (vidas <= 0) {
        mario.style.visibility = 'visible';
        triggerGameOver(pipe.offsetLeft, marioPosition);
        return;
    }

    // Retoma a partida após perder uma vida
    setTimeout(() => {
        if (isPlaying) {
            mario.style.visibility = 'visible';
            gameBoard.classList.remove('paused');
            isPaused = false;
        }
    }, 800);

    return;
}

    // Verifica se o cavaleiro coletou a moeda
    if (coin && coin.style.visibility !== 'hidden') {
        const coinRect = coin.getBoundingClientRect();

        const coletouMoeda =
            marioRect.left < coinRect.right &&
            marioRect.right > coinRect.left &&
            marioRect.top < coinRect.bottom &&
            marioRect.bottom > coinRect.top;

        if (coletouMoeda) {
        tocarSom(somColeta);

        score += 5;
        verificarVidaExtra();
        scoreDisplay.textContent = score;

        atualizarNivelInterface();
        atualizarDificuldade();

        // Esconde a moeda coletada e a recoloca fora da tela, à direita
        coin.style.visibility = 'hidden';
        coinX = posicaoInicialMoeda(Math.random() * 400);
        aplicarPosicoes();
        }
    }
}

    function triggerGameOver(pipePosition, marioPosition) {
        isPlaying = false;
        // Para a música de fundo
        somFundo.pause();
        somFundo.currentTime = 0;

        // Reproduz o som de Game Over
        tocarSom(somGameOver);
        gameBoard.classList.remove('paused');   
        pararMovimento();
        clearInterval(scoreLoop);

        gameBoard.classList.remove('running');
        // O pilar já fica congelado na posição atual (o movimento foi parado)

        // Congela o Mario na altura exata e muda para a imagem de Game Over
        mario.style.animation = 'none';
        mario.style.bottom = `${marioPosition}px`;
        mario.src = personagemAtual; 
        mario.style.visibility = 'visible';
        mario.style.width = '70px';
        mario.style.marginLeft = '50px';

        // Atualiza modal de Game Over
        finalScoreValue.textContent = score;
        saveStatusMsg.textContent = 'Salvando pontuação no banco...';
        saveStatusMsg.style.color = '#ffcc00';

        // Abre modal de Game Over
        gameoverModal.classList.add('active');

        // Salva a pontuação no banco MySQL via PHP
        saveScore(currentPlayer, score);
    }


    function saveScore(playerName, finalScore) {
        fetch('salvar_ranking.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: playerName,
                pontos: finalScore
            })
        })
        .then(async res => {
    const resposta = await res.text();

    console.log('Status HTTP:', res.status);
    console.log('Resposta do PHP:', resposta);

    if (!res.ok) {
        throw new Error(`Erro HTTP ${res.status}: ${resposta}`);
    }

    return JSON.parse(resposta);
})
        .then(data => {
            if (data.status === 'success') {
                saveStatusMsg.textContent = 'Pontuação registrada no banco!';
                saveStatusMsg.style.color = '#10b981';
                if (data.ranking) {
                    renderRanking(data.ranking, playerName, finalScore);
                }
            } else {
                saveStatusMsg.textContent = '⚠️ ' + (data.message || 'Erro ao registrar.');
                saveStatusMsg.style.color = '#ef4444';
            }
        })
        .catch(err => {
            console.error('Erro na requisição:', err);
            saveStatusMsg.textContent = '⚠️ Erro ao conectar ao servidor Laragon.';
            saveStatusMsg.style.color = '#ef4444';
        });
    }

    /**
     * Busca o ranking atualizado no banco
     */
    function fetchRanking() {
        fetch('obter_ranking.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.ranking) {
                    renderRanking(data.ranking);
                }
            })
            .catch(err => console.error('Erro ao buscar ranking:', err));
    }

    /**
     * Atualiza a tabela HTML do ranking
     */
    function renderRanking(list, highlightName = null, highlightScore = null) {
        if (!rankingBody) return;
        rankingBody.innerHTML = '';

        if (!list || list.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Nenhuma pontuação gravada ainda. Jogue para ser o 1º!</td></tr>';
            return;
        }

        let highlighted = false;

        list.forEach((item, index) => {
            const tr = document.createElement('tr');

            // Destaca a pontuação atual recém-salva se coincidir
            if (!highlighted && highlightName && item.nome === highlightName && parseInt(item.pontos, 10) === highlightScore) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }

            let medal = `${index + 1}º`;
            if (index === 0) medal = '🥇 1º';
            else if (index === 1) medal = '🥈 2º';
            else if (index === 2) medal = '🥉 3º';

            tr.innerHTML = `
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
            `;

            rankingBody.appendChild(tr);
        });
    }

    /**
     * Função auxiliar para sanitizar strings no HTML
     */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Carrega os personagens de acordo com o tema
function atualizarSelecaoTema() {

    const temaEscolhido = themeSelect.value;
    const tema = configuracaoTemas[temaEscolhido];

    // Limpa as escolhas anteriores
    characterSelect.innerHTML =
        '<option value="">Selecione um personagem</option>';

    characterSelect.disabled = true;

    personagemAtual = '';
    obstaculoAtual = '';
    itemAtual = '';
    fundoAtual = '';

    // Se não houver tema escolhido, encerra
    if (!tema) {
        gameBoard.style.backgroundImage = '';
        return;
    }

    temaAtual = temaEscolhido;
    fundoAtual = tema.fundo;

    // Atualiza o cenário
    gameBoard.style.backgroundImage =
        `linear-gradient(rgba(9, 5, 20, 0.10), rgba(9, 5, 20, 0.10)), url("${fundoAtual}")`;

    gameBoard.style.backgroundSize = 'cover';
    gameBoard.style.backgroundPosition = 'center';
    gameBoard.style.backgroundRepeat = 'no-repeat';

    // Esconde as nuvens antigas do Cursed Jump
    if (clouds) {
        clouds.style.display = 'none';
    }

    // Adiciona os personagens disponíveis
    tema.personagens.forEach(personagem => {

        const option = document.createElement('option');

        option.value = personagem.id;
        option.textContent = personagem.nome;

        characterSelect.appendChild(option);
    });

    // Libera a seleção
    characterSelect.disabled = false;

    // Mantém o personagem secreto após trocar o tema
    const nomeDigitado = playerInput.value.trim().toLowerCase();

    if (Object.prototype.hasOwnProperty.call(personagensSecretos, nomeDigitado)) {
        aplicarPersonagemSelecionado();
    }
}


// Aplica o personagem, obstáculo e item selecionados
function aplicarPersonagemSelecionado() {

    const nomeDigitado = playerInput.value.trim().toLowerCase();

    // Verifica se é um personagem secreto
    const secreto = personagensSecretos[nomeDigitado];

    if (secreto) {
    personagemAtual = secreto.imagem;
    obstaculoAtual = secreto.obstaculo;
    itemAtual = secreto.item;

    mario.src = personagemAtual;
    pipe.src = obstaculoAtual;

    if (coin) {
        const caminhoItem = itemAtual;

        coin.onerror = () => {
            console.error('Erro ao carregar o item:', caminhoItem);
        };

        coin.src = caminhoItem;
    }

    return;
}

    // Seleção dos personagens normais
    const tema = configuracaoTemas[themeSelect.value];

    if (!tema) return;

    const personagem = tema.personagens.find(
        item => item.id === characterSelect.value
    );

    if (!personagem) return;

    personagemAtual = personagem.imagem;
    obstaculoAtual = personagem.obstaculo;
    itemAtual = personagem.item;

    mario.src = personagemAtual;
    pipe.src = obstaculoAtual;

    if (coin) {
    const caminhoItem = itemAtual;

    coin.onerror = () => {
        console.error('Erro ao carregar o item:', caminhoItem);
    };

    coin.src = caminhoItem;
}
} // Fecha aplicarPersonagemSelecionado()

// Detecta personagens secretos ao digitar o nome
playerInput.addEventListener('input', () => {
    const nomeDigitado = playerInput.value.trim().toLowerCase();

    const ehSecreto = Object.prototype.hasOwnProperty.call(
        personagensSecretos,
        nomeDigitado
    );

    if (ehSecreto) {
        aplicarPersonagemSelecionado();
        return;
    }

    // Se houver um personagem comum selecionado, aplica ele
    if (characterSelect.value) {
        aplicarPersonagemSelecionado();
        return;
    }

    // Limpa as imagens secretas anteriores
    personagemAtual = '';
    obstaculoAtual = '';
    itemAtual = '';

    mario.removeAttribute('src');
    pipe.removeAttribute('src');

    if (coin) {
        coin.removeAttribute('src');
    }
});


// Eventos dos seletores
themeSelect.addEventListener('change', atualizarSelecaoTema);

characterSelect.addEventListener('change', aplicarPersonagemSelecionado);
    // Submit do Formulário de Início (INICIAR JOGO)
    startForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede o recarregamento da página

        const nameValue = playerInput.value.trim();
        if (!nameValue) {
            playerInput.focus();
            return;
        }

        // Verifica se o tema foi escolhido
        if (!themeSelect.value) {
            themeSelect.focus();
            return;
        }

        // Verifica se é um personagem secreto
        const nomeEhSecreto = Object.prototype.hasOwnProperty.call(
            personagensSecretos,
            nameValue.toLowerCase()
        );

        // Exige personagem comum somente quando não for secreto
        if (!characterSelect.value && !nomeEhSecreto) {
            characterSelect.focus();
            return;
        }

        // Confirma as imagens selecionadas
        aplicarPersonagemSelecionado();

        currentPlayer = nameValue;
        localStorage.setItem('mario_jump_player', currentPlayer);

        // Fecha tela de início e começa o jogo
        startModal.classList.remove('active');
        startGame();
    });

    // Botão "VER RANKING" na tela inicial
    btnViewRanking.addEventListener('click', () => {
        fetchRanking();
        finalScoreValue.textContent = '---';
        saveStatusMsg.textContent = '';
        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });

    // Botão "JOGAR NOVAMENTE" no Game Over
    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });

    // 4. Botão "TROCAR JOGADOR" no Game Over
    btnChangePlayer.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        resetElements();
        startModal.classList.add('active');
        playerInput.value = '';
        playerInput.focus();
    });

    // 5. Controle do Pulo por Teclado (Espaço ou Seta para Cima)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });
    // Controle do pulo por clique
    gameBoard.addEventListener('click', () => {
        if (isPlaying) {
            jump();
        }
    });
});