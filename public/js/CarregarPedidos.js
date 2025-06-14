document.addEventListener("DOMContentLoaded", () => {
  fetch("http://localhost:4000/pedidos")
    .then((response) => {
      if (!response.ok) throw new Error("Erro ao carregar pedidos");
      return response.json();
    })
    .then((pedidos) => {
      const container = document.getElementById("lista-pedidos");

      if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<p class="aviso">Nenhum pedido encontrado.</p>';
        return;
      }

      pedidos.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

      pedidos.forEach((pedido) => {
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

      // Remover pedido inteiro
      container.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-cancelar")) {
          const pedidoId = e.target.dataset.pedidoId;
          if (confirm("Deseja cancelar o pedido inteiro?")) {
            fetch(`http://localhost:4000/pedidos/${pedidoId}`, {
              method: "DELETE",
            })
              .then((response) => {
                if (!response.ok) throw new Error("Erro ao cancelar o pedido");
                const pedidoElemento = e.target.closest(".pedido-info");
                if (pedidoElemento) pedidoElemento.remove();
              })
              .catch((error) => console.error(error));
          }
        }
      });

      // Remover item individual
      container.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-remover-item")) {
          const pedidoId = e.target.dataset.pedidoId;
          const nome = e.target.dataset.nome;
          const cor = e.target.dataset.cor;
          const tamanho = e.target.dataset.tamanho;

          if (confirm("Deseja remover este item do pedido?")) {
            fetch(`http://localhost:4000/pedidos/${pedidoId}/itens`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nome, cor, tamanho }),
            })
              .then((response) => {
                if (!response.ok) throw new Error("Erro ao remover o item");
                const itemDiv = e.target.closest(".item-pedido");
                if (itemDiv) itemDiv.remove();

                // Recalcular total
                const pedidoDetalhes = e.target.closest(".pedido-detalhes");
                let novoTotal = 0;
                pedidoDetalhes.querySelectorAll(".preco-item").forEach((precoEl) => {
                  const texto = precoEl.textContent.replace(/[^0-9,]/g, "").replace(",", ".");
                  novoTotal += parseFloat(texto);
                });

                const totalPedidoEl = pedidoDetalhes.querySelector(".total-pedido");
                if (totalPedidoEl) {
                  totalPedidoEl.innerHTML = `<strong>Total do Pedido:</strong> R$ ${novoTotal.toFixed(2)}`;
                }
              })
              .catch((error) => console.error(error));
          }
        }
      });

      // Mandar para entrega + enviar WhatsApp
      container.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-mandar-entrega")) {
          const pedidoDiv = e.target.closest(".pedido-info");
          const pedidoId = pedidoDiv.querySelector(".btn-cancelar")?.dataset.pedidoId;

          if (!pedidoId) return;

          if (confirm("Deseja realmente mandar este pedido para entrega?")) {
            fetch(`http://localhost:4000/pedidos/${pedidoId}/entregar`, {
              method: "PUT",
            })
              .then((response) => {
                if (!response.ok) throw new Error("Erro ao atualizar status");

                // Atualiza o status visual
                const statusEl = pedidoDiv.querySelector(".status");
                if (statusEl) {
                  statusEl.textContent = "🚚 Em entrega";
                  statusEl.classList.remove("status-pendente");
                  statusEl.classList.add("status-entrega");
                }

                e.target.remove();

                // Enviar mensagem via WhatsApp
                const nome = pedidoDiv.querySelector("p:nth-child(4)")?.textContent.split(": ")[1] || "Cliente";
                const telefoneRaw = pedidoDiv.querySelector("p:nth-child(10)")?.textContent.split(": ")[1] || "";
                const telefone = telefoneRaw.replace(/\D/g, "");
                if (!telefone || telefone.length < 10) {
                  alert("Número de telefone inválido para envio via WhatsApp.");
                  return;
                }

                const itens = pedidoDiv.querySelectorAll(".item-pedido");
                let itensTexto = "";
                itens.forEach((item) => {
                  const nomeProduto = item.querySelector("p:nth-child(2)")?.textContent.split(": ")[1];
                  const tamanho = item.querySelector("p:nth-child(3)")?.textContent.split(": ")[1];
                  const quantidade = item.querySelector("p:nth-child(4)")?.textContent.split(": ")[1];
                  const cor = item.querySelector("p:nth-child(5)")?.textContent.split(": ")[1];

                  itensTexto += `\nProduto: ${nomeProduto}\nQuantidade: ${quantidade}\nCor: ${cor}\nTamanho: ${tamanho}\n\n`;
                });

                const mensagem = `Olá! seu pedido Nº${pedidoId} saiu para a entrega 📦💎\n\n*Descrição:*\nNome: ${nome}\n${itensTexto}Agradecemos por comprar na Ruby Acessórios ❤️`;

                const linkWhatsApp = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
                window.open(linkWhatsApp, "_blank");
              })
              .catch((error) => console.error("Erro ao atualizar status:", error));
          }
        }
      });
    })
    .catch((error) => {
      console.error("Erro ao carregar pedidos:", error);
      document.getElementById("lista-pedidos").innerHTML =
        '<p class="erro">Erro ao carregar pedidos.</p>';
    });
});
