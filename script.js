// Importa jspdf para ser acessível globalmente (se não estiver já global pelo UMD)
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('cities-table-body');
    const addCityBtn = document.getElementById('add-city-btn');
    const saveDataBtn = document.getElementById('save-data-btn');
    const loadDataBtn = document.getElementById('load-data-btn');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const periodDisplay = document.getElementById('period-display'); // Agora é um span
    const tableHeaders = document.querySelectorAll('th.sortable');

    let citiesData = [];

    // Lista de cidades pré-definidas
    const initialCities = [
        { name: 'Petrolina, Pernambuco' },
        { name: 'Jaboatão dos Guararapes, Pernambuco' },
        { name: 'Olinda, Pernambuco' },
        { name: 'Cabo de Santo Agostinho, Pernambuco' },
        { name: 'Paulista, Pernambuco' },
        { name: 'Camaragibe, Pernambuco' },
        { name: 'Igarassu, Pernambuco' },
        { name: 'São Lourenço da Mata, Pernambuco' },
        { name: 'Gravatá, Pernambuco' },
        { name: 'Moreno, Pernambuco' },
        { name: 'Garanhuns, Pernambuco' },
        { name: 'Abreu e Lima, Pernambuco' },
        { name: 'Arcoverde, Pernambuco' },
        { name: 'Caruaru, Pernambuco' },
        { name: 'Vitória de Santo Antão, Pernambuco' },
        { name: 'Recife, Pernambuco' }
    ];

    // Função para adicionar uma nova linha à tabela
    function addCityRow(city = {}) {
        const newRow = tableBody.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="city-name" value="${city.name || ''}" placeholder="Nome da Cidade, Estado"></td>
            <td><input type="text" class="campaign-period" value="${city.campaignPeriod || ''}" placeholder="Ex: 01-15 Ago"></td>
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
                campaignPeriod: row.querySelector('.campaign-period').value,
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
        // O período não é mais salvo pois é fixo, mas podemos salvar se for editável no futuro
        // localStorage.setItem('periodOfAnalysis', periodDisplay.textContent); 
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
            alert('Nenhum dado salvo encontrado.');
            // Se não houver dados salvos, carrega as cidades iniciais
            tableBody.innerHTML = '';
            initialCities.forEach(city => addCityRow(city));
        }

        // O período de análise é fixo agora, não precisa carregar do localStorage
        // const savedPeriod = localStorage.getItem('periodOfAnalysis');
        // if (savedPeriod) {
        //     periodDisplay.textContent = savedPeriod;
        // }
    }

    // Função de ordenação
    function sortTable(sortKey, type) {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const table = document.getElementById('leads-table');
        const headerIndex = Array.from(table.tHead.querySelector('tr').children).findIndex(th => th.dataset.sort === sortKey);
        const isAscending = tableHeaders[headerIndex].classList.contains('asc');

        rows.sort((rowA, rowB) => {
            let valueA, valueB;
            
            // Ajusta o índice da coluna para pegar o valor correto
            let columnIndex;
            switch(sortKey) {
                case 'seguidoresNovos':
                    columnIndex = 6; // Coluna de Seguidores Novos
                    valueA = parseInt(rowA.children[columnIndex].querySelector('input').value) || 0;
                    valueB = parseInt(rowB.children[columnIndex].querySelector('input').value) || 0;
                    break;
                case 'custoPorNovoSeguidor':
                    columnIndex = 7; // Coluna de Custo por Novo Seguidor
                    valueA = rowA.children[columnIndex].textContent.replace('R$ ', '').replace('.', '').replace(',', '.'); // Remove R$, . e troca , por .
                    valueB = rowB.children[columnIndex].textContent.replace('R$ ', '').replace('.', '').replace(',', '.');
                    if (valueA === '∞') valueA = Infinity;
                    if (valueB === '∞') valueB = Infinity;
                    valueA = parseFloat(valueA);
                    valueB = parseFloat(valueB);
                    break;
                case 'seguidoresAtuais':
                    columnIndex = 8; // Coluna de Seguidores Atuais
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

        const content = document.getElementById('pdf-content');
        const originalBgBody = document.body.style.backgroundColor;
        const originalBgContainer = content.style.backgroundColor;
        const originalColorContainer = content.style.color;
        const originalColorPeriod = periodDisplay.style.color;

        // Estilos temporários para o PDF
        document.body.style.backgroundColor = 'white';
        content.style.backgroundColor = 'white';
        content.style.color = 'black';
        periodDisplay.style.color = 'black';

        // Oculta botões e a coluna de ações para o PDF
        const controlsDiv = document.querySelector('.controls');
        controlsDiv.style.display = 'none';
        const actionHeader = document.querySelector('th:last-child');
        if (actionHeader) actionHeader.style.display = 'none';
        const actionCells = document.querySelectorAll('td:last-child');
        actionCells.forEach(cell => cell.style.display = 'none');

        // Garante que os inputs são renderizados como texto para o PDF
        const inputsToConvert = content.querySelectorAll('input');
        inputsToConvert.forEach(input => {
            input.setAttribute('value', input.value); // Garante que o valor atual está no atributo 'value'
            input.style.border = 'none'; // Remove bordas
            input.style.backgroundColor = 'transparent'; // Remove background
            input.style.color = 'black'; // Garante texto preto no PDF
            input.style.minWidth = '0'; // Evita largura mínima que force scroll
        });
        
        // Captura o conteúdo
        const canvas = await html2canvas(content, { 
            scale: 2, // Melhor qualidade
            useCORS: true, // Se houver imagens externas
            windowWidth: content.scrollWidth,
            windowHeight: content.scrollHeight,
            onclone: (documentClone) => {
                const clonedContent = documentClone.getElementById('pdf-content');
                
                // Aplica estilos para o clone para garantir o layout correto no PDF
                documentClone.body.style.backgroundColor = 'white';
                clonedContent.style.backgroundColor = 'white';
                clonedContent.style.color = 'black';
                
                const clonedPeriodDisplay = documentClone.getElementById('period-display');
                if (clonedPeriodDisplay) clonedPeriodDisplay.style.color = 'black';

                const clonedH1 = documentClone.querySelector('h1');
                if (clonedH1) clonedH1.style.color = '#DC2626'; // Mantém o título vermelho

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
                });

                // Assegura que as cores condicionais sejam mantidas, mas o texto seja preto ou branco legível
                const clonedNewFollowersInputs = clonedContent.querySelectorAll('.new-followers');
                clonedNewFollowersInputs.forEach(input => {
                    if (input.classList.contains('positive-change') || input.classList.contains('negative-change')) {
                        input.style.color = 'white'; // Se o background for verde/vermelho, texto branco
                    } else if (input.classList.contains('no-change')) {
                        input.style.color = 'black'; // Se o background for amarelo, texto preto
                    }
                });

                // Esconde a barra de rolagem horizontal se ainda aparecer no clone
                const clonedTableContainer = clonedContent.querySelector('.table-container');
                if (clonedTableContainer) clonedTableContainer.style.overflowX = 'hidden';

                // Força a largura da tabela para o clone
                const clonedTable = clonedContent.querySelector('#leads-table');
                if (clonedTable) clonedTable.style.width = '100%';
            }
        });

        // Restaura os estilos e elementos visuais da página
        controlsDiv.style.display = 'flex'; // ou 'block' dependendo de como você definiu
        if (actionHeader) actionHeader.style.display = '';
        actionCells.forEach(cell => cell.style.display = '');

        inputsToConvert.forEach(input => {
            input.style.border = '';
            input.style.backgroundColor = '';
            input.style.color = '';
            input.style.minWidth = '';
        });
        
        document.body.style.backgroundColor = originalBgBody;
        content.style.backgroundColor = originalBgContainer;
        content.style.color = originalColorContainer;
        periodDisplay.style.color = originalColorPeriod;

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' para retrato, 'mm' para unidades, 'a4' para tamanho
        const imgWidth = 210; // Largura do A4 em mm
        const pageHeight = 297; // Altura do A4 em mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= -1) { // Ajustado para garantir que a última parte seja incluída
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('relatorio_leads.pdf');
    }

    // Event Listeners
    addCityBtn.addEventListener('click', () => addCityRow());
    saveDataBtn.addEventListener('click', saveData);
    loadDataBtn.addEventListener('click', loadData);
    generatePdfBtn.addEventListener('click', generatePdf);

    // Carregar dados ao iniciar (se existirem) ou popular com as cidades iniciais
    loadData();

    // Se mesmo após carregar do localStorage ainda não houver dados, adiciona as cidades iniciais.
    // Isso cobre o caso de primeiro acesso ou localStorage vazio.
    if (tableBody.children.length === 0) {
        initialCities.forEach(city => addCityRow(city));
    }
});
