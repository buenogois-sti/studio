# ✅ Teste de Componente - ClientSearchInput

## 🔍 Checklist para Testes

### 1️⃣ Teste Visual
- [ ] Campo aparece na seção "Autores do Processo"
- [ ] Texto placeholder "Pesquisar cliente..." é visível
- [ ] Botão "Criar Novo Cliente" está presente

### 2️⃣ Teste de Busca
Siga os passos:

1. Clique no campo de pesquisa
2. Digite um nome de cliente (mínimo 2 caracteres)
3. Aguarde 300ms (debounce)
4. Verifique:
   - [ ] Ícone de carregamento aparece enquanto busca
   - [ ] Resultados aparecem após a busca
   - [ ] Se não há clientes, aparece: "Nenhum cliente encontrado para..."

### 3️⃣ Verificar Console (F12 → Console)

Procure por estes logs:

**SE FUNCIONAR:**
```
[ClientSearch] Buscando por: <seu-texto>
[searchClients] Iniciando busca por: <seu-texto>
[searchClients] Total de clientes na base: <número>
[searchClients] Resultados após filtro: <número>
[ClientSearch] Resultados encontrados: <número>
```

**SE NÃO FUNCIONAR:**
```
[searchClients] firestoreAdmin não inicializado
[ClientSearch] Erro na busca: <mensagem de erro>
```

---

## 🧪 Testes Específicos

### Teste 1: CPF/CNPJ
```
1. Digite "123.456.789-00" (ou qualquer CPF)
2. Deve buscar por clientes que possuem este documento
3. Resultado deve aparecer se existe na base
```

### Teste 2: Nome Parcial
```
1. Digite "João" (ou qualquer parte de um nome)
2. Deve buscar por todos os clientes que contenham "joão" no nome
3. Deve aparecer: "João Silva", "Maria João", etc.
```

### Teste 3: Seleção
```
1. Busque um cliente
2. Clique em um resultado
3. Verifique:
   - [ ] Cliente aparece no botão principal
   - [ ] Ícone de usuário com nome aparece
   - [ ] Popover fecha automaticamente
```

### Teste 4: Criar Novo Cliente
```
1. Clique em "CRIAR NOVO CLIENTE"
2. Verifique:
   - [ ] Modal/Dialog abre
   - [ ] Formulário de criação aparece
   - [ ] Campos: firstName, lastName, document, etc.
```

---

## 🐛 Possíveis Erros e Soluções

### Erro: "Digite pelo menos 2 caracteres"
**Causa**: Você digitou menos de 2 caracteres
**Solução**: Digite pelo menos 2 caracteres

### Erro: "Nenhum cliente encontrado"
**Causa**: Não há clientes na base com esses critérios
**Solução**: 
- Crie alguns clientes primeiro
- Tente buscar por CPF exato
- Verifique o console (F12) para logs

### Erro no Console: "firestoreAdmin não inicializado"
**Causa**: Firebase Admin SDK não foi inicializado
**Solução**: Verifique se FIREBASE_SERVICE_ACCOUNT_JSON está correto em .env.local

### Popover não abre
**Causa**: Problema com Radix UI Popover
**Solução**: 
- Recarregue a página (F5)
- Limpe cache do navegador (Ctrl+Shift+Delete)
- Reinicie o servidor (npm run dev)

---

## 📊 Se Descobrir Erros

Quando encontrar um erro:

1. **Copie o CONSOLE INTEIRO** (F12 → Console → clique direito → Copy)
2. **Me envie a screenshot** com o erro
3. **Descreva o que você fez** antes do erro
4. **Me diga qual é o esperado** vs qual é o resultado

---

## ✨ Status Esperado Após Testes

✅ Campo de busca visível e funcional
✅ Busca por nome funciona
✅ Busca por CPF/CNPJ funciona
✅ Seleção de cliente funciona
✅ Botão "Criar Novo Cliente" abre modal
✅ Nenhum erro no console

---

**Próximo Passo**: Execute os testes acima e me reporte os resultados!
