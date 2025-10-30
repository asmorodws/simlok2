import { FC, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const TermsModal: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  if (!open) return null;

  // Fungsi helper untuk memberi <strong> pada angka seperti 1.1.
  const formatNumbers = (text: string) => {
    return text.replace(/(^|\s)(\d+\.\d+\.)(?=\s)/g, '$1<strong>$2</strong>');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-lg shadow-lg ring-1 ring-black/5 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 flex items-start justify-between p-4 border-b bg-white z-10">
          <h2 className="text-lg font-semibold">
            Syarat dan Ketentuan & Kebijakan Privasi - SIMLOK
          </h2>
          <button onClick={onClose} aria-label="Tutup modal" className="p-1 rounded hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 text-sm text-gray-700 space-y-6 leading-relaxed">
          <section>
            <h4 className="font-semibold mt-4">1. Ketentuan Umum</h4>
            {[
              "1.1. Sistem SIMLOK (Sistem Izin Masuk Lokasi) adalah platform digital untuk pengajuan, pengelolaan, dan persetujuan Surat Izin Masuk Lokasi (SIMLOK) yang disediakan oleh PT Pertamina (Persero).",
              "1.2. Sistem ini ditujukan bagi instansi, perusahaan, dan vendor yang memerlukan akses masuk ke area kerja, fasilitas, atau proyek milik PT Pertamina (Persero).",
              "1.3. Dengan mendaftar dan menggunakan sistem ini, pengguna yang mewakili instansi/perusahaan/vendor menyatakan telah membaca, memahami, dan menyetujui seluruh isi Syarat dan Ketentuan ini.",
              "1.4. PT Pertamina (Persero) berhak memperbarui atau mengubah ketentuan ini sewaktu-waktu tanpa pemberitahuan sebelumnya. Perubahan akan berlaku sejak diumumkan melalui sistem atau media resmi lainnya.",
            ].map((text, i) => (
              <p key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            <h4 className="font-semibold mt-4">2. Pendaftaran dan Akun Pengguna</h4>
            {[
              "2.1. Pendaftaran akun hanya dapat dilakukan oleh perwakilan resmi dari instansi, perusahaan, atau vendor yang memiliki kepentingan untuk mengajukan izin masuk lokasi kerja PT Pertamina (Persero).",
              "2.2. Pengguna wajib memberikan data instansi/perusahaan/vendor yang benar, valid, dan terkini, termasuk nama legal, alamat kantor, serta dokumen pendukung yang diminta oleh PT Pertamina (Persero).",
              "2.3. Akun bersifat khusus untuk instansi/perusahaan/vendor yang mendaftar dan tidak boleh dialihkan kepada pihak lain tanpa izin tertulis dari PT Pertamina (Persero).",
              "2.4. PT Pertamina (Persero) berhak menolak, menangguhkan, atau menonaktifkan akun yang terindikasi memberikan informasi palsu, tidak lengkap, atau digunakan untuk tujuan yang tidak sesuai.",
            ].map((text, i) => (
              <p key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            {/* ...lanjutan bagian lain tetap sama, cukup bungkus semua paragraf pakai formatNumbers seperti di atas */}
          </section>

          {/* Tombol tutup */}
          <div className="text-right mt-6 border-t pt-4">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
