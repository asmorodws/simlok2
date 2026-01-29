import { FC } from "react";
import BaseModal from './BaseModal';

const TermsModal: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  // Fungsi helper untuk memberi <strong> pada angka seperti 1.1.
  const formatNumbers = (text: string) => {
    return text.replace(/(^|\s)(\d+\.\d+\.)(?=\s)/g, '$1<strong>$2</strong>');
  };

  return (
    <BaseModal 
      isOpen={open} 
      onClose={onClose} 
      title="Syarat dan Ketentuan & Kebijakan Privasi - SIMLOK"
      size="xl"
      contentClassName="max-h-[70vh]"
    >
      <div className="text-sm text-gray-700 space-y-6 leading-relaxed">
          <section>
            <h3 className="font-bold text-base mb-4">Syarat dan Ketentuan Penggunaan Sistem SIMLOK</h3>
            
            <h4 className="font-semibold mt-4">1. Ketentuan Umum</h4>
            {[
              "1.1. Sistem SIMLOK (Sistem Izin Masuk Lokasi) adalah platform digital untuk pengajuan, pengelolaan, dan persetujuan Surat Izin Masuk Lokasi (SIMLOK) yang disediakan oleh PT Pertamina (Persero).",
              "1.2. Sistem ini ditujukan bagi instansi, perusahaan, dan vendor yang memerlukan akses masuk ke area kerja, fasilitas, atau proyek milik PT Pertamina (Persero).",
              "1.3. Dengan mendaftar dan menggunakan sistem ini, pengguna yang mewakili instansi/perusahaan/vendor menyatakan telah membaca, memahami, dan menyetujui seluruh isi Syarat dan Ketentuan ini.",
              "1.4. PT Pertamina (Persero) berhak memperbarui atau mengubah ketentuan ini sewaktu-waktu tanpa pemberitahuan sebelumnya. Perubahan akan berlaku sejak diumumkan melalui sistem atau media resmi lainnya.",
            ].map((text, i) => (
              <p key={i} className="ml-4 mb-2" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            <h4 className="font-semibold mt-4">2. Pendaftaran dan Akun Pengguna</h4>
            {[
              "2.1. Pendaftaran akun hanya dapat dilakukan oleh perwakilan resmi dari instansi, perusahaan, atau vendor yang memiliki kepentingan untuk mengajukan izin masuk lokasi kerja PT Pertamina (Persero).",
              "2.2. Pengguna wajib memberikan data instansi/perusahaan/vendor yang benar, valid, dan terkini, termasuk nama legal, alamat kantor, serta dokumen pendukung yang diminta oleh PT Pertamina (Persero).",
              "2.3. Akun bersifat khusus untuk instansi/perusahaan/vendor yang mendaftar dan tidak boleh dialihkan kepada pihak lain tanpa izin tertulis dari PT Pertamina (Persero).",
              "2.4. PT Pertamina (Persero) berhak menolak, menangguhkan, atau menonaktifkan akun yang terindikasi memberikan informasi palsu, tidak lengkap, atau digunakan untuk tujuan yang tidak sesuai.",
            ].map((text, i) => (
              <p key={i} className="ml-4 mb-2" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            <h4 className="font-semibold mt-4">3. Penggunaan Sistem</h4>
            {[
              "3.1. Sistem SIMLOK hanya boleh digunakan oleh instansi, perusahaan, dan vendor untuk keperluan resmi terkait proses pengajuan dan manajemen izin masuk lokasi PT Pertamina (Persero).",
              "3.2. Pengguna wajib menjaga keamanan akun instansi/perusahaan/vendor dan bertanggung jawab atas seluruh aktivitas yang dilakukan menggunakan akun tersebut.",
              "3.3. Dilarang menggunakan sistem untuk aktivitas yang bertentangan dengan hukum, mengganggu operasional, atau membahayakan keamanan sistem.",
              "3.4. Data dan informasi yang diunggah melalui sistem merupakan tanggung jawab penuh dari instansi/perusahaan/vendor pemilik akun.",
              "3.5. Dilarang mendistribusikan, memodifikasi, atau menggunakan data yang diperoleh dari sistem tanpa izin tertulis dari PT Pertamina (Persero).",
            ].map((text, i) => (
              <p key={i} className="ml-4 mb-2" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            <h4 className="font-semibold mt-4">4. Tanggung Jawab dan Pembatasan</h4>
            {[
              "4.1. PT Pertamina (Persero) tidak bertanggung jawab atas kerugian atau dampak yang timbul akibat kesalahan input data, kelalaian pengguna, atau penyalahgunaan akun oleh pihak instansi/perusahaan/vendor.",
              "4.2. PT Pertamina (Persero) berhak melakukan pemeliharaan, pembaruan, atau penghentian sementara layanan untuk kepentingan peningkatan sistem tanpa pemberitahuan sebelumnya.",
              "4.3. PT Pertamina (Persero) tidak dapat dimintai pertanggungjawaban atas gangguan teknis, kehilangan data, atau keterlambatan proses akibat faktor di luar kendali, seperti gangguan jaringan atau bencana alam.",
            ].map((text, i) => (
              <p key={i} className="ml-4 mb-2" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            <h4 className="font-semibold mt-4">5. Kepemilikan dan Hak Cipta</h4>
            {[
              "5.1. Seluruh sistem, data struktur, desain, dan logo SIMLOK merupakan hak milik PT Pertamina (Persero) dan dilindungi oleh peraturan perundang-undangan yang berlaku.",
              "5.2. Instansi, perusahaan, atau vendor dilarang menggunakan, menyalin, atau memanfaatkan komponen sistem SIMLOK untuk kepentingan lain tanpa izin tertulis dari PT Pertamina (Persero).",
            ].map((text, i) => (
              <p key={i} className="ml-4 mb-2" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            <h4 className="font-semibold mt-4">6. Hukum yang Berlaku</h4>
            <p className="ml-4 mb-2">
              Syarat dan Ketentuan ini diatur berdasarkan hukum Republik Indonesia. Setiap sengketa yang timbul akan diselesaikan melalui musyawarah terlebih dahulu, atau melalui mekanisme hukum yang berlaku apabila diperlukan.
            </p>

            <h3 className="font-bold text-base mb-4 mt-8">🔒 Kebijakan Privasi Sistem SIMLOK</h3>

            <h4 className="font-semibold mt-4">1. Tujuan Kebijakan</h4>
            <p className="ml-4 mb-2">
              Kebijakan Privasi ini menjelaskan bagaimana data milik instansi, perusahaan, dan vendor dikumpulkan, digunakan, dan dilindungi oleh PT Pertamina (Persero) dalam sistem SIMLOK.
            </p>

            <h4 className="font-semibold mt-4">2. Pengumpulan Data</h4>
            <p className="ml-4 mb-2">
              <strong>2.1.</strong> Sistem SIMLOK mengumpulkan data administratif dari instansi, perusahaan, dan vendor yang menggunakan layanan, termasuk namun tidak terbatas pada:
            </p>
            <ul className="ml-8 mb-2 list-disc space-y-1">
              <li>Nama instansi/perusahaan/vendor</li>
              <li>Alamat kantor dan lokasi proyek</li>
              <li>Dokumen legal pendukung (misalnya surat penugasan, surat izin, atau dokumen kerja sama)</li>
              <li>Data permohonan izin masuk lokasi yang diajukan melalui sistem</li>
            </ul>
            <p className="ml-4 mb-2">
              <strong>2.2.</strong> Data dikumpulkan secara langsung dari pengguna resmi instansi/perusahaan/vendor saat proses pendaftaran dan penggunaan sistem.
            </p>

            <h4 className="font-semibold mt-4">3. Penggunaan Data</h4>
            <p className="ml-4 mb-2">
              <strong>3.1.</strong> Data digunakan untuk kepentingan operasional sistem SIMLOK, antara lain:
            </p>
            <ul className="ml-8 mb-2 list-disc space-y-1">
              <li>Verifikasi legalitas instansi/perusahaan/vendor</li>
              <li>Pengelolaan dan pelacakan permohonan izin masuk lokasi</li>
              <li>Komunikasi resmi antara PT Pertamina (Persero) dan pihak instansi/perusahaan/vendor</li>
              <li>Analisis statistik untuk peningkatan efektivitas layanan</li>
            </ul>
            <p className="ml-4 mb-2">
              <strong>3.2.</strong> Data tidak akan digunakan untuk tujuan di luar kepentingan operasional SIMLOK tanpa izin dari instansi/perusahaan/vendor yang bersangkutan.
            </p>

            <h4 className="font-semibold mt-4">4. Keamanan dan Penyimpanan Data</h4>
            {[
              "4.1. PT Pertamina (Persero) menerapkan langkah-langkah teknis dan administratif untuk melindungi data instansi/perusahaan/vendor dari akses tidak sah, perubahan, atau penghapusan tanpa izin.",
              "4.2. Data disimpan secara terenkripsi di server yang dikelola dengan standar keamanan yang berlaku.",
              "4.3. Hanya petugas berwenang yang memiliki akses terhadap data tersebut untuk keperluan verifikasi dan administrasi.",
            ].map((text, i) => (
              <p key={i} className="ml-4 mb-2" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            <h4 className="font-semibold mt-4">5. Pembagian Data</h4>
            {[
              "5.1. PT Pertamina (Persero) dapat membagikan data instansi/perusahaan/vendor kepada lembaga atau otoritas berwenang hanya jika diperlukan untuk kepentingan verifikasi atau kepatuhan terhadap peraturan yang berlaku.",
              "5.2. PT Pertamina (Persero) tidak akan menjual, menyewakan, atau memberikan data kepada pihak lain untuk tujuan komersial.",
            ].map((text, i) => (
              <p key={i} className="ml-4 mb-2" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            <h4 className="font-semibold mt-4">6. Hak Instansi, Perusahaan, atau Vendor</h4>
            {[
              "6.1. Setiap instansi/perusahaan/vendor berhak meminta pembaruan, koreksi, atau penghapusan data yang dimilikinya dengan mengajukan permohonan resmi kepada administrator sistem SIMLOK.",
              "6.2. PT Pertamina (Persero) akan memproses permintaan tersebut sesuai kebijakan keamanan dan prosedur verifikasi internal.",
              "6.3. Pengguna juga berhak mengetahui bagaimana data instansi/perusahaan/vendor disimpan dan digunakan oleh PT Pertamina (Persero).",
            ].map((text, i) => (
              <p key={i} className="ml-4 mb-2" dangerouslySetInnerHTML={{ __html: formatNumbers(text) }} />
            ))}

            <h4 className="font-semibold mt-4">7. Perubahan Kebijakan</h4>
            <p className="ml-4 mb-2">
              Kebijakan Privasi ini dapat diperbarui sewaktu-waktu oleh PT Pertamina (Persero) untuk menyesuaikan dengan perubahan kebijakan internal atau peraturan yang berlaku. Versi terbaru akan diumumkan melalui sistem SIMLOK atau kanal resmi lainnya.
            </p>
          </section>
        </div>
      </BaseModal>
  );
};

export default TermsModal;
