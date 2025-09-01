// Importa jspdf para ser acessível globalmente (se não estiver já global pelo UMD)
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('cities-table-body');
    const addCityBtn = document.getElementById('add-city-btn');
    const saveDataBtn = document.getElementById('save-data-btn');
    const loadDataBtn = document.getElementById('load-data-btn');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const periodDisplay = document.getElementById('period-display');
    const mainTitle = document.getElementById('main-title');
    const reportContentForPdf = document.getElementById('report-content-for-pdf');
    const tableHeaders = document.querySelectorAll('th.sortable');

    let citiesData = [];

    // Lista de cidades pré-definidas na nova ordem
    const initialCities = [
        { name: 'Recife, Pernambuco' },
        { name: 'Jaboatão dos Guararapes, Pernambuco' },
        { name: 'Olinda, Pernambuco' },
        { name: 'Paulista, Pernambuco' },
        { name: 'Caruaru, Pernambuco' },
        { name: 'Camaragibe, Pernambuco' },
        { name: 'Cabo de Santo Agostinho, Pernambuco' },
        { name: 'Petrolina, Pernambuco' },
        { name: 'São Lourenço da Mata, Pernambuco' },
        { name: 'Garanhuns, Pernambuco' },
        { name: 'Vitória de Santo Antão, Pernambuco' },
        { name: 'Igarassu, Pernambuco' },
        { name: 'Abreu e Lima, Pernambuco' },
        { name: 'Gravatá, Pernambuco' },
        { name: 'Moreno, Pernambuco' },
        { name: 'Arcoverde, Pernambuco' }
    ];

    // Função para adicionar uma nova linha à tabela
    function addCityRow(city = {}) {
        const newRow = tableBody.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="city-name" value="${city.name || ''}" placeholder="Nome da Cidade, Estado"></td>
            <td><input type="number" class="accounts-reached" value="${city.accountsReached || ''}" min="0"></td>
            <td><input type="number" class="profile-visits" value="${city.profileVisits || ''}" min="0"></td>
            <td><input type="number" class="cost-per-visit" value="${city.costPerVisit || ''}" step="0.01" min="0"></td>
            <td><input type="number" class="invested-value" value="${city.investedValue || ''}" step="0.01" min="0"></td>
            <td><input type="number" class="new-followers" value="${city.newFollowers || ''}"></td>
            <td class="calculated-cost-per-follower">${formatCurrency(city.costPerNewFollower)}</td>
            <td><input type="number" class="current-followers" value="${city.currentFollowers || ''}" min="0"></td>
            <td><button class="remove-btn">Remover</button></td>
        `;

        // Adicionar listeners para cálculo e remoção
        const inputs = newRow.querySelectorAll('input[type="number"], input[type="text"]');
        inputs.forEach(input => input.addEventListener('input', updateRowCalculation));
        newRow.querySelector('.remove-btn').addEventListener('click', () => removeCityRow(newRow));

        // Atualizar o cálculo inicial se houver dados
        updateRowCalculation({ target: newRow.querySelector('.invested-value') }); // Trigger initial calculation
        applyNewFollowersColor(newRow); // Apply initial color
    }

    // Função para atualizar o cálculo de Custo por Novo Seguidor e a cor
    function updateRowCalculation(event) {
        const row = event.target.closest('tr');
        const investedValue = parseFloat(row.querySelector('.invested-value').value) || 0;
        const newFollowers = parseInt(row.querySelector('.new-followers').value) || 0;
        const costPerNewFollowerCell = row.querySelector('.calculated-cost-per-follower');

        let costPerNewFollower = 0;
        if (newFollowers > 0) {
            costPerNewFollower = investedValue / newFollowers;
        } else if (newFollowers < 0) {
            costPerNewFollower = investedValue / newFollowers; // Custo negativo para perdas
        } else { // newFollowers === 0
            costPerNewFollower = investedValue > 0 ? Infinity : 0; // Se investiu e não teve seguidor, custo infinito. Se não investiu, custo 0.
        }
        
        costPerNewFollowerCell.textContent = formatCurrency(costPerNewFollower);
        applyNewFollowersColor(row);
    }

    // Função para aplicar a coloração condicional aos Seguidores Novos
    function applyNewFollowersColor(row) {
        const newFollowersInput = row.querySelector('.new-followers');
        const newFollowersValue = parseInt(newFollowersInput.value);
        newFollowersInput.classList.remove('positive-change', 'negative-change', 'no-change');

        if (newFollowersValue > 0) {
            newFollowersInput.classList.add('positive-change');
        } else if (newFollowersValue < 0) {
            newFollowersInput.classList.add('negative-change');
        } else {
            newFollowersInput.classList.add('no-change');
        }
    }

    // Função para formatar moeda
    function formatCurrency(value) {
        if (value === Infinity) {
            return 'R$ ∞';
        }
        if (isNaN(value) || value === null) {
            return 'R$ 0,00';
        }
        // Garante a formatação para o Brasil com vírgula para decimais
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Função para remover uma linha da tabela
    function removeCityRow(row) {
        row.remove();
        saveData(); // Salva os dados automaticamente após remover uma linha
    }

    // Função para salvar dados no localStorage
    function saveData() {
        const rows = tableBody.querySelectorAll('tr');
        citiesData = Array.from(rows).map(row => {
            const newFollowersValue = parseInt(row.querySelector('.new-followers').value) || 0;
            const investedValue = parseFloat(row.querySelector('.invested-value').value) || 0;
            let costPerNewFollower = 0;

            if (newFollowersValue > 0) {
                costPerNewFollower = investedValue / newFollowersValue;
            } else if (newFollowersValue < 0) {
                costPerNewFollower = investedValue / newFollowersValue;
            } else {
                costPerNewFollower = investedValue > 0 ? Infinity : 0;
            }

            return {
                name: row.querySelector('.city-name').value,
                // campaignPeriod: row.querySelector('.campaign-period').value, // Removido
                accountsReached: parseInt(row.querySelector('.accounts-reached').value) || 0,
                profileVisits: parseInt(row.querySelector('.profile-visits').value) || 0,
                costPerVisit: parseFloat(row.querySelector('.cost-per-visit').value) || 0,
                investedValue: investedValue,
                newFollowers: newFollowersValue,
                currentFollowers: parseInt(row.querySelector('.current-followers').value) || 0,
                costPerNewFollower: costPerNewFollower // Salva o valor calculado também
            };
        });

        localStorage.setItem('citiesData', JSON.stringify(citiesData));
        alert('Dados salvos com sucesso!');
    }

    // Função para carregar dados do localStorage
    function loadData() {
        const savedData = localStorage.getItem('citiesData');
        
        if (savedData) {
            citiesData = JSON.parse(savedData);
            tableBody.innerHTML = ''; // Limpa a tabela atual
            citiesData.forEach(city => addCityRow(city));
            alert('Dados carregados com sucesso!');
        } else {
            // Se não houver dados salvos, popula com as cidades iniciais
            tableBody.innerHTML = '';
            initialCities.forEach(city => addCityRow(city));
            alert('Nenhum dado salvo encontrado. Cidades iniciais carregadas.');
        }
    }

    // Função de ordenação
    function sortTable(sortKey) {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const table = document.getElementById('leads-table');
        const headerIndex = Array.from(table.tHead.querySelector('tr').children).findIndex(th => th.dataset.sort === sortKey);
        const isAscending = tableHeaders[headerIndex].classList.contains('asc');

        rows.sort((rowA, rowB) => {
            let valueA, valueB;
            
            // Ajusta o índice da coluna para pegar o valor correto (ajustado após remover "Período Campanha")
            let columnIndex;
            switch(sortKey) {
                case 'seguidoresNovos':
                    columnIndex = 5; // Nova coluna de Seguidores Novos
                    valueA = parseInt(rowA.children[columnIndex].querySelector('input').value) || 0;
                    valueB = parseInt(rowB.children[columnIndex].querySelector('input').value) || 0;
                    break;
                case 'custoPorNovoSeguidor':
                    columnIndex = 6; // Nova coluna de Custo por Novo Seguidor
                    valueA = rowA.children[columnIndex].textContent.replace('R$ ', '').replace('.', '').replace(',', '.'); // Remove R$, . e troca , por .
                    valueB = rowB.children[columnIndex].textContent.replace('R$ ', '').replace('.', '').replace(',', '.');
                    if (valueA === '∞') valueA = Infinity;
                    if (valueB === '∞') valueB = Infinity;
                    valueA = parseFloat(valueA);
                    valueB = parseFloat(valueB);
                    break;
                case 'seguidoresAtuais':
                    columnIndex = 7; // Nova coluna de Seguidores Atuais
                    valueA = parseInt(rowA.children[columnIndex].querySelector('input').value) || 0;
                    valueB = parseInt(rowB.children[columnIndex].querySelector('input').value) || 0;
                    break;
                default:
                    return 0;
            }

            if (isAscending) {
                return valueA - valueB;
            } else {
                return valueB - valueA;
            }
        });

        // Limpa a tabela e adiciona as linhas ordenadas
        tableBody.innerHTML = '';
        rows.forEach(row => tableBody.appendChild(row));

        // Atualiza a classe de ordenação nos cabeçalhos
        tableHeaders.forEach(header => header.classList.remove('asc', 'desc'));
        if (isAscending) {
            tableHeaders[headerIndex].classList.add('desc');
        } else {
            tableHeaders[headerIndex].classList.add('asc');
        }
    }

    // Adiciona event listeners para os cabeçalhos de ordenação
    tableHeaders.forEach((header) => {
        header.addEventListener('click', () => {
            const sortKey = header.dataset.sort;
            sortTable(sortKey);
        });
    });

    // Função para gerar PDF
    async function generatePdf() {
        // Salva os dados antes de gerar o PDF para garantir que o conteúdo está atualizado
        saveData();

        const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' para retrato, 'mm' para unidades, 'a4' para tamanho
        let yPos = 15; // Posição Y inicial para o conteúdo

        // Adiciona o título principal
        pdf.setFontSize(22);
        pdf.setTextColor(217, 148, 10); // Cor Gold/Orange (D9940A)
        pdf.text(mainTitle.textContent, 105, yPos, { align: 'center' });
        yPos += 10; // Espaço após o título

        // Adiciona o período de análise
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0); // Preto
        pdf.text(`Período de Análise: ${periodDisplay.textContent}`, 105, yPos, { align: 'center' });
        yPos += 20; // Espaço após o período e antes da tabela

        // Oculta botões e a coluna de ações para a captura da tabela
        const controlsDiv = document.querySelector('.controls');
        controlsDiv.style.display = 'none';
        const actionHeader = document.querySelector('th:last-child');
        if (actionHeader) actionHeader.style.display = 'none';
        const actionCells = document.querySelectorAll('td:last-child');
        actionCells.forEach(cell => cell.style.display = 'none');

        // Garante que os inputs são renderizados como texto e com cores legíveis no PDF
        const inputsToConvert = reportContentForPdf.querySelectorAll('input');
        inputsToConvert.forEach(input => {
            input.setAttribute('value', input.value); 
            input.style.border = 'none'; 
            input.style.backgroundColor = 'transparent'; 
            input.style.color = 'black'; // Temporariamente preto para o PDF
            input.style.minWidth = '0'; 

            // Aplica cor de texto para os Seguidores Novos baseado na cor de fundo original
            if (input.classList.contains('new-followers')) {
                 if (input.classList.contains('positive-change') || input.classList.contains('negative-change')) {
                    input.style.color = 'white'; // Texto branco se o fundo for verde/vermelho
                } else if (input.classList.contains('no-change')) {
                    input.style.color = 'black'; // Texto preto se o fundo for amarelo
                } else {
                    input.style.color = 'black'; // Padrão preto para outros casos
                }
            }
        });
        
        // Captura apenas o container da tabela e dos controles (sem os botões de controle)
        // Usamos reportContentForPdf para englobar a tabela e seus estilos
        const canvas = await html2canvas(reportContentForPdf, { 
            scale: 2, 
            useCORS: true, 
            windowWidth: reportContentForPdf.scrollWidth,
            windowHeight: reportContentForPdf.scrollHeight,
            onclone: (documentClone) => {
                const clonedContent = documentClone.getElementById('report-content-for-pdf');
                if (clonedContent) {
                    clonedContent.style.backgroundColor = 'white';
                    clonedContent.style.color = 'black'; // Garante texto preto no container
                }

                const clonedControlsDiv = documentClone.querySelector('.controls');
                if (clonedControlsDiv) clonedControlsDiv.style.display = 'none';
                
                const clonedActionHeader = clonedContent.querySelector('th:last-child');
                if (clonedActionHeader) clonedActionHeader.style.display = 'none';
                const clonedActionCells = clonedContent.querySelectorAll('td:last-child');
                clonedActionCells.forEach(cell => cell.style.display = 'none');

                const clonedInputs = clonedContent.querySelectorAll('input');
                clonedInputs.forEach(input => {
                    input.style.border = 'none';
                    input.style.backgroundColor = 'transparent';
                    input.style.color = 'black';
                    input.style.minWidth = '0';

                    if (input.classList.contains('new-followers')) {
                        if (input.classList.contains('positive-change') || input.classList.contains('negative-change')) {
                            input.style.color = 'white';
                        } else if (input.classList.contains('no-change')) {
                            input.style.color = 'black';
                        } else {
                            input.style.color = 'black';
                        }
                    }
                });

                // Assegura que o background do body no clone é branco
                documentClone.body.style.backgroundColor = 'white';
            }
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 200; // Largura para a imagem da tabela (ajustado para caber no A4 com margens)
        const pageHeight = 297; 
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;

        pdf.addImage(imgData, 'PNG', 5, yPos, imgWidth, imgHeight); // Adiciona a imagem da tabela
        heightLeft -= (pageHeight - yPos); // Ajusta heightLeft com base na posição inicial da imagem
        let currentImgPos = yPos - imgHeight; // Posição atual da imagem

        while (heightLeft >= -1) { // Ajustado para garantir que a última parte seja incluída
            pdf.addPage();
            currentImgPos = -heightLeft;
            pdf.addImage(imgData, 'PNG', 5, currentImgPos, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('relatorio_leads.pdf');

        // Restaura os estilos e elementos visuais da página
        controlsDiv.style.display = 'flex'; 
        if (actionHeader) actionHeader.style.display = '';
        actionCells.forEach(cell => cell.style.display = '');

        inputsToConvert.forEach(input => {
            input.style.border = '';
            input.style.backgroundColor = '';
            input.style.color = '';
            input.style.minWidth = '';
        });
    }

    // Event Listeners
    addCityBtn.addEventListener('click', () => addCityRow());
    saveDataBtn.addEventListener('click', saveData);
    loadDataBtn.addEventListener('click', loadData);
    generatePdfBtn.addEventListener('click', generatePdf);

    // Carregar dados ao iniciar (se existirem) ou popular com as cidades iniciais
    loadData();
});```

---

### Como usar (mesmo processo):

1.  **Crie uma nova pasta** no seu computador.
2.  Dentro dessa pasta, crie três arquivos e salve o código correspondente em cada um:
    *   `index.html`
    *   `style.css`
    *   `script.js`
3.  **Abra o arquivo `index.html`** no seu navegador (Chrome, Firefox, Edge, etc.).

Agora a planilha deve estar com as cidades na ordem correta, sem a coluna "Período Campanha", com o período de análise no título atualizado e com os ajustes de largura para melhor visibilidade. O PDF também refletirá essas mudanças.

Por favor, teste novamente e me diga se há mais algum ajuste!
