/**
 * customer-detail.js - Customer Details Page
 * Handles displaying and managing customer information and orders
 */

import { formatDateGerman, formatPriceGerman, detectFileType, parseDateToTimestamp } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const customerId = params.get("id");

  // DOM Elements
  const customerNameEl = document.getElementById("customerName");
  const customerJoinedDateEl = document.getElementById("customerJoinedDate");
  const customerAddressEl = document.getElementById("customerAddress");
  const customerPhoneEl = document.getElementById("customerPhone");
  const customerEmailEl = document.getElementById("customerEmail");

  const jobsListEl = document.getElementById("jobsList");
  const addOrderBtn = document.getElementById("addOrderBtn");

  const openMapsBtn = document.getElementById("openMapsBtn");
  const deleteCustomerBtn = document.getElementById("deleteCustomerBtn");
  const editCustomerBtn = document.getElementById("editCustomerBtn");

  if (!window.electronAPI) {
    console.error("Electron API not found!");
    if (customerNameEl) customerNameEl.textContent = "Fehler: Electron API nicht verfügbar.";
    return;
  }

  if (!customerId) {
    if (customerNameEl) customerNameEl.textContent = "Kein Kunde ausgewählt";
    return;
  }

  // Add Order Button Listener
  if (addOrderBtn) {
    addOrderBtn.addEventListener("click", () => {
      window.location.href = `./order.html?id=${customerId}`;
    });
  }

  /**
   * Loads and renders customer data
   */
  async function loadCustomerDetail() {
    try {
      const data = await window.electronAPI.getCustomer(customerId);

      if (!data) {
        if (customerNameEl) customerNameEl.textContent = "Kunde nicht gefunden";
        return;
      }

      // Render Basic Info
      if (customerNameEl) customerNameEl.textContent = data.name || "(ohne Name)";

      if (customerJoinedDateEl) {
        const dateStr = formatDateGerman(data.createdAt);
        customerJoinedDateEl.textContent = dateStr ? `Kunde seit ${dateStr}` : "Kunde seit Unbekannt";
      }

      if (customerAddressEl) customerAddressEl.textContent = data.location || "Keine Adresse";
      if (customerPhoneEl) customerPhoneEl.textContent = data.phone || "Kein Telefon";

      if (customerEmailEl) {
        customerEmailEl.textContent = data.email || "Keine E-Mail";
        customerEmailEl.href = data.email ? `mailto:${data.email}` : "#";
        if (!data.email) customerEmailEl.classList.add("pointer-events-none", "text-slate-400");
        else customerEmailEl.classList.remove("pointer-events-none", "text-slate-400");
      }

      // Configure Maps Button
      if (openMapsBtn) {
        if (!data.location) {
          openMapsBtn.classList.add("opacity-50", "cursor-not-allowed");
          openMapsBtn.disabled = true;
        } else {
          openMapsBtn.classList.remove("opacity-50", "cursor-not-allowed");
          openMapsBtn.disabled = false;
          openMapsBtn.onclick = () => {
            const encoded = encodeURIComponent(data.location);
            window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
          };
        }
      }

      // Delete Button
      if (deleteCustomerBtn) {
        deleteCustomerBtn.onclick = async () => {
          if (confirm("Möchten Sie diesen Kunden wirklich unwiderruflich löschen?")) {
            try {
              await window.electronAPI.deleteCustomer(customerId);
              window.location.href = "./index.html";
            } catch (error) {
              console.error("Fehler beim Löschen:", error);
              alert("Fehler beim Löschen des Kunden.");
            }
          }
        };
      }

      // Edit Customer Button
      if (editCustomerBtn) {
        editCustomerBtn.onclick = () => {
          window.location.href = `./new-customer.html?id=${customerId}`;
        };
      }

      renderJobs(data.jobs || []);

      // Re-init icons
      if (window.lucide) window.lucide.createIcons();
    } catch (error) {
      console.error("Fehler in loadCustomerDetail:", error);
      if (customerNameEl) customerNameEl.textContent = "Fehler beim Laden der Daten.";
    }
  }

  /**
   * Renders the list of jobs/orders
   */
  function renderJobs(jobs) {
    if (!jobsListEl) return;
    if (!jobs.length) {
      jobsListEl.innerHTML = '<div class="text-center text-slate-400 py-4 italic">Noch keine Aufträge erfasst.</div>';
      return;
    }

    jobsListEl.innerHTML = jobs
      .map((job, index) => ({ job, index }))
      .sort((a, b) => {
        const dateA = parseDateToTimestamp(a.job.date);
        const dateB = parseDateToTimestamp(b.job.date);
        return dateB - dateA;
      })
      .map(({ job, index }) => {
        let date = "(ohne Datum)";
        if (job.date) {
          const ts = parseDateToTimestamp(job.date);
          if (ts !== 0) {
            date = formatDateGerman(new Date(ts));
          } else {
            date = job.date;
          }
        }

        const desc = job.description || "(ohne Beschreibung)";
        const price = job.price ? formatPriceGerman(job.price) : "";

        // Handle legacy pdfUrl and new files array
        let files = job.files || [];
        if (job.pdfUrl && !files.some(f => f.url === job.pdfUrl)) {
          files.push({
            name: job.pdfLabel || "PDF Dokument",
            url: job.pdfUrl,
            type: "application/pdf"
          });
        }

        let filesHtml = "";
        if (files.length > 0) {
          const images = [];
          const docs = [];

          files.forEach((file, fileIdx) => {
            const typeInfo = detectFileType(file.name, file.type);
            if (typeInfo.isImage) {
              images.push({ file, idx: fileIdx });
            } else {
              docs.push({ file, idx: fileIdx, icon: typeInfo.icon });
            }
          });

          filesHtml = `<div class="mt-4 space-y-4">`;

          // 1. Documents List (Text only)
          if (docs.length > 0) {
            filesHtml += `<div class="flex flex-col gap-1.5">`;
            docs.forEach(({ file, idx, icon }) => {
              filesHtml += `
                    <div class="group flex items-center gap-3 text-sm text-slate-600 bg-white border border-slate-200 rounded-md px-3 py-2 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer" onclick="window.openFilePreview('${file.url}', '${file.name}', '${file.type}')">
                        <i data-lucide="${icon}" class="w-4 h-4 text-slate-400 group-hover:text-blue-500"></i>
                        <span class="truncate font-medium text-slate-700 group-hover:text-blue-700">${file.name}</span>
                        <button onclick="event.stopPropagation(); removeFileFromJob(${index}, ${idx})" class="ml-auto opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Entfernen">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                 `;
            });
            filesHtml += `</div>`;
          }

          // 2. Images Grid (Beautifully visible)
          if (images.length > 0) {
            filesHtml += `<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">`;
            images.forEach(({ file, idx }) => {
              filesHtml += `
                    <div class="group relative aspect-[4/3] rounded-lg bg-slate-100 border border-slate-200 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all" onclick="window.openFilePreview('${file.url}', '${file.name}', '${file.type}')">
                        <img src="${file.url}" alt="${file.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                        <button type="button" onclick="event.stopPropagation(); removeFileFromJob(${index}, ${idx})" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white/90 text-red-600 rounded-full hover:bg-red-50 transition-all shadow-sm backdrop-blur-sm" title="Entfernen">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                 `;
            });
            filesHtml += `</div>`;
          }

          filesHtml += `</div>`;
        }

        return `
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm group hover:border-blue-300 transition-colors">
                    <div class="flex items-start gap-4 flex-grow min-w-0">
                        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0 mt-1">
                            <i data-lucide="clipboard-list" class="w-5 h-5"></i>
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-sm font-semibold text-slate-900">${date}</span>
                                ${price ? `<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">${price}</span>` : ''}
                            </div>
                            <div class="text-sm text-slate-600 break-words">${desc}</div>
                            ${filesHtml}
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2 self-end sm:self-start mt-1 shrink-0">
                        <button type="button" data-edit-job="${index}" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors">
                            Bearbeiten
                        </button>
                        <button type="button" data-delete-job="${index}" class="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-100 rounded-md hover:bg-red-50 hover:border-red-200 transition-colors">
                            Löschen
                        </button>
                    </div>
                </div>`;
      })
      .join("");

    // Re-attach listeners
    Array.from(jobsListEl.querySelectorAll("button[data-delete-job]"))
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm("Auftrag wirklich löschen?")) return;
          const idx = Number(btn.getAttribute("data-delete-job"));
          const data = await window.electronAPI.getCustomer(customerId) || {};
          const jobsCurrent = data.jobs || [];
          jobsCurrent.splice(idx, 1);
          await window.electronAPI.saveCustomer({ id: customerId, jobs: jobsCurrent });
          renderJobs(jobsCurrent);
          if (window.lucide) window.lucide.createIcons();
        });
      });

    Array.from(jobsListEl.querySelectorAll("button[data-edit-job]"))
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const idx = Number(btn.getAttribute("data-edit-job"));
          window.location.href = `./order.html?id=${customerId}&jobIndex=${idx}`;
        });
      });

    if (window.lucide) window.lucide.createIcons();
  }

  // Global function for removing files
  window.removeFileFromJob = async (jobIndex, fileIndex) => {
    if (!confirm("Datei wirklich entfernen?")) return;
    const data = await window.electronAPI.getCustomer(customerId) || {};
    const jobs = data.jobs || [];

    if (jobs[jobIndex]) {
      if (!jobs[jobIndex].files && jobs[jobIndex].pdfUrl) {
        jobs[jobIndex].files = [{
          name: jobs[jobIndex].pdfLabel || "PDF Dokument",
          url: jobs[jobIndex].pdfUrl,
          type: "application/pdf"
        }];
        jobs[jobIndex].pdfUrl = null;
      }

      if (jobs[jobIndex].files && jobs[jobIndex].files[fileIndex]) {
        jobs[jobIndex].files.splice(fileIndex, 1);
        await window.electronAPI.saveCustomer({ id: customerId, jobs });
        renderJobs(jobs);
      }
    }
  };

  // Modal Elements
  const modal = document.getElementById("filePreviewModal");
  const closeBtn = document.getElementById("closePreviewBtn");
  const openInWordBtn = document.getElementById("openInWordBtn");
  const previewFrame = document.getElementById("previewFrame");
  const previewImage = document.getElementById("previewImage");
  const previewWord = document.getElementById("previewWord");
  const wordContent = document.getElementById("wordContent");
  const previewTitle = document.getElementById("previewTitle");
  const previewError = document.getElementById("previewError");
  const openExternalBtn = document.getElementById("openExternalBtn");

  // Close Modal Logic
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.add("hidden");
      previewFrame.src = "";
      previewImage.src = "";
      if (wordContent) wordContent.innerHTML = "";
    };
  }
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeBtn.click();
    };
  }

  // Global function for opening files
  window.openFilePreview = async (url, name, type) => {
    const { isPdf, isImage, isWord } = detectFileType(name, type);

    if (modal) {
      modal.classList.remove("hidden");
      previewTitle.textContent = name;

      // Hide all preview types first
      previewFrame.classList.add("hidden");
      previewImage.classList.add("hidden");
      if (previewWord) previewWord.classList.add("hidden");
      previewError.classList.add("hidden");

      // Show/hide "Open in Word" button
      if (openInWordBtn) {
        if (isWord) {
          openInWordBtn.classList.remove("hidden");
          openInWordBtn.onclick = () => window.electronAPI.openFile(url);
        } else {
          openInWordBtn.classList.add("hidden");
        }
      }

      if (isPdf) {
        previewFrame.src = url;
        previewFrame.classList.remove("hidden");
      } else if (isImage) {
        previewImage.src = url;
        previewImage.classList.remove("hidden");
      } else if (isWord && window.mammoth) {
        // Word document preview
        try {
          if (previewWord && wordContent) {
            wordContent.innerHTML = '<div class="text-center py-8 text-slate-500">Lade Word-Dokument...</div>';
            previewWord.classList.remove("hidden");

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();

            const result = await mammoth.convertToHtml({ arrayBuffer });
            wordContent.innerHTML = result.value;
          } else {
            throw new Error("Word preview not available");
          }
        } catch (err) {
          console.error("Error loading Word document:", err);
          if (wordContent) wordContent.innerHTML = '<div class="text-center py-8 text-red-600">Fehler beim Laden des Dokuments</div>';
        }
      } else {
        previewError.classList.remove("hidden");
      }

      // Setup external open button
      if (openExternalBtn) {
        openExternalBtn.onclick = () => window.electronAPI.openFile(url);
      }
    }
  };

  // Initial Load
  loadCustomerDetail().catch((error) => {
    console.error("Fehler beim Laden der Kundendetails:", error);
    if (customerNameEl) customerNameEl.textContent = "Fehler beim Laden der Kundendaten";
  });
});
