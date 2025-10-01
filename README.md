# WhatsApp Hayalhanem Botu ![Status: Beta](https://img.shields.io/badge/status-beta-yellow)

🚧 **Beta Sürüm** – Yol haritasındaki özellikler geliştirilmeye devam ediyor.

📱 Test etmek için WhatsApp üzerinden şu numaraya mesaj atabilirsiniz:  
👉 [https://wa.me/447435708498](https://wa.me/447435708498)  
📜 [Komutlar listesine git](#-komutlar)

---
## 📌 Proje Özellikleri

### 🎬 YouTube Entegrasyonu
![YouTube Badge](https://img.shields.io/badge/YouTube-Entegrasyonu-red?logo=youtube&logoColor=white)

Bu modül, belirlediğiniz YouTube kanallarındaki videoları otomatik olarak toplar ve iki kategoriye ayırır:  
- **Kısa videolar (≤ 90 sn)** 🎞️  
- **Uzun videolar (> 90 sn)** 🎥  

Toplanan videolar `data/` klasöründe JSON dosyalarına kaydedilir ve istenirse WhatsApp botu tarafından doğrudan kullanılabilir. 
Bu modülü video arşivi oluşturmak için **tek başına da kullanabilirsiniz**.

#### ⚙️ YouTube Kurulum (.env Ayarları)
YouTube verilerini çekebilmek için `.env` dosyasına aşağıdaki anahtarları ekleyin:  

```env
YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY_HERE
# Virgülle ayırarak birden fazla kanal ekleyebilirsiniz
YOUTUBE_CHANNEL_IDS=CHANNEL_ID_1,CHANNEL_ID_2
```
#### 🚀 Kullanım
Videoları manuel olarak toplamak için proje klasöründe aşağıdaki komutu çalıştırmanız yeterlidir:

```bash
npm run ingest
```

Bu komut her çalıştırıldığında kanallar taranır, **son taramadan sonraki yeni videolar** eklenir ve mevcut dosyalar güncellenir.
Düzenli güncelleme için isteğe bağlı olarak bir **cron job** ekleyebilirsiniz.

### 🤖 WhatsApp Botu
![WhatsApp Badge](https://img.shields.io/badge/WhatsApp-Bot-25D366?logo=whatsapp&logoColor=white)

Bu bot, WhatsApp üzerinden kullanıcılara **Hayalhanem YouTube videoları** ve **Risale-i Nur içerikleri** sunmak için geliştirilmiştir.  
Kullanıcı mesajlarına yanıt verir, komutları algılar ve uygun içeriği döndürür.

> 📏 **Uzun Mesaj Yönetimi:**  
> WhatsApp’ın tek mesaj için koyduğu **4096 karakter sınırı** nedeniyle, bot uzun içerikleri **otomatik olarak parçalayarak birden fazla mesaj hâlinde** gönderir.  
> Böylece Risale-i Nur’daki uzun sayfalar ya da çok satırlı açıklamalar kullanıcıya eksiksiz ulaşır.

#### 📖 Risale-i Nur Külliyatı

Bot şu an **Risale-i Nur Sözler Kitabı'nı** içermektedir ve WhatsApp üzerinden kolayca okunabilir.

> 💡 **Anlam Açık Modu:**  
> Bu mod aktifken **kelimelerin yanına kalın yazı ile anlamı eklenir** ve okumayı / öğrenmeyi kolaylaştırır.  
> İstenirse anlamlar kapatılarak yalnızca orijinal metin görüntülenebilir.

> 📚 **Kelime Çalışması:**  
> Sözler Kitabı'ndaki **zor kelimelerin anlamları** ayrı olarak çıkarılmış ve **rastgele kelime öğrenme** özelliği eklenmiştir.  
> **Anlam kapalı** modunda o sayfada geçen kelimeler sayfa altında gösterilir.

#### 💬 Komutlar

Aşağıdaki tablo, botun desteklediği tüm komutları ve işlevlerini özetler:


| Komut / İfade                                                             | Açıklama                                                                                 |
|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `/bilgi`                                                                  | Botun özelliklerini ve komut listesini gösterir.                                        |
| `/kisavideo`                                                              | Kısa (≤ 90 sn) bir video önerir.                                                        |
| **kısa video ile ilgili herhangi bir ifade**<br>örn: "kısa video öner", "bana kısa video gönder" | Slash komut yazmadan da **kısa video** isteği gönderir.                                 |
| `/uzunvideo`                                                              | Uzun (> 90 sn) bir video önerir.                                                        |
| **uzun video ile ilgili herhangi bir ifade**<br>örn: "uzun video öner", "uzun bir video istiyorum" | Slash komut yazmadan da **uzun video** isteği gönderir.                                 |
| `/risale`                                                                 | Risale-i Nur Sözler Kitabı için yardım menüsünü gösterir.                               |
| `/risaleicindekiler`                                                      | Tüm Sözler'in listesini ve sayfa bilgilerini gösterir.                                   |
| `/risalekelimeler`                                                        | Sözler Kitabı'ndan rastgele 15 kelime ve anlamını getirir.                               |
| `/risalesozler 9`                                                         | 9. Söz'ün ilk sayfasını açar (**varsayılan:** anlamlar açık).                          |
| `/risalesozler 9 sayfa 2 kapalı`                                          | 9. Söz'ün 2. sayfasını açar, **anlamları gizler**.                          |
| `/risalesozlersayfa 421`                                                  | **Sözler Kitabı'nın 421. sayfasını** açar (**varsayılan:** anlamlar açık).              |
| **risale ile ilgili herhangi bir ifade**<br>örn: "risale sözler 9", "risale sözler 9 kapalı", "risale sözler sayfa 421" | Slash komut yazmadan da **Risale okuma** isteği gönderir. Anlam açık/kapalı ve sayfa belirtme desteklenir.</parameter>

## 🧭 Yol Haritası

- 📚 **Külliyat Genişletme:**  
  Risale-i Nur’un tüm külliyatının yanı sıra **hadis ve ayet içeriklerinin** de entegre edilmesi.

- 🤖 **Yapay Zekâ Destekli Öneriler:**  
  Mesaj içeriğine göre **akıllı video ve metin önerileri** sunan yapay zekâ modülünün eklenmesi.

