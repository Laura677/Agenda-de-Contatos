import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const campos = [
    'nome', 'email', 'telefone', 'cep', 'logradouro',
    'numero', 'complemento', 'bairro', 'cidade', 'uf',
    'data_nascimento'
];

const tipos = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8'
};

function json(res, status, obj) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify(obj));
}

function body(req) {
    return new Promise((resolve, reject) => {
        let s = '';

        req.on('data', c => {
            s += c;

            if (s.length > 100000) {
                reject(new Error('Corpo muito grande'));
                req.destroy();
            }
        });

        req.on('end', () => {
            try {
                resolve(JSON.parse(s || '{}'));
            } catch (e) {
                reject(e);
            }
        });

        req.on('error', reject);
    });
}

function validar(d) {
    if (campos.filter(c => c !== 'complemento').some(c => typeof d[c] !== 'string' || !d[c].trim()))
        return 'Preencha todos os campos obrigatórios.';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
        return 'E-mail inválido.';

    if (d.telefone.replace(/\D/g, '').length < 10 || d.telefone.replace(/\D/g, '').length > 11)
        return 'Telefone inválido.';

    if (!/^\d{8}$/.test(d.cep.replace(/\D/g, '')))
        return 'CEP inválido.';

    if (!/^[A-Z]{2}$/.test(d.uf.toUpperCase()))
        return 'UF inválida.';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data_nascimento) ||
        Number.isNaN(Date.parse(d.data_nascimento)) ||
        new Date(d.data_nascimento) > new Date())
        return 'Data de nascimento inválida.';

    return null;
}

http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        const p = url.pathname;

        if (p === '/api/contatos') {
            if (req.method === 'GET') {
                const q = url.searchParams.get('q')?.trim() || '';

                const sql = q
                    ? 'SELECT * FROM contatos WHERE nome LIKE ? OR email LIKE ? OR telefone LIKE ? ORDER BY nome'
                    : 'SELECT * FROM contatos ORDER BY nome';

                return db.all(
                    sql,
                    q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [],
                    (e, rows) => e
                        ? json(res, 500, { error: e.message })
                        : json(res, 200, rows)
                );
            }

            if (req.method === 'POST') {
                const d = await body(req);
                const erro = validar(d);

                if (erro) return json(res, 400, { error: erro });

                const valores = campos.map(c => String(d[c] || '').trim());

                valores[3] = valores[3].replace(/\D/g, '');
                valores[9] = valores[9].toUpperCase();

                return db.run(
                    `INSERT INTO contatos (${campos.join(',')}) VALUES (${campos.map(() => '?').join(',')})`,
                    valores,
                    function (e) {
                        return e
                            ? json(res, 500, { error: e.message })
                            : json(res, 201, {
                                id: this.lastID,
                                message: 'Contato cadastrado!'
                            });
                    }
                );
            }

            return json(res, 405, { error: 'Método não permitido.' });
        }

        const match = p.match(/^\/api\/contatos\/(\d+)$/);

        if (match) {
            const id = Number(match[1]);

            if (req.method === 'GET')
                return db.get(
                    'SELECT * FROM contatos WHERE id=?',
                    [id],
                    (e, row) => e
                        ? json(res, 500, { error: e.message })
                        : row
                            ? json(res, 200, row)
                            : json(res, 404, { error: 'Contato não encontrado.' })
                );

            if (req.method === 'PUT') {
                const d = await body(req);
                const erro = validar(d);

                if (erro) return json(res, 400, { error: erro });

                const valores = campos.map(c => String(d[c] || '').trim());

                valores[3] = valores[3].replace(/\D/g, '');
                valores[9] = valores[9].toUpperCase();

                return db.run(
                    `UPDATE contatos SET ${campos.map(c => c + '=?').join(',')} WHERE id=?`,
                    [...valores, id],
                    function (e) {
                        return e
                            ? json(res, 500, { error: e.message })
                            : this.changes
                                ? json(res, 200, { message: 'Contato atualizado!' })
                                : json(res, 404, { error: 'Contato não encontrado.' });
                    }
                );
            }

            if (req.method === 'DELETE')
                return db.run(
                    'DELETE FROM contatos WHERE id=?',
                    [id],
                    function (e) {
                        return e
                            ? json(res, 500, { error: e.message })
                            : this.changes
                                ? json(res, 200, { message: 'Contato excluído!' })
                                : json(res, 404, { error: 'Contato não encontrado.' });
                    }
                );

            return json(res, 405, { error: 'Método não permitido.' });
        }

        if (req.method !== 'GET')
            return json(res, 405, { error: 'Método não permitido.' });

        const file = path.resolve(publicDir, '.' + (p === '/' ? '/index.html' : p));

        if (!file.startsWith(publicDir + path.sep))
            return json(res, 403, { error: 'Acesso negado.' });

        fs.readFile(file, (e, data) => {
            if (e) {
                res.writeHead(404);
                return res.end('Página não encontrada');
            }

            res.writeHead(200, {
                'Content-Type': tipos[path.extname(file)] || 'application/octet-stream'
            });

            res.end(data);
        });

    } catch (e) {
        json(res, 400, { error: e.message || 'Erro na requisição.' });
    }

}).listen(5000, () => console.log('Agenda disponível em http://localhost:5000'));