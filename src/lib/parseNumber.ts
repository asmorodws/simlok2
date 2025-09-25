export function numberToBahasa(n: number): string {
    if (n === 0) return "Nol";

    const satuan = [
        "",
        "Satu",
        "Dua",
        "Tiga",
        "Empat",
        "Lima",
        "Enam",
        "Tujuh",
        "Delapan",
        "Sembilan",
        "Sepuluh",
        "Sebelas",
    ];

    function toWords(x: number): string {
        let str = "";
        if (x < 12) {
            str = satuan[x] ?? "";
        } else if (x < 20) {
            str = toWords(x - 10) + " Belas";
        } else if (x < 100) {
            str = toWords(Math.floor(x / 10)) + " Puluh " + toWords(x % 10);
        } else if (x < 200) {
            str = "Seratus " + toWords(x - 100);
        } else if (x < 1000) {
            str = toWords(Math.floor(x / 100)) + " Ratus " + toWords(x % 100);
        } else if (x < 2000) {
            str = "Seribu " + toWords(x - 1000);
        } else if (x < 1_000_000) {
            str = toWords(Math.floor(x / 1000)) + " Ribu " + toWords(x % 1000);
        } else if (x < 1_000_000_000) {
            str = toWords(Math.floor(x / 1_000_000)) + " Juta " + toWords(x % 1_000_000);
        } else if (x < 1_000_000_000_000) {
            str = toWords(Math.floor(x / 1_000_000_000)) + " Miliar " + toWords(x % 1_000_000_000);
        } else if (x < 1_000_000_000_000_000) {
            str = toWords(Math.floor(x / 1_000_000_000_000)) + " Triliun " + toWords(x % 1_000_000_000_000);
        }
        return str.trim();
    }

    return toWords(n).replace(/\s+/g, " ").trim();
}