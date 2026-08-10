const API_URL = "/rentals-admin";

let allRentals = [];

const list = document.getElementById("listPage");
const calendar = document.getElementById("calendar");

let calendarInstance;

let listPageOpen = false;
let calendarPageOpen = false;
let pcPageOpen = true;

whichTabOpen();


async function forespårselAlert() {
  const res = await fetch("/requests", {
    credentials: "include"
  });
  const requests = await res.json();

  if (requests.length === 0) {
    document.getElementById("nyAlert").style.display = "none";
  } else {
    document.getElementById("nyAlert").style.display = "flex";
  }
}

forespårselAlert();


document.addEventListener("DOMContentLoaded", () => {
  // Checks if the current page is the contact page
  if (window.location.pathname === "/admin.html") {
    loadPCs();
  } else if (window.location.pathname === "/calendar.html") {
    openCalendar();
  }
});


/* =========================
   Popup for event details
========================= */
const popup = document.createElement("div");
popup.id = "eventPopup";
document.body.appendChild(popup);

/* =========================
   Open / Close views
========================= */
async function openList() {
  list.style.display = "block";
  calendar.style.display = "none";
  popup.style.display = "none";
  document.getElementById("pcPage").style.display = "none";
  listPageOpen = true;
  calendarPageOpen = false;
  pcPageOpen = false;
  whichTabOpen();
}

async function openCalendar() {  
  const res = await fetch("/rentals-admin", {
    credentials: "include",
  });
  const rentals = await res.json();

  let pcNummer = "";

  if (!calendarInstance) {
    calendarInstance = new FullCalendar.Calendar(calendar, {
      initialView: "dayGridMonth",
      firstDay: 1,
      locale: "no",
      height: "auto",
      expandRows: true,
      events: [],
      datesSet: function() {
        const todayButton = document.getElementsByClassName("fc-today-button")[0];
        todayButton.textContent = "I dag";
        todayButton.title = "Denne Måneden";
      },
      eventContent: function(arg) {
        const wrapper = document.createElement("div");
        wrapper.style.height = "100%";
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";

        const top = document.createElement("div");
        top.textContent = `${arg.event.title}`;

        const bottom = document.createElement("div");
        bottom.textContent = arg.event.extendedProps.daysText;
        bottom.style.marginTop = "auto";

        wrapper.appendChild(top);
        wrapper.appendChild(bottom);

        return { domNodes: [wrapper] };
      },
    
      eventClick: function (info) {
        popup.innerHTML = "";
        const event = info.event;
        const clickedDate = event.startStr;

        const sameDayRentals = rentals.filter(r =>
          r.return_date.split("T")[0] === clickedDate
        );

        sameDayRentals.forEach(r => {
          if (r.status === "active") {
            const formattedRented = new Date(r.rented_date).toLocaleDateString("no-NO");
            const formattedReturn = new Date(r.return_date).toLocaleDateString("no-NO");
            console.log("select Date: ", formattedRented, " | ", "return Date: ", formattedReturn)
            const rental = document.createElement("div");
            rental.style = "background-color: rgba(146, 187, 246, 0.52); padding: 5px; margin-bottom: 5px; border-radius: 5px; display: flex; flex-direction: column; justify-content: space-between; align-items: center; gap: 10px;";
            rental.innerHTML = `
              <strong>
                ${r.student_name} - PC ${r.pc_number}
              </strong><br>
              <h4>Rented: ${formattedRented}</h4><br>
              <h4>Return: ${formattedReturn}</h4><br>
              <button class="popupDeleteBtn">✓</button>
            `;

            popup.appendChild(rental);

            document.querySelector(".popupDeleteBtn").onclick = async () => {
              if (!confirm("Er PCen levert inn og klar for ny utlån?")) return;

              const PCres = await fetch("/pcs/status");
              const pcs = await PCres.json();

              pcs.forEach(async pc => {
                if (pc.pc_number === r.pc_number) {
                  pcNummer = pc.pc_number;
                }
              });

              await fetch("/return", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json" 
                },
                body: JSON.stringify({ 
                  id: r.id,
                  pcNumber: pcNummer
                })
              });

              popup.style.display = "none";
              loadRentals();
              loadCalendarEvents();
            };
          };
        });

        popup.style.display = "grid";
      }
    });

    calendarInstance.render();
    loadCalendarEvents();
    const todayButton = document.getElementsByClassName("fc-today-button")[0];
    todayButton.textContent = "I dag";
    todayButton.title = "Denne Måneden";
    const prevButton = document.getElementsByClassName("fc-prev-button")[0];
    prevButton.title = "Forrige Måned";
    const nextButton = document.getElementsByClassName("fc-next-button")[0];
    nextButton.title = "Neste Måned"
  } else {
    calendarInstance.updateSize();
  }
}


async function sortRentals(rentals, sortState) {
  const sorted = [...rentals];
  console.log(sorted.length);
  let rentalsArray = [];
  
  const activeRentals = sorted.filter(r => r.status === "active");
  if (activeRentals.length <= 0) {
    const noRentals = document.createElement("div");
    noRentals.textContent = "Ingen aktive utlån for øyeblikket";
    rentalsArray.push(noRentals);
  } else {
    let rowID = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (sortState === 1) {
      sorted.sort((a, b) => {
        const dateA = new Date(a.return_date).getTime();
        const dateB = new Date(b.return_date).getTime();
        return dateA - dateB;
      });
    } else if (sortState === 2) {
      sorted.sort((a, b) => {
        const dateA = new Date(a.return_date).getTime();
        const dateB = new Date(b.return_date).getTime();
        return dateA - dateB;
      });
      sorted.reverse();
    }

    sorted.forEach(r => {
      if (r.status === "active") {
        let firstCell = true;    

        const formattedRented = new Date(r.rented_date).toLocaleDateString("no-NO");
        const formattedReturn = new Date(r.return_date).toLocaleDateString("no-NO");
        
        const returnDate = new Date(r.return_date).getTime();
        const rentedDate = new Date(r.rented_date).getTime();
        const daysRemaining =
          Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24)) - 1;

        const currentRowID = rowID; // Capture current rowID for closure


        const totalDays = Math.ceil((returnDate - rentedDate) / (1000 * 60 * 60 * 24));

        let percentRemaining = (daysRemaining / totalDays) * 100;

        percentRemaining = Math.max(0, Math.min(100, percentRemaining));

        const statusBar = document.createElement("div");
        statusBar.className = "statusBar";
        statusBar.classList.add("Row" + currentRowID);
        statusBar.style.position = "relative";

        let statusFill = document.createElement("div");
        statusFill.className = "statusFill";

        statusFill.style.width = `${percentRemaining}%`;


        const daysText = document.createElement("span");


        if (percentRemaining >= 50) {
          statusBar.classList.add("green");
          statusFill.classList.add("green");
          daysText.style.color = "green";
        }
        else if (percentRemaining >= 10) {
          statusBar.classList.add("yellow");
          statusFill.classList.add("yellow");
          daysText.style.color = "darkyellow";
        }
        else {
          statusBar.classList.add("red");
          statusFill.classList.add("red");
        }

        if ( daysRemaining < 0) {
          const overdueText = document.createElement("span");
          statusFill = null;
          overdueText.textContent = "Må leveres inn!";
          overdueText.style.color = "darkred";
          overdueText.style.fontWeight = "bold";
          overdueText.style.fontSize = "13px";
          statusBar.appendChild(overdueText);
        } else {
          daysText.textContent = `${daysRemaining} dager igjen`;
          daysText.style.fontWeight = "bold";
          daysText.style.position = "absolute";
          daysText.style.zIndex = "10";
          daysText.style.fontSize = "13px";
          statusBar.appendChild(daysText);
        }

        if (statusFill) {
          statusBar.appendChild(statusFill);
        }

        const throwawayDiv = document.createElement("div");
        throwawayDiv.style = "padding: 10px; border-bottom: 2px rgba(125, 179, 255, 0.519) solid;";
        throwawayDiv.appendChild(statusBar);

        rentalsArray.push(throwawayDiv);

        const rows = [
          r.student_name + "(" + r.student_email + ")",
          r.pc_number,
          formattedRented,
          formattedReturn
        ];

        rows.forEach(text => {
          const row = document.createElement("h5");
          row.innerHTML = text;

          row.className = "Row" + currentRowID;

          row.style = "border-bottom: 2px rgba(125, 179, 255, 0.519) solid; padding: 10px;";

          rentalsArray.push(row);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.id = "delete-btn";
        deleteBtn.className = "Row" + currentRowID;
        deleteBtn.textContent = "✓";

        deleteBtn.onclick = async () => {
          if (!confirm("Er PCen levert inn og klar for ny utlån?")) return;

          document.querySelectorAll('.Row' + currentRowID).forEach(el => el.remove());

          const PCres = await fetch("/pcs/status");
          const pcs = await PCres.json();

          pcs.forEach(async pc => {
            if (pc.pc_number === r.pc_number) {
              pcNummer = pc.pc_number;
            }
          });

          await fetch("/return", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({ 
              id: r.id,
              pcNumber: pcNummer
            })
          });


          loadRentals();
          if (calendarInstance) loadCalendarEvents();
        };

        rentalsArray.push(deleteBtn);

        rowID++;
      };
    });
  }

  renderRentals(rentalsArray);
}

/* =========================
   Load list view
========================= */
async function loadRentals(sortState) {
  const res = await fetch(API_URL);
  allRentals = await res.json();

  sortRentals(allRentals, sortState);
}

let state = 0;
function renderRentals(array) {
  let pcNummer = "";

  const listDiv = document.getElementById("listDiv");
  listDiv.innerHTML = "";

  const headers = [
    "<h5 style='font-weight: bold;' id='statusHeader'><button id='filterBtn' img='icons/normal sort.png'></button>Status<div></div></h5>",
    "<h5 style='font-weight: bold;'>Lånerens navn</h5>",
    "<h5 style='font-weight: bold;'>PC-nr</h5>",
    "<h5 style='font-weight: bold;'>Dato lånt</h5>",
    "<h5 style='font-weight: bold;'>Innleveringsfrist</h5>",
    "<h5 style='font-weight: bold;'>Levert?</h5>"
  ];

  const headerDiv = document.createElement("div");

  headers.forEach(h => {
    const row = document.createElement("div");
    row.innerHTML = h;
    row.style = "background-color: rgba(146, 187, 246, 0.52); border-bottom: 2px rgba(125, 179, 255, 0.519) solid; padding: 10px; display: flex; justify-content: center; align-items: center;";
    listDiv.appendChild(row);
  });

  array.forEach(el => {
    listDiv.appendChild(el);
  });

  const filterBtn = document.getElementById("filterBtn");
  if (state === 0) {
      filterBtn.title = "Normal prioritering";
      filterBtn.style.backgroundImage = "url('icons/normal sort.png')";
    } else if (state === 1) {
      filterBtn.title = "Forfalt prioritering";
      filterBtn.style.backgroundImage = "url('icons/old sort.png')";
    } else {
      filterBtn.title = "Nyest prioritering";
      filterBtn.style.backgroundImage = "url('icons/new sort.png')"; 
    };

  filterBtn.onclick = () => {
    if (state === 0) {
      state = 1;
    } else if (state === 1) {
      state = 2;
    } else {
      state = 0;
    };
      
    loadRentals(state);
  };
}

/* =========================
   Load calendar events
========================= */
async function loadCalendarEvents() {
  const res = await fetch(API_URL);
  const rentals = await res.json();

  calendarInstance.getEvents().forEach(e => e.remove());

  rentals.forEach(r => {
    if (r.status === "active") {
      const returnDate = new Date(r.return_date);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const daysRemaining =
        Math.ceil((returnDate - today) / (1000 * 60 * 60 * 24)) - 1;

      let color = "rgba(154, 255, 139, 0.5)";
      let daysText = "Lenge til levering";
      if (daysRemaining < 0) {color = "darkred", daysText = "Ikke levert inn"}
      else if (daysRemaining === 0) {color = "red", daysText = "Leveres i dag"}
      else if (daysRemaining <= 5) {color = "orange", daysText = "Skal snart leveres"}

      calendarInstance.addEvent({
        title: `${r.student_name} - PC ${r.pc_number}`,
        start: returnDate.toISOString().split("T")[0],
        display: "background",
        color: color,
        classNames: daysRemaining === 0 ? ["today-rental"] : [],
        extendedProps: {
          daysText: daysText,
          id: r.id,
          rentedDate: r.rented_date,
          returnDate: r.return_date,
          studentName: r.student_name,
          pcNumber: r.pc_number
        }
      });
    };
  });
  const todayButton = document.getElementsByClassName("fc-today-button")[0];
  todayButton.textContent = "I dag";
  todayButton.title = "Denne Måneden";
}

/* =========================
   Add new rental
========================= */
async function addRental() {
  const studentName = document.getElementById("navn").value.trim();
  const pcNumber = document.getElementById("pc_nummer").value;
  const rentedDate = document.getElementById("dato_lånt").value;
  const returnDate = document.getElementById("leverings_dato").value;

  if (!studentName || !pcNumber || !rentedDate || !returnDate) {
    alert("Vennligst fyll inn alle feltene");
    return;
  }

  const data = {
    student_name: studentName,
    pc_number: pcNumber,
    rented_date: rentedDate,
    return_date: returnDate
  };

  await fetch("/rentals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  window.location.href = "/";
}

/* =========================
   Helpers
========================= */
function formatDate(dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/* =========================
   Auto load + popup close
========================= */
if (document.getElementById("listDiv")) {
  loadRentals();
}

const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    state = 0;
    const query = e.target.value.toLowerCase();

    const filtered = allRentals.filter(r => {
      return (
        
        r.student_name.toLowerCase().includes(query) ||
        r.student_email.toLowerCase().includes(query) ||
        r.pc_number.toLowerCase().includes(query) ||
        formatDate(r.rented_date).includes(query) ||
        formatDate(r.return_date).includes(query)
      );
    });

    sortRentals(filtered);
  });
}

document.addEventListener("click", function (e) {
  if (!e.target.closest(".fc-event")) {
    popup.style.display = "none";
  }
});

/* =========================
   PC PAGE
========================= */

function openPCs() {
  document.getElementById("listPage").style.display = "none";
  document.getElementById("calendar").style.display = "none";
  document.getElementById("pcPage").style.display = "block";
  listPageOpen = false;
  calendarPageOpen = false;
  pcPageOpen = true;
  whichTabOpen();
  loadPCs();
}

let currentRequestId = null;

async function loadPCs() {
  const PCres = await fetch("/pcs/status");
  const pcs = await PCres.json();

  const pcDiv = document.getElementById("pcList");
  pcDiv.style = "border: 2px solid rgba(125, 179, 255, 0.519); border-radius: 10px; background-color: white;";
  pcDiv.innerHTML = "";

  const headers = [
    "PC-nr",
    "Serienummer",
    "Modell",
    "Status",
    "Utlåners navn",
    "Edit"
  ]

  let rowCounter = 0;
  headers.forEach(h => {
    const row = document.createElement("div");
    row.style = "background-color: rgba(178, 209, 252, 0.519);border-bottom: 2px solid rgba(125, 179, 255, 0.519); display: flex; justify-content: center; align-items: center; padding: 10px";
    row.textContent = h

    if (rowCounter === 0) {
      row.style = "border-top-left-radius: 8px; background-color: rgba(178, 209, 252, 0.519);border-bottom: 2px solid rgba(125, 179, 255, 0.519); display: flex; justify-content: center; align-items: center; padding: 10px;";
    } else if (rowCounter === headers.length - 1) {
      row.style = "border-top-right-radius: 8px; background-color: rgba(178, 209, 252, 0.519);border-bottom: 2px solid rgba(125, 179, 255, 0.519); display: flex; justify-content: center; align-items: center; padding: 10px;";
    }
    
    pcDiv.appendChild(row)
    rowCounter++;
  })

  document.getElementById("pcSelect").replaceChildren();
  let forEachCount = 0;
  pcs.forEach(pc => {
    if (pc.status === "ledig") {
      const selectOption = document.createElement("option");
      selectOption.value = pc.pc_number;
      selectOption.textContent = `PC ${pc.pc_number} - ${pc.model}`;
      document.getElementById("pcSelect").appendChild(selectOption);
    }

    const number = document.createElement("div");
    const serie = document.createElement("div");
    const model = document.createElement("div");
    const status = document.createElement("div");
    const loanName = document.createElement("div");
    number.className = "pcDiv";
    serie.className = "pcDiv";
    model.className = "pcDiv";
    status.className = "pcDiv";
    loanName.className = "pcDiv";

    number.textContent = `${pc.pc_number}`;
    if (forEachCount === pcs.length - 1) {
      number.style = " border-bottom-left-radius: 8px;";
    }

    pcDiv.appendChild(number);

    serie.textContent = `${pc.serie_nummer}`;

    pcDiv.appendChild(serie);

    model.textContent = `${pc.model}`;

    pcDiv.appendChild(model);

    status.textContent =
      pc.status === "lånt"
        ? `🔴 Utlånt`
        : "🟢 Ledig";

    loanName.textContent =
      pc.status === "lånt"
      ? `${pc.user_name} (${pc.user_email})`
      : "";

    pcDiv.appendChild(status);
    pcDiv.appendChild(loanName);

    const edit = document.createElement("button");
    edit.className = "edit-btn";
    edit.textContent = "⚙️";
    edit.onclick = () => {
      openEditPopup(pc);
    };

    if (forEachCount === pcs.length - 1) {
      edit.style = " border-bottom-right-radius: 8px;";
    }

    pcDiv.appendChild(edit);

    forEachCount++;
  });

  // 👇 FETCH REQUESTS
  const res = await fetch("/requests", {
    credentials: "include"
  });
  const requests = await res.json();

  const reqDiv = document.getElementById("requestList");
    reqDiv.innerHTML = "";

  if (requests.length === 0) {
    const noReq = document.createElement("div");
    noReq.textContent = "Ingen forespørsler for øyeblikket";
    reqDiv.appendChild(noReq);
    return;
  }
  else {
    // headers
    ["Bruker", "Datoer", "Status", "Godkjenn", "Avvis"].forEach(h => {
      const row = document.createElement("div");
      row.textContent = h;
      reqDiv.appendChild(row);
    });

    // 👇 LOOP THROUGH REQUESTS
    requests.forEach(req => {
      if (req.status === "pending") {
        const bruker = document.createElement("div");
        const date = document.createElement("div");
        const status = document.createElement("div");
        const approve = document.createElement("div");
        const decline = document.createElement("div");

        bruker.className = "pcDiv";
        date.className = "pcDiv";
        status.className = "pcDiv";
        approve.className = "pcDiv";
        decline.className = "pcDiv"

        bruker.textContent = `${req.student_name} (${req.student_email})`;

        const formattedStart = new Date(req.start_date.split("T")[0]).toLocaleDateString("no-NO");
        const formattedReturn = new Date(req.return_date.split("T")[0]).toLocaleDateString("no-NO");        

        date.textContent = `${formattedStart} → ${formattedReturn}`;

        status.textContent =
          req.status === "pending"
            ? "⏳ Venter på godkjenning"
            : req.status === "approved"
            ? "✅ Godkjent"
            : "❌ Avvist";

        const buttonYes = document.createElement("button");
        buttonYes.className = "decideButton";
        buttonYes.id = "yesButton";
        buttonYes.textContent = "✓";
        buttonYes.onclick = () => {
          currentRequestId = req.id;
          document.getElementById("acceptRequest").style.display = "block";
        };
        const buttonNo = document.createElement("button");
        buttonNo.className = "decideButton";
        buttonNo.id = "noButton";
        buttonNo.textContent = "X";
        buttonNo.onclick = () => {
          currentRequestId = req.id;
          rejectRequest();
        };
        approve.appendChild(buttonYes)
        decline.appendChild(buttonNo)

        reqDiv.appendChild(bruker);
        reqDiv.appendChild(date);
        reqDiv.appendChild(status);
        reqDiv.appendChild(approve);
        reqDiv.appendChild(decline);
      };
    });
  }
}

async function addPC() {
  const pcNumberInput = document.getElementById("pcNumber");
  const serieNumberInput = document.getElementById("serieNumber");
  const modelInput = document.getElementById("pcModel");

  const data = {
    pc_number: pcNumberInput.value,
    serie_number: serieNumberInput.value,
    model: modelInput.value
  };

  if (!data.pc_number || !data.serie_number || !data.model) {
    alert("Vennligst fyll inn alle feltene");
    return;
  }

  await fetch("/pcs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  // ✅ CLEAR INPUTS AFTER SUCCESS
  pcNumberInput.value = "";
  serieNumberInput.value = "";
  modelInput.value = "";

  loadPCs();
}

async function getCurrentUser() {
  const res = await fetch("/me", {
    credentials: "include"
  });

  if (!res.ok) {
    return null;
  }

  return await res.json();
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();

  if (!user) {
    alert("Du må være logget inn for å se denne siden");
    window.location.href = "/login.html";
    return;
  }

  // Optional: admin-only UI
  if (user.role !== "admin") {
    const pcTab = document.getElementById("pcTab");
    if (pcTab) pcTab.style.display = "none";
  }
});


async function approveRequest() {
  const pcNumber = document.getElementById("pcSelect").value;

  const res = await fetch(`/rentals`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      requestId: currentRequestId,
      pcNumber
    }),
    credentials: "include"
  });

  const data = await res.json();
  console.log(data);

  loadPCs();
}

async function rejectRequest() {
  const res = await fetch(`/request-decline`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ 
      requestId: currentRequestId
    }),
    credentials: "include"
  });

  const data = await res.json();
  console.log(data);

  loadPCs();
}

function openEditPopup(pc) {
  document.getElementById("editPC").classList.add("is-visible");

  document.getElementById("editPcNumber").value = pc.pc_number;
  document.getElementById("editSerieNumber").value = pc.serie_nummer;
  document.getElementById("editPcModel").value = pc.model;

  // 👇 THIS is the important part
  document.getElementById("editPC").dataset.id = pc.id;
}
async function savePC(e) {
  e.preventDefault();

  const id = document.getElementById("editPC").dataset.id;
  const pc_number = document.getElementById("editPcNumber").value;
  const serie_number = document.getElementById("editSerieNumber").value;
  const model = document.getElementById("editPcModel").value;

  const res = await fetch("/submit-changes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id,
      pc_number,
      serie_number,
      model
    })
  });

  const data = await res.json();
  console.log(data);

  document.getElementById("editPC").classList.remove("is-visible");

  loadPCs();
}

function whichTabOpen() {
  const listBtn = document.getElementById("listBtn");
  const calendarBtn = document.getElementById("calendarBtn");
  const pcBtn = document.getElementById("pcBtn");

  if (listBtn) {
    if (listPageOpen) {
      listBtn.style =
        "background-color: rgb(187, 187, 187); border: 2px solid blue";
    } else {
      listBtn.style = "";
    }
  }

  if (calendarBtn) {
    if (calendarPageOpen) {
      calendarBtn.style =
        "background-color: rgb(187, 187, 187); border: 2px solid blue";
    } else {
      calendarBtn.style = "";
    }
  }

  if (pcBtn) {
    if (pcPageOpen) {
      pcBtn.style =
        "background-color: rgb(187, 187, 187); border: 2px solid blue";
    } else {
      pcBtn.style = "";
    }
  }
}