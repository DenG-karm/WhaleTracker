# Katkıda Bulunma Rehberi (Contributing Guidelines)

Öncelikle WhaleTracker projesine ilgi duyduğunuz ve katkıda bulunmak istediğiniz için teşekkür ederiz! Bu proje, perakende yatırımcılar için tasarlanmış açık kaynaklı bir yapay zeka destekli alım-satım terminalidir. Topluluğun gücüyle çok daha iyi bir noktaya geleceğine inanıyoruz.

## 🚀 Nasıl Katkıda Bulunabilirsiniz?

Herhangi bir yetenek seviyesinde katkıda bulunabilirsiniz. İşte bazı yollar:

1. **Hata Bildirimi (Bug Reports):** Karşılaştığınız sorunları GitHub Issues üzerinden bize bildirin.
2. **Yeni Özellik Geliştirme:** Yeni bir özellik eklemek istiyorsanız önce bir "Issue" açarak fikrinizi tartışın, ardından bir Pull Request (PR) gönderin.
3. **Dökümantasyon:** Kodun veya sistemin anlaşılırlığını artıran her türlü döküman iyileştirmesi çok değerlidir.
4. **Tasarım & UI/UX:** Frontend (React) ve Mobil (React Native) tarafındaki arayüz geliştirmelerine destek olabilirsiniz.

## 💻 Geliştirme Ortamı Kurulumu

Projeyi yerel ortamınızda ayağa kaldırmak için ana `README.md` dosyasındaki "Quick Start (Docker)" adımlarını izleyebilirsiniz. Kısaca:

1. Projeyi fork'layın ve kendi makinenize klonlayın.
2. `backend/.env.example` dosyasını `backend/.env` olarak kopyalayın.
3. `frontend/.env.local.example` dosyasını `frontend/.env.local` olarak kopyalayın.
4. `docker-compose up --build` komutuyla tüm servisleri başlatın.

## 🛠 Pull Request (PR) Süreci

Kodunuza güveniyoruz, ancak standartları korumak adına lütfen şu adımları izleyin:

1. Orijinal projeyi fork'layın.
2. Kendi özellik dalınızı (feature branch) oluşturun: `git checkout -b feature/HarikaOlanYeniOzellik`
3. Değişikliklerinizi yapın ve commit'leyin: `git commit -m 'feat: Harika bir özellik eklendi'` (Anlamlı commit mesajları kullanmaya özen gösterin).
4. Kendi fork'unuza push'layın: `git push origin feature/HarikaOlanYeniOzellik`
5. Ana repoya bir Pull Request açın.

### Kod Standartları
- **Backend (Python):** PEP 8 standartlarına uymaya gayret edin. FastAPI yapısına sadık kalın.
- **Frontend (React):** Component bazlı mimariye uyun, Tailwind sınıflarını düzenli tutun.
- PR göndermeden önce kodunuzun hatasız çalıştığından ve mevcut sistemi bozmadığından emin olun.

## 🔒 Güvenlik

Lütfen Pull Request gönderirken **ASLA** `.env` dosyalarınızı, API anahtarlarınızı, veritabanı şifrelerinizi veya herhangi bir gizli bilgiyi commit etmeyin. Hassas bilgiler daima çevre değişkenleri (environment variables) aracılığıyla yönetilmelidir.

---

Tekrar teşekkürler! Sorularınız varsa Issues sekmesinden bize ulaşabilirsiniz. İyi kodlamalar! 🐋
