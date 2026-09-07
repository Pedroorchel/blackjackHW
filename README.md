# ♠️ Blackjack Multiplayer Real-Time

Jogo completo de Blackjack (21) multiplayer em tempo real com salas privadas, cartas abertas na mesa, dealer e sistema de turnos.

---

## 🚀 Como Executar Automaticamente (1-Clique)

### No Windows:
- Dê dois cliques no arquivo **`start.bat`**.
- Ele verifica e instala todos os pacotes `npm` automaticamente caso não estejam instalados e abre o jogo direto no seu navegador em `http://localhost:3000`.

### No Linux / Mac:
```bash
chmod +x start.sh
./start.sh
```

### No GitHub Codespaces:
- Basta abrir o repositório no **GitHub Codespaces**. O arquivo de configuração `.devcontainer` já está configurado para instalar todos os pacotes `npm install` e iniciar o jogo automaticamente.

---

## 🌐 Publicação no GitHub Pages (Sem Tela Branca)

O projeto está configurado para funcionar **em qualquer modo do GitHub Pages**:

### Opção 1: GitHub Actions (Automático - Recomendado)
1. No seu repositório no GitHub, clique em **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Build and deployment > Source**, selecione **GitHub Actions**.
4. Pronto! A cada push, o GitHub instala os pacotes, compila o projeto e publica o site automaticamente sem tela branca.

### Opção 2: Deploy direto pelo Branch (Caso não use GitHub Actions)
1. Em **Settings** > **Pages**, deixe **Deploy from a branch**.
2. No campo **Branch**, escolha **main** (ou **master**).
3. Na pasta, escolha **/docs** ou **/ (root)** — ambos já contêm a versão compilada pronta (`dist` e `docs`), garantindo que não haverá tela branca.
