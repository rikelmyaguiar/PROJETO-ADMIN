const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Rota para entregar o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Configuração do banco
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'loja_ruby'
});

db.connect(err => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
  } else {
    console.log('Conectado ao MySQL');
  }
});

function getTableByCategory(categoria) {
  const categorias = ['aneis', 'braceletes', 'brincos', 'colares', 'ofertas', 'pulseiras'];
  return categorias.includes(categoria) ? categoria : null;
}

// Buscar produtos por categoria
app.get('/produtos/:categoria', (req, res) => {
  const tabela = getTableByCategory(req.params.categoria);
  if (!tabela) return res.status(400).send('Categoria inválida');

  db.query(`SELECT * FROM ${tabela}`, (err, results) => {
    if (err) return res.status(500).send('Erro ao buscar produtos');
    res.json(results);
  });
});

// Inserir pedido
app.post('/pedidos', (req, res) => {
  const { itens, cliente } = req.body;
  if (!itens || !cliente) return res.status(400).send('Dados incompletos');

  const pedidoId = crypto.randomBytes(4).toString('hex');

  const inserirItens = itens.map(item => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO pedidos 
        (pedidoId, foto, nome, cor, tamanho, preco_total, quantidade, nome_cliente, telefone, CEP, bairro, rua_avenida, numero, complemento, forma_pagamento)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        pedidoId,
        item.foto,
        item.nome,
        item.cor,
        item.tamanho,
        item.preco_total,
        item.quantidade,
        cliente.nome,
        cliente.telefone,
        cliente.CEP,
        cliente.bairro,
        cliente.rua_avenida,
        cliente.numero,
        cliente.complemento || '',
        cliente.forma_pagamento
      ];

      db.query(sql, values, (err) => {
        if (err) return reject(err);

        const categoria = item.categoria;
        const tabela = getTableByCategory(categoria);
        if (!tabela) return reject('Categoria inválida');

        const updateSql = `UPDATE ${tabela} SET quantidade = quantidade - ? WHERE nome = ? AND cor LIKE ? AND tamanho LIKE ?`;
        const updateValues = [item.quantidade, item.nome, `%${item.cor}%`, `%${item.tamanho}%`];

        db.query(updateSql, updateValues, (err2) => {
          if (err2) return reject(err2);
          resolve();
        });
      });
    });
  });

  Promise.all(inserirItens)
    .then(() => res.status(201).json({ pedidoId }))
    .catch(err => {
      console.error('Erro ao inserir pedido:', err);
      res.status(500).send('Erro ao inserir pedido');
    });
});

// Buscar todos os pedidos agrupados
app.get('/pedidos', (req, res) => {
  const sql = 'SELECT * FROM pedidos ORDER BY data_hora DESC, id DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Erro ao buscar pedidos');

    const pedidosAgrupados = {};
    results.forEach(pedido => {
      if (!pedidosAgrupados[pedido.pedidoId]) {
        pedidosAgrupados[pedido.pedidoId] = {
          pedidoId: pedido.pedidoId,
          cliente: {
            nome: pedido.nome_cliente,
            telefone: pedido.telefone,
            CEP: pedido.CEP,
            bairro: pedido.bairro,
            rua_avenida: pedido.rua_avenida,
            numero: pedido.numero,
            complemento: pedido.complemento,
            forma_pagamento: pedido.forma_pagamento
          },
          itens: [],
          data_hora: pedido.data_hora
        };
      }

      pedidosAgrupados[pedido.pedidoId].itens.push({
        id: pedido.id,
        foto: pedido.foto,
        nome: pedido.nome,
        cor: pedido.cor,
        tamanho: pedido.tamanho,
        preco_total: pedido.preco_total,
        quantidade: pedido.quantidade
      });
    });

    res.json(Object.values(pedidosAgrupados));
  });
});

// Cancelar pedido inteiro
app.delete('/pedidos/:pedidoId', (req, res) => {
  const { pedidoId } = req.params;

  const query = 'DELETE FROM pedidos WHERE pedidoId = ?';
  db.query(query, [pedidoId], (err, result) => {
    if (err) {
      console.error('Erro ao cancelar pedido:', err);
      return res.status(500).send('Erro ao cancelar pedido');
    }
    res.sendStatus(200);
  });
});

// Remover item individual do pedido (com base em nome, cor e tamanho)
app.delete('/pedidos/:pedidoId/itens', (req, res) => {
  const { pedidoId } = req.params;
  const { nome, cor, tamanho } = req.body;

  if (!nome || !cor || !tamanho) {
    return res.status(400).json({ erro: 'Dados do item incompletos.' });
  }

  const query = `
    DELETE FROM pedidos 
    WHERE pedidoId = ? AND nome = ? AND cor = ? AND tamanho = ?
  `;

  db.query(query, [pedidoId, nome, cor, tamanho], (err, result) => {
    if (err) {
      console.error('Erro ao remover item do pedido:', err);
      return res.status(500).json({ erro: 'Erro interno ao remover item' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: 'Item não encontrado no pedido.' });
    }

    res.status(200).json({ mensagem: 'Item removido com sucesso' });
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
