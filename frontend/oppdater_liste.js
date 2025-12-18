const API_URL = "/rentals";

// Load list when page opens
async function loadRentals() {
    const res = await fetch(API_URL);
    const rentals = await res.json();

    const list = document.getElementById("liste");
    list.innerHTML = "";

    rentals.forEach(r => {
        const row = document.createElement("div");
        row.style.display = "flex";

        row.innerHTML = `
            <h5 style="width:150px">${r.student_name}</h5>
            <h5 style="width:100px">${r.pc_number}</h5>
            <h5 style="width:150px">${r.rented_date}</h5>
            <h5 style="width:150px">${r.return_date}</h5>
        `;

        list.appendChild(row);
    });
}

// Add new rental
async function addRental() {
    const data = {
        student_name: document.getElementById("navn").value,
        pc_number: document.getElementById("pc_nummer").value,
        rented_date: document.getElementById("dato_lånt").value,
        return_date: document.getElementById("leverings_dato").value
    };

    await fetch(API_URL, {
        method: "POST",
        headers: { "content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    window.location.href = "/";
}

// Auto-load list
if (document.getElementById("liste")) {
    loadRentals();
}