// Definisi untuk huruf Jepang dalam format Latin, Hiragana, dan Katakana
const HiraganaLetter = [
    { latin: "A", hiragana: "a" },
    { latin: "B", hiragana: "i" },
    { latin: "C", hiragana: "u" },
    { latin: "D", hiragana: "e" },
    { latin: "E", hiragana: "o" },
    { latin: "F", hiragana: "ka" },
    { latin: "G", hiragana: "ki" },
    { latin: "H", hiragana: "ku" },
    { latin: "I", hiragana: "ke" },
    { latin: "J", hiragana: "ko" },
    { latin: "K", hiragana: "sa" },
    { latin: "L", hiragana: "shi" },
    { latin: "M", hiragana: "su" },
    { latin: "N", hiragana: "se" },
    { latin: "O", hiragana: "so" },
    { latin: "P", hiragana: "ta" },
    { latin: "Q", hiragana: "chi" },
    { latin: "R", hiragana: "tsu" },
    { latin: "S", hiragana: "te" },
    { latin: "T", hiragana: "to" },
    { latin: "U", hiragana: "na" },
    { latin: "V", hiragana: "ni" },
    { latin: "W", hiragana: "nu" },
    { latin: "X", hiragana: "ne" },
    { latin: "Y", hiragana: "no" },
    { latin: "Z", hiragana: "ha" },
    { latin: "a", hiragana: "hi" },
    { latin: "b", hiragana: "fu" },
    { latin: "c", hiragana: "he" },
    { latin: "d", hiragana: "ho" },
    { latin: "e", hiragana: "ma" },
    { latin: "f", hiragana: "mi" },
    { latin: "g", hiragana: "mu" },
    { latin: "h", hiragana: "me" },
    { latin: "i", hiragana: "mo" },
    { latin: "j", hiragana: "ya" },
    { latin: "k", hiragana: "yu" },
    { latin: "l", hiragana: "yo" },
    { latin: "m", hiragana: "ra" },
    { latin: "n", hiragana: "ri" },
    { latin: "o", hiragana: "ru" },
    { latin: "p", hiragana: "re" },
    { latin: "q", hiragana: "ro" },
    { latin: "r", hiragana: "wa" },
    { latin: "s", hiragana: "wo" },
    { latin: "t", hiragana: "n" },
];



function japanLetter (x){

    const numbers = new Set()
    while (numbers.size < 4) {
        numbers.add(Math.floor(Math.random() * HiraganaLetter.length));
    }
    const uniqueNumbers = Array.from(numbers);
    console.log("Unique Numbers:", uniqueNumbers);
    const randomIndex = Math.floor(Math.random() * uniqueNumbers.length);
    const selectedIndex = uniqueNumbers[randomIndex];
    console.log("Selected Index:", selectedIndex);

    // menampilkan huruf Jepang dalam format yang sesuai
    const letterElement = document.getElementById("questionLetter");
    const fontLetter = HiraganaLetter[selectedIndex];
    
    
    if (x === "#hiragana") {
        console.log("Selected Hiragana Letter:", fontLetter);
        letterElement.classList.add("font-hiragana");
        letterElement.classList.remove("font-katakana");
    } else if (x === "#katakana") {
        console.log("Selected Katakana Letter:", fontLetter);
        letterElement.classList.remove("font-hiragana");
        letterElement.classList.add("font-katakana");
    } else {
        console.error("Invalid selector provided");
        return;
    }

    letterElement.textContent = fontLetter.latin;

    const valueLetter = document.getElementById("valueLetter");
    valueLetter.innerHTML = uniqueNumbers.map(index => `<div class="btn btn-outline-dark mx-auto font-weight-bolder d-flex align-items-center justify-content-center" data-value="${HiraganaLetter[index].hiragana.toUpperCase()}">${HiraganaLetter[index].hiragana.toUpperCase()}</div>`).join("");            
    
    const buttons = valueLetter.querySelectorAll("[data-value]");
    buttons.forEach(button => {
        button.addEventListener("click", function() {
            const selectedValue = this.getAttribute("data-value");
            console.log("Selected Value:", selectedValue);

            // cek apakah nilai yang dipilih sama dengan huruf Jepang yang ditampilkan
            if (selectedValue === fontLetter.hiragana.toUpperCase()) {
                // ubah warna latar belakang tombol menjadi hijau
                this.classList.add("btn-success");
                this.classList.remove("btn-outline-dark");
            } else {
                // ubah warna latar belakang tombol menjadi merah
                this.classList.add("btn-danger");
                this.classList.remove("btn-outline-dark");
            }
        });
    });

} 

function displayTable() {
    const tableName = window.location.hash || "#hiragana"; // Mengambil nama tabel dari hash URL
    console.log("Table Name:", tableName);
    // Menghapus tanda '#' dari nama tabel
    const tableNameWithoutHash = tableName.replace("#", "");
    console.log("Table Name Without Hash:", tableNameWithoutHash);
    // Mengambil elemen tabel berdasarkan nama tabel
    const tableJapan = document.querySelector("table[data-table=" + tableNameWithoutHash + "]");
    const d = document.querySelector("#tableContainer")
    if (tableJapan.classList.contains("d-none")) {
        tableJapan.classList.remove("d-none");
        d.classList.remove("d-none");
        d.addEventListener("click", displayTable)
    } else {
        tableJapan.classList.add("d-none");
        d.classList.add("d-none");
    }
    

}

function changeLetterType(event) {
    const target = event.target;
    if (target.tagName === "A") {;
        const letterType = target.getAttribute("href");
        // Mengubah hash URL sesuai dengan jenis huruf yang dipilih
        window.location.hash = letterType;
        // Memanggil fungsi untuk menampilkan huruf Jepang sesuai jenis yang dipilih
        japanLetter(letterType);
        if (letterType === "#hiragana") {
            target.classList.add("active");
            document.querySelector('a[href="#katakana"]').classList.remove("active");
        } else if (letterType === "#katakana") {
            target.classList.add("active");
            document.querySelector('a[href="#hiragana"]').classList.remove("active");
        }
    }
}


// saat halaman dimuat tampilkan hiragana
document.addEventListener("DOMContentLoaded", () => {
    const submit = document.getElementById("next");
    submit.href = window.location.hash || "#hiragana";
    japanLetter(window.location.hash || "#hiragana");

    submit.addEventListener("click", () => {
        const japanLatin = window.location.hash;

        console.log("Current Hash:", japanLatin);

        japanLetter(japanLatin);
        
        submit.href = window.location.hash || "#hiragana";
    });
})

