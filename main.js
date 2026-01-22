// main.js - Electron Version

const customerListEl = document.getElementById("card-grid");
const searchInput = document.getElementById("searchInput");
const customerSort = document.getElementById("customerSort");
const yearFilter = document.getElementById("yearFilter");

// Initial load
if (customerListEl) {
  loadCustomers();
}

// Search listener
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    filterCustomers(term);
  });
}

// Sort listener
if (customerSort) {
  customerSort.addEventListener("change", () => {
    loadCustomers();
  });
}

// Year filter listener
if (yearFilter) {
  yearFilter.addEventListener("change", () => {
    loadCustomers();
  });
}

/**
 * Extracts year from a date string
 * @param {string} dateStr - Date in YYYY-MM-DD or DD.MM.YYYY format
 * @returns {number|null} Year or null if invalid
 */
function getYearFromDate(dateStr) {
  if (!dateStr) return null;
  // Handle YYYY-MM-DD format
  if (dateStr.includes('-')) {
    const year = parseInt(dateStr.split('-')[0]);
    return isNaN(year) ? null : year;
  }
  // Handle DD.MM.YYYY or DD.MM.YY format
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      let year = parseInt(parts[2]);
      if (isNaN(year)) return null;
      if (year < 100) year += 2000;
      return year;
    }
  }
  return null;
}

/**
 * Gets all years from a customer's jobs
 * @param {Object} customer - Customer object with jobs array
 * @returns {Set<number>} Set of years
 */
function getCustomerYears(customer) {
  const years = new Set();
  if (customer.jobs && Array.isArray(customer.jobs)) {
    customer.jobs.forEach(job => {
      const year = getYearFromDate(job.date);
      if (year) years.add(year);
    });
  }
  return years;
}

/**
 * Populates the year filter dropdown with available years
 * @param {Array} customers - Array of customer objects
 */
function populateYearFilter(customers) {
  if (!yearFilter) return;

  // Collect all years from all customers' jobs
  const allYears = new Set();
  customers.forEach(customer => {
    const customerYears = getCustomerYears(customer);
    customerYears.forEach(year => allYears.add(year));
  });

  // Sort years descending (newest first)
  const sortedYears = Array.from(allYears).sort((a, b) => b - a);

  // Save current selection
  const currentValue = yearFilter.value;

  // Clear and rebuild options
  yearFilter.innerHTML = '<option value="">Alle Jahre</option>';
  sortedYears.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });

  // Restore selection if still valid
  if (currentValue && sortedYears.includes(parseInt(currentValue))) {
    yearFilter.value = currentValue;
  }
}

/**
 * Loads customers from the local JSON file via Electron Bridge.
 */
export async function loadCustomers() {
  if (!customerListEl) return;
  customerListEl.innerHTML = "<p class='col-span-full text-center text-slate-500'>Lade Kunden...</p>";

  try {
    // Use the Bridge!
    const customers = await window.electronAPI.loadCustomers();

    // Populate year filter with available years
    populateYearFilter(customers);

    customerListEl.innerHTML = "";

    // "Add Customer" Card
    const fragments = document.createDocumentFragment();
    const newCustomerBtn = document.createElement("button");
    newCustomerBtn.className = "group relative flex flex-col items-center justify-center p-6 h-full min-h-[240px] border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-white new-customer-card";
    newCustomerBtn.innerHTML = `
        <div class="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center mb-4 transition-colors">
            <i data-lucide="plus" class="w-6 h-6 text-slate-500 group-hover:text-blue-600"></i>
        </div>
        <span class="text-sm font-semibold text-slate-900 group-hover:text-blue-700">Neuen Kunden anlegen</span>
        <span class="text-xs text-slate-500 mt-1 group-hover:text-blue-600/70">Fügen Sie einen neuen Datensatz hinzu</span>
    `;
    newCustomerBtn.addEventListener("click", () => {
      window.location.href = "./new-customer.html";
    });
    fragments.appendChild(newCustomerBtn);

    // Apply year filter
    const selectedYear = yearFilter ? yearFilter.value : "";
    let filteredCustomers = customers;

    if (selectedYear) {
      const yearNum = parseInt(selectedYear);
      filteredCustomers = customers.filter(customer => {
        const customerYears = getCustomerYears(customer);
        return customerYears.has(yearNum);
      });
    }

    if (filteredCustomers.length === 0) {
      // Just the "Add" card
      customerListEl.appendChild(fragments);
      lucide.createIcons();
      return;
    }

    // Sort based on dropdown selection
    const sortValue = customerSort ? customerSort.value : "Neueste zuerst";

    filteredCustomers.sort((a, b) => {
      if (sortValue === "Alphabetisch (A-Z)") {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        return nameA.localeCompare(nameB, 'de-DE', { sensitivity: 'base' });
      } else if (sortValue === "Älteste zuerst") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      } else {
        // Default: Neueste zuerst
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
    });

    filteredCustomers.forEach((data) => {
      const card = document.createElement("div");
      card.className = "group bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between h-full min-h-[240px] customer-card relative";
      // Store name for search filtering
      card.dataset.name = (data.name || "").toLowerCase();

      card.innerHTML = `
        <div>
            <div class="flex items-start justify-between mb-4 relative">
                 <h3 class="text-base font-semibold text-slate-900 mb-1">${data.name || "(Ohne Name)"}</h3>
                 <div class="relative">
                    <button class="menu-btn text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 transition-colors">
                        <i data-lucide="more-horizontal" class="w-5 h-5"></i>
                    </button>
                    <!-- Dropdown Menu -->
                    <div class="menu-dropdown hidden absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                        <button class="edit-action w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg flex items-center gap-2">
                            <i data-lucide="pencil" class="w-4 h-4"></i> Bearbeiten
                        </button>
                        <button class="delete-action w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg flex items-center gap-2">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Löschen
                        </button>
                    </div>
                 </div>
            </div>

            <div class="space-y-2">
                <div class="flex items-center gap-3 text-sm text-slate-600">
                    <i data-lucide="map-pin" class="w-4 h-4 text-slate-400 shrink-0"></i>
                    <span class="truncate">${data.location || "Kein Ort"}</span>
                </div>
                <div class="flex items-center gap-3 text-sm text-slate-600">
                    <i data-lucide="mail" class="w-4 h-4 text-slate-400 shrink-0"></i>
                    <span class="truncate">${data.email || "Keine E-Mail"}</span>
                </div>
                <div class="flex items-center gap-3 text-sm text-slate-600">
                    <i data-lucide="phone" class="w-4 h-4 text-slate-400 shrink-0"></i>
                    <span class="truncate">${data.phone || "Kein Telefon"}</span>
                </div>
            </div>
        </div>
        
        <div class="mt-6 pt-4 border-t border-slate-100">
            <button class="details-btn w-full py-2 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
                Details
            </button>
        </div>
      `;

      // Event Listeners
      const menuBtn = card.querySelector('.menu-btn');
      const dropdown = card.querySelector('.menu-dropdown');
      const editAction = card.querySelector('.edit-action');
      const deleteAction = card.querySelector('.delete-action');
      const detailsBtn = card.querySelector('.details-btn');

      // Toggle Dropdown
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close all other open dropdowns first
        document.querySelectorAll('.menu-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
      });

      // Edit Action
      editAction.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `./new-customer.html?id=${data.id}`;
      });

      // Delete Action
      deleteAction.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Möchten Sie den Kunden "${data.name}" wirklich löschen?`)) {
          try {
            await window.electronAPI.deleteCustomer(data.id);
            loadCustomers(); // Reload list
          } catch (err) {
            console.error("Fehler beim Löschen:", err);
            alert("Fehler beim Löschen des Kunden.");
          }
        }
      });

      // Details Button
      detailsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `./customer.html?id=${data.id}`;
      });

      // Card Click (Details)
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking inside dropdown
        if (dropdown.contains(e.target)) return;
        window.location.href = `./customer.html?id=${data.id}`;
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });

      fragments.appendChild(card);
    });

    customerListEl.appendChild(fragments);
    lucide.createIcons(); // Re-init icons for new elements
  } catch (error) {
    console.error("Fehler beim Laden:", error);
    customerListEl.innerHTML = "<p class='col-span-full text-center text-red-500'>Fehler beim Laden der Daten.</p>";
  }
}

function filterCustomers(term) {
  const cards = document.querySelectorAll(".customer-card");
  cards.forEach((card) => {
    if (card.classList.contains("new-customer-card")) return; // Always show "Add" card
    const name = card.dataset.name || "";
    if (name.includes(term)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

