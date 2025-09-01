// Importa jspdf para ser acessível globalmente (se não estiver já global pelo UMD)
const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('cities-table-body');
    const addCityBtn = document.getElementById('add-city-btn');
    const saveDataBtn = document.getElementById('save-data-btn');
    const loadDataBtn = document.getElementById('load-data-btn');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const periodInput = document.getElementById('period-input');
    const tableHeaders = document.querySelectorAll('th.sortable');

    let citiesData = [];

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
            <td><input type="number" class="current-followers" value="${city.currentFollowers || ''}" min="0"></td>
            <td class="calculated-cost-per-follower">${formatCurrency(city.costPerNewFollower)}</td>
            <td><button class="remove-btn">Remover</button></td>
        `;

        // Adicionar listeners para cálculo e remoção
        const inputs = newRow.querySelectorAll('input[type="number"]');
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
        } else if (newFollowers < 0) { // Considerar custo infinito ou um valor negativo para perdas
            costPerNewFollower = investedValue / newFollowers; // Custo negativo
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
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    // Função para remover uma linha da tabela
    function removeCityRow(row) {
        row.remove();
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
        localStorage.setItem('periodOfAnalysis', periodInput.value);
        alert('Dados salvos com sucesso!');
    }

    // Função para carregar dados do localStorage
    function loadData() {
        const savedData = localStorage.getItem('citiesData');
        const savedPeriod = localStorage.getItem('periodOfAnalysis');

        if (savedData) {
            citiesData = JSON.parse(savedData);
            tableBody.innerHTML = ''; // Limpa a tabela atual
            citiesData.forEach(city => addCityRow(city));
            alert('Dados carregados com sucesso!');
        } else {
            alert('Nenhum dado salvo encontrado.');
        }

        if (savedPeriod) {
            periodInput.value = savedPeriod;
        }
    }

    // Função de ordenação
    function sortTable(columnIndex, type) {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        const isAscending = tableHeaders[columnIndex].classList.contains('asc');

        rows.sort((rowA, rowB) => {
            let valueA, valueB;

            // Para custo por novo seguidor, remover "R$" e substituir "," por "."
            if (type === 'currency') {
                valueA = rowA.children[columnIndex].textContent.replace('R$ ', '').replace(',', '.');
                valueB = rowB.children[columnIndex].textContent.replace('R$ ', '').replace(',', '.');
                if (valueA === '∞') valueA = Infinity;
                if (valueB === '∞') valueB = Infinity;
                valueA = parseFloat(valueA);
                valueB = parseFloat(valueB);
            } else { // Para números inteiros (Seguidores Atuais, Seguidores Novos)
                valueA = parseInt(rowA.children[columnIndex].querySelector('input').value) || 0;
                valueB = parseInt(rowB.children[columnIndex].querySelector('input').value) || 0;
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
            tableHeaders[columnIndex].classList.add('desc');
        } else {
            tableHeaders[columnIndex].classList.add('asc');
        }
    }

    // Adiciona event listeners para os cabeçalhos de ordenação
    tableHeaders.forEach((header, index) => {
        header.addEventListener('click', () => {
            // Determine the column index for sorting based on data-sort attribute
            const sortKey = header.dataset.sort;
            let colIndex;
            let sortType = 'number';

            switch(sortKey) {
                case 'seguidoresNovos':
                    colIndex = 6;
                    break;
                case 'seguidoresAtuais':
                    colIndex = 7;
                    break;
                case 'custoPorNovoSeguidor':
                    colIndex = 8;
                    sortType = 'currency';
                    break;
                default:
                    return; // Not a sortable column according to our logic
            }
            sortTable(colIndex, sortType);
        });
    });


    // Função para gerar PDF
    async function generatePdf() {
        // Salva os dados antes de gerar o PDF para garantir que o conteúdo está atualizado
        saveData();

        const content = document.getElementById('pdf-content');
        const originalBg = document.body.style.backgroundColor; // Salva o background original
        document.body.style.backgroundColor = 'white'; // Temporariamente muda para branco para o PDF

        // Adiciona um estilo para o PDF ser mais legível, se necessário (ex: mudar cor da fonte para preto)
        // Isso pode ser mais complexo, html2canvas renderiza o que vê.
        // Para a tabela, o CSS já deve dar conta.
        
        // Remove os botões de ação e a coluna de ações para o PDF
        const removeButtons = document.querySelectorAll('.remove-btn');
        removeButtons.forEach(btn => btn.style.display = 'none');
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
        });
        
        // Garante que o período de análise é visível
        periodInput.style.color = 'black';


        // Captura o conteúdo
        const canvas = await html2canvas(content, { 
            scale: 2, // Melhor qualidade
            useCORS: true, // Se houver imagens externas
            windowWidth: content.scrollWidth,
            windowHeight: content.scrollHeight,
            onclone: (document) => {
                // Aqui podemos fazer ajustes no DOM clonado antes de renderizar
                // Ex: Garantir que o texto dos inputs aparece
                const clonedInputs = document.getElementById('pdf-content').querySelectorAll('input');
                clonedInputs.forEach(input => {
                    input.setAttribute('value', input.value);
                    input.style.border = 'none';
                    input.style.backgroundColor = 'transparent';
                    input.style.color = 'black';
                });
                // Esconde botões no clone
                const clonedButtons = document.getElementById('pdf-content').querySelectorAll('.controls button');
                clonedButtons.forEach(btn => btn.style.display = 'none');
                
                const clonedActionHeader = document.getElementById('pdf-content').querySelector('th:last-child');
                if (clonedActionHeader) clonedActionHeader.style.display = 'none';
                const clonedActionCells = document.getElementById('pdf-content').querySelectorAll('td:last-child');
                clonedActionCells.forEach(cell => cell.style.display = 'none');

                // Garante que o período de análise é visível
                const clonedPeriodInput = document.getElementById('pdf-content').querySelector('#period-input');
                if (clonedPeriodInput) clonedPeriodInput.style.color = 'black';

                // Altera o background do corpo no clone
                document.body.style.backgroundColor = 'white';
                const clonedContainer = document.getElementById('pdf-content');
                if (clonedContainer) {
                    clonedContainer.style.backgroundColor = 'white';
                    clonedContainer.style.color = 'black'; // Garante texto preto no container
                }
                 const clonedH1 = document.getElementById('pdf-content').querySelector('h1');
                 if (clonedH1) clonedH1.style.color = '#DC2626'; // Mantém o título vermelho
            }
        });

        // Restaura as exibições dos botões e colunas
        removeButtons.forEach(btn => btn.style.display = '');
        if (actionHeader) actionHeader.style.display = '';
        actionCells.forEach(cell => cell.style.display = '');

        // Restaura os estilos dos inputs
        inputsToConvert.forEach(input => {
            input.style.border = '';
            input.style.backgroundColor = '';
            input.style.color = '';
        });
        periodInput.style.color = '';
        document.body.style.backgroundColor = originalBg; // Restaura o background original

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' para retrato, 'mm' para unidades, 'a4' para tamanho
        const imgWidth = 210; // Largura do A4 em mm
        const pageHeight = 297; // Altura do A4 em mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
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

    // Carregar dados ao iniciar (se existirem)
    loadData();

    // Adiciona uma linha vazia se não houver dados carregados
    if (citiesData.length === 0) {
        addCityRow();
    }
});
