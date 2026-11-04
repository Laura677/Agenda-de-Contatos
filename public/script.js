const form = document.querySelector('#form');
const list = document.querySelector('#list');
const message = document.querySelector('#message');
const search = document.querySelector('#search');
const cep = document.querySelector('#cep');

let editing = null;
let contatos = [];

function field(name) {
    return form.elements.namedItem(name);
}

function notify(text) {
    message.textContent = text;
}

function reset() {
    editing = null;
    form.reset();
    document.querySelector('#form-title').textContent = 'Novo contato';
    document.querySelector('#save').textContent = 'Salvar contato';
    document.querySelector('#cancel').hidden = true;
    document.querySelector('#cep-status').textContent = '';
}

function formatDate(s) {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
}

async function request(url, options) {
    const r = await fetch(url, options);
    const data = await r.json();

    if (!r.ok) throw new Error(data.error || 'Erro na operação');

    return data;
}

async function load() {
    try {
        contatos = await request('/api/contatos?q=' + encodeURIComponent(search.value));
        document.querySelector('#total').textContent = `${contatos.length} contato(s)`;
        render();
    } catch (e) {
        notify(e.message);
    }
}

function render() {
    list.replaceChildren();

    if (!contatos.length) {
        const p = document.createElement('p');
        p.className = 'empty';
        p.textContent = 'Nenhum contato encontrado.';
        list.append(p);
        return;
    }

    for (const c of contatos) {
        const item = document.createElement('article');
        item.className = 'contact';

        const info = document.createElement('div');
        const title = document.createElement('h3');
        title.textContent = c.nome;
        info.append(title);

        for (const s of [
            c.email + ' · ' + c.telefone,
            `${c.logradouro}, ${c.numero}${c.complemento ? ' - ' + c.complemento : ''} · ${c.bairro}`,
            `${c.cidade}/${c.uf} · CEP ${c.cep}`,
            `Nascimento: ${formatDate(c.data_nascimento)}`
        ]) {
            const p = document.createElement('p');
            p.textContent = s;
            info.append(p);
        }

        const actions = document.createElement('div');
        actions.className = 'actions';

        const edit = document.createElement('button');
        edit.textContent = 'Editar';

        edit.onclick = () => {
            editing = c.id;

            for (const key of Object.keys(c)) {
                const el = field(key);
                if (el) el.value = c[key] ?? '';
            }

            document.querySelector('#form-title').textContent = 'Editar contato';
            document.querySelector('#save').textContent = 'Atualizar contato';
            document.querySelector('#cancel').hidden = false;

            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const del = document.createElement('button');
        del.textContent = 'Excluir';
        del.className = 'danger';

        del.onclick = async () => {
            if (!confirm(`Excluir o contato ${c.nome}?`)) return;

            try {
                await request('/api/contatos/' + c.id, { method: 'DELETE' });
                notify('Contato excluído com sucesso!');

                if (editing === c.id) reset();

                await load();
            } catch (e) {
                notify(e.message);
            }
        };

        actions.append(edit, del);
        item.append(info, actions);
        list.append(item);
    }
}

cep.addEventListener('blur', async () => {
    const digits = cep.value.replace(/\D/g, '');

    if (digits.length !== 8) return;

    const status = document.querySelector('#cep-status');
    status.textContent = 'Consultando CEP...';

    try {
        const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);

        if (!r.ok) throw new Error('Falha na consulta');

        const data = await r.json();

        if (data.erro) throw new Error('CEP não encontrado');

        for (const [key, value] of Object.entries({
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf
        })) {
            field(key).value = value || '';
        }

        cep.value = digits.slice(0, 5) + '-' + digits.slice(5);
        status.textContent = 'Endereço preenchido pelo ViaCEP. Confira os dados.';
    } catch (e) {
        status.textContent = 'Não foi possível consultar o CEP. Preencha o endereço manualmente.';
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form));

    try {
        const isEdit = editing !== null;

        const result = await request(
            isEdit ? '/api/contatos/' + editing : '/api/contatos',
            {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }
        );

        reset();
        notify(result.message);
        await load();
    } catch (e) {
        notify(e.message);
    }
});

document.querySelector('#cancel').onclick = reset;

let timer;

search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(load, 250);
});

load();