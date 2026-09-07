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

O projeto já inclui:
1. **`base: './'` no Vite**: Os caminhos de script e estilos são relativos, evitando o erro 404 de tela branca no GitHub Pages (`username.github.io/repo/`).
2. **GitHub Actions Automático**: O arquivo `.github/workflows/deploy.yml` compila e publica o projeto automaticamente a cada `git push` no branch `main`.
3. Para ativar no GitHub:
   - Vá em **Settings** > **Pages** do repositório.
   - Em **Build and deployment > Source**, selecione **GitHub Actions**.
   - O GitHub irá instalar os pacotes, compilar e publicar o site automaticamente!
