# Kartlık

Quizlet benzeri, ücretsiz bir kelime kartı uygulaması. React 18 + Vite ile yazıldı.

- **4 çalışma modu:** Kartlar, Öğren (önce çoktan seçmeli, sonra yazılı), Test, Eşleştir (süreli oyun)
- **Hazır kütüphane:** Günlük İngilizcede en sık kullanılan 1000 kelime, Türkçe karşılıklarıyla, konulara göre 25 pakette
- **Resimler:** Kelimelerin çoğunda hazır emoji var. Kartlara internetten resim arayabilir (Openverse, ücretsiz) ya da kendi resmini yükleyebilirsin
- **Yazılı cevaplarda büyük/küçük harf farkı yok:** `APPLE`, `Apple`, `apple` aynı sayılır; Türkçe ve İngilizce `I/İ` farkı da doğru işlenir. Noktalama yok sayılır, virgülle ayrılmış karşılıklardan biri yeterlidir (“göz önünde bulundurmak, düşünmek” için “düşünmek” doğru sayılır). Türkçe harfler ise doğru yazılmalı: “kirmizi”, “kırmızı” yerine geçmez.
- **Veri saklama:** Varsayılan olarak tarayıcıda. İstersen ücretsiz Supabase ile hesap ve cihazlar arası eşitleme.

## Çalıştırma

Node.js 18 veya üstü gerekir.

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini aç. Yayına hazır sürüm için `npm run build`; çıktı `dist/` klasörüne düşer.

Geliştirirken telefonda denemek için `npm run dev:telefon` çalıştır ve telefonda, aynı Wi-Fi ağından, terminalde yazan `Network` adresini aç. Kaydettiğin her değişiklik telefonda da anında yenilenir. Windows ilk seferde güvenlik duvarı izni sorar; "Özel ağlar"a izin ver.

## Veritabanı gerekli mi?

Hayır. Supabase ayarlanmadığında uygulama her şeyi tarayıcının `localStorage` alanında tutar. Bu, tek cihazda kullanım için yeterli. Ancak:

- Başka bir cihazda ya da tarayıcıda setlerini göremezsin.
- Tarayıcı verilerini silersen setlerin de silinir (ana sayfadaki “Yedekle” bölümüyle yedek alabilirsin).
- Tarayıcı depolaması yaklaşık 5 MB ile sınırlı; çok sayıda yüklenmiş resim bu sınırı doldurabilir.

Bunlar sorun olursa **Supabase**'in ücretsiz planı yeterli olur: Postgres veritabanı ve e-postayla şifresiz giriş sağlar.

### Supabase kurulumu (yaklaşık 5 dakika)

1. [supabase.com](https://supabase.com) üzerinden ücretsiz hesap aç ve yeni bir proje oluştur.
2. Panelde **SQL Editor > New query** aç, `supabase/schema.sql` dosyasının içeriğini yapıştırıp **Run** de. Bu, `sets` tablosunu ve her kullanıcının yalnızca kendi setlerini görmesini sağlayan güvenlik kurallarını oluşturur.
3. **Authentication > URL Configuration** sayfasında **Site URL** alanına uygulamanın adresini yaz (geliştirirken `http://localhost:5173`). Yayına aldıysan oradaki adresi **Redirect URLs** listesine de ekle.
4. **Project Settings > API** sayfasından `Project URL` ve `anon public` anahtarını kopyala.
5. Proje klasöründe `.env.example` dosyasını `.env` adıyla kopyala ve iki değeri yapıştır:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
6. `npm run dev` komutunu yeniden başlat. Sağ üstte **Giriş yap** düğmesi belirir.

Giriş yaptığında tarayıcıdaki setlerin buluta yüklenir; iki tarafta da aynı set varsa en son değiştirilen kazanır.

> `anon` anahtarı tarayıcıya gömülmek için tasarlanmıştır; verileri koruyan şey `schema.sql` içindeki satır düzeyi güvenlik kurallarıdır. `service_role` anahtarını asla `.env` dosyasına koyma.

## Yayına alma

Uygulama `HashRouter` kullandığı için (`/#/kutuphane` gibi adresler) statik barındırmada ek ayar gerekmez.

- **Netlify / Vercel / Cloudflare Pages:** Depoyu bağla, derleme komutu `npm run build`, yayın klasörü `dist`. Supabase kullanıyorsan iki ortam değişkenini panelden ekle.
- **GitHub Pages (kurulu):** `main` dalına her gönderimde `.github/workflows/deploy.yml` uygulamayı derleyip yayınlar. Depo ayarlarında **Settings > Pages > Source: GitHub Actions** seçili olmalı; Supabase değerleri **Settings > Secrets and variables > Actions > Variables** altında `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` adlarıyla durur. `base: "./"` sayesinde depo adı ne olursa olsun alt klasörde çalışır.

### Telefona uygulama olarak kurma

Uygulama bir PWA'dır: yayındaki adresi Android'de **Chrome** ile açıp menüden **Uygulamayı yükle** de. Ana ekranda simgesi olur, tam ekran açılır, internetsiz de açılır. Yeni bir sürüm yayınlandığında uygulamayı açınca birkaç saniye içinde kendini günceller; yeniden kurmak gerekmez. Supabase girişinin telefonda çalışması için yayındaki adres Supabase panelinde **Authentication > URL Configuration > Redirect URLs** listesinde olmalı.

## Proje yapısı

```
src/
  App.jsx                 Yönlendirme ve üst menü
  styles.css              Tüm stiller (açık/koyu tema)
  data/
    words.txt             1000 kelimelik liste (düzenlemesi kolay düz metin)
    library.js            Listeyi okuyup paketlere böler
  lib/
    text.js               Cevap kontrolü, karıştırma, yanlış seçenek üretme
    images.js             Openverse resim araması, resim küçültme
    storage/local.js      Tarayıcı depolaması
    storage/supabase.js   Supabase istemcisi ve tablo işlemleri
  store/StoreContext.jsx  Setlerin durumu, kaydetme ve eşitleme
  components/             Toast, onay düğmesi, kart resmi, resim seçme penceresi, hesap menüsü
  pages/                  Ana sayfa, kütüphane, set düzenleyici, çalışma sayfası
  modes/                  Kartlar, Öğren, Test, Eşleştir
supabase/schema.sql       Veritabanı tablosu ve güvenlik kuralları
```

## Kelime listesini değiştirme

`src/data/words.txt` düz metindir. Her satır `kelime|türkçe karşılığı|emoji` biçimindedir (emoji isteğe bağlı), `#` ile başlayan satırlar yeni bir bölüm açar. Bölümler otomatik olarak en fazla 50 kelimelik paketlere bölünür. Kelime ekleyip çıkarabilir, karşılıkları düzeltebilir ya da tamamen farklı bir dil için yeni bir liste yazabilirsin.

Liste, günlük İngilizcede en sık geçen kelimelerden derlenmiştir; resmi bir sıklık sıralaması ya da Oxford 3000 listesinin kopyası değildir. Elinde başka bir liste varsa set düzenleyicideki **Listeden toplu ekle** ile Excel veya Google E-Tablolar’dan doğrudan yapıştırabilirsin.

## Resimler hakkında

- Openverse anahtarsız kullanımda dakikada 20, günde 200 arama izin verir. **Fotoğrafı olmayan kartlara otomatik resim bul** düğmesi emojili kartlara da fotoğraf arar (emoji kartta yedek olarak kalır); istekleri yavaşça gönderir, sınıra takılırsa durur ve kaç karta resim eklediğini söyler.
- Openverse görselleri Creative Commons lisanslıdır; sahibi ve lisansı kartın arka yüzünde gösterilir.
- Otomatik bulunan resimler her zaman isabetli olmayabilir, özellikle soyut kelimelerde. Kartın yanındaki resme tıklayarak değiştirebilirsin.
- Yüklediğin resimler 480 piksele küçültülüp kartın içinde saklanır.
