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

    // Modais e Telas
    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const characterSelect = document.getElementById('character-select');
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
    let vidas = 3;
    let collisionCooldown = false;
    let personagemAtual = 'assets/cavaleiro.gif';

    const livesDisplay = document.getElementById('lives-display');

    let gameLoop = null;
    let scoreLoop = null;
    let jumpTimer = null;   

    // Configurações da dificuldade
    const velocidadeInicial = 3;
    const aumentoPorNivel = 0.05;
    const velocidadeMinima = 1;

let nivelAtual = 0;

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

// Controla a dificuldade do jogo
function atualizarDificuldade() {
    let novoNivel = 0;

    // Primeiro aumento a partir de 100 pontos
    if (score >= 100 && score < 5000) {
        if (score < 1000) {
            novoNivel = 1;
        } else {
            novoNivel = Math.floor(score / 1000) + 1;
        }
    }

    // Depois de 5000 pontos, aumenta a cada 2500
    if (score >= 5000) {
        novoNivel = 6 + Math.floor((score - 5000) / 2500);
    }

    // Só recalcula quando a etapa de velocidade muda
    if (novoNivel === nivelAtual) return;

    nivelAtual = novoNivel;

    // Quanto menor a duração, mais rápido o elemento se move
    let novaDuracao =
        velocidadeInicial - nivelAtual * aumentoPorNivel;

    // A partir de 50000 pontos, reduz um pouco a velocidade
    if (score >= 50000) {
        novaDuracao += 0.2;
    }

    // Limita a velocidade para manter o jogo funcional
    novaDuracao = Math.max(
        velocidadeMinima,
        Math.min(velocidadeInicial, novaDuracao)
    );

    // Atualiza o obstáculo
    pipe.style.animationDuration = `${novaDuracao}s`;

    // Acelera também as nuvens
    if (clouds) {
        clouds.style.animationDuration =
            `${Math.max(7, 18 * novaDuracao / velocidadeInicial)}s`;
    }

    // Acelera a moeda sem deixá-la rápida demais
    if (coin) {
        coin.style.animationDuration =
            `${Math.max(1.2, 3 * novaDuracao / velocidadeInicial)}s`;
    }
}

    function atualizarVidas() {
    if (!livesDisplay) return;

    livesDisplay.textContent = '🤎 '.repeat(vidas).trim();
}

    function startGame() {
        // Limpa loops anteriores se existirem
        clearInterval(gameLoop);
        clearInterval(scoreLoop);
    

        // Reseta posições e visuais
        resetElements();

        isPlaying = true;
        isPaused = false;
        score = 0;
        vidas = 3;
        collisionCooldown = false;

        scoreDisplay.textContent = '0';
        atualizarNivelInterface();
        atualizarVidas();
        // Reinicia a dificuldade
        nivelAtual = 0;
        pipe.style.animationDuration = '';
        hudPlayerName.textContent = currentPlayer || 'Jogador';

        // Ativa animações CSS do jogo
        gameBoard.classList.add('running');

        // Loop de pontuação progressiva (1 ponto a cada 100ms)
        
 // Loop de pontuação progressiva (1 ponto a cada 250ms)
        scoreLoop = setInterval(() => {
            if (isPlaying) {
                score += 1;
                scoreDisplay.textContent = score;

                atualizarNivelInterface();
                atualizarDificuldade();
            }
        }, 100);


        // Loop de colisão
        gameLoop = setInterval(checkCollision, 10);
    }


    function resetElements() {
        isPaused = false;
        gameBoard.classList.remove('paused');
        // Reseta o obstáculo e as velocidades
        pipe.style.animation = '';
        pipe.style.left = '';
        pipe.style.animationDuration = '';

if (clouds) {
    clouds.style.animationDuration = '';
}

        // Reseta Mario
        mario.src = personagemAtual;
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
    coin.style.animation = '';
    coin.style.animationDuration = '';
    coin.style.right = '-40px';
}

        if (jumpTip) {
            jumpTip.style.opacity = '1';
        }
    }

function finalizarPulo() {
    clearTimeout(jumpTimer);
    jumpTimer = null;

    mario.classList.remove('jump');
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
    const marioLeft = marioRect.left + marioRect.width * 0.35;
    const marioRight = marioRect.right - marioRect.width * 0.35;

    // Hitbox menor do pilar
    const pipeLeft = pipeRect.left + pipeRect.width * 0.35;
    const pipeRight = pipeRect.right - pipeRect.width * 0.35;

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
            score += 10;
            scoreDisplay.textContent = score;

            atualizarNivelInterface();
            atualizarDificuldade();

            coin.style.visibility = 'hidden';

            setTimeout(() => {
                if (isPlaying && !isPaused) { 
                    coin.style.animation = 'none';
                    coin.style.right = '-40px';
                    coin.style.visibility = 'visible';

                    void coin.offsetWidth;
                    coin.style.animation = '';
                }
            }, 700);
        }
    }
}

    function triggerGameOver(pipePosition, marioPosition) {
        isPlaying = false;
        gameBoard.classList.remove('paused');   
        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        
        gameBoard.classList.remove('running');

        
        pipe.style.animation = 'none';
        pipe.style.left = `${pipePosition}px`;

        // Congela o Mario na altura exata e muda para a imagem de Game Over
        mario.style.animation = 'none';
        mario.style.bottom = `${marioPosition}px`;
        mario.src = 'assets/cavaleiro.gif';
        mario.style.visibility = 'visible';
        mario.style.width = '75px';
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

    // Seleção do personagem
    if (characterSelect) {
        personagemAtual = characterSelect.value;

        characterSelect.addEventListener('change', () => {
            personagemAtual = characterSelect.value;
            mario.src = personagemAtual;s
        });
    }
    // Submit do Formulário de Início (INICIAR JOGO)
    startForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede o recarregamento da página

        const nameValue = playerInput.value.trim();
        if (!nameValue) {
            playerInput.focus();
            return;
        }

        currentPlayer = nameValue;
        localStorage.setItem('mario_jump_player', currentPlayer);
        personagemAtual = characterSelect
        ? characterSelect.value
        : 'assets/cavaleiro.gif';

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