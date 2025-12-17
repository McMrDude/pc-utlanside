const elev_navn = document.getElementById("navn").value;
const pc = document.getElementById("pc_nummer").value;
const dato_lånt = document.getElementById("dato_lånt").value;
const leverings_dato = document.getElementById("leverings_dato").value;

const liste = document.getElementById("liste");

function update_list() {
    const ny_utlån = document.createElement("div");
    const navn_text = document.createElement("h5");
    const pc_text = document.createElement("h5");
    const lånt_dato = document.createElement("h5");
    const levering_dato = document.createElement("h5");

    navn_text.innerText = elev_navn;
    pc_text.innerText = pc;
    lånt_dato.innerText = dato_lånt;
    levering_dato.innerText = leverings_dato;

    ny_utlån.appendChild(navn_text)
    ny_utlån.appendChild(pc_text)
    ny_utlån.appendChild(lånt_dato)
    ny_utlån.appendChild(levering_dato)
}
