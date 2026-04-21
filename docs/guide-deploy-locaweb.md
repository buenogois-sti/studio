
# 🚀 Guia de Deploy - Locaweb (VPS/Cloud)

Este guia detalha como hospedar o **LexFlow** em um servidor VPS Linux na Locaweb.

## 🛠️ Pré-requisitos
- Servidor VPS Locaweb com **Ubuntu 22.04 LTS** (recomendado).
- Acesso SSH ao servidor.
- Domínio configurado (DNS apontando para o IP do VPS).

---

## 1️⃣ Preparação do Servidor

Acesse seu servidor via terminal e execute:

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20+ (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar versões
node -v
npm -v
```

---

## 2️⃣ Configuração do Projeto

Clone seu repositório no servidor:

```bash
cd /var/www
git clone https://github.com/seu-usuario/seu-repositorio.git lexflow
cd lexflow

# Instalar dependências
npm install
```

### Configurar Variáveis de Ambiente
Crie o arquivo `.env.local` e cole todas as chaves, incluindo a **FIREBASE_SERVICE_ACCOUNT_JSON** (em uma única linha).

```bash
nano .env.local
```

---

## 3️⃣ Build e Execução

Como configuramos `output: 'standalone'` no `next.config.ts`, o build será extremamente eficiente.

```bash
# Gerar o build de produção
npm run build

# Instalar o PM2 para gerenciar o processo
sudo npm install -g pm2

# Iniciar a aplicação
pm2 start .next/standalone/server.js --name "lexflow" --env PORT=3000

# Configurar para iniciar com o servidor
pm2 startup
pm2 save
```

---

## 4️⃣ Configuração do Nginx (Proxy Reverso)

Instale o Nginx para gerenciar o tráfego na porta 80/443:

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/lexflow
```

Cole a configuração (ajuste o `server_name`):

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative o site e reinicie o Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/lexflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5️⃣ SSL Gratuito (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu-dominio.com.br
```

Siga as instruções para ativar o HTTPS automático.

---

## ⚠️ Notas Importantes para Locaweb
1. **Firewall**: Garanta que as portas 80 (HTTP) e 443 (HTTPS) estejam abertas no painel da Locaweb.
2. **Memória**: O Next.js com IA pode exigir pelo menos 2GB de RAM para o build. Se o build falhar, aumente o SWAP do servidor.
3. **Google OAuth**: Lembre-se de adicionar a URL de produção (`https://seu-dominio.com.br/api/auth/callback/google`) no Google Cloud Console.
