const API_URL = "/rentals";

const list = document.getElementById("listPage");
const calendar = document.getElementById("calendar");
let calendarInstance;

document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');

    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: "100%",
        expandRows: true
    });
});

async function openList() {
    list.style.display = "block";
    calendar.style.display = "none";
};
async function openCalendar() {
    calendar.style.display = "block";
    list.style.display = "none";
    
    if (!calendarInstance) {
        calendarInstance = new FullCalendar.Calendar(calendar, {
            initialView: 'dayGridMonth',
            height: "100%",
            expandRows: true
        });
        calendarInstance.render();
    } else {
        calendarInstance.updateSize();
    }
};


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

        list.appendChild(row);
    });

    rentals.forEach(r => {
        let e = 0;
        const return_date = new Date(r.return_date).getTime();
        const daysRemaining = Math.ceil((return_date - today) / (1000*60*60*24)) - 1;

        const rows = [`Dager til levering: ${daysRemaining.toString()}`,
                    `${r.student_name}`,
                    `${r.pc_number}`,
                    `${formatDate(r.rented_date)}`,
                    `${formatDate(r.return_date)}`];

        rows.forEach(t => {
            const row = document.createElement("h5"); 
            row.style.width = "100%"

            row.innerHTML = t; 

            if (e === 0) {
                row.style.backgroundColor = "green";
                if (daysRemaining < 0) {
                    row.style.backgroundColor = "darkred"
                    row.innerHTML = "Overdue";
                } else if (daysRemaining === 0) {
                    row.style.backgroundColor = "red";
                    row.innerHTML = "Today"
                } else if (daysRemaining <= 5) {
                    row.style.backgroundColor = "yellow";
                } else {
                    row.style.backgroundColor = "lightgreen";
                };
            };

            e = 1;
            
            list.appendChild(row);
        });
    });
};

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