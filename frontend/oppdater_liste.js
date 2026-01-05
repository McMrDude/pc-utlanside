const API_URL = "/rentals";

// Load list when page opens
async function loadRentals() {
    const res = await fetch(API_URL);
    const rentals = await res.json();

    const list = document.getElementById("listDiv");
    list.innerHTML = "";

    rentals.forEach(r => {
        const name = document.createElement("div"); 
        row.style.display = "flex"; 
        const number = document.createElement("div"); 
        row.style.display = "flex"; 
        const rented = document.createElement("div"); 
        row.style.display = "flex"; 
        const returned = document.createElement("div"); 
        row.style.display = "flex"; 
        
        name.innerHTML = ` 
        <h5 style="width:150px">${r.student_name}</h5> 
        `; 
        
        list.appendChild(name);

        number.innerHTML = ` 
        <h5 style="width:100px">${r.pc_number}</h5> 
        `; 

        list.appendChild(number);

        rented.innerHTML = ` 
        <h5 style="width:150px">${formatDate(r.rented_date)}</h5> 
        `; 

        list.appendChild(rented);

        returned.innerHTML = ` 
        <h5 style="width:150px">${formatDate(r.return_date)}</h5>
        `; 

        list.appendChild(returned);
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