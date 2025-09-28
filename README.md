# WhatsApp Hayalhanem Botu

> **🚧 Beta Sürüm – Yol haritasında belirlenen özellikler geliştirilmeye devam ediliyor.**

> 📱 Test etmek için WhatsApp üzerinden şu numaraya mesaj atabilirsiniz: [wa.me/+447435708498](https://wa.me/+447435708498) | [Komutlar listesi](#-komutlar)

---

## 📌 Proje Özellikleri

### YouTube Entegrasyonu

Belirlenen kanalların YouTube videolarını toplayarak **short** ve **uzun** videoları ayırıp depolar. Bunu yapmak için `.env` dosyasında ilgili YouTube anahtarlarını girip, aşağıdaki komutu çalıştırmak yeterlidir;

```bash
npm run ingest
```

### WhatsApp Entegrasyonu

WhatsApp Cloud API entegrasyonu sayesinde kullanıcılarla sohbet tabanlı etkileşim kurar. Şu anki yapıda belirlenen komutlara göre kısa video ve uzun video önerisi yapar; ayrıca karşılama mesajları ve özel yanıtlar da özelleştirilebilir.

### 📖 Risale-i Nur Koleksiyonu

**33 Söz** ve yüzlerce sayfa içerikle Risale-i Nur okuma deneyimi sunar. Hem söz-bazlı hem de global sayfa navigasyonu desteklenir.

## 💬 Komutlar

### WhatsApp Business Slash Komutları
- `/bilgi` → Yardım ve tanıtım menüsü
- `/kisavideo` → Kısa video önerisi
- `/uzunvideo` → Uzun video önerisi
- `/risale` → Risale-i Nur koleksionu yardım menüsü

### YouTube Videoları
- `/kisavideo` komutu veya `kısa video öner` benzeri cümleler → Kısa video önerisi
- `/uzunvideo` komutu veya `uzun video öner` benzeri cümleler → Uzun video önerisi

### Risale-i Nur
- `/risale` → Yardım ve komut listesi
- `risale söz 18` → 18. Söz’ün *1. sayfasını* açar (*anlamlar açık - varsayılan*)',
- `risale söz 18 sayfa 3` → 18. Söz’ün *3. sayfasını* açar (*anlamlar açık*)',
- `risale söz 18 kapali` → 18. Söz’ün *1. sayfasını* açar, *anlamları gizler*',
- `risale söz 18 sayfa 3 kapali` → 18. Söz’ün *3. sayfasını* açar, *anlamları gizler*'
- `risale sayfa 421` → *Global 421. sayfayı* açar (*anlamlar açık - varsayılan*)',
- `risale sayfa 421 kapali` → *Global 421. sayfayı* açar, *anlamları gizler*',

## 🧭 Yol Haritası

* 📚 Risale-i Nur külliyatı, hadis ve ayet içeriklerinin entegrasyonu
* 🤖 AI desteği ile mesaj içeriğine göre akıllı öneri

