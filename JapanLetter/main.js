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

    const KatakanaLetter = [
        { latin: "A", hiragana: "ア" },
        { latin: "B", hiragana: "イ" },
        { latin: "C", hiragana: "ウ" },
        { latin: "D", hiragana: "エ" },
        { latin: "E", hiragana: "オ" },
        { latin: "F", hiragana: "カ" },
        { latin: "G", hiragana: "キ" },
        { latin: "H", hiragana: "ク" },
        { latin: "I", hiragana: "ケ" },
        { latin: "J", hiragana: "コ" },
        { latin: "K", hiragana: "サ" },
        { latin: "L", hiragana: "シ" },
        { latin: "M", hiragana: "ス" },
        { latin: "N", hiragana: "セ" },
        { latin: "O", hiragana: "ソ" },
        { latin: "P", hiragana: "タ" },
        { latin: "Q", hiragana: "チ" },
        { latin: "R", hiragana: "ツ" },
        { latin: "S", hiragana: "テ" },
        { latin: "T", hiragana: "ト" },
        { latin: "U", hiragana: "ナ" },
        { latin: "V", hiragana: "ニ" },
        { latin: "W", hiragana: "ヌ" },
        { latin: "X", hiragana: "ネ" },
        { latin: "Y", hiragana: "ノ" },
        { latin: "Z", hiragana: "ハ" }
    ];

    // ambil elemen dengan id "next" dan tambahkan event listener
    const nextButton = document.getElementById("next");
    nextButton.addEventListener("click", function() {
        // ketika tombol next ditekan, jalankan fungsi gameRestart
        const japanLetter = window.location.hash
        console.log("Current Hash:", japanLetter);
        gameRestart(japanLetter);
    });
    
    function gameRestart(japanLatin) {
        const numbers = new Set();

        while (numbers.size < 4) {
            if (japanLatin === "#hiragana") {
                japanLatin = HiraganaLetter;
            } else if (japanLatin === "#katakana") {
                japanLatin = KatakanaLetter;
            } else {
                console.error("Invalid hash value. Use #hiragana or #katakana.");
            }
            numbers.add(Math.floor(Math.random() * japanLatin.length));
        }
        // Convert Set to Array and log it
        const uniqueNumbers = Array.from(numbers);
        console.log(uniqueNumbers);

        // pilih 1 dari 4 angka unik
        const randomIndex = Math.floor(Math.random() * uniqueNumbers.length);
        const selectedIndex = uniqueNumbers[randomIndex];
        console.log("Selected Index:", selectedIndex);

        // ambil huruf hiragana berdasarkan index yang dipilih
        const selectedHiragana = japanLatin[selectedIndex];
        console.log("Selected Hiragana:", selectedHiragana);

        // menampilkan huruf latin di elemen dengan id "value"
        const valueText = document.getElementById("value");

        // jika japanlatin adalah "#hiragana", gunakan HiraganaLetter, jika "#katakana", gunakan KatakanaLetter

        if (japanLatin === "#hiragana") {
            japanLatin = HiraganaLetter;
            // gunakan foreach untuk menampilkan 4 huruf hiragana yang ada di uniqueNumbers dalam button di "value"
            valueText.innerHTML = uniqueNumbers.map(index => `<div class="btn btn-outline-dark mx-auto font-weight-bolder d-flex align-items-center justify-content-center" data-value="${HiraganaLetter[index].hiragana.toUpperCase()}">${HiraganaLetter[index].hiragana.toUpperCase()}</div>`).join("");            
        } else if (japanLatin === "#katakana") {
            japanLatin = KatakanaLetter;
            valueText.innerHTML = uniqueNumbers.map(index => `<div class="btn btn-outline-dark mx-auto font-weight-bolder d-flex align-items-center justify-content-center" data-value="${KatakanaLetter[index].hiragana.toUpperCase()}">${KatakanaLetter[index].hiragana.toUpperCase()}</div>`).join("");            
        }
        
        // tampilkan huruf hiragana di elemen dengan id "japanText"
        const container = document.getElementById("japanText");
        container.innerHTML = selectedHiragana.latin


        // buat event listener untuk setiap button di "value"
        const buttons = valueText.querySelectorAll("[data-value]");
        buttons.forEach(button => {
            button.addEventListener("click", function() {
                const selectedValue = this.getAttribute("data-value");
                console.log("Selected Value:", selectedValue);

                // cek apakah nilai yang dipilih sama dengan huruf latin yang ditampilkan
                if (selectedValue === selectedHiragana.hiragana.toUpperCase()) {
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

    gameRestart("#hiragana");
})