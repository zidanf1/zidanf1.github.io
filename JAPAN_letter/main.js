// saat di load, jalankan fungsi ini
document.addEventListener("DOMContentLoaded", function() {
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

    // ambil elemen dengan id "next" dan tambahkan event listener
    const nextButton = document.getElementById("next");
    nextButton.addEventListener("click", function() {
        // ketika tombol next ditekan, jalankan fungsi gameRestart
        gameRestart();
    });
    
    function gameRestart() {
        const numbers = new Set();

        while (numbers.size < 4) {
            numbers.add(Math.floor(Math.random() * HiraganaLetter.length));
        }
        // Convert Set to Array and log it
        const uniqueNumbers = Array.from(numbers);
        console.log(uniqueNumbers);

        // pilih 1 dari 4 angka unik
        const randomIndex = Math.floor(Math.random() * uniqueNumbers.length);
        const selectedIndex = uniqueNumbers[randomIndex];
        console.log("Selected Index:", selectedIndex);

        // ambil huruf hiragana berdasarkan index yang dipilih
        const selectedHiragana = HiraganaLetter[selectedIndex];
        console.log("Selected Hiragana:", selectedHiragana);

        // tampilkan huruf hiragana di elemen dengan id "japanText"
        const container = document.getElementById("japanText");
        container.innerHTML = selectedHiragana.latin

        // menampilkan huruf latin di elemen dengan id "value"
        const valueText = document.getElementById("value");
        // gunakan foreach untuk menampilkan 4 huruf hiragana yang ada di uniqueNumbers dalam button di "value"
        valueText.innerHTML = uniqueNumbers.map(index => `<div class="btn btn-outline-dark mx-auto font-weight-bolder d-flex align-items-center justify-content-center" data-value="${HiraganaLetter[index].hiragana.toUpperCase()}">${HiraganaLetter[index].hiragana.toUpperCase()}</div>`).join("");

        // buat event listener untuk setiap button di "value"
        const buttons = valueText.querySelectorAll("[data-value]");
        buttons.forEach(button => {
            button.addEventListener("click", function() {
                const selectedValue = this.getAttribute("data-value");
                console.log("Selected Value:", selectedValue);

                // cek apakah nilai yang dipilih sama dengan huruf latin yang ditampilkan
                if (selectedValue === selectedHiragana.hiragana.toUpperCase()) {
                    alert("BENAR!");
                } else {
                    alert("Salah silahkan coba lagi!");
                }
            });
        });
    }

    gameRestart()
})