const API_URL = "/rentals";

// Load list when page opens
async function loadRentals() {

    const res = await fetch(API_URL);
    const rentals = await res.json();

    const list = document.getElementById("listDiv");
    list.innerHTML = "";

    const headers = ["`<h4>Elev navn</h4>`",
                    "`<h4>PC nummer</h4>`",
                    "`<h4>Dato lånet</h4>`",
                    '`<h4 style="border-right: none;">Leverings dato</h4>`'];
    
    headers.forEach(r => {
        const row = document.createElement("div");
        row.innerHTML = r;

        list.appendChild(row)
    })

    rentals.forEach(r => {
        const rows = ['`<h5 style="width:150px">${r.student_name}</h5>`',
                    '`<h5 style="width:100px">${r.pc_number}</h5>`',
                    '`<h5 style="width:150px">${formatDate(r.rented_date)}</h5>`',
                    '`<h5 style="width:150px">${formatDate(r.return_date)}</h5>`'];

        rows.forEach(t => {
            const row = document.createElement("div"); 
            row.style.display = "flex"; 

            row.innerHTML = t; 
            
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