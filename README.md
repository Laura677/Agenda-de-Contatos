# Projeto 06 — Agenda de Contatos

Adaptação do projeto 261007_Cadastro_CRUD, utilizando Node.js sem framework HTTP, SQLite, HTML, CSS e JavaScript.

## Executar

1. Abra esta pasta no VS Code.
2. No terminal, execute `npm install`.
3. Execute `npm start`.
4. Abra http://localhost:5000 no navegador.

O banco `agenda.sqlite` será criado automaticamente. É necessário acesso à internet para a consulta de CEP na API pública ViaCEP.

## CRUD

- `GET /api/contatos` — listar contatos (opcional `?q=nome`)
- `GET /api/contatos/1` — consultar por ID
- `POST /api/contatos` — cadastrar
- `PUT /api/contatos/1` — atualizar
- `DELETE /api/contatos/1` — excluir

Campos: nome, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf, data_nascimento.
