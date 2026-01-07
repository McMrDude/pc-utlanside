const API_URL = "/rentals";

// Load list when page opens
async function loadRentals() {
    const today = new Date();
    today.setHours(0,0,0,0);

    const res = await fetch(API_URL);
    const rentals = await res.json();

    const list = document.getElementById("listDiv");
    list.innerHTML = "";

    const headers = [`<h4>Status</h4>`,
                    `<h4>Elev navn</h4>`,
                    `<h4>PC nummer</h4>`,
                    `<h4>Dato lånet</h4>`,
                    `<h4 style="border-right: none;">Leverings dato</h4>`];
    
    headers.forEach(r => {
        const row = document.createElement("div");
        row.innerHTML = r;

        list.appendChild(row)
    })

    rentals.forEach(r => {
        const return_date = new Date(r.return_date).getTime();
        const daysRemaining = Math.ceil((return_date - today) / (1000*60*60*24)) - 1;

        const rows = [`<h5 style="width:100%">Dager til levering: ${daysRemaining.toString()}</h5>`,
                    `<h5 style="width:100%">${r.student_name}</h5>`,
                    `<h5 style="width:100%">${r.pc_number}</h5>`,
                    `<h5 style="width:100%">${formatDate(r.rented_date)}</h5>`,
                    `<h5 style="width:100%">${formatDate(r.return_date)}</h5>`];

        rows.forEach(t, e => {
            const row = document.createElement("h5"); 

            row.innerHTML = t; 

            if (e >= 0) {
                row.style.backgroundColor = "green";
                if (daysRemaining < 0) {
                    row.style.backgroundColor = "darkred"
                    row.innerHTML = "Overdue";
                };
                if (daysRemaining === 0) {
                    row.style.backgroundColor = "red";
                    row.innerHTML = "Today"
                };
                if (daysRemaining <= 5) {
                    row.style.backgroundColor = "yellow";
                    row.innerHTML = "Soon"
                };
                if (daysRemaining > 5) {
                    row.style.backgroundColor = "green";
                    row.innerHTML = "Don worry bout it, key"
                };
            };
            
            list.appendChild(row);
        });
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

function formatDate(dateString) {
    const date = new Date(dateString);

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
}

// Auto-load list
if (document.getElementById("listDiv")) {
    loadRentals();
}