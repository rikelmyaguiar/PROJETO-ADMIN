document.addEventListener("DOMContentLoaded", () => {
  const menuLinks = document.querySelectorAll(".menu-link");
  const container = document.getElementById("lista-pedidos");
  let todosPedidos = [];

  function renderizarPedidos(statusSelecionado = "todos") {
    container.innerHTML = "";

    let pedidosFiltrados = todosPedidos;
    if (statusSelecionado !== "todos") {
      pedidosFiltrados = todosPedidos.filter(p => (p.status || "pendente").toLowerCase() === statusSelecionado);
    }

    if (pedidosFiltrados.length === 0) {
      container.innerHTML = '<p class="aviso">Nenhum pedido encontrado para este status.</p>';
      return;
    }

    pedidosFiltrados.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

    pedidosFiltrados.forEach((pedido) => {
      const pedidoDiv = document.createElement("div");
      pedidoDiv.classList.add("pedido-info");

      const dataHoraFormatada = new Date(pedido.data_hora).toLocaleString("pt-BR");
      let precoTotal = 0;

      const status = pedido.status || 'pendente';
      let statusText = '⏳ Pendente';
      let statusClass = 'status-pendente';

      if (status === 'em entrega') {
        statusText = '🚚 Em entrega';
        statusClass = 'status-entrega';
      } else if (status === 'entregue') {
        statusText = '✅ Entregue';
        statusClass = 'status-entregue';
      }

      const itensHTML = pedido.itens.map((item, index) => {
        precoTotal += Number(item.preco_total);
        return `
          <div class="item-pedido" data-item-index="${index}">
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
      }).join("");

      pedidoDiv.innerHTML = `
        <div class="pedido-detalhes">
          <p><strong>ID do Pedido:</strong> ${pedido.pedidoId}</p>
          <span class="status ${statusClass}">${statusText}</span>
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
            ${status === 'pendente' ? '<button class="btn-mandar-entrega">Mandar para entrega</button>' : ''}
            <button class="btn-cancelar" data-pedido-id="${pedido.pedidoId}">Cancelar Pedido</button>
          </div>
        </div>
      `;

      container.appendChild(pedidoDiv);
    });
  }

  fetch("http://localhost:4000/pedidos")
    .then((res) => res.json())
    .then((dados) => {
      todosPedidos = dados;
      renderizarPedidos("todos");
    })
    .catch((err) => {
      console.error("Erro ao buscar pedidos:", err);
      container.innerHTML = '<p class="erro">Erro ao carregar pedidos.</p>';
    });

  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const texto = link.textContent.trim().toLowerCase();
      const status = texto === "todos" ? "todos" :
                     texto === "pendente" ? "pendente" :
                     texto === "em entrega" ? "em entrega" :
                     texto === "entregue" ? "entregue" : "todos";
      renderizarPedidos(status);
    });
  });
});
