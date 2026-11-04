import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const db = new sqlite3.Database(path.join(dir, 'agenda.sqlite'));

db.run(`CREATE TABLE IF NOT EXISTS contatos (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nome TEXT NOT NULL,
 email TEXT NOT NULL,
 telefone TEXT NOT NULL,
 cep TEXT NOT NULL,
 logradouro TEXT NOT NULL,
 numero TEXT NOT NULL,
 complemento TEXT DEFAULT '',
 bairro TEXT NOT NULL,
 cidade TEXT NOT NULL,
 uf TEXT NOT NULL,
 data_nascimento TEXT NOT NULL
)`);

export default db;
