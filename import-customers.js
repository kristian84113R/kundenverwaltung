/**
 * import-customers.js - PDF Invoice Import Page
 * Handles PDF file selection, parsing, preview, and customer creation
 */

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    const loadingState = document.getElementById('loadingState');
    const previewSection = document.getElementById('previewSection');
    const customersTableBody = document.getElementById('customersTableBody');
    const customerCount = document.getElementById('customerCount');
    const selectedCount = document.getElementById('selectedCount');
    const selectAllCheckbox = document.getElementById('selectAll');
    const clearBtn = document.getElementById('clearBtn');
    const importBtn = document.getElementById('importBtn');
    const successToast = document.getElementById('successToast');
    const successMessage = document.getElementById('successMessage');
    const warningToast = document.getElementById('warningToast');
    const warningMessage = document.getElementById('warningMessage');

    // Store parsed customers
    let parsedCustomers = [];
    let existingCustomerNames = new Set();

    // Load existing customers to detect duplicates
    async function loadExistingCustomers() {
        try {
            const customers = await window.electronAPI.loadCustomers();
            existingCustomerNames = new Set(customers.map(c => c.name.toLowerCase().trim()));
        } catch (err) {
            console.error('Error loading existing customers:', err);
        }
    }

    // Initialize
    loadExistingCustomers();

    // File selection via button
    selectFilesBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await selectAndParsePdfs();
    });

    // File selection via drop zone click
    dropZone.addEventListener('click', async () => {
        await selectAndParsePdfs();
    });

    // Select and parse PDF files
    async function selectAndParsePdfs() {
        try {
            const result = await window.electronAPI.selectPdfFiles();

            if (!result.success) {
                console.error('Error selecting files:', result.error);
                return;
            }

            if (result.files.length === 0) {
                return; // User cancelled
            }

            // Show loading state
            dropZone.classList.add('hidden');
            loadingState.classList.remove('hidden');

            // Parse each PDF
            parsedCustomers = [];

            for (const filePath of result.files) {
                const parseResult = await window.electronAPI.parseInvoicePdf(filePath);

                if (parseResult.success) {
                    const isDuplicate = existingCustomerNames.has(
                        parseResult.customer.name.toLowerCase().trim()
                    );

                    parsedCustomers.push({
                        ...parseResult.customer,
                        job: parseResult.job,  // Include job data
                        fileName: parseResult.fileName,
                        filePath: parseResult.filePath,
                        isDuplicate: isDuplicate,
                        selected: !isDuplicate // Pre-select non-duplicates
                    });
                } else {
                    parsedCustomers.push({
                        name: '',
                        location: '',
                        phone: '',
                        email: '',
                        job: null,
                        fileName: filePath.split(/[\\/]/).pop(),
                        filePath: filePath,
                        error: parseResult.error,
                        isDuplicate: false,
                        selected: false
                    });
                }
            }

            // Hide loading, show preview
            loadingState.classList.add('hidden');
            dropZone.classList.remove('hidden');

            renderPreviewTable();
            previewSection.classList.remove('hidden');

        } catch (err) {
            console.error('Error processing PDFs:', err);
            loadingState.classList.add('hidden');
            dropZone.classList.remove('hidden');
        }
    }

    // Render the preview table
    function renderPreviewTable() {
        customersTableBody.innerHTML = '';

        parsedCustomers.forEach((customer, index) => {
            const row = document.createElement('tr');
            row.className = customer.isDuplicate ? 'bg-amber-50' : '';

            let statusBadge = '';
            if (customer.error) {
                statusBadge = `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <i data-lucide="x-circle" class="w-3 h-3 mr-1"></i>Fehler
                </span>`;
            } else if (customer.isDuplicate) {
                statusBadge = `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <i data-lucide="alert-triangle" class="w-3 h-3 mr-1"></i>Duplikat
                </span>`;
            } else {
                statusBadge = `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <i data-lucide="check-circle" class="w-3 h-3 mr-1"></i>Neu
                </span>`;
            }

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" 
                           data-index="${index}" 
                           class="customer-checkbox rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                           ${customer.selected ? 'checked' : ''}
                           ${customer.error ? 'disabled' : ''}>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${escapeHtml(customer.fileName)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${escapeHtml(customer.name) || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">${escapeHtml(customer.location) || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">${escapeHtml(customer.phone) || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">${escapeHtml(customer.email) || '-'}</td>
            `;

            customersTableBody.appendChild(row);
        });

        // Re-create Lucide icons for the new elements
        if (window.lucide) window.lucide.createIcons();

        updateCounts();
        attachCheckboxListeners();
    }

    // Escape HTML to prevent XSS
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Update counts
    function updateCounts() {
        const total = parsedCustomers.filter(c => !c.error).length;
        const selected = parsedCustomers.filter(c => c.selected && !c.error).length;

        customerCount.textContent = `${total} Kunde${total !== 1 ? 'n' : ''} gefunden`;
        selectedCount.textContent = selected;

        importBtn.disabled = selected === 0;
    }

    // Attach checkbox event listeners
    function attachCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.customer-checkbox');

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                parsedCustomers[index].selected = e.target.checked;
                updateCounts();
                updateSelectAllState();
            });
        });
    }

    // Select all checkbox
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;

        parsedCustomers.forEach((customer, index) => {
            if (!customer.error) {
                customer.selected = isChecked;
            }
        });

        renderPreviewTable();
    });

    // Update select all checkbox state
    function updateSelectAllState() {
        const validCustomers = parsedCustomers.filter(c => !c.error);
        const selectedCustomers = validCustomers.filter(c => c.selected);

        selectAllCheckbox.checked = validCustomers.length > 0 &&
            selectedCustomers.length === validCustomers.length;
        selectAllCheckbox.indeterminate = selectedCustomers.length > 0 &&
            selectedCustomers.length < validCustomers.length;
    }

    // Clear / Reset
    clearBtn.addEventListener('click', () => {
        parsedCustomers = [];
        previewSection.classList.add('hidden');
        customersTableBody.innerHTML = '';
        updateCounts();
    });

    // Import selected customers
    importBtn.addEventListener('click', async () => {
        const toImport = parsedCustomers.filter(c => c.selected && !c.error && c.name);

        if (toImport.length === 0) return;

        let successCount = 0;
        let skipCount = 0;

        for (const customer of toImport) {
            // Double-check for duplicates (in case new customers were added)
            const customers = await window.electronAPI.loadCustomers();
            const existingNames = new Set(customers.map(c => c.name.toLowerCase().trim()));

            if (existingNames.has(customer.name.toLowerCase().trim())) {
                skipCount++;
                continue;
            }

            const newCustomer = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: customer.name,
                location: customer.location,
                phone: customer.phone,
                email: customer.email,
                createdAt: new Date().toISOString(),
                photos: [],
                jobs: []
            };

            try {
                // Copy PDF to storage
                let pdfFile = null;
                if (customer.filePath && customer.fileName) {
                    const copyResult = await window.electronAPI.copyPdfToStorage({
                        sourcePath: customer.filePath,
                        fileName: customer.fileName
                    });
                    if (copyResult.success) {
                        pdfFile = {
                            name: copyResult.name,
                            url: copyResult.url,
                            type: 'application/pdf'
                        };
                    }
                }

                // Create job from invoice data
                if (customer.job) {
                    const job = {
                        date: customer.job.date || new Date().toISOString().slice(0, 10),
                        description: customer.job.description || 'Importierte Rechnung',
                        price: customer.job.price,
                        files: pdfFile ? [pdfFile] : [],
                        pdfUrl: null,
                        pdfLabel: null
                    };
                    newCustomer.jobs.push(job);
                }

                await window.electronAPI.saveCustomer(newCustomer);
                successCount++;

                // Update existing names set
                existingCustomerNames.add(customer.name.toLowerCase().trim());

                // Small delay to ensure unique IDs
                await new Promise(resolve => setTimeout(resolve, 10));
            } catch (err) {
                console.error('Error saving customer:', err);
            }
        }

        // Show appropriate toast
        if (skipCount > 0) {
            warningMessage.textContent = `${successCount} Kunde${successCount !== 1 ? 'n' : ''} importiert, ${skipCount} Duplikat${skipCount !== 1 ? 'e' : ''} übersprungen.`;
            showToast(warningToast);
        } else {
            successMessage.textContent = `${successCount} Kunde${successCount !== 1 ? 'n' : ''} erfolgreich importiert!`;
            showToast(successToast);
        }

        // Reset view after successful import
        parsedCustomers = [];
        previewSection.classList.add('hidden');
        customersTableBody.innerHTML = '';

        // Reload existing customers
        await loadExistingCustomers();
    });

    // Show toast notification
    function showToast(toastElement) {
        toastElement.classList.remove('hidden');

        setTimeout(() => {
            toastElement.classList.add('hidden');
        }, 4000);
    }

    // Initialize Lucide icons
    if (window.lucide) window.lucide.createIcons();
});
