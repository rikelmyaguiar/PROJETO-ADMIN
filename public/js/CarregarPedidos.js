document.addEventListener('DOMContentLoaded', () => {
  fetch('http://localhost:4000/pedidos')
    .then(response => {
      if (!response.ok) throw new Error('Erro ao carregar pedidos');
      return response.json();
    })
    .then(pedidos => {
      const container = document.getElementById('lista-pedidos');

      if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<p class="aviso">Nenhum pedido encontrado.</p>';
        return;
      }

      pedidos.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

      pedidos.forEach(pedido => {
        const pedidoDiv = document.createElement('div');
        pedidoDiv.classList.add('pedido-info');

        const dataHoraFormatada = new Date(pedido.data_hora).toLocaleString('pt-BR');

        let precoTotal = 0;

        const itensHTML = pedido.itens.map((item, index) => {
          precoTotal += Number(item.preco_total);
          return `
            <div class="item-pedido" data-item-index="${index}">
            <hr>
              <img src="${item.foto}" alt="Foto do Produto" class="produto-imagem">
              <p><strong>Produto:</strong> ${item.nome}</p>
              <p><strong>Tamanho:</strong> ${item.tamanho}</p>
              <p><strong>Quantidade:</strong> ${item.quantidade}</p>
              <p><strong>Cor:</strong> ${item.cor}</p>
              <p class="preco-item"><strong>Preço Total:</strong> R$ ${Number(item.preco_total).toFixed(2)}</p>
              <button class="btn-remover-item" data-nome="${item.nome}" data-cor="${item.cor}" data-tamanho="${item.tamanho}" data-pedido-id="${pedido.pedidoId}">Remover Item</button>
              <hr>
            </div>
          `;
        }).join('');

        pedidoDiv.innerHTML = `
          <div class="pedido-detalhes">
            <span class="status status-pendente">⏳ Pendente</span>
            <p><strong>Data e Hora:</strong> ${dataHoraFormatada}</p>
            <p><strong>Nome:</strong> ${pedido.cliente.nome}</p>
            <p><strong>CEP:</strong> ${pedido.cliente.CEP}</p>
            <p><strong>Bairro:</strong> ${pedido.cliente.bairro}</p>
            <p><strong>Rua/Avenida:</strong> ${pedido.cliente.rua_avenida}</p>
            <p><strong>Número:</strong> ${pedido.cliente.numero}</p>
            <p><strong>Complemento:</strong> ${pedido.cliente.complemento}</p>
            <p><strong>Telefone:</strong> ${pedido.cliente.telefone}</p>
            <p><strong>Forma de Pagamento:</strong> ${pedido.cliente.forma_pagamento}</p>
            ${itensHTML}
            <p class="total-pedido"><strong>Total do Pedido:</strong> R$ ${precoTotal.toFixed(2)}</p>
            <div class="pedido-botoes">
              <button class="btn-mandar-entrega">Mandar para entrega</button>
              <button class="btn-cancelar" data-pedido-id="${pedido.pedidoId}">Cancelar Pedido</button>
            </div>
          </div>
        `;

        container.appendChild(pedidoDiv);
      });

      // Remover pedido inteiro
      container.addEventListener('click', e => {
        if (e.target.classList.contains('btn-cancelar')) {
          const pedidoId = e.target.dataset.pedidoId;
          if (confirm('Deseja cancelar o pedido inteiro?')) {
            fetch(`http://localhost:4000/pedidos/${pedidoId}`, { method: 'DELETE' })
              .then(response => {
                if (!response.ok) throw new Error('Erro ao cancelar o pedido');
                const pedidoElemento = e.target.closest('.pedido-info');
                if (pedidoElemento) pedidoElemento.remove();
              })
              .catch(error => console.error(error));
          }
        }
      });

      // Remover item individual
      container.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remover-item')) {
          const pedidoId = e.target.dataset.pedidoId;
          const nome = e.target.dataset.nome;
          const cor = e.target.dataset.cor;
          const tamanho = e.target.dataset.tamanho;

          if (confirm('Deseja remover este item do pedido?')) {
            fetch(`http://localhost:4000/pedidos/${pedidoId}/itens`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nome, cor, tamanho })
            })
              .then(response => {
                if (!response.ok) throw new Error('Erro ao remover o item');
                const itemDiv = e.target.closest('.item-pedido');
                if (itemDiv) itemDiv.remove();

                // Recalcular total
                const pedidoDetalhes = e.target.closest('.pedido-detalhes');
                let novoTotal = 0;
                pedidoDetalhes.querySelectorAll('.preco-item').forEach(precoEl => {
                  const texto = precoEl.textContent.replace(/[^0-9,]/g, '').replace(',', '.');
                  novoTotal += parseFloat(texto);
                });

                const totalPedidoEl = pedidoDetalhes.querySelector('.total-pedido');
                if (totalPedidoEl) {
                  totalPedidoEl.innerHTML = `<strong>Total do Pedido:</strong> R$ ${novoTotal.toFixed(2)}`;
                }
              })
              .catch(error => console.error(error));
          }
        }
      });
    })
    .catch(error => {
      console.error('Erro ao carregar pedidos:', error);
      document.getElementById('lista-pedidos').innerHTML = '<p class="erro">Erro ao carregar pedidos.</p>';
    });
});
