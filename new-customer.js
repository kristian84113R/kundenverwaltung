/**
 * new-customer.js - Create/Edit Customer Page
 * Handles the form for creating and editing customers
 */

document.addEventListener('DOMContentLoaded', () => {
    const customerForm = document.getElementById("customerForm");

    if (!customerForm) return;

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("id");

    // Check if we are editing
    if (editId) {
        (async () => {
            const h1 = document.querySelector("h1");
            if (h1) h1.textContent = "Kunden bearbeiten";
            document.title = "Kunden bearbeiten";

            const submitBtn = customerForm.querySelector("button[type='submit']");
            if (submitBtn) submitBtn.textContent = "Änderungen speichern";

            try {
                const customer = await window.electronAPI.getCustomer(editId);
                if (customer) {
                    const nameInput = document.getElementById("name");
                    const locationInput = document.getElementById("location");
                    const phoneInput = document.getElementById("phone");
                    const emailInput = document.getElementById("email");

                    if (nameInput) nameInput.value = customer.name || "";
                    if (locationInput) locationInput.value = customer.location || "";
                    if (phoneInput) phoneInput.value = customer.phone || "";
                    if (emailInput) emailInput.value = customer.email || "";
                }
            } catch (err) {
                console.error("Error loading customer for edit:", err);
            }
        })();
    }

    customerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(customerForm);
        const name = formData.get("name");
        const location = formData.get("location");
        const phone = formData.get("phone");
        const email = formData.get("email");


        if (!name || !location) {
            alert("Bitte Name und Wohnort ausfüllen.");
            return;
        }

        // If editing, get existing data first to preserve other fields (like jobs, createdAt)
        let customerData = {};
        if (editId) {
            try {
                customerData = await window.electronAPI.getCustomer(editId) || {};
            } catch (err) {
                console.error("Error fetching existing customer data:", err);
            }
        }

        const newCustomer = {
            ...customerData, // Keep existing data (jobs, etc.)
            id: editId || Date.now().toString(),
            name,
            location,
            phone,
            email,
            createdAt: customerData.createdAt || new Date().toISOString(),
            photos: customerData.photos || [],
            jobs: customerData.jobs || []
        };

        try {
            await window.electronAPI.saveCustomer(newCustomer);
            // alert(editId ? "Kunde erfolgreich aktualisiert!" : "Kunde erfolgreich angelegt!");
            if (editId) {
                window.location.href = `./customer.html?id=${editId}`;
            } else {
                window.location.href = "./index.html";
            }
        } catch (err) {
            console.error("Fehler beim Speichern:", err);
            alert("Fehler beim Speichern des Kunden.");
        }
    });

    if (window.lucide) window.lucide.createIcons();
});
