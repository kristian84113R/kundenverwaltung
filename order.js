/**
 * order.js - Order Management
 * Handles creating and editing customer orders
 */

import { detectFileType } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get("id");
    const jobIndex = params.get("jobIndex");

    // DOM Elements
    const backBtn = document.getElementById("backBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const pageTitle = document.getElementById("pageTitle");
    const orderForm = document.getElementById("orderForm");
    const saveBtnText = document.getElementById("saveBtnText");

    const jobDateInput = document.getElementById("jobDate");
    const jobPriceInput = document.getElementById("jobPrice");
    const jobDescriptionInput = document.getElementById("jobDescription");
    const jobFilesInput = document.getElementById("jobFiles");

    const existingFilesList = document.getElementById("existingFilesList");
    const filesContainer = document.getElementById("filesContainer");

    // Validation
    if (!window.electronAPI) {
        alert("Electron API nicht verfügbar!");
        return;
    }

    if (!customerId) {
        alert("Keine Kunden-ID übergeben!");
        window.location.href = "./index.html";
        return;
    }

    // Setup Navigation
    const backUrl = `./customer.html?id=${customerId}`;
    backBtn.href = backUrl;
    cancelBtn.addEventListener("click", () => {
        window.location.href = backUrl;
    });

    // Load Customer Data
    let customerData = null;
    try {
        customerData = await window.electronAPI.getCustomer(customerId);
    } catch (err) {
        console.error("Fehler beim Laden des Kunden:", err);
        alert("Fehler beim Laden der Kundendaten.");
        window.location.href = "./index.html";
        return;
    }

    if (!customerData) {
        alert("Kunde nicht gefunden!");
        window.location.href = "./index.html";
        return;
    }

    // If Editing, Pre-fill Data
    let isEditing = false;
    let currentFiles = []; // Store existing files here

    if (jobIndex !== null && jobIndex !== "") {
        const idx = parseInt(jobIndex, 10);
        if (!isNaN(idx) && customerData.jobs && customerData.jobs[idx]) {
            isEditing = true;
            const job = customerData.jobs[idx];

            pageTitle.textContent = "Auftrag bearbeiten";
            saveBtnText.textContent = "Änderungen speichern";

            jobDateInput.value = job.date || "";
            jobPriceInput.value = job.price || "";
            jobDescriptionInput.value = job.description || "";

            // Handle legacy pdfUrl migration for display
            if (!job.files && job.pdfUrl) {
                currentFiles = [{
                    name: job.pdfLabel || "PDF Dokument",
                    url: job.pdfUrl,
                    type: "application/pdf"
                }];
            } else {
                currentFiles = job.files || [];
            }

            renderExistingFiles();
        }
    } else {
        // Set default date to today for new orders
        jobDateInput.value = new Date().toISOString().slice(0, 10);
    }

    /**
     * Renders the list of existing files
     */
    function renderExistingFiles() {
        if (currentFiles.length > 0) {
            existingFilesList.classList.remove("hidden");
            filesContainer.innerHTML = "";

            currentFiles.forEach((file, index) => {
                const { icon } = detectFileType(file.name, file.type);

                const div = document.createElement("div");
                div.className = "flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100";
                div.innerHTML = `
                    <i data-lucide="${icon}" class="w-4 h-4 text-slate-400 shrink-0"></i>
                    <span class="truncate flex-grow text-xs font-medium min-w-0" title="${file.name}">${file.name}</span>
                    <button type="button" class="text-slate-400 hover:text-red-600 transition-colors p-1 remove-file-btn shrink-0" title="Datei entfernen">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                `;

                div.querySelector(".remove-file-btn").addEventListener("click", () => {
                    if (confirm("Datei wirklich entfernen? (Wird beim Speichern übernommen)")) {
                        currentFiles.splice(index, 1);
                        renderExistingFiles();
                    }
                });

                filesContainer.appendChild(div);
            });
            if (window.lucide) window.lucide.createIcons();
        } else {
            existingFilesList.classList.add("hidden");
        }
    }

    // New File Selection Preview
    jobFilesInput.addEventListener("change", () => {
        const newFilesContainer = document.getElementById("newFilesPreview") || document.createElement("div");
        newFilesContainer.id = "newFilesPreview";
        newFilesContainer.className = "mt-4 space-y-2";

        // Insert after input wrapper if not exists
        if (!document.getElementById("newFilesPreview")) {
            jobFilesInput.closest(".md\\:col-span-3").appendChild(newFilesContainer);
        }

        newFilesContainer.innerHTML = "";

        if (jobFilesInput.files && jobFilesInput.files.length > 0) {
            const title = document.createElement("h4");
            title.className = "text-sm font-medium text-slate-700 mb-2";
            title.textContent = "Neu ausgewählt (wird beim Speichern hochgeladen):";
            newFilesContainer.appendChild(title);

            Array.from(jobFilesInput.files).forEach(file => {
                const { icon } = detectFileType(file.name, file.type);

                const div = document.createElement("div");
                div.className = "flex items-center gap-2 text-sm text-slate-600 bg-blue-50 p-2 rounded-md border border-blue-100";
                div.innerHTML = `
                    <i data-lucide="${icon}" class="w-4 h-4 text-blue-400 shrink-0"></i>
                    <span class="truncate flex-grow text-xs font-medium min-w-0" title="${file.name}">${file.name}</span>
                `;
                newFilesContainer.appendChild(div);
            });
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Form Submission
    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const date = jobDateInput.value;
        const price = jobPriceInput.value ? parseFloat(jobPriceInput.value) : null;
        const description = jobDescriptionInput.value.trim();

        if (!description) {
            alert("Bitte eine Beschreibung eingeben.");
            return;
        }

        // Process New Files
        const newFiles = [];
        if (jobFilesInput.files && jobFilesInput.files.length > 0) {
            for (const file of Array.from(jobFilesInput.files)) {
                try {
                    const buffer = await file.arrayBuffer();
                    const url = await window.electronAPI.saveFile({
                        name: file.name,
                        buffer: buffer
                    });
                    newFiles.push({
                        name: file.name,
                        url: url,
                        type: file.type
                    });
                } catch (err) {
                    console.error("Fehler beim Upload:", err);
                    alert(`Fehler beim Laden von ${file.name}`);
                }
            }
        }

        // Combine existing and new files
        const finalFiles = [...currentFiles, ...newFiles];

        const jobData = {
            date,
            description,
            price,
            files: finalFiles,
            pdfUrl: null, // Clean up legacy
            pdfLabel: null
        };

        // Update Customer Data
        if (!customerData.jobs) customerData.jobs = [];

        if (isEditing) {
            const idx = parseInt(jobIndex, 10);
            customerData.jobs[idx] = jobData;
        } else {
            customerData.jobs.push(jobData);
        }

        try {
            await window.electronAPI.saveCustomer(customerData);
            window.location.href = backUrl;
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
            alert("Fehler beim Speichern des Auftrags.");
        }
    });

    if (window.lucide) window.lucide.createIcons();
});
